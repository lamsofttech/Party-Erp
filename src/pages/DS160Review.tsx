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
import CancelIcon from "@mui/icons-material/Cancel";
import * as XLSX from "xlsx";

interface DS160Request {
    req_id: string;
    name: string;
    application_id: string;
    school_name: string;
    reporting_date: string;
    birth_year: string;
    course: string;
    security_answer: string;
    visa_attempt: string;
    approved_before: string;
    denied_before: string;
    current_country: string;
    visa_interview_country: string;
    with_family: string;
    documents?: string | null; // Assuming documents is a file path or URL
    sn?: number;
}

const DS160Review: React.FC = () => {
    const [requests, setRequests] = useState<DS160Request[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<DS160Request[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openViewModal, setOpenViewModal] = useState(false);
    const [openRejectModal, setOpenRejectModal] = useState(false);
    const [openDocumentModal, setOpenDocumentModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<DS160Request | null>(null);
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

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/visa/APIs/ds160_api.php";

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
                        request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        request.application_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        request.school_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredRequests(requests);
        }
    }, [searchQuery, requests]);

    // Fetch DS160 requests
    const fetchRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}`);
            if (response.data.success) {
                const requestsWithSn = response.data.requests.map(
                    (request: DS160Request, index: number) => ({
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
            "Student Name": request.name,
            "Application ID": request.application_id,
            School: request.school_name,
            "Reporting Date": request.reporting_date,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DS160 Requests");
        XLSX.writeFile(workbook, "ds160_requests.xlsx");
    };

    // Open view modal
    const handleOpenViewModal = (request: DS160Request) => {
        setSelectedRequest(request);
        setOpenViewModal(true);
    };

    // Open document modal
    //   const handleOpenDocumentModal = (request: DS160Request) => {
    //     setSelectedRequest(request);
    //     setOpenDocumentModal(true);
    //   };

    // Handle approve request
    const handleApproveSubmit = async () => {
        if (!selectedRequest) return;

        setIsSubmitting(true);
        try {
            const response = await axios.post(`${API_URL}`, {
                action: "approve",
                req_id: selectedRequest.req_id,
            });

            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: "Request approved successfully",
                    severity: "success",
                });
                setOpenViewModal(false);
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
    const handleOpenRejectModal = (request: DS160Request) => {
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
            const response = await axios.post(`${API_URL}`, {
                action: "reject",
                req_id: selectedRequest.req_id,
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

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "sn", headerName: "ID", width: 70 },
        { field: "name", headerName: "Student Name", flex: 1 },
        { field: "application_id", headerName: "Application ID", flex: 1 },
        { field: "school_name", headerName: "School", flex: 1 },
        { field: "reporting_date", headerName: "Reporting Date", flex: 1 },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <Tooltip title="View Details">
                        <IconButton onClick={() => handleOpenViewModal(params.row)}>
                            <VisibilityIcon color="primary" />
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
                    DS160 Application Review
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage and review DS160 application requests.
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
                                                        DS160 Application Requests ({requests.length})
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
                                                        getRowId={(row) => row.req_id}
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

            {/* View Details Modal */}
            <Dialog
                open={openViewModal}
                onClose={() => setOpenViewModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)',
                    }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: "linear-gradient(135deg, #2980b9 0%, #2164a6 100%)",
                    background: "linear-gradient(135deg, #2980b9 0%, #2164a6 100%)",
                    color: "white",
                    py: 3,
                    px: 4
                }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            📋
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight="600" sx={{ mb: 0.5 }}>
                                DS-160 Application Review
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.875rem' }}>
                                Visa application details and approval
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {selectedRequest && (
                        <Box sx={{ p: 4 }}>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                gap: 3,
                                mb: 4
                            }}>
                                <Box sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: '#f8fafc',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                        Application Information
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Application ID
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.application_id}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Date of Birth
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.birth_year}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Security Answer
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.security_answer}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Box sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: '#f0f9ff',
                                    border: '1px solid #bae6fd'
                                }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                        Academic Details
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Course
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.course}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                School Name
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.school_name}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Reporting Date
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.reporting_date}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Box sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: '#fefce8',
                                    border: '1px solid #fde047'
                                }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                        Visa History
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Visa Attempt
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.visa_attempt}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Previously Approved
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.approved_before}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Previously Denied
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.denied_before}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Box sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: '#f0fdf4',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                        Location & Travel
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Current Country
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.current_country}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Interview Country
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.visa_interview_country}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                Traveling with Family
                                            </Typography>
                                            <Typography variant="body1" fontWeight="500">
                                                {selectedRequest.with_family}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{
                    borderTop: "1px solid #e5e7eb",
                    p: 3,
                    bgcolor: '#fafbfc',
                    gap: 2
                }}>
                    <Button
                        onClick={() => setOpenViewModal(false)}
                        sx={{
                            textTransform: "none",
                            px: 3,
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 500,
                            color: '#6b7280',
                            '&:hover': {
                                bgcolor: '#f3f4f6'
                            }
                        }}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={handleApproveSubmit}
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                            textTransform: "none",
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 600,
                            bgcolor: '#10b981',
                            '&:hover': {
                                bgcolor: '#059669'
                            },
                            '&:disabled': {
                                bgcolor: '#d1d5db'
                            },
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        {isSubmitting ? (
                            <Box display="flex" alignItems="center" gap={1}>
                                <Box
                                    sx={{
                                        width: 16,
                                        height: 16,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        '@keyframes spin': {
                                            '0%': { transform: 'rotate(0deg)' },
                                            '100%': { transform: 'rotate(360deg)' }
                                        }
                                    }}
                                />
                                Approving...
                            </Box>
                        ) : (
                            "Approve Application"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Request Modal */}
            <Dialog open={openRejectModal} onClose={() => setOpenRejectModal(false)}>
                <DialogTitle sx={{ bgcolor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
                    <Typography variant="h6" fontWeight="bold">
                        Reject DS160 Request
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body1" color="text.primary" mb={2}>
                            Please provide the reason for rejecting the DS160 request for{" "}
                            <strong>{selectedRequest?.name}</strong>.
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
                <DialogActions sx={{ borderTop: "1px solid #e0e0e0", p: 2 }}>
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

            {/* Document Modal */}
            <Dialog
                open={openDocumentModal}
                onClose={() => setOpenDocumentModal(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>DS160 Documents</DialogTitle>
                <DialogContent>
                    {selectedRequest && selectedRequest.documents ? (
                        <iframe
                            src={`https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/visa/documents/${selectedRequest.documents}`}
                            style={{ width: "100%", height: "500px", border: "none" }}
                            title="DS160 Documents"
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
                        onClick={() => setOpenDocumentModal(false)}
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

export default DS160Review;