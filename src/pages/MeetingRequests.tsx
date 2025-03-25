import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    Alert,
    Box,
    Typography,
    Chip,
    Paper,
    Tooltip,
    Select,
    MenuItem
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
    sn?: number;
    meeting_status?: string;
}

interface AdvisoryTeam {
    email: string;
}

interface ProposedCourse {
    id: number;
    school: string;
    course: string;
    school_name: string;
    program_name: string;
}

interface School {
    id: string;
    school_name: string;
}

interface Course {
    id: string;
    program_name: string;
}

export const currentUserEmail = "admin_test_one@gmail.com";

const MeetingRequests: React.FC = () => {
    const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
    const [filteredMeetings, setFilteredMeetings] = useState<MeetingRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openEndModal, setOpenEndModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<MeetingRequest | null>(null);
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [advisoryTeam, setAdvisoryTeam] = useState<AdvisoryTeam[]>([]);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [viewLogsDialogOpen, setViewLogsDialogOpen] = useState(false);
    const [meetModalOpen, setMeetModalOpen] = useState(false);
    const [proposeCourseDialogOpen, setProposeCourseDialogOpen] = useState(false);
    const [markAttendedModalOpen, setMarkAttendedModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedAdvisor, setSelectedAdvisor] = useState("");
    const [logs, setLogs] = useState<any[]>([]);
    const [proposedCourses, setProposedCourses] = useState<ProposedCourse[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [school, setSchool] = useState("");
    const [course, setCourse] = useState("");
    const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
    const [shareAdvisors, setShareAdvisors] = useState<AdvisoryTeam[]>([]);

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/meeting_requests_api.php";
    const SINGLE_ROOM_API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php";

    useEffect(() => {
        fetchMeetingRequests();
    }, []);

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

    const fetchMeetingRequests = async () => {
        try {
            const response = await axios.get(`${API_URL}?type=meetings&advisor=${currentUserEmail}`);
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

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

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

    const fetchAdvisors = async () => {
        try {
            const response = await axios.get(SINGLE_ROOM_API_URL, {
                params: { action: "fetch_advisors", current_advisor: currentUserEmail },
            });
            if (response.data.success) {
                return response.data.data;
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Failed to fetch advisors",
                    severity: "error",
                });
                return [];
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching advisors",
                severity: "error",
            });
            return [];
        }
    };

    const fetchLogs = async (email: string) => {
        try {
            const response = await axios.get(SINGLE_ROOM_API_URL, {
                params: { action: "view_logs", email },
            });
            if (response.data.success) {
                setLogs(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Failed to fetch logs",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching logs",
                severity: "error",
            });
        }
    };

    const fetchProposedCourses = async (app_id: number) => {
        try {
            const response = await axios.get(SINGLE_ROOM_API_URL, {
                params: { action: "fetch_proposed_courses", app_id },
            });
            if (response.data.success) {
                setProposedCourses(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Failed to fetch proposed programs",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching proposed programs",
                severity: "error",
            });
        }
    };

    const fetchSchools = async () => {
        try {
            const response = await axios.get(SINGLE_ROOM_API_URL, {
                params: { action: "fetch_schools" },
            });
            if (response.data.success) {
                setSchools(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Failed to fetch schools",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching schools",
                severity: "error",
            });
        }
    };

    const fetchCourses = async (school_id: string) => {
        try {
            const response = await axios.get(SINGLE_ROOM_API_URL, {
                params: { action: "fetch_courses", school_id },
            });
            if (response.data.success) {
                setCourses(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Failed to fetch programs",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching programs",
                severity: "error",
            });
        }
    };

    const handleCancelIndividual = () => {
        if (selectedMeeting && window.Calendly) {
            window.Calendly.initPopupWidget({ url: selectedMeeting.cancel_url });
            setCancelModalOpen(false);
        } else {
            setSnackbar({
                open: true,
                message: "Calendly widget not available or no cancel URL",
                severity: "error",
            });
        }
    };

    const handleCancelEvent = async () => {
        if (selectedMeeting) {
            try {
                setIsSubmitting(true);
                const response = await axios.post(SINGLE_ROOM_API_URL, {
                    action: "cancel_meeting",
                    app_id: selectedMeeting.id,
                    cancel_type: "event",
                });
                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: "Event cancellation requested. Please refresh to see updates.",
                        severity: "success",
                    });
                    fetchMeetingRequests();
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Failed to cancel event",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error canceling event",
                    severity: "error",
                });
            } finally {
                setIsSubmitting(false);
                setCancelModalOpen(false);
            }
        }
    };

    const handleEndMeeting = async () => {
        if (selectedMeeting && remarks) {
            try {
                setIsSubmitting(true);
                const response = await axios.post(SINGLE_ROOM_API_URL, {
                    action: "end_meeting",
                    app_id: selectedMeeting.id,
                    remarks,
                });
                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: "Meeting ended successfully",
                        severity: "success",
                    });
                    fetchMeetingRequests();
                    setMeetModalOpen(false); // Close Meet modal
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Failed to end meeting",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error ending meeting",
                    severity: "error",
                });
            } finally {
                setIsSubmitting(false);
                setOpenEndModal(false);
                setRemarks("");
            }
        }
    };

    const handleShareMeeting = async () => {
        if (selectedMeeting && selectedAdvisor) {
            try {
                setIsSubmitting(true);
                const response = await axios.post(SINGLE_ROOM_API_URL, {
                    action: "share_meeting",
                    email: selectedMeeting.email,
                    new_advisor: selectedAdvisor,
                });
                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: "Meeting shared successfully",
                        severity: "success",
                    });
                    fetchMeetingRequests();
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Failed to share meeting",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error sharing meeting",
                    severity: "error",
                });
            } finally {
                setIsSubmitting(false);
                setShareDialogOpen(false);
                setSelectedAdvisor("");
            }
        }
    };

    const handleProposeCourse = async () => {
        if (selectedMeeting && school && course) {
            try {
                setIsSubmitting(true);
                const response = await axios.post(SINGLE_ROOM_API_URL, {
                    action: "propose_course",
                    app_id: selectedMeeting.id,
                    school,
                    course,
                });
                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: "Program proposed successfully",
                        severity: "success",
                    });
                    fetchProposedCourses(selectedMeeting.id);
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Failed to propose program",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error proposing program",
                    severity: "error",
                });
            } finally {
                setIsSubmitting(false);
                setProposeCourseDialogOpen(false);
                setSchool("");
                setCourse("");
            }
        }
    };

    const handleMarkAttended = () => {
        if (selectedMeeting) {
            setMarkAttendedModalOpen(true);
        }
    };

    const confirmMarkAttended = async () => {
        if (selectedMeeting) {
            try {
                setIsSubmitting(true);
                const response = await axios.post(SINGLE_ROOM_API_URL, {
                    action: "mark_attended",
                    app_id: selectedMeeting.id,
                });
                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: "Student marked attended successfully",
                        severity: "success",
                    });
                    fetchMeetingRequests();
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Failed to mark attended",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error marking attended",
                    severity: "error",
                });
            } finally {
                setIsSubmitting(false);
                setMarkAttendedModalOpen(false);
            }
        }
    };

    const handleDeleteProposedCourse = (proposed_course_id: number) => {
        setCourseToDelete(proposed_course_id);
        setDeleteModalOpen(true);
    };

    const confirmDeleteProposedCourse = async () => {
        if (courseToDelete !== null && selectedMeeting) {
            try {
                setIsSubmitting(true);
                const response = await axios.post(SINGLE_ROOM_API_URL, {
                    action: "delete_proposed_course",
                    proposed_course_id: courseToDelete,
                });
                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: "Proposed school removed successfully",
                        severity: "success",
                    });
                    fetchProposedCourses(selectedMeeting.id);
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Failed to delete proposed program",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error deleting proposed program",
                    severity: "error",
                });
            } finally {
                setIsSubmitting(false);
                setDeleteModalOpen(false);
                setCourseToDelete(null);
            }
        }
    };

    const handleOpenEndModal = (meeting: MeetingRequest) => {
        setSelectedMeeting(meeting);
        setOpenEndModal(true);
    };

    useEffect(() => {
        const fetchAdvisoryTeam = async () => {
            try {
                const response = await axios.get(`${API_URL}?type=advisory&category=career`);
                if (response.data.success) {
                    setAdvisoryTeam(response.data.data);
                } else {
                    throw new Error(response.data.message || "Failed to fetch data");
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Failed to fetch advisory team!",
                    severity: "error",
                });
            }
        };
        fetchAdvisoryTeam();
    }, []);

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
                params.row.meeting_frequency === 0 ? (
                    <Chip label="First Time" color="success" size="small" />
                ) : (
                    <Chip label={`${params.row.meeting_frequency + 1} Times`} color="primary" size="small" />
                )
            ),
        },
        {
            field: "actions",
            headerName: "Action",
            flex: 4,
            sortable: false,
            renderCell: (params: GridRenderCellParams<MeetingRequest>) => {
                const meeting = params.row;
                return (
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", height: "100%" }}>
                        {meeting.advisor === currentUserEmail && (
                            <>
                                <Tooltip title="Meet">
                                    <Button
                                        variant="outlined"
                                        color="success"
                                        size="small"
                                        onClick={() => {
                                            setSelectedMeeting(meeting);
                                            fetchProposedCourses(meeting.id);
                                            setMeetModalOpen(true);
                                        }}
                                    >
                                        <MeetingRoomIcon />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => {
                                            setSelectedMeeting(meeting);
                                            setCancelModalOpen(true);
                                        }}
                                    >
                                        <CancelIcon />
                                    </Button>
                                </Tooltip>
                                {meeting.has_logs ? (
                                    <Tooltip title="End">
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            size="small"
                                            onClick={() => handleOpenEndModal(meeting)}
                                            // disabled={meeting.meeting_status === "4"}
                                        >
                                            <CheckCircleIcon />
                                        </Button>
                                    </Tooltip>
                                ) : null}
                                <Tooltip title="Share">
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                        onClick={async () => {
                                            setSelectedMeeting(meeting);
                                            const advisors = await fetchAdvisors();
                                            setShareAdvisors(advisors);
                                            setShareDialogOpen(true);
                                        }}
                                    >
                                        <ShareIcon />
                                    </Button>
                                </Tooltip>
                            </>
                        )}
                        {meeting.has_logs ? (
                            <Tooltip title="View">
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    onClick={() => {
                                        setSelectedMeeting(meeting);
                                        fetchLogs(meeting.email);
                                        setViewLogsDialogOpen(true);
                                    }}
                                >
                                    <VisibilityIcon />
                                </Button>
                            </Tooltip>
                        ) : null}
                    </Box>
                );
            },
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
                                                        <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                                                            Career Advisory Feedback Meetings Table
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-4 mb-4">
                                                        {advisoryTeam.some((teamMember) => teamMember.email === currentUserEmail) && (
                                                            <Button
                                                                key={currentUserEmail}
                                                                component={Link}
                                                                to={`/school-admission/meeting-requests/my-room?email=${currentUserEmail}`}
                                                                variant="contained"
                                                                color="success"
                                                                className="m-1"
                                                            >
                                                                My Room
                                                            </Button>
                                                        )}
                                                        {advisoryTeam
                                                            .filter((teamMember) => teamMember.email !== currentUserEmail)
                                                            .map((teamMember, _index) => {
                                                                const roomName = `room of ${teamMember.email}`;
                                                                return (
                                                                    <Button
                                                                        key={teamMember.email}
                                                                        component={Link}
                                                                        to={`/school-admission/meeting-requests/${roomName}?email=${teamMember.email}`}
                                                                        variant="contained"
                                                                        color="primary"
                                                                        className="m-1"
                                                                    >
                                                                        Room of {teamMember.email}
                                                                    </Button>
                                                                );
                                                            })}
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
                                                        <Button variant="contained" color="primary" onClick={handleExportExcel}>
                                                            Export to Excel
                                                        </Button>
                                                    </div>
                                                    <div style={{ height: 400, width: "100%" }}>
                                                        <DataGrid
                                                            rows={filteredMeetings}
                                                            columns={columns}
                                                            initialState={{
                                                                pagination: { paginationModel: { pageSize: 10 } },
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

            {/* Meet Modal */}
            <Dialog open={meetModalOpen} onClose={() => setMeetModalOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Meeting Details for {selectedMeeting?.email}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => {
                                fetchSchools();
                                setProposeCourseDialogOpen(true);
                            }}
                        >
                            Propose Program
                        </Button>
                        <Button
                            variant="outlined"
                            color="success"
                            onClick={handleMarkAttended}
                            disabled={selectedMeeting?.meeting_status === "2"}
                        >
                            {selectedMeeting?.meeting_status === "2" ? "Marked Attended" : "Mark Attended"}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setOpenEndModal(true)}
                        >
                            Confirm Details
                        </Button>
                    </Box>
                    <div style={{ height: 400, width: "100%" }}>
                        <DataGrid
                            rows={proposedCourses}
                            columns={[
                                { field: "id", headerName: "ID", width: 100 },
                                { field: "school_name", headerName: "Proposed School", width: 300 },
                                { field: "program_name", headerName: "Proposed Program", width: 300 },
                                {
                                    field: "actions",
                                    headerName: "Action",
                                    width: 150,
                                    renderCell: (params: GridRenderCellParams<ProposedCourse>) => (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteProposedCourse(params.row.id)}
                                        >
                                            Delete
                                        </Button>
                                    ),
                                },
                            ]}
                            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                            pageSizeOptions={[5, 10, 20]}
                            disableRowSelectionOnClick
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMeetModalOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Propose Course Modal */}
            <Dialog open={proposeCourseDialogOpen} onClose={() => setProposeCourseDialogOpen(false)}>
                <DialogTitle>Propose a Program</DialogTitle>
                <DialogContent>
                    <DialogContentText>Propose a program for {selectedMeeting?.email}.</DialogContentText>
                    <Select
                        value={school}
                        onChange={(e) => {
                            setSchool(e.target.value);
                            setCourse("");
                            fetchCourses(e.target.value);
                        }}
                        displayEmpty
                        fullWidth
                        variant="standard"
                        sx={{ mt: 2 }}
                    >
                        <MenuItem value="">Select a School</MenuItem>
                        {schools.map((school) => (
                            <MenuItem key={school.id} value={school.id}>
                                {school.school_name}
                            </MenuItem>
                        ))}
                    </Select>
                    <Select
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        displayEmpty
                        fullWidth
                        variant="standard"
                        disabled={!school}
                        sx={{ mt: 2 }}
                    >
                        <MenuItem value="">Select a Program</MenuItem>
                        {courses.map((course) => (
                            <MenuItem key={course.id} value={course.id}>
                                {course.program_name}
                            </MenuItem>
                        ))}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setProposeCourseDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleProposeCourse} disabled={isSubmitting || !school || !course}>
                        {isSubmitting ? "Proposing..." : "Propose"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mark Attended Modal */}
            <Dialog open={markAttendedModalOpen} onClose={() => setMarkAttendedModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Mark Attended</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to mark {selectedMeeting?.email} as attended for the meeting on{" "}
                        {selectedMeeting?.date} at {selectedMeeting?.time}? This action will update the meeting status.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMarkAttendedModalOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmMarkAttended}
                        color="success"
                        variant="contained"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Marking..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Proposed Course Modal */}
            <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this proposed program? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteModalOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDeleteProposedCourse}
                        color="error"
                        variant="contained"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Meeting Modal */}
            <Dialog open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Cancel Meeting</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Choose how to cancel the meeting with {selectedMeeting?.email} scheduled for {selectedMeeting?.date} at{" "}
                        {selectedMeeting?.time}.
                    </DialogContentText>
                    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleCancelIndividual}
                            disabled={!selectedMeeting?.cancel_url || isSubmitting}
                        >
                            Cancel Only for This Invitee
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleCancelEvent}
                            disabled={isSubmitting || !selectedMeeting?.event}
                        >
                            {isSubmitting ? "Canceling..." : "Cancel for All Invitees in This Slot"}
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelModalOpen(false)} disabled={isSubmitting}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

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
                    <Button onClick={() => setOpenEndModal(false)} color="secondary" disabled={isSubmitting}>
                        Close
                    </Button>
                    <Button
                        onClick={handleEndMeeting}
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || !remarks}
                    >
                        {isSubmitting ? "Ending..." : "End"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Share Meeting Modal */}
            <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
                <DialogTitle>Share Meeting</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Select an advisor to share the meeting with {selectedMeeting?.email}.
                    </DialogContentText>
                    <Select
                        value={selectedAdvisor}
                        onChange={(e) => setSelectedAdvisor(e.target.value)}
                        displayEmpty
                        fullWidth
                        variant="standard"
                    >
                        <MenuItem value="" disabled>
                            Select Advisor
                        </MenuItem>
                        {shareAdvisors.map((advisor) => (
                            <MenuItem key={advisor.email} value={advisor.email}>
                                {advisor.email}
                            </MenuItem>
                        ))}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShareDialogOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleShareMeeting}
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || !selectedAdvisor}
                    >
                        {isSubmitting ? "Sharing..." : "Share"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Logs Modal */}
            <Dialog open={viewLogsDialogOpen} onClose={() => setViewLogsDialogOpen(false)} maxWidth="md">
                <DialogTitle>Meeting Logs for {selectedMeeting?.email}</DialogTitle>
                <DialogContent>
                    {logs.length > 0 ? (
                        logs.map((log, index) => (
                            <Box key={index} sx={{ mb: 2 }}>
                                <Typography variant="subtitle1">Meeting {index + 1}</Typography>
                                <Typography variant="body2">Date: {log.date}</Typography>
                                <Typography variant="body2">Time: {log.time}</Typography>
                                <Typography variant="body2">Advisor: {log.advisor}</Typography>
                                <Typography variant="body2">Schools: {log.schools}</Typography>
                                <Typography variant="body2">Remarks: {log.remarks}</Typography>
                            </Box>
                        ))
                    ) : (
                        <Typography>No logs found</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewLogsDialogOpen(false)}>Close</Button>
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

export default MeetingRequests;