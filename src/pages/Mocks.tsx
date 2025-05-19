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
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

interface MockBooking {
  id: number;
  email: string;
  fullnames: string;
  test_type: string;
  mock: string;
  marks: string;
  status: number;
  proof: string;
  comment?: string;
  sn?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Mocks: React.FC = () => {
  const [allMocks, setAllMocks] = useState<MockBooking[]>([]);
  const [pendingMocks, setPendingMocks] = useState<MockBooking[]>([]);
  const [approvedMocks, setApprovedMocks] = useState<MockBooking[]>([]);
  const [rejectedMocks, setRejectedMocks] = useState<MockBooking[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedMock, setSelectedMock] = useState<MockBooking | null>(null);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    "https://finkapinternational.qhtestingserver.com/login/main/APIs/student_management/school-application/entrance_exams/mocks.php";

  useEffect(() => {
    fetchAllMocks();
  }, []);

  const fetchAllMocks = async () => {
    setIsLoading(true);
    try {
      const [allResponse, pendingResponse, approvedResponse, rejectedResponse] =
        await Promise.all([
          axios.get(API_URL, { params: { action: "fetch_all_mock_results" } }),
          axios.get(API_URL, { params: { action: "fetch_mock_results", status: 1 } }),
          axios.get(API_URL, { params: { action: "fetch_mock_results", status: 2 } }),
          axios.get(API_URL, { params: { action: "fetch_mock_results", status: 3 } }),
        ]);

      if (allResponse.data.status === "success") {
        setAllMocks(allResponse.data.data);
      }
      if (pendingResponse.data.status === "success") {
        setPendingMocks(pendingResponse.data.data);
      }
      if (approvedResponse.data.status === "success") {
        setApprovedMocks(approvedResponse.data.data);
      }
      if (rejectedResponse.data.status === "success") {
        setRejectedMocks(rejectedResponse.data.data);
      }

      if (
        allResponse.data.status === "success" &&
        pendingResponse.data.status === "success" &&
        approvedResponse.data.status === "success" &&
        rejectedResponse.data.status === "success" &&
        (!allResponse.data.data || allResponse.data.data.length === 0) &&
        (!pendingResponse.data.data || pendingResponse.data.data.length === 0) &&
        (!approvedResponse.data.data || approvedResponse.data.data.length === 0) &&
        (!rejectedResponse.data.data || rejectedResponse.data.data.length === 0)
      ) {
        setSnackbar({
          open: true,
          message: "No mock results found",
          severity: "warning",
        });
      }
    } catch (error) {
      console.error("Error fetching mocks:", error);
      setSnackbar({
        open: true,
        message: "Error fetching mock results",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewClick = (mock: MockBooking) => {
    setSelectedMock(mock);
    setOpenViewModal(true);
  };

  const handleApproveClick = (mock: MockBooking) => {
    setSelectedMock(mock);
    setComment("");
    setOpenApproveModal(true);
  };

  const handleRejectClick = (mock: MockBooking) => {
    setSelectedMock(mock);
    setComment("");
    setOpenRejectModal(true);
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
          comment: comment || "",
        },
      });

      if (response.data.status === "success") {
        setSnackbar({
          open: true,
          message: response.data.message || "Mock result approved successfully",
          severity: "success",
        });
        setOpenApproveModal(false);
        setComment("");
        fetchAllMocks();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error approving mock result",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error approving mock:", error);
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
      setIsSubmitting(false);
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
        setOpenRejectModal(false);
        setComment("");
        fetchAllMocks();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error rejecting mock result",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error rejecting mock:", error);
      setSnackbar({
        open: true,
        message: "Error submitting rejection",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseColumns: GridColDef<MockBooking>[] = [
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
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        const status = params.row.status;
        const badgeClass =
          status === 2
            ? "badge bg-green-500 text-white p-2 rounded"
            : status === 3
              ? "badge bg-red-500 text-white p-2 rounded"
              : "badge bg-amber-500 text-white p-2 rounded";
        const statusText =
          status === 2 ? "Approved" : status === 3 ? "Rejected" : "Pending";
        return <span className={badgeClass}>{statusText}</span>;
      },
    },
  ];

  const allMocksColumns: GridColDef<MockBooking>[] = [
    ...baseColumns,
    {
      field: "action",
      headerName: "Action",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton title="View" onClick={() => handleViewClick(params.row)}>
          <VisibilityIcon className="text-blue-600" />
        </IconButton>
      ),
    },
  ];

  const pendingColumns: GridColDef<MockBooking>[] = [
    ...baseColumns,
    {
      field: "action",
      headerName: "Action",
      flex: 2,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <IconButton title="View" onClick={() => handleViewClick(params.row)}>
            <VisibilityIcon className="text-blue-600" />
          </IconButton>
          <IconButton
            title="Approve"
            onClick={() => handleApproveClick(params.row)}
          >
            <CheckCircleIcon className="text-green-600" />
          </IconButton>
          <IconButton
            title="Reject"
            onClick={() => handleRejectClick(params.row)}
          >
            <CancelIcon className="text-red-600" />
          </IconButton>
        </>
      ),
    },
  ];

