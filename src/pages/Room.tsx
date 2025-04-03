import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
    GridToolbar
} from '@mui/x-data-grid';
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar,
    Alert,
    Box,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    TextField,
    Typography
} from '@mui/material';
import {
    AccessTime,
    Delete,
    Check,
    Share,
    Visibility
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { currentUserEmail } from './MeetingRequests';

interface MeetingRequest {
    id: number;
    email: string;
    date: string;
    time: string;
    advisor: string;
    advisor_name: string;
    meeting_frequency: number;
    has_student_log: boolean;
    cancel_url: string;
    event: string;
    isCurrentUserAdvisor: boolean;
    meeting_status?: string;
}

interface Advisor {
    email: string;
    name: string;
}

interface Log {
    date: string;
    time: string;
    advisor: string;
    schools: string;
    remarks: string;
}

interface School {
    id: string;
    school_name: string;
}

interface Course {
    id: string;
    program_name: string;
}

interface ProposedCourse {
    id: number;
    school: string;
    course: string;
    school_name: string;
    program_name: string;
}

declare global {
    interface Window {
        Calendly: {
            initPopupWidget: (options: { url: string }) => void;
        };
    }
}

const Room: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const advisorEmail = queryParams.get("email") || '';
    const [isSubmitting, setIsSubmitting] = useState(false);// For Cancel
    const [endMeetingDialogOpen, setEndMeetingDialogOpen] = useState(false); // For End Meeting
    const [shareDialogOpen, setShareDialogOpen] = useState(false); // For Share
    const [viewLogsDialogOpen, setViewLogsDialogOpen] = useState(false); // For View
    const [proposeCourseDialogOpen, setProposeCourseDialogOpen] = useState(false); // For Meet -> Propose Course
    const [remarks, setRemarks] = useState(''); // For End Meeting
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [selectedAdvisor, setSelectedAdvisor] = useState(''); // For Share
    const [logs, setLogs] = useState<Log[]>([]);
    const [school, setSchool] = useState(''); // For Propose Course
    const [course, setCourse] = useState(''); // For Propose Course

    const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [meetModalOpen, setMeetModalOpen] = useState(false);
    const [proposedCourses, setProposedCourses] = useState<ProposedCourse[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
    const [markAttendedModalOpen, setMarkAttendedModalOpen] = useState(false);

    const [cancelModalOpen, setCancelModalOpen] = useState(false);

    const fetchMeetingRequests = async () => {
        try {
            const response = await axios.get('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                params: { action: 'fetch_meetings', advisor: advisorEmail }
            });
            console.log('Raw API response:', response.data);
            if (response.data.success) {
                // Map API data and compute isCurrentUserAdvisor
                const mappedData = response.data.data.map((item: any) => ({
                    ...item,
                    advisor_name: item.advisor_name,
                    meeting_frequency: item.meeting_frequency,
                    has_student_log: item.has_student_log,
                    cancel_url: item.cancel_url,
                    isCurrentUserAdvisor: item.advisor === advisorEmail,
                    meeting_status: item.meeting_status
                }));
                setMeetingRequests(mappedData);
            } else {
                setError(response.data.message || 'Failed to fetch meeting requests');
            }
        } catch (err) {
            setError('Error connecting to the server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (advisorEmail) {
            fetchMeetingRequests();
        } else {
            setError('Advisor email is required');
            setLoading(false);
        }
    }, [advisorEmail]);

    const [selectedMeeting, setSelectedMeeting] = useState<MeetingRequest | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info' | 'warning'
    });

    // const handleMeetClick = (meeting: MeetingRequest) => {
    //     setSnackbar({
    //         open: true,
    //         message: `Meeting with ${meeting.email} initiated`,
    //         severity: 'success'
    //     });
    // };

    // const handleCancelClick = (meeting: MeetingRequest) => {
    //     setSelectedMeeting(meeting);
    //     setDeleteDialogOpen(true);
    // };


    // const handleShareClick = (meeting: MeetingRequest) => {
    //     setSnackbar({
    //         open: true,
    //         message: `Share dialog for ${meeting.email} would open here`,
    //         severity: 'info'
    //     });
    // };

    // const handleViewClick = (meeting: MeetingRequest) => {
    //     setSnackbar({
    //         open: true,
    //         message: `Viewing student log for ${meeting.email}`,
    //         severity: 'info'
    //     });
    // };

    // const handleCloseSnackbar = () => {
    //     setSnackbar({ ...snackbar, open: false });
    // };

    const columns: GridColDef[] = [
        {
            field: 'email',
            headerName: 'Member Email',
            flex: 2,
        },
        {
            field: 'date',
            headerName: 'Meeting Date',
            flex: 1
        },
        {
            field: 'time',
            headerName: 'Meeting Time',
            flex: 1
        },
        {
            field: 'advisor_name', // Updated to use advisor_name from API
            headerName: 'Advisor',
            flex: 1
        },
        {
            field: 'meeting_frequency', // Updated to use meeting_frequency
            headerName: 'Frequency',
            flex: 1,
            renderCell: (params: GridRenderCellParams<MeetingRequest>) => {
                const meeting = params.row;
                return (
                    <Chip
                        label={meeting.meeting_frequency === 0 ? 'First Time' : `${meeting.meeting_frequency + 1} Times`}
                        color="success"
                        size="small"
                    />
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Action',
            flex: 4,
            renderCell: (params) => {
                const meeting = params.row;
                const isCurrentAdvisor = meeting.advisor === currentUserEmail; // advisorEmail is the current user's email
                const hasStudentLog = meeting.has_student_log;
                return (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
                        {isCurrentAdvisor && (
                            <>
                                <Tooltip title="Meet">
                                    <Button
                                        variant="outlined"
                                        color="success"
                                        size="small"
                                        onClick={() => {
                                            setSelectedMeeting(meeting);
                                            fetchProposedCourses(meeting.id);
                                            setMeetModalOpen(true); // Open the new "Meet" modal
                                        }}
                                    >
                                        <AccessTime />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => {
                                            setSelectedMeeting(meeting);
                                            setCancelModalOpen(true)
                                        }}
                                    >
                                        <Delete />
                                    </Button>
                                </Tooltip>
                                {hasStudentLog ? (
                                    <Tooltip title="End">
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            size="small"
                                            onClick={() => {
                                                setSelectedMeeting(meeting);
                                                setEndMeetingDialogOpen(true);
                                            }}
                                        >
                                            <Check />
                                        </Button>
                                    </Tooltip>
                                ) : null}
                                <Tooltip title="Share">
                                    <Button
                                        onClick={() => {
                                            setSelectedMeeting(meeting);
                                            setShareDialogOpen(true);
                                            fetchAdvisors();
                                        }}
                                        variant="outlined"
                                        color="warning"
                                        size="small"
                                    >
                                        <Share />
                                    </Button>
                                </Tooltip>
                            </>
                        )}
                        {hasStudentLog ? (
                            <Tooltip title="View">
                                <Button
                                    onClick={() => {
                                        setSelectedMeeting(meeting);
                                        fetchLogs(meeting.email);
                                        setViewLogsDialogOpen(true);
                                    }}
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                >
                                    <Visibility />
                                </Button>
                            </Tooltip>
                        ) : null}
                    </Box>
                );
            }
        }
    ];

    const fetchAdvisors = async () => {
        try {
            const response = await axios.get('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                params: { action: 'fetch_advisors', current_advisor: advisorEmail }
            });
            if (response.data.success) {
                setAdvisors(response.data.data);
            } else {
                setSnackbar({ open: true, message: response.data.message || 'Failed to fetch advisors', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error fetching advisors', severity: 'error' });
        }
    };

    const fetchLogs = async (email: any) => {
        try {
            const response = await axios.get('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                params: { action: 'view_logs', email }
            });
            if (response.data.success) {
                setLogs(response.data.data);
            } else {
                setSnackbar({ open: true, message: response.data.message || 'Failed to fetch logs', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error fetching logs', severity: 'error' });
        }
    };

    const handleCancelIndividual = () => {
        if (selectedMeeting && window.Calendly) {
            window.Calendly.initPopupWidget({ url: selectedMeeting.cancel_url });
            // Optionally, close modal after opening widget or keep open for manual close
            setCancelModalOpen(false);
        } else {
            setSnackbar({ open: true, message: 'Calendly widget not available or no cancel URL', severity: 'error' });
        }
    };

    const handleCancelEvent = async () => {
        if (selectedMeeting) {
            try {
                setIsSubmitting(true);
                const response = await axios.post('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                    action: 'cancel_meeting',
                    app_id: selectedMeeting.id,
                    cancel_type: 'event'
                });
                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: 'Event cancellation requested. Please refresh to see updates.',
                        severity: 'success'
                    });
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || 'Failed to cancel event',
                        severity: 'error'
                    });
                }
            } catch (error) {
                setSnackbar({ open: true, message: 'Error canceling event', severity: 'error' });
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
                const response = await axios.post('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                    action: 'end_meeting',
                    app_id: selectedMeeting.id,
                    remarks
                });
                if (response.data.success) {
                    setSnackbar({ open: true, message: 'Meeting ended successfully', severity: 'success' });
                    fetchMeetingRequests();
                    setMeetModalOpen(false);
                } else {
                    setSnackbar({ open: true, message: response.data.message || 'Failed to end meeting', severity: 'error' });
                }
            } catch (error) {
                setSnackbar({ open: true, message: 'Error ending meeting', severity: 'error' });
            } finally {
                setIsSubmitting(false);
                setEndMeetingDialogOpen(false);
                setRemarks('');
            }
        }
    };

    const handleShareMeeting = async () => {
        if (selectedMeeting && selectedAdvisor) {
            try {
                setIsSubmitting(true);
                const response = await axios.post('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                    action: 'share_meeting',
                    email: selectedMeeting.email,
                    new_advisor: selectedAdvisor
                });
                if (response.data.success) {
                    setSnackbar({ open: true, message: 'Meeting shared successfully', severity: 'success' });
                    fetchMeetingRequests();
                } else {
                    setSnackbar({ open: true, message: response.data.message || 'Failed to share meeting', severity: 'error' });
                }
            } catch (error) {
                setSnackbar({ open: true, message: 'Error sharing meeting', severity: 'error' });
            } finally {
                setIsSubmitting(false);
                setShareDialogOpen(false);
                setSelectedAdvisor('');
            }
        }
    };

    const fetchProposedCourses = async (app_id: number) => {
        try {
            const response = await axios.get('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                params: { action: 'fetch_proposed_courses', app_id }
            });
            if (response.data.success) {
                setProposedCourses(response.data.data);
            } else {
                setSnackbar({ open: true, message: response.data.message || 'Failed to fetch proposed programs', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error fetching proposed programs', severity: 'error' });
        }
    };

    const fetchSchools = async () => {
        try {
            const response = await axios.get('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                params: { action: 'fetch_schools' }
            });
            console.log('Schools API response:', response.data);
            if (response.data.success) {
                setSchools(response.data.data);
            } else {
                setSnackbar({ open: true, message: response.data.message || 'Failed to fetch schools', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error fetching schools', severity: 'error' });
        }
    };

    const fetchCourses = async (school_id: string) => {
        try {
            const response = await axios.get('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                params: { action: 'fetch_courses', school_id }
            });
            if (response.data.success) {
                setCourses(response.data.data);
            } else {
                setSnackbar({ open: true, message: response.data.message || 'Failed to fetch programs', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error fetching programs', severity: 'error' });
        }
    };

    const handleMarkAttended = () => {
        if (selectedMeeting) {
            setMarkAttendedModalOpen(true); // Open the confirmation modal
        }
    };

    const confirmMarkAttended = async () => {
        if (selectedMeeting) {
            try {
                setIsSubmitting(true); // Use existing isSubmitting state for loading
                const response = await axios.post('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                    action: 'mark_attended',
                    app_id: selectedMeeting.id
                });
                if (response.data.success) {
                    setSnackbar({ open: true, message: 'Student marked attended successfully', severity: 'success' });
                    fetchMeetingRequests(); // Refresh the main meeting list
                } else {
                    setSnackbar({ open: true, message: response.data.message || 'Failed to mark attended', severity: 'error' });
                }
            } catch (error) {
                setSnackbar({ open: true, message: 'Error marking attended', severity: 'error' });
            } finally {
                setIsSubmitting(false);
                setMarkAttendedModalOpen(false); // Close the modal
            }
        }
    };

    const handleDeleteProposedCourse = async (proposed_course_id: number) => {
        setCourseToDelete(proposed_course_id);
        setDeleteModalOpen(true); // Open the modal instead of confirm
    };

    const confirmDeleteProposedCourse = async () => {
        if (courseToDelete !== null && selectedMeeting) {
            try {
                setIsSubmitting(true); // Use existing isSubmitting state for loading
                const response = await axios.post('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                    action: 'delete_proposed_course',
                    proposed_course_id: courseToDelete
                });
                if (response.data.success) {
                    setSnackbar({ open: true, message: 'Proposed school removed successfully', severity: 'success' });
                    fetchProposedCourses(selectedMeeting.id); // Refresh the proposed courses
                } else {
                    setSnackbar({ open: true, message: response.data.message || 'Failed to delete proposed program', severity: 'error' });
                }
            } catch (error) {
                setSnackbar({ open: true, message: 'Error deleting proposed program', severity: 'error' });
            } finally {
                setIsSubmitting(false);
                setDeleteModalOpen(false); // Close the modal
                setCourseToDelete(null); // Reset the course ID
            }
        }
    };

    // Update existing handleProposeCourse to refresh proposed courses
    const handleProposeCourse = async () => {
        if (selectedMeeting && school && course) {
            try {
                setIsSubmitting(true);
                const response = await axios.post('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_room.php', {
                    action: 'propose_course',
                    app_id: selectedMeeting.id,
                    school,
                    course
                });
                if (response.data.success) {
                    setSnackbar({ open: true, message: 'Program proposed successfully', severity: 'success' });
                    fetchProposedCourses(selectedMeeting.id); // Refresh the proposed courses
                } else {
                    setSnackbar({ open: true, message: response.data.message || 'Failed to propose program', severity: 'error' });
                }
            } catch (error) {
                setSnackbar({ open: true, message: 'Error proposing program', severity: 'error' });
            } finally {
                setIsSubmitting(false);
                setProposeCourseDialogOpen(false);
                setSchool('');
                setCourse('');
            }
        }
    };


    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6">
                <div className="container mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="py-4 mb-6"
                    >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                            <h1 className="text-[#2164A6] text-2xl font-semibold">
                                Meeting Requests
                            </h1>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                        <div className="border-b border-gray-200 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">
                                        Career Advisory Feedback
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div style={{ height: 500, width: '100%' }}>
                                <DataGrid
                                    rows={meetingRequests}
                                    columns={columns}
                                    initialState={{
                                        pagination: {
                                            paginationModel: { pageSize: 10 },
                                        },
                                    }}
                                    pageSizeOptions={[5, 10, 25]}
                                    checkboxSelection={false}
                                    disableRowSelectionOnClick
                                    slots={{
                                        toolbar: GridToolbar,
                                    }}
                                    slotProps={{
                                        toolbar: {
                                            showQuickFilter: true,
                                            quickFilterProps: { debounceMs: 500 },
                                        },
                                    }}
                                    sx={{
                                        '& .MuiDataGrid-columnHeaderTitle': {
                                            fontWeight: 'bold',
                                        },
                                    }}
                                    localeText={{ noRowsLabel: "No rows found!" }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
            <Dialog
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Cancel Meeting</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Choose how to cancel the meeting with {selectedMeeting?.email} scheduled for {selectedMeeting?.date} at {selectedMeeting?.time}.
                    </DialogContentText>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleCancelIndividual}
                            disabled={!selectedMeeting?.cancel_url}
                        >
                            Cancel Only for This Invitee
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleCancelEvent}
                            disabled={isSubmitting || !selectedMeeting?.event}
                        >
                            {isSubmitting ? 'Canceling...' : 'Cancel for All Invitees in This Slot'}
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
            <Dialog
                open={endMeetingDialogOpen}
                onClose={() => setEndMeetingDialogOpen(false)}
            >
                <DialogTitle>End Meeting</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Provide remarks for ending the meeting with {selectedMeeting?.email}.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Remarks"
                        fullWidth
                        variant="standard"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEndMeetingDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleEndMeeting} disabled={isSubmitting || !remarks}>
                        {isSubmitting ? 'Ending...' : 'End Meeting'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Share Meeting Modal */}
            <Dialog
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
            >
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
                        <MenuItem value="" disabled>Select Advisor</MenuItem>
                        {advisors.map((advisor) => (
                            <MenuItem key={advisor.email} value={advisor.email}>
                                {advisor.name === "N/A" ? advisor.email : advisor.name}
                            </MenuItem>
                        ))}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleShareMeeting} disabled={isSubmitting || !selectedAdvisor}>
                        {isSubmitting ? 'Sharing...' : 'Share'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Logs Modal */}
            <Dialog
                open={viewLogsDialogOpen}
                onClose={() => setViewLogsDialogOpen(false)}
                maxWidth="md"
            >
                <DialogTitle>Meeting Logs for {selectedMeeting?.email}</DialogTitle>
                <DialogContent>
                    {logs.length > 0 ? (
                        <List>
                            {logs.map((log, index) => (
                                <ListItem key={index}>
                                    <ListItemText
                                        primary={`Meeting ${index + 1}`}
                                        secondary={
                                            <>
                                                <Typography variant="body2">Date: {log.date}</Typography>
                                                <Typography variant="body2">Time: {log.time}</Typography>
                                                <Typography variant="body2">Advisor: {log.advisor}</Typography>
                                                <Typography variant="body2">Schools: {log.schools}</Typography>
                                                <Typography variant="body2">Remarks: {log.remarks}</Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography>No logs found</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewLogsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={meetModalOpen}
                onClose={() => setMeetModalOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>Meeting Details for {selectedMeeting?.email}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
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
                            disabled={selectedMeeting?.meeting_status === '2'} // Disable if already attended
                        >
                            {selectedMeeting?.meeting_status === '2' ? 'Marked Attended' : 'Mark Attended'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setEndMeetingDialogOpen(true)}
                        >
                            Confirm Details
                        </Button>
                    </Box>
                    <div style={{ height: 400, width: '100%' }}>
                        <DataGrid
                            rows={proposedCourses}
                            columns={[
                                { field: 'id', headerName: 'ID', width: 100 },
                                { field: 'school_name', headerName: 'Proposed School', width: 300 },
                                { field: 'program_name', headerName: 'Proposed Program', width: 300 },
                                {
                                    field: 'actions',
                                    headerName: 'Action',
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
                                    )
                                }
                            ]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 5 } }
                            }}
                            pageSizeOptions={[5, 10, 20]}
                            disableRowSelectionOnClick
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMeetModalOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={proposeCourseDialogOpen}
                onClose={() => setProposeCourseDialogOpen(false)}
            >
                <DialogTitle>Propose a Program</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Propose a program for {selectedMeeting?.email}.
                    </DialogContentText>
                    <Select
                        value={school}
                        onChange={(e) => {
                            setSchool(e.target.value);
                            setCourse(''); // Reset course when school changes
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
                        {isSubmitting ? 'Proposing...' : 'Propose'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                maxWidth="sm"
                fullWidth
            >
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
                        {isSubmitting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={markAttendedModalOpen}
                onClose={() => setMarkAttendedModalOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Confirm Mark Attended</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to mark {selectedMeeting?.email} as attended for the meeting on {selectedMeeting?.date} at {selectedMeeting?.time}? This action will update the meeting status.
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
                        {isSubmitting ? 'Marking...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Feedback */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default Room;