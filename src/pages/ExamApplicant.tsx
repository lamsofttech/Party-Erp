import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Box, Typography, Button, Modal, TextField, IconButton, Snackbar, Alert, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';

const API_URL = 'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/applicant_api.php';

interface Applicant {
    full_name: string;
    prog_email: string;
    webmail_pass: string;
    phone_no: string;
    email: string;
    package: string;
    status: number | null;
    testType: string;
}

interface Payment {
    payment_intent_id: string;
    purpose: string;
    date_completed: string;
    amount: number;
}

interface Expenditure {
    reference_id: string;
    purporse: string;
    date: string;
    amount: number;
}

const ExamApplicant: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get("email");
    const navigate = useNavigate();

    const [applicant, setApplicant] = useState<Applicant | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
    const [totalPayment, setTotalPayment] = useState<number>(0);
    const [totalExpenditure, setTotalExpenditure] = useState<number>(0);
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const [openStatementModal, setOpenStatementModal] = useState<boolean>(false);
    const [openRejectModal, setOpenRejectModal] = useState<boolean>(false);
    const [openApproveModal, setOpenApproveModal] = useState<boolean>(false); // New state for approve modal
    const [rejectReason, setRejectReason] = useState<string>('');

    const [isApproving, setIsApproving] = useState<boolean>(false);
    const [isRejecting, setIsRejecting] = useState<boolean>(false);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_URL}?action=get_applicant&email=${email}`);
                if (response.data.success) {
                    setApplicant(response.data.applicant);
                    setPayments(response.data.payments);
                    setExpenditures(response.data.expenditures);
                    setTotalPayment(response.data.totalPayment);
                    setTotalExpenditure(response.data.totalExpenditure);
                    setBalance(response.data.balance);
                } else {
                    setError(response.data.message);
                }
            } catch (err) {
                setError('Error fetching applicant data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [email]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
    };

    const handleApprove = async () => {
        setIsApproving(true); // Start loading
        try {
            const response = await axios.post(API_URL, { action: 'approve_app', email });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: 'success' });
                setTimeout(() => navigate('/entrance-exams/applications'), 1500);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: 'error' });
            }
        } catch (err) {
            setSnackbar({ open: true, message: 'Error approving applicant', severity: 'error' });
        } finally {
            setIsApproving(false);
            setOpenApproveModal(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason) {
            setSnackbar({ open: true, message: 'Please provide a reason', severity: 'warning' });
            return;
        }
        setIsRejecting(true); // Start loading
        try {
            const response = await axios.post(API_URL, { action: 'reject_app', email, reason: rejectReason });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: 'success' });
                setOpenRejectModal(false);
                setTimeout(() => navigate('/entrance-exams/applications'), 1500);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: 'error' });
            }
        } catch (err) {
            setSnackbar({ open: true, message: 'Error rejecting applicant', severity: 'error' });
        } finally {
            setIsRejecting(false); // Stop loading
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-statement');
        if (!printContent) return;
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

    return (
        <main className="p-6 min-h-[80vh] max-w-5xl mx-auto">
            <div className="bg-gradient-to-b from-[#2164A6] to-[#1a4e7e] rounded-xl mb-6 p-4">
                <p className="font-bold text-[24px] text-white dark:text-white text-center">{applicant?.testType} Applicant Details</p>
            </div>

            {/* Applicant Details Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-lg p-6 my-14"
            >
                <Typography variant="h5" className="font-bold mb-4 text-gray-800" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
                    Personal Details
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="flex items-center">
                        <PersonIcon className="mr-2 text-blue-500" />
                        <strong>Name:</strong> {applicant?.full_name}
                    </p>
                    <p className="flex items-center flex-wrap w-full">
                        <EmailIcon className="mr-2 text-blue-500" />
                        <strong>Program Email:</strong>{" "}
                        <span className="break-words max-w-xs">
                            {applicant?.prog_email}
                        </span>
                        <IconButton onClick={() => handleCopy(applicant?.prog_email || '')} className="ml-2">
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </p>
                    <p className="flex items-center">
                        <LockIcon className="mr-2 text-blue-500" />
                        <strong>Password:</strong> {applicant?.webmail_pass}
                        <IconButton onClick={() => handleCopy(applicant?.webmail_pass || '')} className="ml-2">
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </p>
                    <p className="flex items-center">
                        <PhoneIcon className="mr-2 text-blue-500" />
                        <strong>Telephone:</strong> {applicant?.phone_no}
                    </p>
                    <p className="flex items-center">
                        <EmailIcon className="mr-2 text-blue-500" />
                        <strong>Email:</strong> {applicant?.email}
                    </p>
                    <p className="flex items-center">
                        <PersonIcon className="mr-2 text-blue-500" />
                        <strong>Package:</strong> {applicant?.package}
                    </p>
                </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center mb-6">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                        variant="outlined"
                        sx={{ textTransform: 'none' }}
                        color="success"
                        onClick={() => setOpenApproveModal(true)} // Open the confirmation modal
                        disabled={applicant?.status === 2 || applicant?.status === 3}
                        className="font-semibold"
                    >
                        Approve
                    </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                        variant="outlined"
                        sx={{ textTransform: 'none' }}
                        color="error"
                        onClick={() => setOpenRejectModal(true)}
                        disabled={applicant?.status === 2 || applicant?.status === 3}
                        className="font-semibold"
                    >
                        Reject
                    </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button sx={{ textTransform: 'none' }} variant="contained" color="warning" onClick={() => setOpenStatementModal(true)} className="font-semibold">
                        Total Contribution
                    </Button>
                </motion.div>
            </div>

            {/* Approve Confirmation Modal */}
            <Modal open={openApproveModal} onClose={() => setOpenApproveModal(false)}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: '8px',
                }}>
                    <Typography variant="h6" className="font-bold mb-4" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
                        Confirm Approval
                    </Typography>
                    <Typography className="mb-4">
                        Are you sure you want to approve this applicant?
                    </Typography>
                    <div className="flex justify-between mt-4">
                        <Button
                            variant="contained"
                            sx={{ textTransform: 'none' }}
                            color="success"
                            onClick={() => {
                                handleApprove();
                            }}
                            disabled={isApproving}
                        >
                            {isApproving ? 'Approving...' : 'Yes'}
                        </Button>
                        <Button sx={{ textTransform: 'none' }} variant="outlined" onClick={() => setOpenApproveModal(false)}>
                            No
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Reject Modal */}
            <Modal open={openRejectModal} onClose={() => setOpenRejectModal(false)}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 400,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: '8px',
                }}>
                    <Typography variant="h6" className="font-bold mb-4" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
                        Reject Application
                    </Typography>
                    <TextField
                        fullWidth
                        label="Reason"
                        multiline
                        rows={4}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        required
                    />
                    <div className="flex justify-between mt-4">
                        <Button
                            variant="contained"
                            sx={{ textTransform: 'none' }}
                            color="error"
                            onClick={handleReject}
                            disabled={isRejecting}
                        >
                            {isRejecting ? 'Rejecting...' : 'Reject'}
                        </Button>
                        <Button sx={{ textTransform: 'none' }} variant="outlined" onClick={() => setOpenRejectModal(false)}>
                            Cancel
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Statement Modal */}
            <Modal open={openStatementModal} onClose={() => setOpenStatementModal(false)}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    maxWidth: 800,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: '8px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}>
                    <div id="printable-statement">
                        <div className="text-center mb-6">
                            <img src="https://finkapinternational.qhtestingserver.com/login/includes/includes/scholars-logo.png" alt="ISP Logo" className="h-20 mx-auto" />
                            <Typography variant="h5" className="font-bold mt-2" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
                                The International Scholars Program
                            </Typography>
                            <Typography className="text-gray-600">
                                Email: scholars@internationalscholarsprogram.com<br />
                                Address: 100 S. Ashley Drive, Suite 600, Tampa, FL, 33602
                            </Typography>
                            <Typography className="mt-2">
                                <strong>Account statement for:</strong> {applicant?.full_name}<br />
                                <strong>Email address:</strong> {applicant?.email}
                            </Typography>
                        </div>
                        <Divider className="my-4" />

                        {/* Contributions */}
                        <Typography variant="h6" className="font-bold text-center mb-4" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
                            Contribution to the Program
                        </Typography>
                        <table className="w-full border-t border-gray-300 text-gray-700">
                            <thead>
                                <tr className="border-b border-gray-300 bg-gray-100">
                                    <th className="py-2 text-left">Transaction ID</th>
                                    <th className="py-2 text-left">Purpose</th>
                                    <th className="py-2 text-left">Date</th>
                                    <th className="py-2 text-left">Amount ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length > 0 ? (
                                    <>
                                        {payments.map((payment, index) => (
                                            <tr key={index} className="border-b border-gray-200">
                                                <td className="py-2">{payment.payment_intent_id}</td>
                                                <td className="py-2">{payment.purpose}</td>
                                                <td className="py-2">{new Date(payment.date_completed).toLocaleDateString()}</td>
                                                <td className="py-2">{parseFloat(String(payment.amount)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold bg-gray-50">
                                            <td colSpan={3} className="py-2 text-right">Total Contribution</td>
                                            <td className="py-2">{parseFloat(String(totalPayment)).toFixed(2)}</td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-2 text-center">No contributions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Divider className="my-4" />

                        {/* Expenditures */}
                        <Typography variant="h6" className="font-bold text-center mt-6 mb-4" style={{ fontFamily: "'Century Gothic', sans-serif" }}>
                            Expenditure
                        </Typography>
                        <table className="w-full border-t border-gray-300 text-gray-700">
                            <thead>
                                <tr className="border-b border-gray-300 bg-gray-100">
                                    <th className="py-2 text-left">Transaction ID</th>
                                    <th className="py-2 text-left">Expense</th>
                                    <th className="py-2 text-left">Date</th>
                                    <th className="py-2 text-left">Amount ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenditures.length > 0 ? (
                                    <>
                                        {expenditures.map((expenditure, index) => (
                                            <tr key={index} className="border-b border-gray-200">
                                                <td className="py-2">{expenditure.reference_id}</td>
                                                <td className="py-2">{expenditure.purporse}</td>
                                                <td className="py-2">{new Date(expenditure.date).toLocaleDateString()}</td>
                                                <td className="py-2">{parseFloat(String(expenditure.amount)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold bg-gray-50">
                                            <td colSpan={3} className="py-2 text-right">Total Expenditure</td>
                                            <td className="py-2">{parseFloat(String(totalExpenditure)).toFixed(2)}</td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-2 text-center">No expenditures found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Divider className="my-4" />

                        {/* Balance */}
                        <Typography className="text-center mt-4">
                            <strong>{applicant?.package === 'Regular' ? 'Loan Amount' : 'Amount Due'}:</strong> ${Math.abs(balance).toFixed(2)}
                        </Typography>
                    </div>

                    <div className="flex justify-between mt-6">
                        <Button sx={{ textTransform: 'none' }} variant="contained" color="primary" onClick={handlePrint} startIcon={<PrintIcon />}>
                            Print
                        </Button>
                        <Button sx={{ textTransform: 'none' }} variant="outlined" color="error" onClick={() => setOpenStatementModal(false)}>
                            Close
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
};

export default ExamApplicant