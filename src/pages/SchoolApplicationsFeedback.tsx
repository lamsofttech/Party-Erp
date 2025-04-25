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
    Chip,
    Zoom,
    Divider
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";

// Define the Application interface
interface Application {
    id: number;
    app_id: number;
    email: string;
    full_name: string;
    kap_email: string;
    university: string;
    program: string;
    sop: string;
    outcome: string;
    letter: string;
    status: number;
    action: string;
    prop_id: string;
}

const SchoolApplicationsFeedback: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [openRejectDialog, setOpenRejectDialog] = useState<boolean>(false);
    const [openApproveDialog, setOpenApproveDialog] = useState<boolean>(false); // New state for approve modal
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [openDocumentModal, setOpenDocumentModal] = useState<boolean>(false);
    const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>("");
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });
    // Open document preview modal
    const handleOpenDocumentModal = (letter: string): void => {
        const fullUrl = `${BASE_DOCUMENT_URL}${letter}`;
        setSelectedDocumentUrl(fullUrl);
        setOpenDocumentModal(true);
    };

    // API endpoints
    const FETCH_API_URL: string = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/school_app_feedback_api.php";
    const BASE_DOCUMENT_URL: string = "https://finkapinternational.qhtestingserver.com";

    // Fetch applications on mount
    useEffect(() => {
        fetchApplications();
    }, []);

    // Filter applications based on search query
    useEffect(() => {
        if (searchQuery) {
            setFilteredApplications(
                applications.filter(
                    (app) =>
                        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.kap_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.outcome.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    // Fetch feedback applications
    const fetchApplications = async (): Promise<void> => {
        try {
            const response = await axios.get(`${FETCH_API_URL}?action=get_feedback`);
            console.log("API Response:", response)
            if (response.data.success) {
                setApplications(response.data.applications);
                setFilteredApplications(response.data.applications);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching feedback",
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

    // Handle search input
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(event.target.value);
    };

    // Open reject confirmation dialog
    const handleReject = (app: Application): void => {
        setSelectedApplication(app);
        setOpenRejectDialog(true);
    };

    // Open approve confirmation dialog
    const handleOpenApproveDialog = (app: Application): void => {
        setSelectedApplication(app);
        setOpenApproveDialog(true);
    };

    // Approve feedback
    const confirmApprove = async (): Promise<void> => {
        if (selectedApplication) {
            setIsProcessing(true);
            try {
                const formData = new URLSearchParams({
                    action: "approve_feedback",
                    id: selectedApplication.id.toString(),
                });

                const response = await axios.post(FETCH_API_URL, formData, {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                });

                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: response.data.message,
                        severity: "success",
                    });
                    fetchApplications();
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Error approving feedback",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error approving feedback",
                    severity: "error",
                });
            } finally {
                setIsProcessing(false);
                setOpenApproveDialog(false);
                setSelectedApplication(null);
            }
        }
    };

    // Confirm rejection
    const confirmReject = async (): Promise<void> => {
        if (selectedApplication && rejectionReason.trim()) {
            setIsProcessing(true);
            try {
                const formData = new URLSearchParams({
                    action: "reject_feedback",
                    id: selectedApplication.id.toString(),
                    remark: rejectionReason,
                });

                const response = await axios.post(FETCH_API_URL, formData, {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                });

                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: response.data.message,
                        severity: "success",
                    });
                    fetchApplications();
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Error rejecting feedback",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error rejecting feedback",
                    severity: "error",
                });
            } finally {
                setIsProcessing(false);
                setOpenRejectDialog(false);
                setSelectedApplication(null);
                setRejectionReason("");
            }
        } else {
            setSnackbar({
                open: true,
                message: "Rejection reason is required",
                severity: "error",
            });
        }
    };

    // Define DataGrid columns
    const columns: GridColDef[] = [
        { field: "full_name", headerName: "Full Name", flex: 1 },
        {
            field: "kap_email",
            headerName: "KAP Email",
            flex: 1,
            renderCell: (params) => (params.value !== "N/A" ? params.value : "N/A"),
        },
        {
            field: "university",
            headerName: "University",
            flex: 1,
            renderCell: (params) => (params.value !== "N/A" ? params.value : "N/A"),
        },
        {
            field: "program",
            headerName: "Program",
            flex: 1,
            renderCell: (params) => (params.value !== "N/A" ? params.value : "N/A"),
        },
        {
            field: "outcome",
            headerName: "Application Outcome",
            flex: 1,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === "Rejected" ? "error" : "success"}
                    size="small"
                />
            ),
        },
        {
            field: "letter",
            headerName: "Feedback Letter",
            flex: 1,
            renderCell: (params) =>
                params.value !== "N/A" ? (
                    <IconButton
                        onClick={() => handleOpenDocumentModal(params.value)}
                        title="View Letter"
                    >
                        <VisibilityIcon color="primary" />
                    </IconButton>
                ) : (
                    "N/A"
                ),
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box display="flex" gap={1} sx={{ justifyContent: "center", alignItems: "center", marginTop: "5%" }}>
                    <IconButton
                        component={Link}
                        to={`/school-admission/school-applications-feedback/${encodeURIComponent(params.row.full_name)}?id=${params.row.app_id}&sop=${encodeURIComponent(params.row.sop)}&action=feedback&prop_id=${params.row.prop_id}&source=feedback`}
                        title="View Application"
                    >
                        <VisibilityIcon color="primary" />
                    </IconButton>
                    <IconButton
                        title="Approve Feedback"
                        onClick={() => handleOpenApproveDialog(params.row)}
                        disabled={isProcessing}
                    >
                        <CheckIcon color="success" />
                    </IconButton>
                    <IconButton
                        title="Reject Feedback"
                        onClick={() => handleReject(params.row)}
                        disabled={isProcessing}
                    >
                        <CancelIcon color="error" />
                    </IconButton>
                </Box>
            ),
        },
    ];

    return (
        <div className="px-3">
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
                                                        School Application Feedback
                                                    </p>
                                                </div>
                                                <div className="flex justify-content-end mb-4 gap-4">
                                                    <Button
                                                        component={Link}
                                                        sx={{ textTransform: "none" }}
                                                        to="/school-admission/school-applications-feedback/approved-application-feedbacks?action=get_feedbacks_approved"
                                                        variant="outlined"
                                                        color="success"
                                                        className="m-1"
                                                    >
                                                        Approved Feedbacks
                                                    </Button>
                                                    <Button
                                                        component={Link}
                                                        sx={{ textTransform: "none" }}
                                                        to="/school-admission/school-applications-feedback/rejected-application-feedbacks?action=get_feedbacks_rejected"
                                                        variant="outlined"
                                                        color="error"
                                                        className="m-1"
                                                    >
                                                        Rejected Feedbacks
                                                    </Button>
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
                                                </div>

                                                <div style={{ height: 400, width: "100%" }}>
                                                    <DataGrid
                                                        rows={filteredApplications}
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

            {/* Approve Confirmation Dialog */}
            <Dialog
                open={openApproveDialog}
                onClose={() => setOpenApproveDialog(false)}
                maxWidth="sm"
                fullWidth
                TransitionComponent={Zoom} // Import Zoom from '@mui/material'
                transitionDuration={300}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                    }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: "success.main",
                    color: "white",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: 18,
                    fontWeight: 500
                }}>
                    <CheckIcon fontSize="small" />
                    Approve Feedback
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 3, px: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 400, lineHeight: 1.5, paddingTop: "20px" }}>
                        Are you sure you want to approve this feedback?
                    </Typography>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 2, py: 1.5 }}>
                    <Button
                        variant="outlined"
                        sx={{
                            textTransform: "none",
                            borderRadius: 1.5,
                            px: 2,
                            fontWeight: 500
                        }}
                        onClick={() => setOpenApproveDialog(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmApprove}
                        variant="contained"
                        sx={{
                            textTransform: "none",
                            borderRadius: 1.5,
                            px: 2,
                            fontWeight: 500
                        }}
                        color="success"
                        disabled={isProcessing}
                    >
                        {isProcessing ? "Approving..." : "Approve"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Confirmation Dialog */}
            <Dialog
                open={openRejectDialog}
                onClose={() => setOpenRejectDialog(false)}
                maxWidth="sm"
                fullWidth
                TransitionComponent={Zoom}
                transitionDuration={300}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                    }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: "error.main",
                    color: "white",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: 18,
                    fontWeight: 500
                }}>
                    <CancelIcon fontSize="small" />
                    Reject Feedback
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 3, px: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 400, lineHeight: 1.5, paddingTop: "20px" }}>
                        Are you sure you want to reject this feedback? Please provide a reason.
                    </Typography>
                    <TextField
                        label="Rejection Reason"
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={4}
                        value={rejectionReason}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setRejectionReason(e.target.value)
                        }
                        required
                        sx={{
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                '&.Mui-focused fieldset': {
                                    borderColor: 'error.main',
                                },
                            }
                        }}
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 2, py: 1.5 }}>
                    <Button
                        variant="outlined"
                        sx={{
                            textTransform: "none",
                            borderRadius: 1.5,
                            px: 2,
                            fontWeight: 500
                        }}
                        onClick={() => setOpenRejectDialog(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmReject}
                        variant="contained"
                        sx={{
                            textTransform: "none",
                            borderRadius: 1.5,
                            px: 2,
                            fontWeight: 500
                        }}
                        color="error"
                        disabled={!rejectionReason.trim() || isProcessing}
                    >
                        {isProcessing ? "Rejecting..." : "Reject"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Document Preview Modal */}
            <Dialog
                open={openDocumentModal}
                onClose={() => setOpenDocumentModal(false)}
                maxWidth="md"
                fullWidth
                TransitionComponent={Zoom}
                transitionDuration={300}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: 18,
                    fontWeight: 500
                }}>
                    <VisibilityIcon fontSize="small" />
                    Feedback Letter
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <iframe
                        src={selectedDocumentUrl}
                        width="100%"
                        height="600px"
                        title="Document Preview"
                        style={{ border: 'none' }}
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 2, py: 1.5 }}>
                    <Button
                        variant="contained"
                        sx={{
                            textTransform: "none",
                            borderRadius: 1.5,
                            px: 3,
                            fontWeight: 500
                        }}
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

export default SchoolApplicationsFeedback;