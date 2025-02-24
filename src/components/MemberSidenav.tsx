import { NavLink } from "react-router-dom";
import assets from "../assets/assets";
import { Modal, Box, Typography, IconButton, TextField, FormControl, Button, InputLabel, MenuItem, Select, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from "@mui/material";
import { useContext, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { StudentContext } from "../layouts/view-member";
import PrintIcon from '@mui/icons-material/Print';
import axios from "axios";

interface MemberNavigationProps {
    membershipType: string;
    memberName: string;
    memberEmail: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/disburse_loan.php";

const MemberSidenav: React.FC<MemberNavigationProps> = ({ membershipType, memberName, memberEmail }) => {
    const [open, setOpen] = useState(false);
    const [open2, setOpen2] = useState(false);

    const { student, refreshStudent } = useContext(StudentContext);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handlePrint = () => {
        const printContent = document.getElementById("printable-modal");
        if (!printContent) return;

        const originalContent = document.body.innerHTML;

        // Replace body content with modal content
        document.body.innerHTML = printContent.innerHTML;

        window.print(); // Trigger print

        // Restore original page content
        document.body.innerHTML = originalContent;
        window.location.reload(); // Reload to reset the page state
    };

    const [formData, setFormData] = useState({
        email: memberEmail,
        loan_id: "",
        loan_amount: "",
        loan_ref: "",
        disburse_purpose: "",
        disburse_date: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // ✅ Handle form input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (e: any) => {
        setFormData({ ...formData, disburse_purpose: e.target.value });
    };

    // ✅ Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const response = await axios.post(API_URL, formData, {
                headers: { "Content-Type": "application/json" },
            });

            if (response.data.status === "success") {
                setMessage("Loan disbursed successfully!");
                setFormData({ email: "", loan_id: "", loan_amount: "", loan_ref: "", disburse_purpose: "", disburse_date: "" });
            } else {
                setMessage("Error: " + response.data.message);
            }
        } catch (error) {
            setMessage("Network error, please try again.");
        } finally {
            setLoading(false);
        }
    };

    const [level, setLevel] = useState("");
    const [specialId, setSpecialId] = useState("");
    const [specialComment, setSpecialComment] = useState("");
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [modalOpen, setModalOpen] = useState(false);

    const handleSubmit2 = async () => {
        try {
            if (!level) {
                setSnackbar({ open: true, message: "Please select a stage", severity: "warning" });
                return;
            }

            const payload: Record<string, any> = { level, email: memberEmail };
            if (level === "pay_error") payload.special_id = specialId;
            if (level === "special_comment") payload.special_comment = specialComment;

            console.log("Payload:", payload);

            const response = await axios.post("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/run_special_function.php", payload);
            console.log("API Response:", response.data);
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setModalOpen(false);
                refreshStudent(); 
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Server error. Try again later", severity: "error" });
        }
    };

    return (
        <main className="px-4 overflow">
            <div className="flex flex-col items-center">
                {/* Button Group */}
                <div className="flex items-center justify-center gap-2 my-4">
                    {/* Statement Button */}
                    <button onClick={handleOpen} className="relative group border border-[#308AE3] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                        <img className="h-8" src={assets.statement} alt="statement" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Statement
                        </span>
                    </button>

                    {/* Disburse Button */}
                    <button onClick={() => setOpen2(true)} className="relative group border border-[#1A9970] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                        <img className="h-8" src={assets.disburse} alt="disburse vector" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Disburse Loan
                        </span>
                    </button>

                    {/* Function Button */}
                    <button onClick={() => setModalOpen(true)} className="relative group border border-[#308AE3] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                        <img className="h-8" src={assets.functionPic} alt="function" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Function
                        </span>
                    </button>

                    {/* Cancel Button */}
                    <button className="relative group border border-[#F14545] p-1 rounded-lg hover:scale-105 dark:bg-gray-600">
                        <img className="h-8" src={assets.cancel} alt="cancel" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Cancel
                        </span>
                    </button>
                </div>

                {/* Display Picture */}
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
                            {/* The arrow is placed before the text and only appears when the link is active */}
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
            <Modal open={open} onClose={handleClose} aria-labelledby="modal-title" aria-describedby="modal-description">
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
                            <IconButton onClick={handleClose} className="hover:bg-red-100 no-print">
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
                                            <th className="py-2 text-left w-1/12">No.</th> {/* ✅ Numbering column */}
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
                                                        <td className="py-2 text-left">{index + 1}</td> {/* ✅ Numbering */}
                                                        <td className="py-2 break-words">{payment.payment_intent_id}</td>
                                                        <td className="py-2 break-words">{payment.purpose}</td>
                                                        <td className="py-2 text-left px-2">${payment.amount}</td>
                                                        <td className="py-2">{new Date(payment.date_completed).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                                {/* ✅ Total Payments Row */}
                                                <tr className="border-t border-gray-500 font-bold">
                                                    <td colSpan={3} className="py-2 text-right">Total Payments</td>
                                                    <td className="py-2 text-right">
                                                        ${Number(student.payments.reduce((total, payment) => total + parseFloat(String(payment.amount || "0")), 0)).toFixed(2)}
                                                    </td>
                                                    <td></td> {/* Empty column to maintain structure */}
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
                                            <th className="py-2 text-left w-1/12">No.</th> {/* ✅ Numbering column */}
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
                                                        <td className="py-2">{index + 1}</td> {/* ✅ Numbering */}
                                                        <td className="py-2 break-words">{expense.reference_id}</td>
                                                        <td className="py-2 break-words">{expense.purporse}</td>
                                                        <td className="py-2 text-left px-2">${expense.amount.toFixed(2)}</td>
                                                        <td className="py-2">{new Date(expense.date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                                {/* ✅ Total Expenses Row */}
                                                <tr className="border-t border-b border-gray-300 font-bold">
                                                    <td colSpan={3} className="py-2 text-right">Total Expenses</td>
                                                    <td className="py-2 text-right">
                                                        ${student.expenditure.reduce((total, expense) => total + expense.amount, 0).toFixed(2)}
                                                    </td>
                                                    <td></td> {/* Empty column to maintain structure */}
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
                        <div className="flex justify-start">
                            <button onClick={handlePrint} className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700">
                                <PrintIcon />
                            </button>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">
                                Close
                            </button>
                        </div>
                    </div>
                </Box>
            </Modal>

            <Modal open={open2} onClose={() => setOpen(false)} aria-labelledby="modal-title">
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
                    <Typography id="modal-title" variant="h6" component="h2" className="text-center text-white font-bold bg-[#2164A6] rounded-xl py-2">
                        Disburse Loan
                    </Typography>

                    {message && <Typography className="text-red-500 text-center my-2">{message}</Typography>}

                    {/* ✅ Form */}
                    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
                        {/* <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            className="bg-white shadow rounded"
                            onChange={handleChange}
                            required
                        /> */}
                        <TextField
                            fullWidth
                            label="Loan ID"
                            name="loan_id"
                            type="text"
                            value={formData.loan_id}
                            className="bg-white shadow rounded"
                            onChange={handleChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Loan Amount ($)"
                            name="loan_amount"
                            type="number"
                            value={formData.loan_amount}
                            className="bg-white shadow rounded"
                            onChange={handleChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Loan Reference"
                            name="loan_ref"
                            type="text"
                            value={formData.loan_ref}
                            className="bg-white shadow rounded"
                            onChange={handleChange}
                            required
                        />

                        {/* ✅ Purpose Select Dropdown */}
                        <FormControl fullWidth required>
                            <InputLabel>Purpose</InputLabel>
                            <Select name="disburse_purpose" value={formData.disburse_purpose} onChange={handleSelectChange} label="purpose" className="bg-white shadow rounded">
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
                            value={formData.disburse_date}
                            className="bg-white shadow rounded"
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            required
                        />

                        {/* ✅ Buttons */}
                        <div className="flex justify-between mt-4">
                            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? "Processing..." : "Submit"}
                            </Button>
                            <Button type="button" onClick={() => setOpen2(false)} variant="outlined" color="error">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Box>
            </Modal>
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
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

                            {/* Conditional "Activate/Disable" options */}
                            {/* {userStatus === "active" ? (
                                <MenuItem value="disable">Disable</MenuItem>
                            ) : (
                                <MenuItem value="active">Activate</MenuItem>
                            )} */}
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
                    <Button onClick={() => setModalOpen(false)} color="error">Cancel</Button>
                    <Button onClick={handleSubmit2} color="primary" variant="contained">Submit</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
                <Alert severity={snackbar.severity as "success" | "error" | "warning"}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
}

export default MemberSidenav;
