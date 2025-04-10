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
    Typography,
    Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CancelIcon from "@mui/icons-material/Cancel";

// Define the Application interface based on API response
interface Application {
    id: number;
    app_id: number;
    email: string;
    member_no: string;
    full_name: string;
    kap_email: string;
    university: string;
    program: string;
    sop: string;
    app_status: string;
    status_label: string;
    assigned_to: number;
    action: string;
    prop_id: string;
}

const SchoolApplications: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openRejectDialog, setOpenRejectDialog] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });
    const userId = "4";
    const [rejectionReason, setRejectionReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    // API URL (adjust to your server)
    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/school_applications_api.php";

    // Fetch applications on mount
    useEffect(() => {
        fetchApplications();
    }, []);

    // Filter applications based on search query
    useEffect(() => {
        if (searchQuery) {
            setFilteredApplications(
                applications.filter(
                    (app) =>
                        app.member_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.kap_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.program.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    // Fetch applications from API
    const fetchApplications = async () => {
        try {
            // Pass $test if needed; here it's omitted for simplicity
            const response = await axios.get(`${API_URL}?action=get_all`);
            if (response.data.success) {
                setApplications(response.data.applications);
                setFilteredApplications(response.data.applications);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching applications",
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

    // Handle search input
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    // Open reject confirmation dialog
    const handleReject = (app: Application) => {
        setSelectedApplication(app);
        setOpenRejectDialog(true);
    };

    // Confirm rejection and update API
    const confirmReject = async () => {
        if (selectedApplication) {
            setIsRejecting(true);
            try {
                const response = await axios.post(API_URL, {
                    action: "reject_application",
                    id: selectedApplication.id,
                    app_id: selectedApplication.app_id,
                    remark: rejectionReason,
                }, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

                if (response.data.success) {
                    setSnackbar({
                        open: true,
                        message: "Application rejected successfully",
                        severity: "success",
                    });
                    fetchApplications(); // Refresh the table
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Error rejecting application",
                        severity: "error",
                    });
                }
            } catch (error) {
                setSnackbar({
                    open: true,
                    message: "Error submitting request",
                    severity: "error",
                });
            } finally {
                setIsRejecting(false);
                setOpenRejectDialog(false);
                setSelectedApplication(null);
                setRejectionReason("");
            }
        }
    };

    // Define DataGrid columns
    const columns: GridColDef[] = [
        { field: "member_no", headerName: "Member No", flex: 1 },
        { field: "full_name", headerName: "Full Name", flex: 1 },
        {
            field: "kap_email",
            headerName: "KAP Email",
            flex: 1,
            renderCell: (params) => (params.value ? params.value : "N/A"),
        },
        {
            field: "university",
            headerName: "University",
            flex: 1,
            renderCell: (params) => (params.value ? params.value : "N/A"),
        },
        {
            field: "program",
            headerName: "Program",
            flex: 1,
            renderCell: (params) => (params.value ? params.value : "N/A"),
        },
        {
            field: "status_label",
            headerName: "Status",
            flex: 1,
            renderCell: (params) => {
                switch (params.row.app_status) {
                    case "1":
                        return <Chip label="New" color="primary" size="small" />;
                    case "2":
                        return <Chip label="Start Application" color="warning" size="small" />;
                    case "3":
                        return <Chip label="On Progress" color="secondary" size="small" />;
                    case "4":
                        return <Chip label="Pending Approval" color="success" size="small" />;
                    default:
                        return <Chip label={params.row.status_label} size="small" />;
                }
            },
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => {
                const action = params.row.status === 1 ? "View" :
                    params.row.assigned_to === userId ? "Download" : "view";
                return (
                    <Box>
                        <IconButton
                            component={Link}
                            to={`/school-admission/new-school-applications/${params.row.full_name}?id=${params.row.id}&sop=${params.row.sop}&action=${action}&prop_id=${params.row.prop_id}`}
                        >
                            <VisibilityIcon color="primary" />
                        </IconButton>
                        <IconButton onClick={() => handleReject(params.row)}>
                            <CancelIcon color="error" />
                        </IconButton>
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
                                                <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                                                    <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                                                        New School Applications
                                                    </p>
                                                </div>
                                                <div className="flex justify-content-end mb-4 gap-4">
                                                    <Button
                                                        component={Link}
                                                        sx={{ textTransform: 'none' }}
                                                        to="/school-admission/new-school-applications/assigned-applications"
                                                        variant="outlined"
                                                        color="success"
                                                        className="m-1"
                                                    >
                                                        My Assigned Applications
                                                    </Button>
                                                    <Button
                                                        component={Link}
                                                        sx={{ textTransform: 'none' }}
                                                        to="/school-admission/new-school-applications/rejected-applications"
                                                        variant="outlined"
                                                        color="error"
                                                        className="m-1"
                                                    >
                                                        Rejected Applications
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="card-body mb-4">
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
                                                        rows={filteredApplications}
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

            {/* Reject Confirmation Dialog */}
            <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)}>
                <DialogTitle>Reject Application</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to reject this application? Please provide a reason for rejection.
                    </Typography>
                    <TextField
                        label="Rejection Reason"
                        variant="outlined"
                        fullWidth
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        margin="normal"
                        required
                    />
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenRejectDialog(false)}>Cancel</Button>
                    <Button
                        onClick={confirmReject}
                        sx={{ textTransform: 'none' }}
                        color="error"
                        disabled={!rejectionReason.trim() || isRejecting} // Disable if no reason is provided
                    >
                        {isRejecting ? "Rejecting..." : "Reject"}
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

export default SchoolApplications;