  const approvedRejectedColumns: GridColDef<MockBooking>[] = [
    ...baseColumns,
    {
      field: "action",
      headerName: "Action",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton title="View" onClick={() => handleViewClick(params.row)}>
          <VisibilityIcon className="text-blue-600" />
        </IconButton>
      ),
    },
  ];

  const allMocksRows = allMocks.map((mock, index) => ({ ...mock, sn: index + 1 }));
  const pendingRows = pendingMocks.map((mock, index) => ({ ...mock, sn: index + 1 }));
  const approvedRows = approvedMocks.map((mock, index) => ({ ...mock, sn: index + 1 }));
  const rejectedRows = rejectedMocks.map((mock, index) => ({ ...mock, sn: index + 1 }));

  return (
    <main className="min-h-[80vh] p-4">
      <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
        <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
          Mock Results
        </p>
      </div>

      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          mb: 3,
          p: 2,
          border: '1px solid #e0e0e0',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="mock results tabs"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#2164A6',
              height: '3px',
              borderRadius: '2px',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              color: '#616161',
              padding: '12px 24px',
              borderRadius: '8px',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                color: '#2164A6',
              },
            },
            '& .Mui-selected': {
              color: '#2164A6',
              fontWeight: 600,
              backgroundColor: '#e3f2fd',
            },
          }}
        >
          <Tab label="All Mocks" />
          <Tab label="Pending Review" />
          <Tab label="Approved" />
          <Tab label="Rejected" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <div className="bg-white rounded-lg shadow-md">
          <DataGrid
            rows={allMocksRows}
            columns={allMocksColumns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: "No mock results found!" }}
            className="border-none"
            loading={isLoading}
          />
        </div>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <div className="bg-white rounded-lg shadow-md">
          <DataGrid
            rows={pendingRows}
            columns={pendingColumns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: "No pending mock results found!" }}
            className="border-none"
            loading={isLoading}
          />
        </div>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <div className="bg-white rounded-lg shadow-md">
          <DataGrid
            rows={approvedRows}
            columns={approvedRejectedColumns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: "No approved mock results found!" }}
            className="border-none"
            loading={isLoading}
          />
        </div>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <div className="bg-white rounded-lg shadow-md">
          <DataGrid
            rows={rejectedRows}
            columns={approvedRejectedColumns}
            pageSizeOptions={[5, 10, 25]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: "No rejected mock results found!" }}
            className="border-none"
            loading={isLoading}
          />
        </div>
      </TabPanel>

      <Dialog
        open={openViewModal}
        onClose={() => setOpenViewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>View Mock Result</DialogTitle>
        <DialogContent>
          {selectedMock && (
            <>
              {selectedMock.comment && (
                <p className="p-3 shadow-md rounded-md mb-8">
                  <strong>Review Comment:</strong> {selectedMock.comment}
                </p>
              )}
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
            onClick={() => setOpenViewModal(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openApproveModal}
        onClose={() => setOpenApproveModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Approval</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to approve this mock result?
          </Typography>
          <TextField
            fullWidth
            label="Comment (Optional)"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenApproveModal(false)}
            disabled={isSubmitting}
          >
            Cancel
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

      <Dialog
        open={openRejectModal}
        onClose={() => setOpenRejectModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Mock Result</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Please provide a reason for rejecting this mock result.
          </Typography>
          <TextField
            fullWidth
            label="Comment (Required)"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 2 }}
            error={!comment && isSubmitting}
            helperText={!comment && isSubmitting ? "Comment is required" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenRejectModal(false)}
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