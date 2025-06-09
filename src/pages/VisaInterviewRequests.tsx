import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Box,
  Typography,
  Tooltip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import * as XLSX from "xlsx";

interface VisaInterviewRequest {
  id: string;
  stu_name: string;
  stu_email: string;
  interview_date: string;
  passport_doc: string | null;
  i20_file: string | null;
  support_doc: string | null;
  sn?: number;
}

const VisaInterviewRequests: React.FC = () => {
  // State variables
  const [requests, setRequests] = useState<VisaInterviewRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VisaInterviewRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [openApproveModal, setOpenApproveModal] = useState(false);
  const [openPassportModal, setOpenPassportModal] = useState(false);
  const [openI20Modal, setOpenI20Modal] = useState(false);
  const [openSupportDocModal, setOpenSupportDocModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VisaInterviewRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const API_URL =
    "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/visa/APIs";

  // Fetch requests on component mount
  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests when search query changes
  useEffect(() => {
    if (searchQuery) {
      setFilteredRequests(
        requests.filter(
          (request) =>
            request.stu_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.stu_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.interview_date.includes(searchQuery)
        )
      );
    } else {
      setFilteredRequests(requests);
    }
  }, [searchQuery, requests]);

  // Fetch visa interview requests
  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/visa_interview_api.php`);
      if (response.data.success) {
        const requestsWithSn = response.data.requests.map(
          (request: VisaInterviewRequest, index: number) => ({
            ...request,
            sn: index + 1,
          })
        );
        setRequests(requestsWithSn);
        setFilteredRequests(requestsWithSn);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error fetching requests",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error connecting to server",
        severity: "error",
      });
    }
  };

  // Handle search input changes
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Export data to Excel
  const handleExportExcel = () => {
    const exportData = filteredRequests.map((request) => ({
      ID: request.sn,
      "Student Name": request.stu_name,
      "Interview Date": request.interview_date,
      Passport: request.passport_doc || "N/A",
      "I-20 File": request.i20_file || "N/A",
      "Support Doc": request.support_doc || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Visa Interview Requests");
    XLSX.writeFile(workbook, "visa_interview_requests.xlsx");
  };

  // Open approve confirmation modal
  const handleOpenApproveModal = (request: VisaInterviewRequest) => {
    setSelectedRequest(request);
    setOpenApproveModal(true);
  };

  // Handle approve request
  const handleApproveSubmit = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/visa_interview_api.php`, {
        action: "approve",
        stu_id: selectedRequest.id,
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Request approved successfully",
          severity: "success",
        });
        setOpenApproveModal(false);
        fetchRequests();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error approving request",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting request",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open reject modal
  const handleOpenRejectModal = (request: VisaInterviewRequest) => {
    setSelectedRequest(request);
    setRejectReason("");
    setOpenRejectModal(true);
  };

  // Handle reject request submission
  const handleRejectSubmit = async () => {
    if (!selectedRequest || !rejectReason) {
      setSnackbar({
        open: true,
        message: "Please provide a rejection reason",
        severity: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/visa_interview_api.php`, {
        action: "reject",
        stu_id: selectedRequest.id,
        reason: rejectReason,
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Request rejected successfully",
          severity: "success",
        });
        setOpenRejectModal(false);
        fetchRequests();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error rejecting request",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting request",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open document modals
  const handleOpenPassportModal = (request: VisaInterviewRequest) => {
    setSelectedRequest(request);
    setOpenPassportModal(true);
  };

  const handleOpenI20Modal = (request: VisaInterviewRequest) => {
    setSelectedRequest(request);
    setOpenI20Modal(true);
  };

  const handleOpenSupportDocModal = (request: VisaInterviewRequest) => {
    setSelectedRequest(request);
    setOpenSupportDocModal(true);
  };

  // DataGrid columns
  const columns: GridColDef[] = [
    { field: "sn", headerName: "ID", width: 70 },
    { field: "stu_name", headerName: "Student Name", flex: 1 },
    { field: "interview_date", headerName: "Interview Date", flex: 1 },
    {
      field: "passport_doc",
      headerName: "Passport",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title="View Passport">
          <IconButton onClick={() => handleOpenPassportModal(params.row)}>
            <VisibilityIcon color={params.row.passport_doc ? "primary" : "disabled"} />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "i20_file",
      headerName: "I-20",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title="View I-20">
          <IconButton onClick={() => handleOpenI20Modal(params.row)}>
            <VisibilityIcon color={params.row.i20_file ? "primary" : "disabled"} />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "support_doc",
      headerName: "Support Doc",
      flex: 1,
      renderCell: (params) => (
        <Tooltip title="View Support Doc">
          <IconButton onClick={() => handleOpenSupportDocModal(params.row)}>
            <VisibilityIcon color={params.row.support_doc ? "primary" : "disabled"} />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Approve Request">
            <IconButton
              onClick={() => handleOpenApproveModal(params.row)}
              disabled={isSubmitting}
            >
              <CheckIcon color="success" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reject Request">
            <IconButton
              onClick={() => handleOpenRejectModal(params.row)}
              disabled={isSubmitting}
            >
              <CancelIcon color="error" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <div className="px-4 mb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
          <div className="w-1 h-8 bg-gradient-to-b from-[#1a9970] to-[#2164a6] rounded"></div>
          Visa Interview Training Requests
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Manage and review visa interview training requests.
        </p>
      </div>
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="card">
                      <div className="card-header">
                        <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                          <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                            Visa Interview Training Requests Table ({requests.length})
                          </p>
                        </div>
                      </div>
                      <div className="card-body mb-4">
                        <div className="flex flex-row gap-4 mb-4">
                          <TextField
                            label="Search..."
                            variant="outlined"
                            fullWidth
                            value={searchQuery}
                            onChange={handleSearch}
                            sx={{ flex: 1 }}
                          />
                          <Button
                            sx={{ textTransform: "none" }}
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleExportExcel}
                          >
                            Export to Excel
                          </Button>
                        </div>
                        <div style={{ height: 400, width: "100%" }}>
                          <DataGrid
                            rows={filteredRequests}
                            columns={columns}
                            initialState={{
                              pagination: { paginationModel: { pageSize: 10 } },
                            }}
                            pageSizeOptions={[5, 10, 25]}
                            getRowId={(row) => row.id}
                            disableRowSelectionOnClick
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      <Dialog open={openApproveModal} onClose={() => setOpenApproveModal(false)}>
        <DialogTitle>Approve Request</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve this visa interview request for{" "}
            {selectedRequest?.stu_name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenApproveModal(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApproveSubmit}
            variant="contained"
            color="success"
            disabled={isSubmitting}
            sx={{ textTransform: "none" }}
          >
            {isSubmitting ? "Approving..." : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Request Modal */}
      <Dialog open={openRejectModal} onClose={() => setOpenRejectModal(false)}>
        <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" fontWeight="bold">
            Reject Visa Interview Request
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" color="text.primary" mb={2}>
              Please provide the reason for rejecting the visa interview request for{" "}
              <strong>{selectedRequest?.stu_name}</strong> ({selectedRequest?.stu_email}).
            </Typography>
            <TextField
              label="Rejection Reason"
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              placeholder="Enter the reason for rejection"
              error={!rejectReason && isSubmitting}
              helperText={
                !rejectReason && isSubmitting ? "Rejection reason is required" : ""
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', p: 2 }}>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenRejectModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectSubmit}
            variant="contained"
            color="error"
            disabled={isSubmitting}
            sx={{ textTransform: "none" }}
          >
            {isSubmitting ? "Rejecting..." : "Reject Request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Passport Document Modal */}
      <Dialog
        open={openPassportModal}
        onClose={() => setOpenPassportModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Passport Document</DialogTitle>
        <DialogContent>
          {selectedRequest && selectedRequest.passport_doc ? (
            <iframe
              src={`https://finkapinternational.qhtestingserver.com/login/member/dashboard/school_app_docs/${selectedRequest.passport_doc}`}
              style={{ width: "100%", height: "500px", border: "none" }}
              title="Passport Document"
            />
          ) : (
            <Box textAlign="center" py={4}>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Document Not Available
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                The requested document could not be found.
              </p>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenPassportModal(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* I-20 Document Modal */}
      <Dialog
        open={openI20Modal}
        onClose={() => setOpenI20Modal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>I-20 Document</DialogTitle>
        <DialogContent>
          {selectedRequest && selectedRequest.i20_file ? (
            <iframe
              src={`https://finkapinternational.qhtestingserver.com/login/member/dashboard/I20forDS160/${selectedRequest.i20_file}`}
              style={{ width: "100%", height: "500px", border: "none" }}
              title="I-20 Document"
            />
          ) : (
            <Box textAlign="center" py={4}>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Document Not Available
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                The requested document could not be found.
              </p>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenI20Modal(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Support Document Modal */}
      <Dialog
        open={openSupportDocModal}
        onClose={() => setOpenSupportDocModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Support Document</DialogTitle>
        <DialogContent>
          {selectedRequest && selectedRequest.support_doc ? (
            <iframe
              src={`https://finkapinternational.qhtestingserver.com/login/member/dashboard/I20forDS160/${selectedRequest.support_doc}`}
              style={{ width: "100%", height: "500px", border: "none" }}
              title="Support Document"
            />
          ) : (
            <Box textAlign="center" py={4}>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Document Not Available
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                The requested document could not be found.
              </p>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            sx={{ textTransform: "none" }}
            onClick={() => setOpenSupportDocModal(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default VisaInterviewRequests;