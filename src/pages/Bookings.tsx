import React, { useEffect, useState, ReactNode } from "react";
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
    Box,
    Typography,
    InputLabel,
    FormControl,
    InputAdornment,
    Paper,
    Grid,
    Chip
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';
import DescriptionIcon from '@mui/icons-material/Description';
import CategoryIcon from '@mui/icons-material/Category';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PublicIcon from '@mui/icons-material/Public';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
// import PrintIcon from '@mui/icons-material/Print';
import * as XLSX from 'xlsx';

// Interface aligned with API fields from fetch_pending_booking_requests and SQL query
interface Booking {
    id: number;
    enrollment_id: number;
    email: string;
    fullnames: string;
    exam_type: number;
    test_type: string;
    username: string;
    password: string;
    exam_center: string;
    country: string;
    time: string;
    exam_date_one: string; // Maps to proposed_exam_date_one
    exam_date_two: string; // Maps to proposed_exam_date_two
    exam_date_three: string; // Maps to proposed_exam_date_three
    status: number;
    sn?: number; // Serial number for display
}

interface InfoItemProps {
    icon: ReactNode;
    label: string;
    value: string | number | null | undefined;
}

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [openApproveModal, setOpenApproveModal] = useState(false);
    const [openRejectModal, setOpenRejectModal] = useState(false);
    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [time, setTime] = useState("");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "warning" | "info";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    // Base URL from API documentation
    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/APIs/student_management/school-application/entrance_exams/exams.php"; // Update to your actual new API URL

    // Status mapping updated to include all 6 statuses per API documentation
    // const statusMap: { [key: number]: string } = {
    //     1: "Pending",
    //     2: "Approved",
    //     3: "Rejected",
    //     4: "Results Shared",
    //     5: "Results Not Shared",
    //     6: "Results Approved",
    // };

    useEffect(() => {
        fetchBookings();
    }, []);

    // Fetch pending bookings (status=1)
    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=fetch_pending_booking_requests&status=1`);
            console.log("API Response:", response);
            if (response.data.status === "success") {
                const transformedBookings = response.data.data.map((booking: any) => ({
                    id: booking.id,
                    enrollment_id: booking.enrollment_id,
                    email: booking.email,
                    fullnames: booking.fullnames,
                    exam_type: booking.exam_type,
                    test_type: booking.test_type,
                    username: booking.account_username,
                    password: booking.account_password,
                    exam_center: booking.exam_center,
                    country: booking.country,
                    time: booking.preferred_time_of_day,
                    exam_date_one: booking.proposed_exam_date_one,
                    exam_date_two: booking.proposed_exam_date_two,
                    exam_date_three: booking.proposed_exam_date_three,
                    status: booking.status,
                }));
                setBookings(transformedBookings);
                setFilteredBookings(transformedBookings);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "No pending bookings found",
                    severity: "info",
                });
            }
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || "Error fetching bookings",
                severity: "error",
            });
        }
    };

    // Search functionality
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredBookings(
            bookings.filter(
                (booking) =>
                    booking.fullnames.toLowerCase().includes(query) ||
                    booking.email.toLowerCase().includes(query) ||
                    booking.test_type.toLowerCase().includes(query)
            )
        );
    };

    // Approve booking (report_exam_booked)
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
            const response = await axios.get(
                `${API_URL}?action=report_exam_booked&exam_date=${selectedDate}&exam_time=${time}&booking_id=${selectedBooking.id}&enrollment_id=${selectedBooking.enrollment_id}`
            );
            if (response.data.status === "success") {
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
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || "Error approving booking",
                severity: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const InfoItem = ({ icon, label, value }: InfoItemProps) => (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ mr: 1.5, mt: 0.5 }}>
                {icon}
            </Box>
            <Box>
                <Typography variant="body2" color="text.secondary">
                    {label}
                </Typography>
                <Typography variant="body1">
                    {value || "Not specified"}
                </Typography>
            </Box>
        </Box>
    );

    // Helper function to format dates
    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return "Not specified";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    // Reject booking (reject_booking_request)
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
            const response = await axios.get(
                `${API_URL}?action=reject_booking_request&request_id=${selectedBooking.id}&enrollment_id=${selectedBooking.enrollment_id}&comment=${encodeURIComponent(comment)}`
            );
            if (response.data.status === "success") {
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
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || "Error rejecting booking",
                severity: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // DataGrid columns
    const columns: GridColDef<Booking>[] = [
        { field: "sn", headerName: "Id", flex: 1, valueGetter: (_, row) => row.sn },
        { field: "email", headerName: "Email", flex: 2 },
        { field: "fullnames", headerName: "Name", flex: 2 },
        { field: "test_type", headerName: "Test Type", flex: 1 },
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
        { field: "time", headerName: "Preferred Period", flex: 2 },
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

    const rows = filteredBookings.map((booking, index) => ({ ...booking, sn: index + 1 }));

    return (
        <main className="min-h-[80vh] p-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                    Exam Booking Requests
                </p>
            </div>

            <div className="flex flex-row gap-4 mb-4">
                <TextField
                    label="Search..."
                    variant="outlined"
                    fullWidth
                    value={searchQuery}
                    onChange={handleSearch}
                    sx={{ input: { backgroundColor: "white" }, flex: 1 }}
                />
                <Button
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    color="primary"
                    size="small"
                    onClick={() => {
                        const worksheet = XLSX.utils.json_to_sheet(filteredBookings);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");
                        XLSX.writeFile(workbook, "bookings.xlsx");
                    }}
                >
                    Export to Excel
                </Button>
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
                    onCellClick={(params) => {
                        if (params.field !== "action") {
                            setSelectedBooking(params.row);
                            setOpenDetailsModal(true);
                        }
                    }}
                />
            </div>

            {/* Details Modal */}
            <Dialog
                open={openDetailsModal}
                onClose={() => setOpenDetailsModal(false)}
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        overflow: 'hidden',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }
                }}
            >
                <Box sx={{
                    background: 'linear-gradient(90deg, #1976d2, #0d47a1)',
                    px: 3,
                    py: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Typography variant="h6" component="h2" sx={{ color: 'white', fontWeight: 500 }}>
                        Booking Details for {selectedBooking?.fullnames}
                    </Typography>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={() => setOpenDetailsModal(false)}
                        aria-label="close"
                        sx={{ color: 'white' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                <DialogContent sx={{ p: 3 }}>
                    {selectedBooking && (
                        <Box>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    mb: 3,
                                    bgcolor: '#f0f7ff',
                                    borderLeft: '4px solid #1976d2',
                                    borderRadius: 1,
                                    borderTop: 'none',
                                    borderRight: 'none',
                                    borderBottom: 'none'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <BadgeIcon sx={{ color: '#1976d2', mr: 1 }} fontSize="small" />
                                    <Typography fontWeight={500} color="#1976d2">
                                        Booking ID: {selectedBooking.id}
                                    </Typography>
                                </Box>
                            </Paper>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{
                                        borderBottom: '1px solid #e0e0e0',
                                        pb: 1,
                                        fontWeight: 500,
                                        color: '#424242'
                                    }}>
                                        Personal Information
                                    </Typography>

                                    <Box sx={{ mt: 2 }}>
                                        <InfoItem
                                            icon={<EmailIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Email"
                                            value={selectedBooking.email}
                                        />

                                        <InfoItem
                                            icon={<PersonIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Full Names"
                                            value={selectedBooking.fullnames}
                                        />

                                        <InfoItem
                                            icon={<AccountCircleIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Username"
                                            value={selectedBooking.username}
                                        />

                                        <InfoItem
                                            icon={<LockIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Password"
                                            value={selectedBooking.password}
                                        />
                                    </Box>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{
                                        borderBottom: '1px solid #e0e0e0',
                                        pb: 1,
                                        fontWeight: 500,
                                        color: '#424242'
                                    }}>
                                        Exam Details
                                    </Typography>

                                    <Box sx={{ mt: 2 }}>
                                        <InfoItem
                                            icon={<DescriptionIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Test Type"
                                            value={selectedBooking.test_type}
                                        />

                                        <InfoItem
                                            icon={<CategoryIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Exam Type"
                                            value={selectedBooking.exam_type === 1 ? "Classic" : "Focus"}
                                        />

                                        <InfoItem
                                            icon={<LocationOnIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Exam Center"
                                            value={selectedBooking.exam_center}
                                        />

                                        <InfoItem
                                            icon={<PublicIcon fontSize="small" sx={{ color: '#757575' }} />}
                                            label="Country"
                                            value={selectedBooking.country}
                                        />
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom sx={{
                                        borderBottom: '1px solid #e0e0e0',
                                        pb: 1,
                                        fontWeight: 500,
                                        color: '#424242'
                                    }}>
                                        Scheduling Information
                                    </Typography>

                                    <Box sx={{ mt: 2 }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={4}>
                                                <Paper elevation={0} sx={{
                                                    p: 2,
                                                    bgcolor: '#fafafa',
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    height: '100%'
                                                }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        First Choice
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                        <EventIcon fontSize="small" sx={{ color: '#1976d2', mr: 1 }} />
                                                        <Typography variant="body1">
                                                            {formatDate(selectedBooking.exam_date_one)}
                                                        </Typography>
                                                    </Box>
                                                </Paper>
                                            </Grid>

                                            <Grid item xs={12} sm={4}>
                                                <Paper elevation={0} sx={{
                                                    p: 2,
                                                    bgcolor: '#fafafa',
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    height: '100%'
                                                }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        Second Choice
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                        <EventIcon fontSize="small" sx={{ color: '#1976d2', mr: 1 }} />
                                                        <Typography variant="body1">
                                                            {formatDate(selectedBooking.exam_date_two)}
                                                        </Typography>
                                                    </Box>
                                                </Paper>
                                            </Grid>

                                            <Grid item xs={12} sm={4}>
                                                <Paper elevation={0} sx={{
                                                    p: 2,
                                                    bgcolor: '#fafafa',
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    height: '100%'
                                                }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        Third Choice
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                        <EventIcon fontSize="small" sx={{ color: '#1976d2', mr: 1 }} />
                                                        <Typography variant="body1">
                                                            {formatDate(selectedBooking.exam_date_three)}
                                                        </Typography>
                                                    </Box>
                                                </Paper>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                    <AccessTimeIcon fontSize="small" sx={{ color: '#757575', mr: 1 }} />
                                                    <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                                        Preferred Period:
                                                    </Typography>
                                                    <Chip
                                                        label={selectedBooking.time}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: '#e3f2fd',
                                                            color: '#1976d2',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>

                {/* <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Button
                        variant="outlined"
                        onClick={() => setOpenDetailsModal(false)}
                        startIcon={<CloseIcon />}
                        sx={{ textTransform: 'none', borderRadius: 1 }}
                    >
                        Close
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        sx={{ textTransform: 'none', borderRadius: 1, ml: 1 }}
                    >
                        Print Details
                    </Button>
                </DialogActions> */}
            </Dialog>

            {/* Approve Modal */}
            <Dialog open={openApproveModal} onClose={() => setOpenApproveModal(false)}>
                <DialogTitle>Set Exam Date and Time</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Date</InputLabel>
                        <Select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            label="Select Date"
                        >
                            <MenuItem value={selectedBooking?.exam_date_one}>
                                Date 1: {selectedBooking?.exam_date_one}
                            </MenuItem>
                            <MenuItem value={selectedBooking?.exam_date_two}>
                                Date 2: {selectedBooking?.exam_date_two}
                            </MenuItem>
                            <MenuItem value={selectedBooking?.exam_date_three}>
                                Date 3: {selectedBooking?.exam_date_three}
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Time (HH:MM)"
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
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenApproveModal(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApprove}
                        color="primary"
                        disabled={isSubmitting}
                        sx={{ textTransform: 'none' }}
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
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenRejectModal(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReject}
                        sx={{ textTransform: 'none' }}
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

export default Bookings;