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

interface DS160Request {
    id: string;
    upload_date: string;
    stu_email: string;
    stu_name: string;
    i20_file: string;
    passportDoc: string | null; // Added for passport document name
    sn?: number; // Serial number for display
}

interface Statement {
    fullnames: string;
    email: string;
    package: string;
    country: string;
    contributions: Array<{
        payment_intent_id: string;
        purpose: string;
        date_completed: string;
        amount: number;
    }>;
    expenditures: Array<{
        reference_id: string;
        purpose: string;
        date: string;
        amount: number;
    }>;
    total_contribution: number;
    total_expenditure: number;
    balance: number;
}

const DS160Requests: React.FC = () => {
    // State variables
    const [requests, setRequests] = useState<DS160Request[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<DS160Request[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openRejectModal, setOpenRejectModal] = useState(false);
    const [openApproveModal, setOpenApproveModal] = useState(false);
    const [openStatementModal, setOpenStatementModal] = useState(false);
    const [openPassportModal, setOpenPassportModal] = useState(false);
    const [openI20Modal, setOpenI20Modal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<DS160Request | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [statement, setStatement] = useState<Statement | null>(null);
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
                        request.stu_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        request.stu_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        request.upload_date.includes(searchQuery)
                )
            );
        } else {
            setFilteredRequests(requests);
        }
    }, [searchQuery, requests]);

    // Fetch DS160 requests from API
    const fetchRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}/ds160_requests_api.php`);
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
            "Date Requested": request.upload_date,
            "Student Email": request.stu_email,
            "Student Name": request.stu_name,
            "I-20 File": request.i20_file,
            Passport: request.passportDoc || "N/A",
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DS160 Requests");
        XLSX.writeFile(workbook, "ds160_requests.xlsx");
    };

    // Open approve confirmation modal
    const handleOpenApproveModal = (request: DS160Request) => {
        setSelectedRequest(request);
        setOpenApproveModal(true);
    };

    // Handle approve request
    const handleApproveSubmit = async () => {
        if (!selectedRequest) return;

        setIsSubmitting(true);
        try {
            const response = await axios.post(`${API_URL}/ds160_requests_api.php`, {
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
            const response = await axios.post(`${API_URL}/ds160_requests_api.php`, {
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

    // Open passport modal
    const handleOpenPassportModal = (request: DS160Request) => {
        setSelectedRequest(request);
        setOpenPassportModal(true);
    };

    // Open I-20 modal
    const handleOpenI20Modal = (request: DS160Request) => {
        setSelectedRequest(request);
        setOpenI20Modal(true);
    };

    // Fetch and open statement modal
    const handleOpenStatement = async (request: DS160Request) => {
        try {
            const response = await axios.get(
                `${API_URL}/ds160_requests_api.php?action=statement&email=${request.stu_email}`
            );
            if (response.data.success) {
                setStatement(response.data.statement);
                setOpenStatementModal(true);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching statement",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching statement",
                severity: "error",
            });
        }
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "sn", headerName: "ID", width: 70 },
        { field: "upload_date", headerName: "Date Requested", flex: 1 },
        { field: "stu_email", headerName: "Student Email", flex: 1 },
        {
            field: "stu_name",
            headerName: "Student Name",
            flex: 1,
        },
        {
            field: "passport",
            headerName: "Passport",
            flex: 1,
            renderCell: (params) => (
                <Tooltip title="View Passport">
                    <IconButton onClick={() => handleOpenPassportModal(params.row)}>
                        <VisibilityIcon color="primary" />
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
                        <VisibilityIcon color="primary" />
                    </IconButton>
                </Tooltip>
            ),
        },
        {
            field: "statement",
            headerName: "Statement",
            flex: 2,
            renderCell: (params) => (
                <Tooltip title="View Statement">
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleOpenStatement(params.row)}
                        sx={{ textTransform: "none" }}
                    >
                        View Statement
                    </Button>
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
                    View DS160 Requests
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage and review DS160 instruction requests.
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
                                                        DS160 Requests Table ({requests.length})
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
                                                            pagination: {
                                                                paginationModel: { pageSize: 10 },
                                                            },
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
                        Are you sure you want to approve this DS160 request for{" "}
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
                        Reject DS160 Request
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body1" color="text.primary" mb={2}>
                            Please provide the reason for rejecting the DS160 request for{" "}
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
                            placeholder="Enter the reason for rejection (e.g., incomplete documentation, invalid I-20, etc.)"
                            error={!rejectReason && isSubmitting} // Highlight if empty during submission
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
                    {selectedRequest && selectedRequest.passportDoc ? (
                        <iframe
                            src={`https://finkapinternational.qhtestingserver.com/login/member/dashboard/school_app_docs/${selectedRequest.passportDoc}`}
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

            {/* Statement Modal */}
            <Dialog
                open={openStatementModal}
                onClose={() => setOpenStatementModal(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                    <Typography variant="h6" fontWeight="bold">
                        Account Statement
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 4 }}>
                    {statement ? (
                        <Box sx={{ fontFamily: "'Roboto', sans-serif", color: '#333' }}>
                            {/* Header Section */}
                            <Box textAlign="center" mb={4}>
                                <img
                                    src="https://finkapinternational.qhtestingserver.com/login/includes/includes/scholars-logo.png"
                                    alt="The International Scholars Program"
                                    style={{ width: 80, height: 80, borderRadius: '50%', display: 'block', margin: '0 auto' }}
                                />
                                <Typography variant="h5" fontWeight="bold" mt={2}>
                                    The International Scholars Program
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Email: scholars@internationalscholarsprogram.com
                                    <br />
                                    Address: 100 S. Ashley Drive, Suite 600, Tampa, FL, 33602
                                </Typography>
                                <Box mt={3} p={2} bgcolor="#f9f9f9" borderRadius={1} border="1px solid #e0e0e0">
                                    <Typography variant="body1">
                                        <strong>Account Holder:</strong> {statement.fullnames.toUpperCase()}
                                    </Typography>
                                    <Typography variant="body1">
                                        <strong>Email:</strong> {statement.email}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Contributions Section */}
                            <Box mb={4}>
                                <Typography variant="h6" fontWeight="bold" mb={2} color="black" textAlign="center">
                                    Contributions to the Program
                                </Typography>
                                {statement.contributions.length > 0 ? (
                                    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '2fr 2fr 1fr 1fr',
                                                bgcolor: '#f5f5f5',
                                                p: 2,
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            <Typography variant="body2">Transaction ID</Typography>
                                            <Typography variant="body2">Purpose</Typography>
                                            <Typography variant="body2">Date</Typography>
                                            <Typography variant="body2" textAlign="right">
                                                Amount
                                            </Typography>
                                        </Box>
                                        {statement.contributions.map((contrib) => (
                                            <Box
                                                key={contrib.payment_intent_id}
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '2fr 2fr 1fr 1fr',
                                                    p: 2,
                                                    borderTop: '1px solid #e0e0e0',
                                                    '&:hover': { bgcolor: '#fafafa' },
                                                }}
                                            >
                                                <Typography variant="body2">{contrib.payment_intent_id}</Typography>
                                                <Typography variant="body2">{contrib.purpose}</Typography>
                                                <Typography variant="body2">{contrib.date_completed}</Typography>
                                                <Typography variant="body2" textAlign="right">
                                                    ${contrib.amount.toFixed(2)}
                                                </Typography>
                                            </Box>
                                        ))}
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '4fr 1fr',
                                                p: 2,
                                                bgcolor: '#f5f5f5',
                                                fontWeight: 'bold',
                                                borderTop: '1px solid #e0e0e0',
                                            }}
                                        >
                                            <Typography variant="body2" textAlign="right">
                                                Total Contribution
                                            </Typography>
                                            <Typography variant="body2" textAlign="right">
                                                ${statement.total_contribution.toFixed(2)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        No contributions recorded.
                                    </Typography>
                                )}
                            </Box>

                            {/* Expenditures Section */}
                            <Box mb={4}>
                                <Typography variant="h6" fontWeight="bold" mb={2} color="black" textAlign="center">
                                    Expenditures
                                </Typography>
                                {statement.expenditures.length > 0 ? (
                                    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '2fr 2fr 1fr 1fr',
                                                bgcolor: '#f5f5f5',
                                                p: 2,
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            <Typography variant="body2">Transaction ID</Typography>
                                            <Typography variant="body2">Purpose</Typography>
                                            <Typography variant="body2">Date</Typography>
                                            <Typography variant="body2" textAlign="right">
                                                Amount
                                            </Typography>
                                        </Box>
                                        {statement.expenditures.map((exp) => (
                                            <Box
                                                key={exp.reference_id}
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '2fr 2fr 1fr 1fr',
                                                    p: 2,
                                                    borderTop: '1px solid #e0e0e0',
                                                    '&:hover': { bgcolor: '#fafafa' },
                                                }}
                                            >
                                                <Typography variant="body2">{exp.reference_id}</Typography>
                                                <Typography variant="body2">{exp.purpose}</Typography>
                                                <Typography variant="body2">{exp.date}</Typography>
                                                <Typography variant="body2" textAlign="right">
                                                    ${exp.amount.toFixed(2)}
                                                </Typography>
                                            </Box>
                                        ))}
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '4fr 1fr',
                                                p: 2,
                                                bgcolor: '#f5f5f5',
                                                fontWeight: 'bold',
                                                borderTop: '1px solid #e0e0e0',
                                            }}
                                        >
                                            <Typography variant="body2" textAlign="right">
                                                Total Expenditure
                                            </Typography>
                                            <Typography variant="body2" textAlign="right">
                                                ${statement.total_expenditure.toFixed(2)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        No expenditures recorded.
                                    </Typography>
                                )}
                            </Box>

                            {/* Balance Section */}
                            <Box textAlign="center" p={2} bgcolor="#e8f5e9" borderRadius={1}>
                                <Typography
                                    variant="h6"
                                    fontWeight="bold"
                                    color={statement.balance >= 0 ? 'success.main' : 'error.main'}
                                >
                                    {statement.package === "Regular"
                                        ? `Loan Amount: $${Math.abs(statement.balance).toFixed(2)}`
                                        : `Amount Due: $${Math.abs(statement.balance).toFixed(2)}`}
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Typography textAlign="center" color="text.secondary">
                            Loading statement...
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #e0e0e0' }}>
                    <Button
                        sx={{ textTransform: "none" }}
                        onClick={() => setOpenStatementModal(false)}
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

export default DS160Requests;