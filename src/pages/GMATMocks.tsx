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
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface MockBooking {
  id: number;
  email: string;
  fullnames: string;
  mock: string;
  date_submitted: string;
  marks: string;
  proof?: string; // Optional, included when fetching details
  sn?: number; // Serial number added dynamically
}

const GMATMocks: React.FC = () => {
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

  const API_URL =
    "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/gmat_mocks_api.php";

  useEffect(() => {
    fetchMocks();
  }, []);

  const fetchMocks = async () => {
    try {
      const response = await axios.get(`${API_URL}`);
      if (response.data.success) {
        setMocks(response.data.mocks);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "No mock bookings found",
          severity: "warning",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching mock bookings",
        severity: "error",
      });
    }
  };

  const fetchMockDetails = async (id: number) => {
    try {
      const response = await axios.get(`${API_URL}?id=${id}`);
      if (response.data.success) {
        setSelectedMock(response.data.mock);
        setOpenReviewModal(true);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Mock not found",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching mock details",
        severity: "error",
      });
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedMock || !comment) {
      setSnackbar({
        open: true,
        message: "Please provide a comment",
        severity: "warning",
      });
      return;
    }

    setIsSubmitting(true); // Track submission state

    try {
      const formData = new FormData();
      formData.append("action", "review");
      formData.append("mock_id", selectedMock.id.toString());
      formData.append("comment", comment);

      const response = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || "Mock reviewed successfully",
          severity: "success",
        });
        setOpenReviewModal(false);
        setComment("");
        fetchMocks(); // Refresh the mock list
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error reviewing mock",
          severity: "error",
        });
        setOpenReviewModal(false); // Close modal on failure
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting review",
        severity: "error",
      });
      setOpenReviewModal(false); // Close modal on failure
    } finally {
      setIsSubmitting(false); // Reset submission state
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
    { field: "date_submitted", headerName: "Date Submitted", flex: 2 },
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
          onClick={() => fetchMockDetails(params.row.id)}
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
          GMAT Mock Bookings
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
          localeText={{ noRowsLabel: "No mock bookings found!" }}
          className="border-none"
        />
      </div>

      <Dialog open={openReviewModal} onClose={() => setOpenReviewModal(false)} maxWidth="md" fullWidth>
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
                sx={{ mb: 2, mt: 2 }}
              />
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
          <Button onClick={() => setOpenReviewModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleReviewSubmit}
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
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

export default GMATMocks;