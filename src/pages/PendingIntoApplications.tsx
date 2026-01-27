import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    IconButton,
    Snackbar,
    Alert,
    Box,
    Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";

// Define the Application interface
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
    assigned_to_name: string;
    action: string;
    prop_id: string;
}

const PendingIntoApplications: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    // API endpoint for fetching pending INTO applications
    const FETCH_API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/school_applications_api.php";

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
                        app.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    // Fetch applications from the API
    const fetchApplications = async () => {
        try {
            const response = await axios.get(`${FETCH_API_URL}?action=get_pending_into_applications`);
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

    // Define DataGrid columns
    const columns: GridColDef[] = [
        { field: "member_no", headerName: "Member No", flex: 1 },
        { field: "full_name", headerName: "Full Name", flex: 1 },
        {
            field: "kap_email",
            headerName: "ISP Email",
            flex: 1,
            renderCell: (params) => (params.value !== "N/A" ? params.value : "N/A"),
        },
        {
            field: "university",
            headerName: "University",
            flex: 1,
            renderCell: (params) => (params.value !== "N/A" ? params.value : "N/A"),
        },
        {
            field: "program",
            headerName: "Program",
            flex: 1,
            renderCell: (params) => (params.value !== "N/A" ? params.value : "N/A"),
        },
        { field: "assigned_to_name", headerName: "Assigned to", flex: 1 },
        {
            field: "status_label",
            headerName: "Status",
            flex: 1,
            renderCell: (_params) => (
                <Chip label="Pending INTO Approval" color="success" size="small" />
            ),
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        component={Link}
                        to={`/party-operations/pending-into-schools/${params.row.full_name}?id=${params.row.id}&sop=${params.row.sop}&action=${params.row.action}&prop_id=${params.row.prop_id}`}
                    >
                        <VisibilityIcon color="primary" />
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
                                                        School Applications Pending INTO Schools
                                                    </p>
                                                </div>
                                                <div className="flex justify-content-end mb-4 gap-4">
                                                    <Button
                                                        component={Link}
                                                        sx={{ textTransform: "none" }}
                                                        to="/party-operations/pending-into-schools/new-school-applications"
                                                        variant="outlined"
                                                        color="primary"
                                                        className="m-1"
                                                    >
                                                        New School Applications
                                                    </Button>
                                                    <Button
                                                        component={Link}
                                                        sx={{ textTransform: "none" }}
                                                        to="/party-operations/pending-into-schools/rejected-applications"
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

export default PendingIntoApplications;