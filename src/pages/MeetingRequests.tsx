import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Box,
    Typography,
    Chip,
    Paper,
    Tooltip
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import CancelIcon from "@mui/icons-material/Cancel";
import ShareIcon from "@mui/icons-material/Share";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import * as XLSX from "xlsx";

interface MeetingRequest {
    id: number;
    email: string;
    date: string;
    time: string;
    advisor: string;
    advisor_name: string;
    meeting_frequency: number;
    has_logs: boolean;
    event: string;
    cancel_url: string;
    sn?: number; // Serial number for display
}

const MeetingRequests: React.FC = () => {
    // State variables
    const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
    const [filteredMeetings, setFilteredMeetings] = useState<MeetingRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openEndModal, setOpenEndModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<MeetingRequest | null>(null);
    const [remarks, setRemarks] = useState("");
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

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/meeting_requests_api.php";
    const currentUserEmail = "admin_test_one@gmail.com"; // Replace with actual logged-in user email

    // Fetch meeting requests on component mount
    useEffect(() => {
        fetchMeetingRequests();
    }, []);

    // Filter meetings when search query changes
    useEffect(() => {
        if (searchQuery) {
            setFilteredMeetings(
                meetings.filter(
                    (meeting) =>
                        meeting.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        meeting.date.includes(searchQuery) ||
                        meeting.time.includes(searchQuery) ||
                        meeting.advisor_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredMeetings(meetings);
        }
    }, [searchQuery, meetings]);

    // Fetch meeting requests from API
    const fetchMeetingRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}?advisor=${currentUserEmail}`);
            if (response.data.success) {
                const meetingsWithSn = response.data.data.map((meeting: MeetingRequest, index: number) => ({
                    ...meeting,
                    sn: index + 1,
                }));
                setMeetings(meetingsWithSn);
                setFilteredMeetings(meetingsWithSn);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching meeting requests",
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
        const exportData = filteredMeetings.map((meeting) => ({
            ID: meeting.sn,
            Email: meeting.email,
            Date: meeting.date,
            Time: meeting.time,
            Advisor: meeting.advisor_name,
            Frequency: meeting.meeting_frequency === 0 ? "First Time" : `${meeting.meeting_frequency + 1} Times`,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Meeting Requests");
        XLSX.writeFile(workbook, "meeting_requests.xlsx");
    };

    // Handle end meeting submission
    const handleEndMeeting = async () => {
        if (!selectedMeeting || !remarks) {
            setSnackbar({
                open: true,
                message: "Please provide remarks",
                severity: "error",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post(API_URL, {
                action: "complete_meeting",
                meeting_id: selectedMeeting.id,
                remarks: remarks,
            });

            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: "Meeting ended successfully",
                    severity: "success",
                });
                setOpenEndModal(false);
                setRemarks("");
                fetchMeetingRequests();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error ending meeting",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error submitting data",
                severity: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle cancel meeting
    const handleCancelMeeting = async (meeting: MeetingRequest) => {
        try {
            const response = await axios.post(API_URL, {
                action: "cancel_meeting",
                id: meeting.cancel_url,
                event: meeting.event,
            });

            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: "Meeting canceled successfully",
                    severity: "success",
                });
                fetchMeetingRequests();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error canceling meeting",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error submitting request",
                severity: "error",
            });
        }
    };

    // Open end meeting modal
    const handleOpenEndModal = (meeting: MeetingRequest) => {
        setSelectedMeeting(meeting);
        setOpenEndModal(true);
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "email", headerName: "Member Email", flex: 2 },
        { field: "date", headerName: "Meeting Date", flex: 1 },
        { field: "time", headerName: "Meeting Time", flex: 1 },
        { field: "advisor_name", headerName: "Advisor", flex: 1 },
        {
            field: "meeting_frequency",
            headerName: "Frequency",
            flex: 1,
            renderCell: (params) => (
                params.row.meeting_frequency === 0 ?
                    <Chip label="First Time" color="success" size="small" /> :
                    <Chip label={`${params.row.meeting_frequency + 1} Times`} color="primary" size="small" />
            )
        },
        {
            field: "actions",
            headerName: "Action",
            flex: 4,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%', }}>
                    {params.row.advisor === currentUserEmail && (
                        <>
                            <Tooltip title="Meet">
                                <Button
                                    component={Link}
                                    to={`/student-feedback/${params.row.id}`}
                                    variant="outlined"
                                    color="success"
                                    size="small"
                                >
                                    <MeetingRoomIcon />
                                </Button>
                            </Tooltip>

                            <Tooltip title="Cancel">
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => handleCancelMeeting(params.row)}
                                >
                                    <CancelIcon />
                                </Button>
                            </Tooltip>

                            {params.row.has_logs ? (
                                <Tooltip title="End">
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        size="small"
                                        onClick={() => handleOpenEndModal(params.row)}
                                    >
                                        <CheckCircleIcon />
                                    </Button>
                                </Tooltip>
                            ) : null}

                            <Tooltip title="Share">
                                <Button
                                    component={Link}
                                    to={`/share/${params.row.email}/${currentUserEmail}`}
                                    variant="outlined"
                                    color="warning"
                                    size="small"
                                >
                                    <ShareIcon />
                                </Button>
                            </Tooltip>
                        </>
                    )}

                    {params.row.has_logs ? (
                        <Tooltip title="View">
                            <Button
                                component={Link}
                                to={`/school-app-log/${params.row.email}`}
                                variant="outlined"
                                color="primary"
                                size="small"
                            >
                                <VisibilityIcon />
                            </Button>
                        </Tooltip>
                    ) : null}
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
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                                                        <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">Career Advisory Feedback Meetings Table</p>
                                                    </div>
                                                    <div className="flex gap-4 mb-4">
                                                        {/* Room buttons would go here */}
                                                        <Button
                                                            component={Link}
                                                            to={`/room/${currentUserEmail}`}
                                                            variant="contained"
                                                            color="success"
                                                            className="m-1"
                                                        >
                                                            My Room
                                                        </Button>
                                                        <Button
                                                            component={Link}
                                                            to="/room/room2"
                                                            variant="outlined"
                                                            color="primary"
                                                            className="m-1"
                                                        >
                                                            Room 2
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="card-body">
                                                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                                                    <div className="flex justify-between mb-3 gap-4">
                                                        <TextField
                                                            label="Search..."
                                                            variant="outlined"
                                                            size="small"
                                                            value={searchQuery}
                                                            onChange={handleSearch}
                                                            sx={{ width: "50%" }}
                                                        />
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={handleExportExcel}
                                                        >
                                                            Export to Excel
                                                        </Button>
                                                    </div>

                                                    <div style={{ height: 400, width: '100%' }}>
                                                        <DataGrid
                                                            rows={filteredMeetings}
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
                                                </Paper>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* End Meeting Modal */}
            <Dialog open={openEndModal} onClose={() => setOpenEndModal(false)}>
                <DialogTitle>End Meeting</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Please provide remarks for the meeting with {selectedMeeting?.email}
                    </Typography>
                    <TextField
                        label="Remarks"
                        multiline
                        rows={4}
                        fullWidth
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEndModal(false)} color="secondary">
                        Close
                    </Button>
                    <Button
                        onClick={handleEndMeeting}
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || !remarks}
                    >
                        {isSubmitting ? "Processing..." : "End"}
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
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default MeetingRequests;