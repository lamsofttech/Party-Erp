import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Checkbox,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";

// Define interfaces
interface MeetingLink {
    id: number;
    name: string;
    email: string;
    zoom_link: string;
    category: string;
}

interface User {
    email: string;
    username: string;
}

interface MeetingType {
    meeting_name: string;
}

interface Slot {
    time: string;
}

const MeetingLinks: React.FC = () => {
    const [meetingLinks, setMeetingLinks] = useState<MeetingLink[]>([]);
    const [filteredLinks, setFilteredLinks] = useState<MeetingLink[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [users, setUsers] = useState<User[]>([]);
    const [openAddModal, setOpenAddModal] = useState<boolean>(false);
    const [openEditModal, setOpenEditModal] = useState<boolean>(false);
    const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
    const [openLeaveModal, setOpenLeaveModal] = useState<boolean>(false);
    const [selectedLink, setSelectedLink] = useState<MeetingLink | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [formData, setFormData] = useState<{
        user: string;
        team: string;
        link: string;
    }>({ user: "", team: "", link: "" });
    const [leaveForm, setLeaveForm] = useState<{
        meetingType: string;
        leaveType: string;
        date: string;
        slots: string[];
    }>({
        meetingType: "",
        leaveType: "",
        date: "",
        slots: [],
    });
    const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    // API endpoints
    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/meeting_links_api.php";
    const MEETING_API_URL = "https://finkapinternational.qhtestingserver.com/login/main/APIs/meeting_management/functions.php";
    const ADMIN_EMAIL = "admin_test_one@gmail.com";

    // Fetch meeting links and users on mount
    useEffect(() => {
        fetchMeetingLinks();
        fetchUsers();
        fetchMeetingTypes();
    }, []);

    // Filter links based on search query
    useEffect(() => {
        if (searchQuery) {
            setFilteredLinks(
                meetingLinks.filter(
                    (link) =>
                        link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        link.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        link.zoom_link.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        link.category.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredLinks(meetingLinks);
        }
    }, [searchQuery, meetingLinks]);

    // Fetch meeting links
    const fetchMeetingLinks = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=get_meeting_links`);
            if (response.data.success) {
                setMeetingLinks(response.data.meeting_links);
                setFilteredLinks(response.data.meeting_links);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching meeting links",
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

    // Fetch users
    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=get_users`);
            if (response.data.success) {
                setUsers(response.data.users);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching users",
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

    // Fetch meeting types
    const fetchMeetingTypes = async () => {
        try {
            const response = await axios.get(MEETING_API_URL, {
                params: {
                    action: "fetch_meetings",
                    email: ADMIN_EMAIL,
                },
            });
            if (response.data.code === 200) {
                setMeetingTypes(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching meeting types",
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

    // Fetch slots for leave declaration
    const fetchSlots = async () => {
        if (!leaveForm.meetingType || leaveForm.meetingType === "Select Type of Meeting") {
            setSnackbar({
                open: true,
                message: "Please select a meeting type",
                severity: "warning",
            });
            setSlots([]);
            return;
        }
        try {
            const response = await axios.get(MEETING_API_URL, {
                params: {
                    action: "fetch_schedule",
                    meeting_name: leaveForm.meetingType,
                },
            });
            if (response.data.message?.schedule) {
                const selectedDate = dayjs(leaveForm.date).format("dddd").toLowerCase();
                const slots = response.data.message.schedule[selectedDate] || [];
                setSlots(slots.map((time: string) => ({ time })));
            } else {
                setSlots([]);
                setSnackbar({
                    open: true,
                    message: `No slots available on ${dayjs(leaveForm.date).format("ddd, MMMM D, YYYY")}`,
                    severity: "info",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching slots",
                severity: "error",
            });
        }
    };

    // Handle add link
    const handleAddLink = async () => {
        setLoading(true);
        try {
            const formDataToSend = new URLSearchParams();
            formDataToSend.append("action", "add_meeting_link");
            formDataToSend.append("user", formData.user);
            formDataToSend.append("team", formData.team);
            formDataToSend.append("link", formData.link);

            const response = await axios.post(API_URL, formDataToSend, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (response.data.success) {
                setOpenAddModal(false);
                setFormData({ user: "", team: "", link: "" });
                fetchMeetingLinks();
                setSnackbar({
                    open: true,
                    message: "Link added successfully",
                    severity: "success",
                });
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error adding link",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error connecting to server",
                severity: "error",
            });
        } finally {
            setLoading(false); // Stop loading
        }
    };

    // Handle edit link
    const handleEditLink = async () => {
        if (!selectedLink) return;
        setLoading(true);
        try {
            const formDataToSend = new URLSearchParams();
            formDataToSend.append("action", "edit_meeting_link");
            formDataToSend.append("id", selectedLink.id.toString());
            formDataToSend.append("user", formData.user);
            formDataToSend.append("team", formData.team);
            formDataToSend.append("link", formData.link);

            const response = await axios.post(API_URL, formDataToSend, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (response.data.success) {
                setOpenEditModal(false);
                setFormData({ user: "", team: "", link: "" });
                setSelectedLink(null);
                fetchMeetingLinks();
                setSnackbar({
                    open: true,
                    message: "Link edited successfully",
                    severity: "success",
                });
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error editing link",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error connecting to server",
                severity: "error",
            });
        } finally {
            setLoading(false); // Stop loading
        }
    };

    // Handle delete link
    const handleDeleteLink = async () => {
        if (!selectedLink) return;
        setLoading(true);
        try {
            const formDataToSend = new URLSearchParams();
            formDataToSend.append("action", "delete_meeting_link");
            formDataToSend.append("id", selectedLink.id.toString());

            const response = await axios.post(API_URL, formDataToSend, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            if (response.data.success) {
                setOpenDeleteModal(false);
                setSelectedLink(null);
                fetchMeetingLinks();
                setSnackbar({
                    open: true,
                    message: "Link deleted successfully",
                    severity: "success",
                });
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error deleting link",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error connecting to server",
                severity: "error",
            });
        } finally {
            setLoading(false); // Stop loading
        }
    };

    // Handle leave submission
    const handleSubmitLeave = async () => {
        if (leaveForm.slots.length === 0) {
            setSnackbar({
                open: true,
                message: "No slots selected",
                severity: "warning",
            });
            return;
        }
        setLoading(true);
        const time = leaveForm.slots.length === slots.length ? "fullday" : leaveForm.slots;
        try {
            const response = await axios.get(MEETING_API_URL, {
                params: {
                    action: leaveForm.leaveType,
                    meeting_name: leaveForm.meetingType,
                    email: ADMIN_EMAIL,
                    date: leaveForm.date,
                    day: dayjs(leaveForm.date).format("dddd"),
                    time,
                },
            });
            if (response.data.code === 200) {
                setOpenLeaveModal(false);
                resetLeaveForm();
                const reassign = response.data.data?.failed_reassignments || [];
                const message = reassign.length > 0 ? `Failed to reassign meetings at ${reassign.map((time: string) => dayjs(`2024-01-31T${time}Z`).format("HH:mm")).join(", ")}` : "";
                setSnackbar({
                    open: true,
                    message: `${response.data.message} ${message}`,
                    severity: "success",
                });
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error submitting leave",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error connecting to server",
                severity: "error",
            });
        } finally {
            setLoading(false); // Stop loading
        }
    };

    // Reset leave form
    const resetLeaveForm = () => {
        setLeaveForm({
            meetingType: "",
            leaveType: "",
            date: "",
            slots: [],
        });
        setSlots([]);
    };

    // Handle search input
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    // Handle form input changes
    const handleFormChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Handle leave form changes
    const handleLeaveFormChange = (field: string, value: string) => {
        setLeaveForm((prev) => ({ ...prev, [field]: value }));
        if (field === "leaveType" && value) {
            // Show date picker when leave type is selected
            // Trigger slot fetch when date is already selected
            if (leaveForm.date) {
                fetchSlots();
            }
        }
        if (field === "date" && value) {
            fetchSlots();
        }
    };

    // Handle slot selection
    const handleSlotChange = (time: string) => {
        setLeaveForm((prev) => ({
            ...prev,
            slots: prev.slots.includes(time)
                ? prev.slots.filter((slot) => slot !== time)
                : [...prev.slots, time],
        }));
    };

    // Open edit modal
    const openEdit = (link: MeetingLink) => {
        setSelectedLink(link);
        setFormData({
            user: link.email,
            team: link.category,
            link: link.zoom_link,
        });
        setOpenEditModal(true);
    };

    // Open delete modal
    const openDelete = (link: MeetingLink) => {
        setSelectedLink(link);
        setOpenDeleteModal(true);
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "name", headerName: "Name", flex: 1 },
        { field: "email", headerName: "Email", flex: 1 },
        { field: "zoom_link", headerName: "Link", flex: 1 },
        {
            field: "category",
            headerName: "Team",
            flex: 1,
            renderCell: (params) =>
                params.value === "career" ? "Career Advisory" : "Visa Training",
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box display="flex" gap={1}>
                    <IconButton
                        onClick={() => openEdit(params.row)}
                        title="Edit Link"
                    >
                        <EditIcon color="primary" />
                    </IconButton>
                    <IconButton
                        onClick={() => openDelete(params.row)}
                        title="Delete Link"
                    >
                        <DeleteIcon color="error" />
                    </IconButton>
                    <IconButton
                        onClick={() => setOpenLeaveModal(true)}
                        title="Declare Leave"
                    >
                        <VisibilityIcon color="secondary" />
                    </IconButton>
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
                                                <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                                                    <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                                                        Meeting Links
                                                    </p>
                                                </div>
                                                <Box display="flex" justifyContent="end">
                                                    <Button
                                                        sx={{ textTransform: "none" }}
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={() => setOpenAddModal(true)}
                                                    >
                                                        <AddIcon />&nbsp; Add Link
                                                    </Button>
                                                </Box>
                                            </div>

                                            <div className="card-body mb-4 mt-4">
                                                <div className="flex flex-row gap-4 mb-4">
                                                    <TextField
                                                        label="Search..."
                                                        variant="outlined"
                                                        fullWidth
                                                        value={searchQuery}
                                                        onChange={handleSearch}
                                                        sx={{ flex: 1 }}
                                                    />
                                                </div>

                                                <div style={{ height: 400, width: "100%" }}>
                                                    <DataGrid
                                                        rows={filteredLinks}
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
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Link Modal */}
            <Dialog
                open={openAddModal}
                onClose={() => setOpenAddModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
                    Add Meeting Link
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Meeting Link Owner</InputLabel>
                        <Select
                            label="Meeting Link Owner"
                            value={formData.user}
                            onChange={(e) => handleFormChange("user", e.target.value)}
                            required
                        >
                            <MenuItem value="">Select</MenuItem>
                            {users.map((user) => (
                                <MenuItem key={user.email} value={user.email}>
                                    {user.username}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Staff Team</InputLabel>
                        <Select
                            label="Staff Team"
                            value={formData.team}
                            onChange={(e) => handleFormChange("team", e.target.value)}
                            required
                        >
                            <MenuItem value="">Select</MenuItem>
                            <MenuItem value="career">Career Advisory</MenuItem>
                            <MenuItem value="visa">Visa Training</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Zoom Link"
                        fullWidth
                        margin="normal"
                        value={formData.link}
                        onChange={(e) => handleFormChange("link", e.target.value)}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: "none" }} onClick={() => setOpenAddModal(false)}>Close</Button>
                    <Button sx={{ textTransform: "none" }} onClick={handleAddLink} color="primary" disabled={loading}>
                        {loading ? "Adding..." : "Add Link"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Link Modal */}
            <Dialog
                open={openEditModal}
                onClose={() => setOpenEditModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
                    Edit Meeting Link
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Meeting Link Owner</InputLabel>
                        <Select
                            label="Meeting Link Owner"
                            value={formData.user}
                            onChange={(e) => handleFormChange("user", e.target.value)}
                            required
                        >
                            <MenuItem value="">Select</MenuItem>
                            {users.map((user) => (
                                <MenuItem key={user.email} value={user.email}>
                                    {user.username}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Staff Team</InputLabel>
                        <Select
                            label="Staff Team"
                            value={formData.team}
                            onChange={(e) => handleFormChange("team", e.target.value)}
                            required
                        >
                            <MenuItem value="">Select</MenuItem>
                            <MenuItem value="career">Career Advisory</MenuItem>
                            <MenuItem value="visa">Visa Training</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Zoom Link"
                        fullWidth
                        margin="normal"
                        value={formData.link}
                        onChange={(e) => handleFormChange("link", e.target.value)}
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: "none" }} onClick={() => setOpenEditModal(false)}>Close</Button>
                    <Button sx={{ textTransform: "none" }} onClick={handleEditLink} color="primary" disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={openDeleteModal}
                onClose={() => setOpenDeleteModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: "error.main", color: "white" }}>
                    Confirm Deletion
                </DialogTitle>
                <DialogContent>
                    <p className="pt-4">Are you sure you want to delete this meeting link?</p>
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: "none" }} onClick={() => setOpenDeleteModal(false)}>Cancel</Button>
                    <Button sx={{ textTransform: "none" }} onClick={handleDeleteLink} color="error" disabled={loading}>
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Leave Declaration Modal */}
            <Dialog
                open={openLeaveModal}
                onClose={() => setOpenLeaveModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
                    Leave Declaration
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Meeting</InputLabel>
                        <Select
                            label="Meeting"
                            value={leaveForm.meetingType}
                            onChange={(e) => handleLeaveFormChange("meetingType", e.target.value)}
                        >
                            <MenuItem value="">Select Type of Meeting</MenuItem>
                            {meetingTypes.map((type) => (
                                <MenuItem key={type.meeting_name} value={type.meeting_name}>
                                    {type.meeting_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Type of Leave</InputLabel>
                        <Select
                            label="Type of leave"
                            value={leaveForm.leaveType}
                            onChange={(e) => handleLeaveFormChange("leaveType", e.target.value)}
                        >
                            <MenuItem value="">Select Type of Leave</MenuItem>
                            <MenuItem value="temporary_leave">Temporary</MenuItem>
                            <MenuItem value="recurring_leave">Recurring</MenuItem>
                        </Select>
                    </FormControl>
                    {leaveForm.leaveType && (
                        <TextField
                            label="Leave Day"
                            type="date"
                            fullWidth
                            margin="normal"
                            value={leaveForm.date}
                            onChange={(e) => handleLeaveFormChange("date", e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    )}
                    {leaveForm.date && slots.length > 0 && (
                        <Box mt={2}>
                            <p>Slots Available</p>
                            {slots.map((slot) => (
                                <FormControlLabel
                                    key={slot.time}
                                    control={
                                        <Checkbox
                                            checked={leaveForm.slots.includes(slot.time)}
                                            onChange={() => handleSlotChange(slot.time)}
                                        />
                                    }
                                    label={`${dayjs(`2024-01-31T${slot.time}Z`).format("HH:mm")} hrs`}
                                />
                            ))}
                        </Box>
                    )}
                    {leaveForm.date && slots.length === 0 && (
                        <p>No slots available on {dayjs(leaveForm.date).format("ddd, MMMM D, YYYY")}</p>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: "none" }} onClick={() => setOpenLeaveModal(false)}>Close</Button>
                    <Button sx={{ textTransform: "none" }} onClick={handleSubmitLeave} color="primary" disabled={loading}>
                        {loading ? "Submitting..." : "Submit"}
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
                <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default MeetingLinks;