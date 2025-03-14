import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    IconButton,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    InputAdornment,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

interface GMATBooking {
    id: number;
    email: string;
    fullnames: string;
    gmat_email: string;
    exam_type: number;
    username: string;
    password: string;
    exam_center: string;
    country: string;
    exam_date_one: string;
    exam_date_two: string;
    exam_date_three: string;
    status: string;
    sn?: number; // Serial number added dynamically
}

const GMATBookings: React.FC = () => {
    const [bookings, setBookings] = useState<GMATBooking[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<GMATBooking | null>(null);
    const [openApproveModal, setOpenApproveModal] = useState(false);
    const [openRejectModal, setOpenRejectModal] = useState(false);
    const [openDetailsModal, setOpenDetailsModal] = useState(false); // New state
    const [selectedDate, setSelectedDate] = useState("");
    const [time, setTime] = useState("");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/gmat_bookings_api.php";

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${API_URL}`);
            if (response.data.success) {
                const validBookings = response.data.bookings.filter(
                    (booking: GMATBooking) => booking.exam_center && booking.country
                );
                setBookings(validBookings);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "No bookings found",
                    severity: "warning",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching bookings",
                severity: "error",
            });
        }
    };

    const handleApprove = async () => {
        if (!selectedBooking || !selectedDate || !time) {
            setSnackbar({
                open: true,
                message: "Please select a date and time",
                severity: "warning",
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("action", "approve");
            formData.append("id", selectedBooking.id.toString());
            formData.append("date", selectedDate);
            formData.append("time", time);
            formData.append("email", selectedBooking.email);
            formData.append("personal_email", selectedBooking.email);

            const response = await axios.post(API_URL, formData);
            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Booking approved successfully",
                    severity: "success",
                });
                setOpenApproveModal(false);
                fetchBookings();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error approving booking",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error approving booking",
                severity: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedBooking || !comment) {
            setSnackbar({
                open: true,
                message: "Please provide a rejection reason",
                severity: "warning",
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("action", "reject");
            formData.append("id", selectedBooking.id.toString());
            formData.append("comment", comment);
            formData.append("status", selectedBooking.status);

            const response = await axios.post(API_URL, formData);
            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Booking rejected successfully",
                    severity: "success",
                });
                setOpenRejectModal(false);
                fetchBookings();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error rejecting booking",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error rejecting booking",
                severity: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns: GridColDef<GMATBooking>[] = [
        { field: "sn", headerName: "Id", flex: 1, valueGetter: (_, row) => row.sn },
        { field: "email", headerName: "Email", flex: 2 },
        { field: "fullnames", headerName: "Name", flex: 2 },
        {
            field: "exam_type",
            headerName: "Exam Type",
            flex: 1,
            renderCell: (params) => (
                <span className={params.value === 1 ? "badge bg-info" : "badge bg-success"}>
                    {params.value === 1 ? "Classic" : "Focus"}
                </span>
            ),
        },
        { field: "username", headerName: "Username", flex: 1 },
        { field: "password", headerName: "Password", flex: 1 },
        { field: "exam_center", headerName: "Center", flex: 2 },
        { field: "exam_date_one", headerName: "Date 1", flex: 2 },
        { field: "exam_date_two", headerName: "Date 2", flex: 2 },
        { field: "exam_date_three", headerName: "Date 3", flex: 2 },
        {
            field: "action",
            headerName: "Action",
            flex: 2,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <>
                    <IconButton
                        title="Approve"
                        onClick={() => {
                            setSelectedBooking(params.row);
                            setOpenApproveModal(true);
                        }}
                    >
                        <CheckIcon className="text-green-600" />
                    </IconButton>
                    <IconButton
                        title="Reject"
                        onClick={() => {
                            setSelectedBooking(params.row);
                            setOpenRejectModal(true);
                        }}
                    >
                        <CloseIcon className="text-red-600" />
                    </IconButton>
                </>
            ),
        },
    ];

    const rows = bookings.map((booking, index) => ({ ...booking, sn: index + 1 }));

    return (
        <main className="min-h-[80vh] p-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                    GMAT Bookings
                </p>
            </div>

            <div className="bg-white mt-8 rounded-lg shadow-md overflow-x-auto">
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: "No bookings found!" }}
                    className="border-none"
                    autoHeight
                    onCellClick={(params) => {
                        if (params.field !== "action") {
                            setSelectedBooking(params.row);
                            setOpenDetailsModal(true);
                        }
                    }}
                />
            </div>

            {/* Details Modal */}
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md">
                <DialogTitle>Booking Details for {selectedBooking?.fullnames}</DialogTitle>
                <DialogContent>
                    {selectedBooking && (
                        <div>
                            <p><strong>ID:</strong> {selectedBooking.id}</p>
                            <p><strong>Email:</strong> {selectedBooking.email}</p>
                            <p><strong>Full Names:</strong> {selectedBooking.fullnames}</p>
                            <p><strong>GMAT Email:</strong> {selectedBooking.gmat_email}</p>
                            <p><strong>Exam Type:</strong> {selectedBooking.exam_type === 1 ? "Classic" : "Focus"}</p>
                            <p><strong>Username:</strong> {selectedBooking.username}</p>
                            <p><strong>Password:</strong> {selectedBooking.password}</p>
                            <p><strong>Exam Center:</strong> {selectedBooking.exam_center}</p>
                            <p><strong>Country:</strong> {selectedBooking.country}</p>
                            <p><strong>Exam Date One:</strong> {selectedBooking.exam_date_one}</p>
                            <p><strong>Exam Date Two:</strong> {selectedBooking.exam_date_two}</p>
                            <p><strong>Exam Date Three:</strong> {selectedBooking.exam_date_three}</p>
                            <p><strong>Status:</strong> {selectedBooking.status}</p>
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Approve Modal */}
            <Dialog open={openApproveModal} onClose={() => setOpenApproveModal(false)}>
                <DialogTitle>Set GMAT Date</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Date</InputLabel>
                        <Select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            label="Select Date"
                        >
                            <MenuItem value={selectedBooking?.exam_date_one.substring(0, 10)}>
                                Date 1: {selectedBooking?.exam_date_one}
                            </MenuItem>
                            <MenuItem value={selectedBooking?.exam_date_two.substring(0, 10)}>
                                Date 2: {selectedBooking?.exam_date_two}
                            </MenuItem>
                            <MenuItem value={selectedBooking?.exam_date_three.substring(0, 10)}>
                                Date 3: {selectedBooking?.exam_date_three}
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        sx={{ mt: 2 }}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"></InputAdornment>,
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenApproveModal(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApprove}
                        color="primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Approving..." : "Approve"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={openRejectModal} onClose={() => setOpenRejectModal(false)}>
                <DialogTitle>Reject Booking</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Rejection Reason"
                        multiline
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRejectModal(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReject}
                        color="error"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Rejecting..." : "Reject"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
};

export default GMATBookings;