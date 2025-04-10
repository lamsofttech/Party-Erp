import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, Typography, Snackbar, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';

interface Cosigner {
    id: number;
    fullname: string;
    email_address: string;
    phone_no: string;
    special_id: string;
    reason: string;
    student_email: string;
}

// Base URL for the API (adjust this to your server's actual API endpoint)
const API_BASE_URL = 'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs';

const dialogVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
};

const CosignerDetails: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const idStr = queryParams.get("id"); // id is optional (string | undefined)

    // Parse and validate id
    const idNum = idStr ? parseInt(idStr, 10) : NaN;
    const [cosigner, setCosigner] = useState<Cosigner | null>(null);
    const [emails, setEmails] = useState<any[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<any>(null);
    const [openEmailDialog, setOpenEmailDialog] = useState(false);
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'error',
    });

    useEffect(() => {
        const fetchCosigner = async () => {
            if (isNaN(idNum) || idNum <= 0) {
                setSnackbar({ open: true, message: 'Invalid cosigner ID', severity: 'error' });
                return;
            }

            try {
                // Use idStr in the API call since the API expects a string
                const response = await axios.get(`${API_BASE_URL}/view_cosigner.php/cosigners/${idStr}`);
                const data = response.data;

                // Parse id from API response to number
                data.id = parseInt(data.id, 10);
                if (isNaN(data.id)) {
                    throw new Error('Invalid id from API response');
                }
                setCosigner(data);
            } catch (error: any) {
                console.error('Error fetching cosigner:', error);
                setSnackbar({
                    open: true,
                    message: error.response?.status === 404 ? 'Cosigner not found' : 'Failed to fetch cosigner details',
                    severity: 'error',
                });
            }
        };

        fetchCosigner();
    }, [idStr]);

    useEffect(() => {
        const fetchEmails = async () => {
            if (cosigner) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/view_cosigner.php/emails?receiver_email=${cosigner.email_address}`);
                    setEmails(response.data);
                } catch (error) {
                    console.error('Error fetching emails:', error);
                    setSnackbar({ open: true, message: 'Failed to fetch emails', severity: 'error' });
                }
            }
        };

        fetchEmails();
    }, [cosigner]);

    const handleViewEmail = async (emailId: string) => {
        setLoadingEmail(true);
        setOpenEmailDialog(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/view_cosigner.php/emails/${emailId}`);
            setSelectedEmail(response.data);
        } catch (error) {
            console.error('Error fetching email details:', error);
            setSnackbar({ open: true, message: 'Failed to fetch email details', severity: 'error' });
            setSelectedEmail(null);
        } finally {
            setLoadingEmail(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    if (isNaN(idNum) || idNum <= 0) {
        return (
            <div className="text-center mt-10">
                <Typography variant="h6" color="error">
                    Invalid Cosigner ID
                </Typography>
            </div>
        );
    }

    if (!cosigner && !snackbar.open) {
        return <div className="text-center mt-10">Loading...</div>;
    }

    return (
        <div className="py-6">
            <h1 className="text-2xl text-[#2164A6] font-bold mb-4 flex items-center">
                Cosigner Information
            </h1>
            <div className="grid grid-cols-2 gap-8">
                <Card sx={{ boxShadow: 3 }}>
                    <CardContent>
                        <Typography variant="h5" component="div" gutterBottom>
                            <i className="fa-solid fa-user-tie mr-2"></i> Personal Details
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                            Full Name: {cosigner?.fullname || 'N/A'}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                            Email: {cosigner?.email_address || 'N/A'}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                            Phone Number: {cosigner?.phone_no || 'N/A'}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                            Student Cosigning: {cosigner?.student_email || 'N/A'}
                        </Typography>
                        <Typography color="text.secondary">
                            Reason to Cosign: {cosigner?.reason || 'N/A'}
                        </Typography>
                    </CardContent>
                </Card>
            </div>
            <Card sx={{ mt: 2, boxShadow: 3 }}>
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
                                                sx={{ textTransform: 'none' }}
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
                            <Typography>No emails sent to this cosigner.</Typography>
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
                        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300 }}
                    >
                        <Dialog
                            open={openEmailDialog}
                            onClose={() => setOpenEmailDialog(false)}
                            maxWidth="md"
                            fullWidth
                            sx={{ "& .MuiDialog-paper": { margin: 0 } }}
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
                                            <strong>To:</strong> {cosigner?.email_address}
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
                                <Button sx={{ textTransform: 'none' }} onClick={() => setOpenEmailDialog(false)} variant="contained" color="primary">
                                    Close
                                </Button>
                            </DialogActions>
                        </Dialog>
                    </motion.div>
                )}
            </AnimatePresence>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default CosignerDetails;