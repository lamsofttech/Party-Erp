import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import * as XLSX from 'xlsx';

interface Result {
  id: number;
  fullnames: string;
  prog_email: string;
  test_type: string;
  status: "review score" | "unsubmitted score";
}

const Results: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [filteredResults, setFilteredResults] = useState<Result[]>([]); // Added for filtered data
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [score, setScore] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [isFetchingScore, setIsFetchingScore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/results_api.php";

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=list`);
      if (response.data.success) {
        setResults(response.data.bookings);
        setFilteredResults(response.data.bookings);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "No results found",
          severity: "warning",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching results",
        severity: "error",
      });
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredResults(
      results.filter(
        (result) =>
          result.fullnames.toLowerCase().includes(query) ||
          result.prog_email.toLowerCase().includes(query) ||
          result.test_type.toLowerCase().includes(query)
      )
    );
  };

  const handleOpenApproveModal = async (result: Result) => {
    setSelectedResult(result);
    setOpenApproveModal(true);
    setScore("");
    setFile(null);
    setIsFetchingScore(true);
    try {
      const response = await axios.get(`${API_URL}?action=score&id=${result.id}`);
      if (response.data.success) {
        setScore(response.data.score);
      } else {
        setScore("");
        setSnackbar({
          open: true,
          message: response.data.message || "Could not fetch score automatically",
          severity: "warning",
        });
      }
    } catch (error) {
      setScore("");
      setSnackbar({
        open: true,
        message: "Error fetching score",
        severity: "error",
      });
    } finally {
      setIsFetchingScore(false);
    }
  };

  const handleApproveSubmit = async () => {
    if (!selectedResult || !score) {
      setSnackbar({
        open: true,
        message: "Please provide a score",
        severity: "warning",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("action", "approve");
      formData.append("id", selectedResult.id.toString());
      formData.append("score", score);
      if (file) formData.append("report", file);

      const response = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || "Score approved successfully",
          severity: "success",
        });
        setOpenApproveModal(false);
        fetchResults();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error approving score",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting approval",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRejectModal = (result: Result) => {
    setSelectedResult(result);
    setOpenRejectModal(true);
    setComment("");
  };

  const handleRejectSubmit = async () => {
    if (!selectedResult || !comment) {
      setSnackbar({
        open: true,
        message: "Please provide a rejection reason",
        severity: "warning",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("action", "reject");
      formData.append("id", selectedResult.id.toString());
      formData.append("comment", comment);

      const response = await axios.post(API_URL, formData);
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || "Score rejected successfully",
          severity: "success",
        });
        setOpenRejectModal(false);
        fetchResults();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error rejecting score",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting rejection",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: GridColDef<Result>[] = [
    { field: "id", headerName: "Id", flex: 1 },
    { field: "fullnames", headerName: "Name", flex: 2 },
    { field: "prog_email", headerName: "ISP Email", flex: 2 },
    { field: "test_type", headerName: "Test Type", flex: 2 },
    {
      field: "status",
      headerName: "Status",
      flex: 2,
      renderCell: (params) => (
        <span className="badge bg-success p-2">
          {params.value === "review score" ? "score submitted" : "score not submitted"}
        </span>
      ),
    },
    {
      field: "action",
      headerName: "Action",
      flex: 2,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <IconButton
            title={params.row.status === "review score" ? "Approve Score" : "Request Score"}
            onClick={() => handleOpenApproveModal(params.row)}
          >
            <CheckIcon className="text-green-600" />
          </IconButton>
          <IconButton title="Reject" onClick={() => handleOpenRejectModal(params.row)}>
            <CloseIcon className="text-red-600" />
          </IconButton>
        </>
      ),
    },
  ];

  const rows = filteredResults.map((result, index) => ({ ...result, sn: index + 1 }));

  return (
    <main className="min-h-[80vh] p-4">
      <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
        <p className="font-bold text-[24px] text-white py-4 text-center">Results</p>
      </div>

      <div className="flex flex-row gap-4 mb-4">
        <TextField
          label="Search..."
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={handleSearch}
          sx={{ input: { backgroundColor: "white" }, flex: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => {
            const exportData = filteredResults.map(result => ({
              Id: result.id,
              Name: result.fullnames,
              "ISP Email": result.prog_email,
              "Test Type": result.test_type,
              Status: result.status === "review score" ? "score submitted" : "score not submitted",
            }));
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
            XLSX.writeFile(workbook, "results.xlsx");
          }}
        >
          Export to Excel
        </Button>
      </div>

      <div className="bg-white mt-8 rounded-lg shadow-md">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: "No results found!" }}
          className="border-none"
        />
      </div>

      {/* Approve Modal */}
      <Dialog open={openApproveModal} onClose={() => setOpenApproveModal(false)}>
        <DialogTitle>Approve Score</DialogTitle>
        <DialogContent>
          {isFetchingScore ? (
            <div className="flex justify-center">
              <CircularProgress />
            </div>
          ) : (
            <>
              <TextField
                fullWidth
                label="Score"
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                sx={{ mt: 2 }}
                required
              />
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ marginTop: "16px" }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApproveModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleApproveSubmit} color="primary" disabled={isSubmitting}>
            {isSubmitting ? "Approving..." : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={openRejectModal} onClose={() => setOpenRejectModal(false)}>
        <DialogTitle>Reject Score</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Rejection Reason"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 2 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleRejectSubmit} color="error" disabled={isSubmitting}>
            {isSubmitting ? "Rejecting..." : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </main>
  );
};

export default Results;