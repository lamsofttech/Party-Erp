import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { NavLink } from "react-router-dom";
import { Modal, Box, Typography, IconButton, TextField, FormControl, Button, InputLabel, MenuItem, Select, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from '@mui/icons-material/Print';
import assets from "../assets/assets";
import { StudentContext } from "../layouts/view-member";

interface MemberNavigationProps {
    membershipType: string;
    memberName: string;
    memberEmail: string;
    rolesArray: string[];
}
// interface ReloadWrapperProps {
//     reloadKey: number;
//     children: ReactNode;
// }

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/member_actions.php";
// function ReloadWrapper({ reloadKey, children }: ReloadWrapperProps) {
//     return <div key={reloadKey}>{children}</div>;
// }

const MemberSidenav: React.FC<MemberNavigationProps> = ({ membershipType, memberName, memberEmail, rolesArray }) => {
    const [openStatement, setOpenStatement] = useState(false);
    const [openDisburseLoan, setOpenDisburseLoan] = useState(false);
    const [openExtraLoan, setOpenExtraLoan] = useState(false);
    const [openDeduction, setOpenDeduction] = useState(false);
    const [openReverseDeduction, setOpenReverseDeduction] = useState(false);
    const [openSpecialFunction, setOpenSpecialFunction] = useState(false);
    const [openConfirmWithdrawal, setOpenConfirmWithdrawal] = useState(false);
    const [openRequestAccess, setOpenRequestAccess] = useState(false);
    const [openCancelRequest, setOpenCancelRequest] = useState(false);

    // const [reloadKey, setReloadKey] = useState(0);

    // const handleReload = () => {
    //     setReloadKey((prev) => prev + 1); // Changing the key triggers a remount
    // };

    const { student, refreshStudent } = useContext(StudentContext);

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const [memberData, setMemberData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [disburseFormData, setDisburseFormData] = useState({
        email: memberEmail,
        loan_id: "",
        loan_amount: "",
        loan_ref: "",
        disburse_purpose: "",
        disburse_date: "",
    });

    const [extraLoanFormData, setExtraLoanFormData] = useState({
        email: memberEmail,
        loan_type: "",
        loan_amount: "",
        due_date:"",
    });

    const [deductionFormData, setDeductionFormData] = useState({
        email: memberEmail,
        purpose: "",
        amount: "",
        txn_code: "",
        package: "",
        balance: 0,
    });

    const [reverseDeductionOptions, setReverseDeductionOptions] = useState<any[]>([]);
    const [selectedDeductionId, setSelectedDeductionId] = useState<string>("");

    const [requestAccessReason, setRequestAccessReason] = useState("");
    const [level, setLevel] = useState("");
    const [specialId, setSpecialId] = useState("");
    const [specialComment, setSpecialComment] = useState("");

    useEffect(() => {
        const fetchMemberData = async () => {
            try {
                const response = await axios.get(`${API_URL}?action=get_member_data&email=${memberEmail}`);
                if (response.data.success) {
                    setMemberData(response.data.data);
                    console.log("Member Data: ", response.data.data);
                    setDeductionFormData(prev => ({
                        ...prev,
                        package: response.data.data.package,
                        balance: response.data.data.balance,
                    }));
                    setReverseDeductionOptions(response.data.data.deductions || []);
                }
            } catch (error) {
                console.error('Error fetching member data:', error);
            }
        };
        fetchMemberData();
    }, [memberEmail]);

    const handlePrint = () => {
        const printContent = document.getElementById("printable-modal");
        if (!printContent) return;
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, formSetter: React.Dispatch<React.SetStateAction<any>>) => {
        formSetter((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectChange = (e: any, formSetter: React.Dispatch<React.SetStateAction<any>>, field: string) => {
        formSetter((prev: any) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent, action: string, formData: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(API_URL, { action, ...formData });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: 'success' });
                if (action === 'disburse_loan') setOpenDisburseLoan(false);
                if (action === 'extra_loan') setOpenExtraLoan(false);
                if (action === 'deduction') {
                    setOpenDeduction(false);
                    window.location.reload();
                };
                if (action === 'reverse_deduction') setOpenReverseDeduction(false);
                if (action === 'confirm_withdrawal') setOpenConfirmWithdrawal(false);
                if (action === 'request_access') {
                    setOpenRequestAccess(false);
                    window.location.reload();
                };
                if (action === 'cancel_request') {
                    setOpenCancelRequest(false);
                    window.location.reload();
                };
                refreshStudent();
            } else {
                setSnackbar({ open: true, message: response.data.message || 'Action failed', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Network error, please try again.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSpecialFunctionSubmit = async () => {
        try {
            if (!level) {
                setSnackbar({ open: true, message: "Please select a stage", severity: "warning" });
                return;
            }
            const payload: Record<string, any> = { level, email: memberEmail };
            if (level === "pay_error") payload.special_id = specialId;
            if (level === "special_comment") payload.special_comment = specialComment;

            const response = await axios.post("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/run_special_function.php", payload);
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenSpecialFunction(false);
                refreshStudent();
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Server error. Try again later", severity: "error" });
        }
    };

    const handleAccessView = async () => {
        try {
            const response = await axios.post(API_URL, { action: 'grant_access', email: memberEmail, adminEmail: 'admin@example.com' });
            if (response.data.success) {
                window.open(response.data.redirectUrl, '_blank');
            } else {
                setSnackbar({ open: true, message: response.data.message || 'Error accessing student page', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Network error', severity: 'error' });
        }
    };

    return (
        // <ReloadWrapper reloadKey={reloadKey}>
        <main className="px-4 overflow">
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-2 my-4 flex-wrap">
                    <button onClick={() => setOpenStatement(true)} className="relative group border border-[#308AE3] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                        <img className="h-8" src={assets.statement} alt="statement" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Statement
                        </span>
                    </button>

                    {(memberData?.alternativeLoan === 1 && rolesArray.includes("SM0710")) && (
                        <button onClick={() => setOpenDisburseLoan(true)} className="relative group border border-[#1A9970] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.disburse} alt="disburse" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Disburse Loan
                            </span>
                        </button>
                    )}

                    {(memberData?.loanExists === 1 && rolesArray.includes("SM0710")) && (
                        <button onClick={() => setOpenExtraLoan(true)} className="relative group border border-[#308AE3] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.extraLoan} alt="extra loan" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Extra Loan
                            </span>
                        </button>
                    )}

                    {rolesArray.includes("SM0101") && (
                        <button onClick={() => setOpenDeduction(true)} className="relative group border border-[#17A2B8] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.deduction} alt="deduction" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Deduction
                            </span>
                        </button>
                    )}

                    {rolesArray.includes("SM0101") && (
                        <button onClick={() => setOpenReverseDeduction(true)} className="relative group border border-[#6C757D] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.reverse} alt="reverse deduction" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Reverse Deduction
                            </span>
                        </button>
                    )}

                    {rolesArray.includes("SM0102") && (
                        <button onClick={() => setOpenSpecialFunction(true)} className="relative group border border-[#308AE3] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.functionPic} alt="function" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Function
                            </span>
                        </button>
                    )}

                    {rolesArray.includes("SM0103") && memberData?.reportStatus === "requested" && (
                        <button onClick={() => setOpenConfirmWithdrawal(true)} className="relative group border border-[#28A745] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.confirm} alt="confirm" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Confirm
                            </span>
                        </button>
                    )}

                    {memberData?.accessStatus === 'pending' && (
                        <button onClick={() => setOpenCancelRequest(true)} className="relative group border border-[#F14545] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.cancel} alt="cancel" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Cancel Request
                            </span>
                        </button>
                    )}
                    {(memberData?.accessStatus === null || (memberData?.timeDifference && memberData.timeDifference > 300)) && (
                        <button onClick={() => setOpenRequestAccess(true)} className="relative group border border-[#28A745] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.requestAccess} alt="request access" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {memberData?.accessStatus === null ? "Request Access" : "Request Access Again"}
                            </span>
                        </button>
                    )}
                    {(memberData?.accessStatus && memberData?.timeDifference && memberData.timeDifference <= 300) && (
                        <button onClick={handleAccessView} className="relative group border border-[#308AE3] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                            <img className="h-8" src={assets.access2} alt="access" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                Access Portal
                            </span>
                        </button>
                    )}
                </div>

                <img className="h-32 dark:opacity-75" src={assets.displayPic} alt="Display Picture" />

                <nav className="flex flex-col gap-2 mt-4">
                    {[
                        { to: `/members/${membershipType}/${memberName}?email=${memberEmail}`, label: "Personal Details", exact: true },
                        { to: `/members/${membershipType}/${memberName}/education?email=${memberEmail}`, label: "Education Details" },
                        { to: `/members/${membershipType}/${memberName}/documents?email=${memberEmail}`, label: "Documents" },
                        { to: `/members/${membershipType}/${memberName}/sent-mails?email=${memberEmail}`, label: "Sent Mails" },
                        { to: `/members/${membershipType}/${memberName}/contributions?email=${memberEmail}`, label: "Contribution Details" },
                        { to: `/members/${membershipType}/${memberName}/expenses?email=${memberEmail}`, label: "Expense Details" }
                    ].map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.to}
                            end={item.exact}
                            className={({ isActive }) =>
                                `relative flex items-center gap-2 text-black/30 dark:text-gray-400 transition-all duration-200 
                                 ${isActive ? "text-blue-500 dark:text-blue-500 scale-105 font-semibold" : "hover:text-black/50"}`
                            }
                        >
                            {({ isActive }) => (
                                <span className="flex items-center gap-2">
                                    {isActive && <span className="absolute left-[-20px] text-black dark:text-white">→</span>}
                                    {item.label}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Modals */}
            <Modal open={openStatement} onClose={() => setOpenStatement(false)} aria-labelledby="modal-title" aria-describedby="modal-description">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "auto",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                }}>
                    <Typography id="modal-title" variant="h6" component="h2">
                        <div className="flex items-center justify-end">
                            <IconButton onClick={() => setOpenStatement(false)} className="hover:bg-red-100 no-print">
                                <CloseIcon className="text-red-500" />
                            </IconButton>
                        </div>
                    </Typography>
                    <div id="printable-modal">
                        <Typography id="modal-description" sx={{ mt: 2 }}>
                            <img className="h-20 mx-auto" src={assets.ispLogo} alt="ISP logo" />
                            <div className="text-center text-gray-500">
                                <p className="text-[20px] font-bold">The International Scholars Program</p>
                                <div className="text-[16px]">
                                    <p>Email: scholars@internationalscholarsprogram.com</p>
                                    <p>100 S. Ashley Drive, Suite 600, Tampa, FL, 33602</p>
                                    <p className="mt-4">Account statement for: {student?.fullName}</p>
                                    <p>Email address: {student?.email}</p>
                                </div>
                            </div>
                            <div className="mt-6">
                                <p className="font-bold text-[24px] text-center">Contribution to the program</p>
                                <table className="w-full border-t border-gray-300 text-gray-500">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="py-2 text-left w-1/12">No.</th>
                                            <th className="py-2 text-left w-1/4">Payment ID</th>
                                            <th className="py-2 text-left w-1/4">Purpose</th>
                                            <th className="py-2 text-left w-1/6">Amount ($)</th>
                                            <th className="py-2 text-left w-1/6">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {student?.payments && student.payments.length > 0 ? (
                                            <>
                                                {student.payments.map((payment, index) => (
                                                    <tr key={index} className="border-b border-gray-300 text-[12px]">
                                                        <td className="py-2 text-left">{index + 1}</td>
                                                        <td className="py-2 break-words">{payment.payment_intent_id}</td>
                                                        <td className="py-2 break-words">{payment.purpose}</td>
                                                        <td className="py-2 text-left px-2">${payment.amount}</td>
                                                        <td className="py-2">{new Date(payment.date_completed).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t border-gray-500 font-bold">
                                                    <td colSpan={3} className="py-2 text-right">Total Payments</td>
                                                    <td className="py-2 text-right">
                                                        ${Number(student.payments.reduce((total, payment) => total + parseFloat(String(payment.amount || "0")), 0)).toFixed(2)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-4">No contributions found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6">
                                <p className="font-bold text-[24px] text-center">Expenses Incurred</p>
                                <table className="w-full border-t border-gray-300 text-gray-500">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="py-2 text-left w-1/12">No.</th>
                                            <th className="py-2 text-left w-1/4">Reference</th>
                                            <th className="py-2 text-left w-1/4">Expense</th>
                                            <th className="py-2 text-left w-1/6">Amount ($)</th>
                                            <th className="py-2 text-left w-1/6">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {student?.expenditure && student.expenditure.length > 0 ? (
                                            <>
                                                {student.expenditure.map((expense, index) => (
                                                    <tr key={index} className="border-b border-gray-300 text-[12px]">
                                                        <td className="py-2">{index + 1}</td>
                                                        <td className="py-2 break-words">{expense.reference_id}</td>
                                                        <td className="py-2 break-words">{expense.purporse}</td>
                                                        <td className="py-2 text-left px-2">${expense.amount.toFixed(2)}</td>
                                                        <td className="py-2">{new Date(expense.date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t border-b border-gray-300 font-bold">
                                                    <td colSpan={3} className="py-2 text-right">Total Expenses</td>
                                                    <td className="py-2 text-right">
                                                        ${student.expenditure.reduce((total, expense) => total + expense.amount, 0).toFixed(2)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-4">No expenses found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Typography>
                    </div>
                    <div className="flex items-center justify-between">
                        <button onClick={handlePrint} className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700">
                            <PrintIcon />
                        </button>
                        <button onClick={() => setOpenStatement(false)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">
                            Close
                        </button>
                    </div>
                </Box>
            </Modal>

            <Modal open={openDisburseLoan} onClose={() => setOpenDisburseLoan(false)} aria-labelledby="disburse-modal-title">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                }}>
                    <Typography id="disburse-modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Disburse Loan
                    </Typography>
                    <form onSubmit={(e) => handleSubmit(e, 'disburse_loan', disburseFormData)} className="space-y-3 mt-4">
                        <FormControl fullWidth required>
                            <InputLabel>Loan Type</InputLabel>
                            <Select
                                name="loan_id"
                                value={disburseFormData.loan_id}
                                onChange={(e) => handleSelectChange(e, setDisburseFormData, 'loan_id')}
                                label="Purpose"
                            >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="study">Study</MenuItem>
                                <MenuItem value="personal">Personal</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Loan Amount ($)"
                            name="loan_amount"
                            type="number"
                            value={disburseFormData.loan_amount}
                            onChange={(e) => handleChange(e, setDisburseFormData)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Loan Reference"
                            name="loan_ref"
                            type="text"
                            value={disburseFormData.loan_ref}
                            onChange={(e) => handleChange(e, setDisburseFormData)}
                            required
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Purpose</InputLabel>
                            <Select
                                name="disburse_purpose"
                                value={disburseFormData.disburse_purpose}
                                onChange={(e) => handleSelectChange(e, setDisburseFormData, 'disburse_purpose')}
                                label="Purpose"
                            >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="Living expenses">Living expenses</MenuItem>
                                <MenuItem value="Accomodation">Accommodation</MenuItem>
                                <MenuItem value="Tuition">Tuition</MenuItem>
                                <MenuItem value="Origination Fee">Origination Fee</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Disbursement Date"
                            name="disburse_date"
                            type="date"
                            value={disburseFormData.disburse_date}
                            onChange={(e) => handleChange(e, setDisburseFormData)}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? "Processing..." : "Submit"}
                            </Button>
                            <Button type="button" onClick={() => setOpenDisburseLoan(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>

            <Modal open={openExtraLoan} onClose={() => setOpenExtraLoan(false)} aria-labelledby="extra-loan-modal-title">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                }}>
                    <Typography id="extra-loan-modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Extra Loan
                    </Typography>
                    <form onSubmit={(e) => handleSubmit(e, 'extra_loan', extraLoanFormData)} className="space-y-3 mt-4">
                        <FormControl fullWidth required>
                            <InputLabel>Loan Type</InputLabel>
                            <Select
                                name="loan_type"
                                value={extraLoanFormData.loan_type}
                                onChange={(e) => handleSelectChange(e, setExtraLoanFormData, 'loan_type')}
                                label="Loan Type"
                            >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="extra">Extra Amount</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            // label="Loan Date"
                            name="due_date"
                            type="date"
                            value={extraLoanFormData.due_date}
                            onChange={(e) => handleChange(e, setExtraLoanFormData)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Loan Amount ($)"
                            name="loan_amount"
                            type="number"
                            value={extraLoanFormData.loan_amount}
                            onChange={(e) => handleChange(e, setExtraLoanFormData)}
                            required
                        />
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? "Processing..." : "Submit"}
                            </Button>
                            <Button type="button" onClick={() => setOpenExtraLoan(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>

            <Modal open={openDeduction} onClose={() => setOpenDeduction(false)} aria-labelledby="deduction-modal-title">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                }}>
                    <Typography id="deduction-modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Record Deduction
                    </Typography>
                    <form onSubmit={(e) => handleSubmit(e, 'deduction', deductionFormData)} className="space-y-3 mt-4">
                        <TextField
                            fullWidth
                            label="Purpose"
                            name="purpose"
                            type="text"
                            value={deductionFormData.purpose}
                            onChange={(e) => handleChange(e, setDeductionFormData)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Amount ($)"
                            name="amount"
                            type="number"
                            value={deductionFormData.amount}
                            onChange={(e) => handleChange(e, setDeductionFormData)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Transaction Code"
                            name="txn_code"
                            type="text"
                            value={deductionFormData.txn_code}
                            onChange={(e) => handleChange(e, setDeductionFormData)}
                            required
                        />
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? "Processing..." : "Submit"}
                            </Button>
                            <Button type="button" onClick={() => setOpenDeduction(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>

            <Modal open={openReverseDeduction} onClose={() => setOpenReverseDeduction(false)} aria-labelledby="reverse-deduction-modal-title">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 600,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                }}>
                    <Typography id="reverse-deduction-modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Reverse Deduction
                    </Typography>
                    <form onSubmit={(e) => handleSubmit(e, 'reverse_deduction', { email: memberEmail, deductionId: selectedDeductionId })} className="mt-4">
                        <FormControl fullWidth required>
                            <InputLabel>Select Deduction</InputLabel>
                            <Select
                                value={selectedDeductionId}
                                onChange={(e) => setSelectedDeductionId(e.target.value)}
                                label="Select Deduction"
                            >
                                <MenuItem value="">Select</MenuItem>
                                {reverseDeductionOptions.map((deduction) => (
                                    <MenuItem key={deduction.id} value={deduction.id}>
                                        {`${deduction.date} - ${deduction.purporse} - $${deduction.amount}`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading || !selectedDeductionId}>
                                {loading ? "Processing..." : "Reverse"}
                            </Button>
                            <Button type="button" onClick={() => setOpenReverseDeduction(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>

            <Dialog open={openSpecialFunction} onClose={() => setOpenSpecialFunction(false)} fullWidth maxWidth="sm">
                <DialogTitle>Special Function</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Select stage</InputLabel>
                        <Select value={level} onChange={(e) => setLevel(e.target.value)} label='Select Stage' fullWidth>
                            <MenuItem value="">Select</MenuItem>
                            <MenuItem value="app">New Application</MenuItem>
                            <MenuItem value="waive_gmat">Waive entrance exam</MenuItem>
                            <MenuItem value="special_comment">Add special comment</MenuItem>
                            <MenuItem value="gmat">GMAT Exam booking</MenuItem>
                            <MenuItem value="gre">GRE Exam booking</MenuItem>
                            <MenuItem value="school">School app</MenuItem>
                            <MenuItem value="credit">Credit report</MenuItem>
                            <MenuItem value="approve">Re-approve Application</MenuItem>
                            <MenuItem value="score">GMAT Score</MenuItem>
                            <MenuItem value="gre_score">GRE Score</MenuItem>
                            <MenuItem value="regular">Prime - Regular</MenuItem>
                            <MenuItem value="parallel">Regular - Prime</MenuItem>
                            <MenuItem value="loan">Loan</MenuItem>
                            <MenuItem value="start_visa">Start Visa</MenuItem>
                            <MenuItem value="ds160">DS160</MenuItem>
                            <MenuItem value="visa_training">Visa Training</MenuItem>
                            <MenuItem value="transcript_counter">Reset Transcript Counter</MenuItem>
                            <MenuItem value="video_counter">Reset Video Counter</MenuItem>
                            <MenuItem value="visa">VISA Transcript</MenuItem>
                            <MenuItem value="waive_transcript">Waive Visa Transcript</MenuItem>
                        </Select>
                    </FormControl>
                    {level === "pay_error" && (
                        <TextField
                            label="Special ID"
                            fullWidth
                            margin="normal"
                            type="number"
                            value={specialId}
                            onChange={(e) => setSpecialId(e.target.value)}
                        />
                    )}
                    {level === "special_comment" && (
                        <TextField
                            label="Special Comment"
                            fullWidth
                            multiline
                            rows={3}
                            margin="normal"
                            value={specialComment}
                            onChange={(e) => setSpecialComment(e.target.value)}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSpecialFunction(false)} color="error">Cancel</Button>
                    <Button onClick={handleSpecialFunctionSubmit} color="primary" variant="contained">Submit</Button>
                </DialogActions>
            </Dialog>

            <Modal open={openConfirmWithdrawal} onClose={() => setOpenConfirmWithdrawal(false)} aria-labelledby="confirm-modal-title">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                }}>
                    <Typography id="confirm-modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Confirm Withdrawal
                    </Typography>
                    <form onSubmit={(e) => handleSubmit(e, 'confirm_withdrawal', { email: memberEmail, memberNo: student?.memberNo })} className="mt-4">
                        <Typography>Are you sure you want to confirm the withdrawal request?</Typography>
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? "Processing..." : "Confirm"}
                            </Button>
                            <Button type="button" onClick={() => setOpenConfirmWithdrawal(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>

            <Modal open={openRequestAccess} onClose={() => setOpenRequestAccess(false)} aria-labelledby="request-access-modal-title">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                }}>
                    <Typography id="request-access-modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Request Access
                    </Typography>
                    <form onSubmit={(e) => handleSubmit(e, 'request_access', { email: memberEmail, reason: requestAccessReason, rolesArray })} className="space-y-3 mt-4">
                        <TextField
                            fullWidth
                            label="Reason"
                            name="reason"
                            multiline
                            rows={4}
                            value={requestAccessReason}
                            onChange={(e) => setRequestAccessReason(e.target.value)}
                            required
                        />
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? "Processing..." : "Submit"}
                            </Button>
                            <Button type="button" onClick={() => setOpenRequestAccess(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>

            <Modal open={openCancelRequest} onClose={() => setOpenCancelRequest(false)} aria-labelledby="cancel-request-modal-title">
                <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                }}>
                    <Typography id="cancel-request-modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Cancel Request
                    </Typography>
                    <form onSubmit={(e) => handleSubmit(e, 'cancel_request', { email: memberEmail })} className="mt-4">
                        <Typography>Are you sure you want to cancel the access request?</Typography>
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? "Processing..." : "Confirm"}
                            </Button>
                            <Button type="button" onClick={() => setOpenCancelRequest(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
        // </ReloadWrapper>
    );
};

export default MemberSidenav;