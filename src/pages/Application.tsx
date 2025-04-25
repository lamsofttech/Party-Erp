import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Typography, TextField, Button, Snackbar, Alert, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
    Box, Chip, Container, Grid
} from "@mui/material";
import { motion } from "framer-motion";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneIcon from "@mui/icons-material/Done";
import CheckIcon from "@mui/icons-material/Check";

interface Application {
    id: number;
    email: string;
    app_id: number;
    password: string | null;
    app_status: number;
    remarks: string | null;
    assigned_to: string | null;
    date_assigned: string | null;
    member_no: string;
    full_name: string;
    kap_email: string;
    phone: string;
    package: string;
    school: string;
    program: string;
}

interface Document {
    id: number;
    doc_type: number;
    name: string;
    document_name: string | null;
    url: string | null;
    status?: number; // Add this
    remarks?: string | null;
}

interface User {
    id: string;
    name: string;
}

const SchoolApplicationDetails: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const appId = queryParams.get("id") || "";
    const sop = queryParams.get("sop") || "";
    const action = queryParams.get("action") || "";
    const propId = queryParams.get("prop_id") || "";
    const source = queryParams.get("source") || "";
    const fromPage = action === "rejected" ? "rejected_applications" : action === "download" ? "on_progress" : "school_application";

    const [application, setApplication] = useState<Application | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success",
    });
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [openDocDialog, setOpenDocDialog] = useState(false);
    const [openAssignDialog, setOpenAssignDialog] = useState(false);
    const [assignedUser, setAssignedUser] = useState("");
    const [processing, setProcessing] = useState(false);
    const [openRejectDialog, setOpenRejectDialog] = useState(false);
    const [selectedDocForRejection, setSelectedDocForRejection] = useState<Document | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const userId = "4";
    const [openEndDialog, setOpenEndDialog] = useState(false);
    const [comment, setComment] = useState("");
    const [isInto, setIsInto] = useState("");
    const [openEndIntoDialog, setOpenEndIntoDialog] = useState(false);
    const [endIntoComment, setEndIntoComment] = useState("");

    const getUserNameById = (id: string) => {
        const user = users.find(u => u.id === id);
        return user ? user.name : "Unknown";
    };

    const fetchApplication = async () => {
        try {
            const response = await axios.get("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/view_application_api.php", {
                params: { action: "get_application", app_id: appId, sop, prop_id: propId, source: source }
            });
            if (response.data.success) {
                setApplication(response.data.application);
                setDocuments(response.data.documents);
                setUsers(response.data.users);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error fetching application!", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionType: string) => {
        setProcessing(true);
        try {
            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/view_application_api.php",
                new URLSearchParams({
                    action: actionType,
                    id: appId
                }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                if (actionType === "start_application" || actionType === "done_application") {
                    setTimeout(() => navigate("/school-admission"), 1000);
                } else {
                    // For other actions, use the original navigation path
                    setTimeout(() => navigate(`/${fromPage}`), 1500);
                }
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: `Error performing ${actionType}!`, severity: "error" });
        } finally {
            setProcessing(false);
        }
    };

    const handleAssignUser = async () => {
        if (!assignedUser) {
            setSnackbar({ open: true, message: "Please select a user!", severity: "error" });
            return;
        }
        setProcessing(true);
        try {
            const response = await axios.post("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/view_application_api.php", {
                action: "assign_user",
                id: appId,
                assigned_user: assignedUser
            }, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenAssignDialog(false);
                setTimeout(() => navigate("/school-admission/new-school-applications"), 1000);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error assigning user!", severity: "error" });
        } finally {
            setProcessing(false);
        }
    };

    const handleRejectDocument = async () => {
        if (!selectedDocForRejection || !rejectionReason.trim()) {
            setSnackbar({ open: true, message: "Please provide a reason for rejection", severity: "error" });
            return;
        }

        setProcessing(true);
        try {
            const formData = new URLSearchParams({
                action: "reject_document",
                doc_id: String(selectedDocForRejection.id),
                app_id: String(application?.app_id),
                doc_name: selectedDocForRejection.name,
                reason: rejectionReason
            });

            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/view_application_api.php",
                formData,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenRejectDialog(false);
                setRejectionReason("");
                // Refresh application data after rejection
                setTimeout(() => fetchApplication(), 1000);
                setTimeout(() => navigate('/school-admission/new-school-applications/assigned-applications'), 1000);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error rejecting document!", severity: "error" });
        } finally {
            setProcessing(false);
        }
    };

    const handleEndApplication = async () => {
        if (!comment.trim()) {
            setSnackbar({ open: true, message: "Comment is required", severity: "error" });
            return;
        }
        if (application?.app_status !== 8 && !isInto) {
            setSnackbar({ open: true, message: "Please select if this is an INTO school", severity: "error" });
            return;
        }

        setProcessing(true);
        try {
            const formData = new URLSearchParams({
                action: "end_application",
                id: appId,
                comment,
                is_into: isInto || (application?.app_status === 8 ? "2" : ""),
            });

            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/view_application_api.php",
                formData,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenEndDialog(false);
                setComment("");
                setIsInto("");
                setTimeout(() => navigate("/school-admission/applications-pending-approval"), 1000);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error ending application!", severity: "error" });
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        fetchApplication();
    }, [appId, sop, propId]);

    const handleEndIntoApplication = async () => {
        if (!endIntoComment.trim()) {
            setSnackbar({ open: true, message: "Comment is required", severity: "error" });
            return;
        }

        setProcessing(true);
        try {
            const formData = new URLSearchParams({
                action: "end_into_application",
                id: appId,
                comment: endIntoComment,
            });

            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/view_application_api.php",
                formData,
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenEndIntoDialog(false);
                setEndIntoComment("");
                setTimeout(() => navigate("/school-admission/pending-into-schools"), 1200);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error completing INTO application!", severity: "error" });
        } finally {
            setProcessing(false);
        }
    };

    const getStatusChip = (status: number) => {
        if (status === 1) return <Chip label="New" color="info" size="small" />;
        if (status === 2) return <Chip label="Ready" color="success" size="small" />;
        if (status === 3) return <Chip label="In Progress" color="warning" size="small" />;
        if (status === 4) return <Chip label="Completed" color="success" size="small" />;
        if (status === 5) return <Chip label="Rejected" color="error" size="small" />;
        if (status === 8) return <Chip label="Pending INTO" color="warning" size="small" />;
        return <Chip label="Unknown" color="default" size="small" />;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                    <SchoolIcon sx={{ fontSize: 28, color: "primary.main", mr: 1 }} />
                    <Typography variant="h4" fontWeight="500" color="primary.main">
                        School Application Details
                    </Typography>
                </Box>

                {application && (
                    <>
                        <Box mb={4} bgcolor="background.paper" borderRadius={2} overflow="hidden" boxShadow={3}>
                            <Box bgcolor="primary.main" px={3} py={2}>
                                <Typography variant="h5" color="white" fontWeight="500">
                                    {application.full_name}
                                    <Box component="span" ml={2}>
                                        {getStatusChip(application.app_status)}
                                    </Box>
                                </Typography>
                                <Typography sx={{ color: "white", opacity: 0.9 }}>
                                    Application ID: {application.app_id}
                                </Typography>
                            </Box>

                            <Grid container spacing={0}>
                                <Grid item xs={12} md={6} sx={{ borderRight: { xs: 'none', md: '1px solid #e0e0e0' } }}>
                                    <Box p={3}>
                                        <Box display="flex" alignItems="center" mb={2}>
                                            <PersonIcon sx={{ color: "primary.main", mr: 1 }} />
                                            <Typography variant="h6">Applicant Details</Typography>
                                        </Box>
                                        <Box sx={{ ml: 4 }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={5}>
                                                    <Typography variant="body2" color="text.secondary">Member No</Typography>
                                                    <Typography variant="body1" fontWeight="500">{application.member_no}</Typography>
                                                </Grid>
                                                <Grid item xs={7}>
                                                    <Typography variant="body2" color="text.secondary">Full Name</Typography>
                                                    <Typography variant="body1" fontWeight="500">{application.full_name}</Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" color="text.secondary">KAP Email</Typography>
                                                    <Typography variant="body1">{application.kap_email}</Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                                                    <Typography variant="body1">{application.phone}</Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Box p={3}>
                                        <Box display="flex" alignItems="center" mb={2}>
                                            <SchoolIcon sx={{ color: "primary.main", mr: 1 }} />
                                            <Typography variant="h6">School Information</Typography>
                                        </Box>
                                        <Box sx={{ ml: 4 }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" color="text.secondary">School</Typography>
                                                    <Typography variant="body1" fontWeight="500">{application.school}</Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" color="text.secondary">Program</Typography>
                                                    <Typography variant="body1">{application.program}</Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" color="text.secondary">Package</Typography>
                                                    <Typography variant="body1">{application.package}</Typography>
                                                </Grid>
                                                {application.password && (
                                                    <Grid item xs={12}>
                                                        <Typography variant="body2" color="text.secondary">Account Password (For school portal)</Typography>
                                                        <Typography variant="body1">{application.password}</Typography>
                                                    </Grid>
                                                )}
                                                {action === "rejected" && (
                                                    <Grid item xs={12}>
                                                        <Typography variant="body2" color="error">Rejected</Typography>
                                                        <Typography variant="body1">Reason: {application.remarks || "No reason provided"}</Typography>
                                                    </Grid>
                                                )}
                                            </Grid>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                        <Box mb={4} bgcolor="background.paper" borderRadius={2} overflow="hidden" boxShadow={3}>
                            <Box bgcolor="primary.main" px={3} py={2} display="flex" alignItems="center">
                                <DescriptionIcon sx={{ color: "white", mr: 1 }} />
                                <Typography variant="h6" color="white">Application Documents</Typography>
                            </Box>

                            <TableContainer component={Paper} elevation={0}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "rgba(0, 0, 0, 0.04)" }}>
                                            <TableCell width="5%">#</TableCell>
                                            <TableCell>Document</TableCell>
                                            <TableCell width="15%" align="center">View/Download</TableCell>
                                            <TableCell width="15%" align="center">Reject</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {documents.map((doc, index) => (
                                            <TableRow key={doc.id} sx={{ '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } }}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{doc.name}</TableCell>
                                                <TableCell align="center">
                                                    {doc.url ? (
                                                        <IconButton
                                                            onClick={() => { setSelectedDoc(doc); setOpenDocDialog(true); }}
                                                            sx={{ color: "primary.main" }}
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    ) : "None"}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {doc.url && (doc.status === 3 ? (
                                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                            Rejected
                                                        </Typography>
                                                    ) : (
                                                        <Button
                                                            sx={{ textTransform: "none" }}
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedDocForRejection(doc);
                                                                setOpenRejectDialog(true);
                                                            }}
                                                        >
                                                            Reject
                                                        </Button>
                                                    ))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {documents.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                                    <Typography variant="body1" color="text.secondary">No documents available</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>

                        <Box
                            mt={4}
                            p={3}
                            bgcolor="background.paper"
                            borderRadius={2}
                            boxShadow={3}
                            display="flex"
                            flexDirection={{ xs: "column", md: "row" }}
                            alignItems="center"
                            justifyContent="space-between"
                            gap={2}
                        >
                            <Box display="flex" alignItems="center">
                                <AssignmentIndIcon sx={{ color: "primary.main", mr: 1 }} />
                                <Typography variant="h6">Application Actions</Typography>
                            </Box>

                            <Box display="flex" flexWrap="wrap" gap={2}>
                                {application.app_status === 2 && application.assigned_to === userId && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<PlayArrowIcon />}
                                        onClick={() => handleAction("start_application")}
                                        disabled={processing}
                                        sx={{ minWidth: "180px", textTransform: "none" }}
                                    >
                                        {processing ? "Processing..." : "Start Application"}
                                    </Button>
                                )}

                                {application.app_status === 3 && application.assigned_to === userId && (
                                    <>
                                        <Chip
                                            label="In Progress"
                                            color="warning"
                                            variant="outlined"
                                            sx={{ height: "40px", borderWidth: "2px" }}
                                        />
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<DoneIcon />}
                                            onClick={() => handleAction("done_application")}
                                            disabled={processing}
                                            sx={{ minWidth: "180px", textTransform: "none" }}
                                        >
                                            {processing ? "Processing..." : "Complete Application"}
                                        </Button>
                                    </>
                                )}

                                {application.app_status === 4 && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckIcon />}
                                        onClick={() => setOpenEndDialog(true)}
                                        disabled={processing}
                                        sx={{ minWidth: "180px", textTransform: "none" }}
                                    >
                                        {processing ? "Processing..." : "End Application"}
                                    </Button>
                                )}

                                {application.app_status === 8 && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckIcon />}
                                        onClick={() => setOpenEndIntoDialog(true)}
                                        disabled={processing}
                                        sx={{ minWidth: "180px", textTransform: "none" }}
                                    >
                                        {processing ? "Processing..." : "Complete Application"}
                                    </Button>
                                )}

                                {(application.app_status === 1) && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<AssignmentIndIcon />}
                                        onClick={() => setOpenAssignDialog(true)}
                                        sx={{ minWidth: "180px", textTransform: "none" }}
                                    >
                                        Assign Staff
                                    </Button>
                                )}

                                {application.app_status !== 1 && application.assigned_to && (
                                    <TextField
                                        label="Assigned Staff"
                                        value={getUserNameById(application.assigned_to)}
                                        disabled
                                        size="small"
                                        sx={{ minWidth: "220px" }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </>
                )}

                <Dialog
                    open={openDocDialog}
                    onClose={() => setOpenDocDialog(false)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ display: "flex", alignItems: "center", bgcolor: "primary.main", color: "white" }}>
                        <DescriptionIcon sx={{ mr: 1 }} />
                        {selectedDoc?.name}
                        <IconButton
                            onClick={() => setOpenDocDialog(false)}
                            sx={{
                                position: "absolute",
                                right: 8,
                                top: 8,
                                color: "white"
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: 0, height: "70vh" }}>
                        {selectedDoc?.url && (
                            <iframe
                                src={selectedDoc.url}
                                width="100%"
                                height="100%"
                                title={selectedDoc.name}
                                style={{ border: "none" }}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={openAssignDialog}
                    onClose={() => setOpenAssignDialog(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
                        <Box display="flex" alignItems="center">
                            <AssignmentIndIcon sx={{ mr: 1 }} />
                            Assign Staff
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3, pb: 1, px: 3, mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Select User</InputLabel>
                            <Select
                                value={assignedUser}
                                onChange={(e) => setAssignedUser(e.target.value as string)}
                                label="Select User"
                            >
                                {users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            sx={{ textTransform: "none" }}
                            onClick={() => setOpenAssignDialog(false)}
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button
                            sx={{ textTransform: 'none' }}
                            onClick={() => handleAssignUser()}
                            variant="contained"
                            color="primary"
                            disabled={processing}
                            startIcon={<AssignmentIndIcon />}
                        >
                            {processing ? "Assigning..." : "Assign"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={openRejectDialog}
                    onClose={() => setOpenRejectDialog(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ bgcolor: "error.main", color: "white" }}>
                        <Box display="flex" alignItems="center">
                            <CloseIcon sx={{ mr: 1 }} />
                            Reject Document
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3, pb: 1, px: 3, mt: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            {selectedDocForRejection?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Rejecting this document will reject the entire application.
                        </Typography>
                        <TextField
                            label="Reason for Rejection"
                            multiline
                            rows={4}
                            fullWidth
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please provide a reason for rejection"
                            required
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            sx={{ textTransform: "none" }}
                            onClick={() => setOpenRejectDialog(false)}
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button
                            sx={{ textTransform: 'none' }}
                            onClick={() => handleRejectDocument()}
                            variant="contained"
                            color="error"
                            disabled={processing || !rejectionReason.trim()}
                            startIcon={<CloseIcon />}
                        >
                            {processing ? "Processing..." : "Reject Document"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={openEndDialog}
                    onClose={() => setOpenEndDialog(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ bgcolor: "success.main", color: "white" }}>
                        <Box display="flex" alignItems="center">
                            <CheckIcon sx={{ mr: 1 }} />
                            End Application
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3, pb: 1, px: 3, mt: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Add an application comment
                        </Typography>
                        <TextField
                            label="Application Comment"
                            multiline
                            rows={4}
                            fullWidth
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Enter application comment"
                            required
                            sx={{ mb: 2 }}
                        />
                        {application?.app_status !== 8 && (
                            <FormControl fullWidth>
                                <InputLabel>Was the program applied under INTO platform?</InputLabel>
                                <Select
                                    value={isInto}
                                    onChange={(e) => setIsInto(e.target.value)}
                                    label="Was the program applied under INTO platform?"
                                    required
                                >
                                    <MenuItem value="">Select</MenuItem>
                                    <MenuItem value="1">Yes</MenuItem>
                                    <MenuItem value="2">No</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            sx={{ textTransform: "none" }}
                            onClick={() => setOpenEndDialog(false)}
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button
                            sx={{ textTransform: "none" }}
                            onClick={handleEndApplication}
                            variant="contained"
                            color="success"
                            disabled={processing || !comment.trim() || (application?.app_status !== 8 && !isInto)}
                            startIcon={<CheckIcon />}
                        >
                            {processing ? "Processing..." : "End Application"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={openEndIntoDialog}
                    onClose={() => setOpenEndIntoDialog(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 2 } }}
                >
                    <DialogTitle sx={{ bgcolor: "success.main", color: "white" }}>
                        <Box display="flex" alignItems="center">
                            <CheckIcon sx={{ mr: 1 }} />
                            Complete INTO Application
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3, pb: 1, px: 3, mt: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Add an application comment
                        </Typography>
                        <TextField
                            label="Application Comment"
                            multiline
                            rows={4}
                            fullWidth
                            value={endIntoComment}
                            onChange={(e) => setEndIntoComment(e.target.value)}
                            placeholder="Enter application comment"
                            required
                            sx={{ mb: 2 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            sx={{ textTransform: "none" }}
                            onClick={() => setOpenEndIntoDialog(false)}
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button
                            sx={{ textTransform: "none" }}
                            onClick={handleEndIntoApplication}
                            variant="contained"
                            color="success"
                            disabled={processing || !endIntoComment.trim()}
                            startIcon={<CheckIcon />}
                        >
                            {processing ? "Processing..." : "Complete Application"}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={3000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                >
                    <Alert
                        severity={snackbar.severity}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </motion.div>
    );
};

export default SchoolApplicationDetails;