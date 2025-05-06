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
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface MockBooking {
  id: number;
  email: string;
  fullnames: string;
  test_type: string;
  mock: string;
  marks: string;
  proof?: string; // Optional, included in the response
  sn?: number; // Serial number added dynamically
}

const Mocks: React.FC = () => {
  const [mocks, setMocks] = useState<MockBooking[]>([]);
  const [selectedMock, setSelectedMock] = useState<MockBooking | null>(null);
  const [openReviewModal, setOpenReviewModal] = useState(false);
  const [comment, setComment] = useState("");
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

  const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/APIs/student_management/school-application/entrance_exams/mocks.php";

  useEffect(() => {
    fetchMocks();
  }, []);

  const fetchMocks = async () => {
    try {
      const response = await axios.get(API_URL, {
        params: { action: "fetch_mock_results", status: 1 },
      });
      if (response.data.status === "success") {
        setMocks(response.data.data); // New API returns results in `data`
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "No mock results found",
          severity: "warning",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching mock results",
        severity: "error",
      });
    }
  };

  const handleReviewClick = (mock: MockBooking) => {
    setSelectedMock(mock);
    setComment(""); // Reset comment
    setOpenReviewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedMock) return;

    setIsSubmitting(true);
    try {
      const response = await axios.get(API_URL, {
        params: {
          action: "approve_result",
          result_id: selectedMock.id,
          student_email: selectedMock.email,
          comment: comment || "", // Comment is optional
        },
      });

      if (response.data.status === "success") {
        setSnackbar({
          open: true,
          message: response.data.message || "Mock result approved successfully",
          severity: "success",
        });
        setOpenReviewModal(false);
        setComment("");
        fetchMocks(); // Refresh the list
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error approving mock result",
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

  const handleReject = async () => {
    if (!selectedMock || !comment) {
      setSnackbar({
        open: true,
        message: "Comment is required for rejection",
        severity: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.get(API_URL, {
        params: {
          action: "reject_result",
          result_id: selectedMock.id,
          student_email: selectedMock.email,
          comment: comment,
        },
      });

      if (response.data.status === "success") {
        setSnackbar({
          open: true,
          message: response.data.message || "Mock result rejected successfully",
          severity: "success",
        });
        setOpenReviewModal(false);
        setComment("");
        fetchMocks(); // Refresh the list
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error rejecting mock result",
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

  const columns: GridColDef<MockBooking>[] = [
    {
      field: "sn",
      headerName: "Id",
      flex: 1,
      valueGetter: (_, row) => row.sn,
    },
    { field: "email", headerName: "Email", flex: 2 },
    { field: "fullnames", headerName: "Name", flex: 2 },
    {
      field: "mock",
      headerName: "Mock No.",
      flex: 1,
      renderCell: (params) => <span className="badge bg-success">{params.value}</span>,
    },
    { field: "test_type", headerName: "Test Type", flex: 1 },
    { field: "marks", headerName: "Marks", flex: 1 },
    {
      field: "action",
      headerName: "Action",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          title="Review"
          onClick={() => handleReviewClick(params.row)}
        >
          <VisibilityIcon className="text-blue-600" />
        </IconButton>
      ),
    },
  ];

  const rows = mocks.map((mock, index) => ({ ...mock, sn: index + 1 }));

  return (
    <main className="min-h-[80vh] p-4">
      <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
        <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
          Mock Results
        </p>
      </div>

      <div className="bg-white mt-8 rounded-lg shadow-md">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: "No mock results found!" }}
          className="border-none"
        />
      </div>

      <Dialog
        open={openReviewModal}
        onClose={() => setOpenReviewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Review Mock</DialogTitle>
        <DialogContent>
          {selectedMock && (
            <>
              <TextField
                fullWidth
                label="Review Comment"
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                sx={{ mt: 2 }}
              />
              <Typography variant="caption" sx={{ fontStyle: 'italic', marginBottom: "20px" }} color="text.secondary">
                <strong>*Comment is optional for approval but required for rejection.</strong>
              </Typography>
              <div className="mb-8"></div>
              <iframe
                src={`https://finkapinternational.qhtestingserver.com/login/member/dashboard/uploads/mocks/${selectedMock.proof}`}
                width="100%"
                height="600px"
                title="Mock Document"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenReviewModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            sx={{ textTransform: "none" }}
            color="error"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Reject"}
          </Button>
          <Button
            onClick={handleApprove}
            sx={{ textTransform: "none" }}
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Approve"}
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

export default Mocks;