import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import InfoIcon from '@mui/icons-material/Info';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Typography, TextField, Button, Snackbar, Alert, CircularProgress, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, FormControl, FormLabel, RadioGroup, FormControlLabel, DialogActions } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import Radio from '@mui/material/Radio';
import CommentIcon from '@mui/icons-material/Comment';
import Tooltip from '@mui/material/Tooltip';

interface Application {
    id: number;
    fullnames: string;
    email: string;
    datetime: string;
    id_no: number;
    phone: string;
    ac_level: string;
    package: string;
    country: string;
    gpa: string | null;
    gpa_doc: string | null;
    status: string;
    remark: string;
    high_school: string;
    kcse_grade: string;
    kcse_point: number;
    degree: string;
    u_grade: string;
    kcse_cert: string;
    u_cert: string;
    transcript: string;
    credit_report_status: string;
    transcript_comment: string | null;
}

interface Email {
    id: number;
    subject: string;
    datee: string;
    body?: string;
}

const ApplicationDetails: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get("id");
    const [application, setApplication] = useState<Application | null>(null);
    const [gpa, setGpa] = useState<string>("");
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success",
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [updating, setUpdating] = useState<boolean>(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [open, setOpen] = useState(false);
    const [open2, setOpen2] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<{ name: string; url: string } | null>(null);

    const fromPage = (location.state as { from?: string } | null)?.from || 'new-applications';

    // Open modal with selected document
    const handleOpen = (doc: { name: string; url: string }) => {
        setSelectedDoc(doc);
        setOpen(true);
    };

    // Close modal
    const handleClose = () => {
        setOpen(false);
        setSelectedDoc(null);
    };

    const handleOpen2 = () => {
        setOpen2(true);
    };

    // Close modal
    const handleClose2 = () => {
        setOpen2(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const uploadGPAReport = async () => {
        if (!selectedFile) {
            setSnackbar({ open: true, message: "Please select a file to upload.", severity: "error" });
            return;
        }

        const formData = new FormData();
        formData.append("gpa_doc", selectedFile);
        formData.append("code", String(application?.id)); // Pass application ID

        try {
            setUploading(true);
            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );
            fetchApplication();
            setSnackbar({ open: true, message: response.data.message, severity: response.data.status === "success" ? "success" : "error" });
        } catch (error) {
            setSnackbar({ open: true, message: "Error uploading GPA report!", severity: "error" });
        } finally {
            setUploading(false);
            setSelectedFile(null); // Reset file input after upload
        }
    };


    const fetchApplication = async () => {
        try {
            const response = await axios.get(`https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php?id=${id}`);
            setApplication(response.data.application);
            // console.log(response.data.application);
            // console.log(response.data.application.status);
            setGpa(response.data.application.gpa || "");
            setLoading(false);
        } catch (error) {
            setSnackbar({ open: true, message: "Error fetching application!", severity: "error" });
            setLoading(false);
        }
    };



    const updateGPA = async () => {
        try {
            setUpdating(true);
            await axios.put("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php", { id, gpa });
            setSnackbar({ open: true, message: "GPA updated successfully!", severity: "success" });
        } catch (error) {
            setSnackbar({ open: true, message: "Error updating GPA!", severity: "error" });
        } finally {
            setUpdating(false);
        }
    };

    const base_url = "https://internationalscholars.qhtestingserver.com/apply/uploadfolder/";
    const gpa_url = "https://finkapinternational.qhtestingserver.com/login/main/gpa_reports/";

    const documents = [
        { name: "High School Certificate", url: `${base_url}${application?.kcse_cert}` },
        { name: "Undergraduate Certificate", url: `${base_url}${application?.u_cert}` },
        { name: "Undergraduate Transcripts", url: `${base_url}${application?.transcript}` },
        ...(application?.gpa_doc ? [{ name: "GPA Report", url: `${gpa_url}${application.gpa_doc}` }] : [])
    ];

    const [formData, setFormData] = useState({
        kcse_cert: "2",
        u_cert: "2",
        u_transcript: "2",
        post_cert: "2",
        post_transcript: "2",
        national_id: "2",
        m_info: "",
    });

    const [submitting, setSubmitting] = useState(false);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const navigate = useNavigate();

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const requestData = {
                code: application?.id,
                ...formData,
            };

            console.log("Sending request data:", requestData);

            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/save_request.php",
                requestData
            );

            console.log("Response from server:", response.data);

            if (response.data.status === "success") {
                setSnackbar({ open: true, message: "Request sent successfully!", severity: "success" });

                setTimeout(() => {
                    navigate(`/onboarding/${fromPage}`);
                }, 1500); // Add delay to allow snackbar message to be seen
            } else {
                setSnackbar({ open: true, message: "Error: " + response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error sending request!", severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    const [openRejectModal, setOpenRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const handleOpenRejectModal = () => {
        setOpenRejectModal(true);
    };

    const handleCloseRejectModal = () => {
        setOpenRejectModal(false);
        setRejectReason(""); // Clear the input after closing
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) {
            setSnackbar({ open: true, message: "Please provide a reason for rejection.", severity: "error" });
            return;
        }

        if (!application?.id) {
            setSnackbar({ open: true, message: "Application ID is missing!", severity: "error" });
            return;
        }

        try {
            setSubmitting(true);
            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/reject_application.php",
                {
                    app_id: application.id,
                    comment: rejectReason,
                },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            console.log("Response from API:", response.data);

            if (response.data.status === "success") {
                setSnackbar({ open: true, message: "Application rejected successfully!", severity: "success" });
                setTimeout(() => {
                    navigate(`/onboarding/${fromPage}`);
                }, 1500);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error rejecting application!", severity: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    const [openApproveDialog, setOpenApproveDialog] = useState(false);
    const [openRejectDialog, setOpenRejectDialog] = useState(false);
    const [rejectReason2, setRejectReason2] = useState("");
    const [loading2, setLoading2] = useState(false);

    // ✅ Open & Close Handlers
    const handleOpenApprove = () => setOpenApproveDialog(true);
    const handleCloseApprove = () => setOpenApproveDialog(false);
    const handleOpenReject = () => setOpenRejectDialog(true);
    const handleCloseReject = () => setOpenRejectDialog(false);

    // ✅ Approve GPA Function
    const handleApproveGPA = async () => {
        try {
            setLoading2(true);
            const response = await axios.post("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php", {
                id: application?.id,
                action: "approve_gpa",
            });

            setSnackbar({ open: true, message: response.data.message, severity: response.data.status === "success" ? "success" : "error" });
            fetchApplication(); // Refresh application details
        } catch (error) {
            setSnackbar({ open: true, message: "Error approving GPA!", severity: "error" });
        } finally {
            setLoading2(false);
            handleCloseApprove();
        }
    };

    // ✅ Reject GPA Function
    const handleRejectGPA = async () => {
        if (!rejectReason2.trim()) {
            setSnackbar({ open: true, message: "Please provide a reason for rejection.", severity: "error" });
            return;
        }

        try {
            setLoading2(true);
            const response = await axios.post("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php", {
                id: application?.id,
                action: "reject_gpa",
                reason: rejectReason2,
            });

            setSnackbar({ open: true, message: response.data.message, severity: response.data.status === "success" ? "success" : "error" });
            fetchApplication(); // Refresh application details
        } catch (error) {
            setSnackbar({ open: true, message: "Error rejecting GPA!", severity: "error" });
        } finally {
            setLoading2(false);
            handleCloseReject();
        }
    };

    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [openEmailDialog, setOpenEmailDialog] = useState(false);
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [openCommentModal, setOpenCommentModal] = useState(false);
    const [comment, setComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const handleViewEmail = async (emailId: number) => {
        setLoadingEmail(true);
        setOpenEmailDialog(true);
        try {
            const response = await axios.get(`https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php?email_id=${emailId}`);
            console.log(response.data);
            if (response.data.status === "success") {
                setSelectedEmail(response.data.email);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
                setOpenEmailDialog(false);
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error fetching email content!", severity: "error" });
            setOpenEmailDialog(false);
        } finally {
            setLoadingEmail(false);
        }
    };

    const fetchEmails = async () => {
        if (application?.email) {
            try {
                const response = await axios.get(`https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php?email=${application.email}`);
                if (response.data.status === "success") {
                    setEmails(response.data.emails);
                }
            } catch (error) {
                setSnackbar({ open: true, message: "Error fetching email history!", severity: "error" });
            }
        }
    };

    const dialogVariants = {
        hidden: { opacity: 0, y: -50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, y: 50, transition: { duration: 0.2, ease: "easeIn" } },
    };

    const [openApproveDocsDialog, setOpenApproveDocsDialog] = useState(false);
    const [approvingDocs, setApprovingDocs] = useState(false);

    const handleApproveRequestedDocs = async () => {
        try {
            setApprovingDocs(true);
            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php",
                {
                    id: application?.id,
                    action: "approve_requested_docs",
                },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            setSnackbar({
                open: true,
                message: response.data.message,
                severity: response.data.status === "success" ? "success" : "error",
            });

            if (response.data.status === "success") {
                fetchApplication(); // Refresh application data
                setTimeout(() => navigate(`/onboarding/${fromPage}`), 1500); // Optional redirect
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error approving requested documents!",
                severity: "error",
            });
        } finally {
            setApprovingDocs(false);
            setOpenApproveDocsDialog(false); // Close dialog after action
        }
    };

    // Open and close handlers for the dialog
    // const handleOpenApproveDocs = () => setOpenApproveDocsDialog(true);
    const handleCloseApproveDocs = () => setOpenApproveDocsDialog(false);

    const [openFinalApproveDialog, setOpenFinalApproveDialog] = useState(false);
    const [approvingFinal, setApprovingFinal] = useState(false);

    const handleFinalApproval = async () => {
        try {
            setApprovingFinal(true);
            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/approve.php",
                { id: application?.id }, // Sending as JSON, adjust if approve.php expects query params
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            setSnackbar({
                open: true,
                message: response.data.message,
                severity: response.data.status === "success" ? "success" : "error",
            });

            if (response.data.status === "success") {
                fetchApplication(); // Refresh application data
                setTimeout(() => navigate(`/onboarding/${fromPage}`), 1200); // Redirect to match old PHP
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error approving application!",
                severity: "error",
            });
        } finally {
            setApprovingFinal(false);
            setOpenFinalApproveDialog(false); // Close dialog
        }
    };
    // ✅ Open & Close Handlers
    const handleOpenFinalApprove = () => setOpenFinalApproveDialog(true);
    const handleCloseFinalApprove = () => setOpenFinalApproveDialog(false);

    const [openReferDialog, setOpenReferDialog] = useState(false);
    const [referring, setReferring] = useState(false);

    const handleReferApproval = async () => {
        try {
            setReferring(true);
            const response = await axios.get(
                `https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/refer.php?id=${application?.id}`
            );

            setSnackbar({
                open: true,
                message: response.data.message,
                severity: response.data.status === "success" ? "success" : "error",
            });

            if (response.data.status === "success") {
                fetchApplication(); // Refresh application data
                setTimeout(() => navigate(`/onboarding/${fromPage}`), 1200); // Redirect to match old PHP
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error referring application to another option!",
                severity: "error",
            });
        } finally {
            setReferring(false);
            setOpenReferDialog(false); // Close dialog
        }
    };

    const handleOpenRefer = () => setOpenReferDialog(true);
    const handleCloseRefer = () => setOpenReferDialog(false);

    const getAlternateProgram = () => {
        if (!application?.package) return "another option"; // Fallback if package is undefined
        return application.package.toLowerCase() === "regular" ? "Prime" : "Regular";
    };

    const isPendingApplicant = (app: Application) => {
        const status = app?.status;
        const remark = app?.remark;
        const creditReportStatus = app?.credit_report_status;

        return (
            status !== "5" && // status != 5
            (
                (status === "1" && remark === 'pending') || // status = 1 AND remark = 'pending'
                (status === "3" &&
                    (creditReportStatus === 'Requested cosigner' || creditReportStatus === 'pending ID card')) || // status = 3 AND (credit_report_status conditions)
                status === "7" // status = 7
            )
        );
    };

    const handleSubmitComment = async () => {
        if (!comment.trim()) {
            setSnackbar({ open: true, message: "Please enter a comment", severity: "error" });
            return;
        }

        try {
            setSubmittingComment(true);
            const response = await axios.post(
                "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/view_application.php",
                {
                    action: "comment_transcript",
                    id: application?.id,
                    comment: comment
                }
            );

            setSnackbar({
                open: true,
                message: response.data.message,
                severity: response.data.status === "success" ? "success" : "error"
            });

            if (response.data.status === "success") {
                fetchApplication(); // Refresh application data
                setOpenCommentModal(false);
                setComment(""); // Clear the comment
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error submitting comment!",
                severity: "error"
            });
        } finally {
            setSubmittingComment(false);
        }
    };

    useEffect(() => {
        fetchApplication();
        fetchEmails();
    }, [id, application?.email]);

    if (loading) return <CircularProgress />;

    return (
        <main className="min-h-[80vh] py-6">
            <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: -10 }} transition={{ duration: 0.5 }}>
                <Typography variant="h4">Application ID: {application?.id}</Typography>
                <Typography variant="h6">Application Date: {application?.datetime}</Typography>
            </motion.div>

            <div className="grid grid-cols-2 gap-10 mt-4">
                <Card sx={{ mt: 2 }}>
                    <CardContent>
                        <Typography variant="h5">Personal Details</Typography>
                        <Typography>&nbsp;</Typography>
                        <div className="flex flex-col gap-4">
                            <Typography>Name: {application?.fullnames}</Typography>
                            <Typography>ID Number: {application?.id_no}</Typography>
                            <Typography>Email: {application?.email}</Typography>
                            <Typography>Phone Number: {application?.phone}</Typography>
                            <Typography>Country: {application?.country}</Typography>
                            <Typography>Academic Level: {application?.ac_level}</Typography>
                            <Typography>Program: {application?.package}</Typography>
                        </div>
                    </CardContent>
                </Card>
                <Card sx={{ mt: 2 }}>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <Typography variant="h5">Education Details</Typography>
                            <a href="https://www.scholaro.com/gpa-calculator/" target="_blank" className="text-white hover:underline px-4 py-2 bg-blue-500 rounded-lg text-[15px]">Calculate GPA</a>
                        </div>
                        <Typography>&nbsp;</Typography>
                        <div className="flex flex-col gap-4">
                            <Typography>High School: {application?.high_school}</Typography>
                            <Typography>KCSE Grade: {application?.kcse_grade}</Typography>
                            <Typography>KCSE Point: {application?.kcse_point}</Typography>
                            <Typography>Undergradute Degree: {application?.degree}</Typography>
                            <Typography>Undergradute Qualifications/Honors: {application?.u_grade}</Typography>
                        </div>
                        <div className="grid grid-cols-2 items-center gap-10 mt-4">
                            <TextField className="bg-white dark:bg-transparent" label="GPA Points" value={gpa} onChange={(e) => setGpa(e.target.value)} fullWidth />
                            <Button onClick={updateGPA} variant="contained" disabled={updating}>
                                {updating ? "Updating..." : "Update GPA"}
                            </Button>
                        </div>
                        {(application?.gpa_doc === null || application?.status === "12") && (
                            <div className="grid grid-cols-2 items-center gap-10 mt-4">
                                <input type="file" accept=".pdf" onChange={handleFileChange} className="border border-gray-300 rounded-md px-4 py-2 bg-white" />
                                <Button onClick={uploadGPAReport} variant="contained" disabled={uploading}>
                                    {uploading ? "Uploading..." : "Upload GPA Report"}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="shadow-[9px_9px_54px_9px_rgba(0,0,0,0.08)] p-10 rounded-lg dark:bg-gray-700">
                    <p className="text-[24px] text-[#2164a6] dark:text-blue-300 mb-2">Documents</p>
                    <div>
                        {/* Document List */}
                        {documents.map((doc, index) => (
                            <div key={index} className="flex items-center gap-2 mb-2">
                                <p>{doc.name}</p>
                                <IconButton onClick={() => handleOpen(doc)}>
                                    <VisibilityIcon color="primary" />
                                </IconButton>
                                {doc.name === "Undergraduate Transcripts" && (
                                    <Tooltip title="Comment on transcript">
                                        <IconButton
                                            onClick={() => setOpenCommentModal(true)}
                                            color="warning"
                                        >
                                            <CommentIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </div>
                        ))}
                        <Dialog open={openCommentModal} onClose={() => setOpenCommentModal(false)} fullWidth maxWidth="sm">
                            <DialogTitle>Comment on Transcript</DialogTitle>
                            <DialogContent>
                                <Typography variant="subtitle1">Applicant: {application?.fullnames}</Typography>
                                <form>
                                    <TextField
                                        name="transcript_comment"
                                        label="Comment"
                                        multiline
                                        rows={4}
                                        fullWidth
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        margin="normal"
                                        variant="outlined"
                                    />

                                    {application?.transcript_comment && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                            <Typography variant="subtitle2" color="textSecondary">Previous Comment:</Typography>
                                            <Typography variant="body1">{application.transcript_comment}</Typography>
                                        </div>
                                    )}
                                    {!application?.transcript_comment && (
                                        <Typography variant="body2" color="textSecondary" className="mt-2">
                                            No previous comments on this transcript
                                        </Typography>
                                    )}
                                </form>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setOpenCommentModal(false)} color="secondary">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitComment}
                                    variant="contained"
                                    color="primary"
                                    disabled={submittingComment}
                                >
                                    {submittingComment ? "Submitting..." : "Submit Comment"}
                                </Button>
                            </DialogActions>
                        </Dialog>

                        {/* Dialog with Close Button */}
                        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                            <DialogTitle className="flex justify-between items-center">
                                <span>{selectedDoc?.name}</span>
                                <IconButton onClick={handleClose} className="hover:bg-red-100">
                                    <CloseIcon className="text-red-500" />
                                </IconButton>
                            </DialogTitle>
                            <DialogContent>
                                {selectedDoc && (
                                    <iframe
                                        src={selectedDoc.url}
                                        width="100%"
                                        height="500px"
                                        title={selectedDoc.name}
                                    />
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                    {(application?.status === "10") && (
                        <div className="flex items-center gap-4">
                            <Button className="w-96" variant="outlined" color="success" onClick={handleOpenApprove}>
                                <CheckCircleIcon />&nbsp;&nbsp;Approve GPA
                            </Button>
                            <Button className="w-96" variant="outlined" color="error" onClick={handleOpenReject}>
                                <CancelIcon />&nbsp;&nbsp;Reject GPA
                            </Button>
                        </div>
                    )}

                    {/* ✅ Approve Confirmation Dialog */}
                    <Dialog open={openApproveDialog} onClose={handleCloseApprove} fullWidth maxWidth="sm">
                        <DialogTitle>Approve GPA</DialogTitle>
                        <DialogContent>
                            <p>Are you sure you want to approve the GPA for <b>{application?.fullnames}</b>?</p>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseApprove} color="secondary">Cancel</Button>
                            <Button onClick={handleApproveGPA} variant="contained" color="success" disabled={loading2}>
                                {loading2 ? "Processing..." : "Confirm"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* ✅ Reject GPA Dialog */}
                    <Dialog open={openRejectDialog} onClose={handleCloseReject} fullWidth maxWidth="sm">
                        <DialogTitle>Reject GPA</DialogTitle>
                        <DialogContent>
                            <p>Please provide a reason for rejecting the GPA:</p>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                value={rejectReason2}
                                onChange={(e) => setRejectReason2(e.target.value)}
                                placeholder="Enter rejection reason..."
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseReject} color="secondary">Cancel</Button>
                            <Button onClick={handleRejectGPA} variant="contained" color="error" disabled={loading2}>
                                {loading2 ? "Processing..." : "Reject"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </div>
                <div className="flex flex-col items-center justify-center gap-6">
                    <Button onClick={handleOpen2} className="w-96" variant="contained">
                        <InfoIcon />&nbsp;&nbsp;Request Extra Info
                    </Button>
                    <Dialog open={open2} onClose={handleClose2} fullWidth maxWidth="sm">
                        <DialogTitle>Request More Documents</DialogTitle>
                        <DialogContent>
                            <Typography variant="subtitle1">Applicant: {application?.fullnames}</Typography>
                            <form>
                                {[
                                    { name: "kcse_cert", label: "High School Certificate" },
                                    { name: "u_cert", label: "Undergraduate Certificate" },
                                    { name: "u_transcript", label: "Undergraduate Transcript" },
                                    { name: "post_cert", label: "Postgraduate Certificate" },
                                    { name: "post_transcript", label: "Postgraduate Transcript" },
                                    { name: "national_id", label: "National ID" },
                                ].map((item) => (
                                    <FormControl key={item.name} component="fieldset" fullWidth margin="normal">
                                        <FormLabel>{item.label}</FormLabel>
                                        <RadioGroup row name={item.name} value={formData[item.name as keyof typeof formData]} onChange={handleChange}>
                                            <FormControlLabel value="1" control={<Radio />} label="Yes" />
                                            <FormControlLabel value="2" control={<Radio />} label="No" />
                                        </RadioGroup>
                                    </FormControl>
                                ))}

                                <TextField
                                    name="m_info"
                                    label="Additional Comments"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    value={formData.m_info}
                                    onChange={handleChange}
                                    margin="normal"
                                />
                            </form>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose2} color="secondary">
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} variant="contained" color="primary" disabled={submitting}>
                                {submitting ? "Sending..." : "Send Request"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {(application?.gpa_doc != null && application?.status === "11") && (
                        <Button className="w-96" variant="contained" color="success" onClick={handleOpenFinalApprove}>
                            <CheckCircleIcon />&nbsp;&nbsp;Approve
                        </Button>
                    )}
                    <Dialog
                        open={openFinalApproveDialog}
                        onClose={handleCloseFinalApprove}
                        fullWidth
                        maxWidth="sm"
                    >
                        <DialogTitle>Approve Application</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Are you sure you want to approve the application for{" "}
                                <b>{application?.fullnames}</b>?
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseFinalApprove} color="secondary">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleFinalApproval}
                                variant="contained"
                                color="success"
                                disabled={approvingFinal}
                            >
                                {approvingFinal ? "Processing..." : "Confirm"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {(application?.gpa_doc != null && application?.status === "11") && (
                        <Button className="w-96" variant="contained" color="success" onClick={handleOpenRefer}>
                            <CheckCircleIcon />&nbsp;&nbsp;Approve For Other Option
                        </Button>
                    )}
                    <Dialog
                        open={openReferDialog}
                        onClose={handleCloseRefer}
                        fullWidth
                        maxWidth="sm"
                    >
                        <DialogTitle>Refer to Another Program</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Are you sure you want to refer{" "}
                                <b>{application?.fullnames}</b> to the{" "}
                                <b>{getAlternateProgram()}</b> program option?
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseRefer} color="secondary">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReferApproval}
                                variant="contained"
                                color="success"
                                disabled={referring}
                            >
                                {referring ? "Processing..." : "Confirm"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Button className="w-96" variant="contained" color="error" onClick={handleOpenRejectModal}>
                        <CancelIcon />&nbsp;&nbsp;Reject
                    </Button>
                    {/* Reject Applicant Dialog */}
                    <Dialog open={openRejectModal} onClose={handleCloseRejectModal} fullWidth maxWidth="sm">
                        <DialogTitle>Reject Applicant</DialogTitle>
                        <DialogContent>
                            <Typography variant="subtitle1">Please provide a reason for rejecting the application:</Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                variant="outlined"
                                placeholder="Enter reason for rejection..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                margin="normal"
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseRejectModal} color="secondary">
                                Cancel
                            </Button>
                            <Button onClick={handleRejectSubmit} variant="contained" color="error" disabled={submitting}>
                                {submitting ? "Rejecting..." : "Submit Rejection"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* {(application?.status === "1" && application?.remark === "needs review") && (
                        <Button className="w-96" variant="contained" color="success" onClick={handleOpenApproveDocs}>
                            <CheckCircleIcon />&nbsp;&nbsp;Approve Requested Documents
                        </Button>
                    )} */}
                    <Dialog
                        open={openApproveDocsDialog}
                        onClose={handleCloseApproveDocs}
                        fullWidth
                        maxWidth="sm"
                    >
                        <DialogTitle>Approve Requested Documents</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Are you sure you want to approve the requested documents for{" "}
                                <b>{application?.fullnames}</b>?
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseApproveDocs} color="secondary">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleApproveRequestedDocs}
                                variant="contained"
                                color="success"
                                disabled={approvingDocs}
                            >
                                {approvingDocs ? "Processing..." : "Confirm"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </div>
            </div>

            {application && isPendingApplicant(application) && (
                <div className="grid grid-cols-1 gap-10 mt-4">
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="h5">Email History</Typography>
                            {emails.length > 0 ? (
                                <table className="w-full mt-4">
                                    <thead>
                                        <tr>
                                            <th className="text-left">Subject</th>
                                            <th className="text-left">Date</th>
                                            <th className="text-left">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emails.map((email) => (
                                            <tr key={email.id}>
                                                <td>{email.subject}</td>
                                                <td>{email.datee}</td>
                                                <td>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<VisibilityIcon />}
                                                        onClick={() => handleViewEmail(email.id)}
                                                    >
                                                        View
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-6">
                                    <Typography>No emails sent to this applicant.</Typography>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <AnimatePresence>
                        {openEmailDialog && (
                            <motion.div
                                variants={dialogVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300 }} // Match Dialog's z-index
                            >
                                <Dialog
                                    open={openEmailDialog}
                                    onClose={() => setOpenEmailDialog(false)}
                                    maxWidth="md"
                                    fullWidth
                                    sx={{ "& .MuiDialog-paper": { margin: 0 } }} // Remove default margin for full control
                                >
                                    <DialogTitle
                                        sx={{
                                            borderBottom: "1px solid #e0e0e0",
                                            bgcolor: "#f5f5f5",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Typography variant="h6">{selectedEmail?.subject || "Loading..."}</Typography>
                                        <IconButton onClick={() => setOpenEmailDialog(false)}>
                                            <CloseIcon color="error" />
                                        </IconButton>
                                    </DialogTitle>
                                    <DialogContent sx={{ p: 3, bgcolor: "#fff", fontFamily: "'Roboto', sans-serif" }}>
                                        {loadingEmail ? (
                                            <CircularProgress sx={{ display: "block", mx: "auto" }} />
                                        ) : selectedEmail ? (
                                            <div className="mt-3">
                                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                                    <strong>Date:</strong> {selectedEmail.datee}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                                    <strong>To:</strong> {application?.email}
                                                </Typography>
                                                <div
                                                    style={{
                                                        border: "1px solid #e0e0e0",
                                                        borderRadius: "4px",
                                                        padding: "16px",
                                                        backgroundColor: "#fafafa",
                                                        minHeight: "200px",
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: selectedEmail.body || "" }}
                                                />
                                            </div>
                                        ) : (
                                            <Typography>No email content available.</Typography>
                                        )}
                                    </DialogContent>
                                    <DialogActions sx={{ borderTop: "1px solid #e0e0e0", bgcolor: "#f5f5f5" }}>
                                        <Button onClick={() => setOpenEmailDialog(false)} variant="contained" color="primary">
                                            Close
                                        </Button>
                                    </DialogActions>
                                </Dialog>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
};

export default ApplicationDetails;
