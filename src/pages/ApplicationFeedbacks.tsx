import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom"; // Add useLocation
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
    Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";

// Define the Application interface
interface Application {
    id: number;
    app_id: number;
    email: string;
    full_name: string;
    kap_email: string;
    university: string;
    program: string;
    sop: string;
    outcome: string;
    letter: string;
    status: number;
    action: string;
    prop_id: string;
}

const ApplicationFeedbacks: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const action = queryParams.get("action")
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [openDocumentModal, setOpenDocumentModal] = useState<boolean>(false);
    const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>("");
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });
    // Open document preview modal
    const handleOpenDocumentModal = (letter: string): void => {
        const fullUrl = `${BASE_DOCUMENT_URL}${letter}`;
        setSelectedDocumentUrl(fullUrl);
        setOpenDocumentModal(true);
    };

    // API endpoints
    const FETCH_API_URL: string = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/school_app_feedback_api.php";
    const BASE_DOCUMENT_URL: string = "https://finkapinternational.qhtestingserver.com";

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
                        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.kap_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.outcome.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    // Fetch feedback applications
    const fetchApplications = async (): Promise<void> => {
        try {
            const response = await axios.get(`${FETCH_API_URL}?action=${action}`);
            console.log("API Response:", response)
            if (response.data.success) {
                setApplications(response.data.applications);
                setFilteredApplications(response.data.applications);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching feedback",
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
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(event.target.value);
    };

    // Define DataGrid columns
    const columns: GridColDef[] = [
        { field: "full_name", headerName: "Full Name", flex: 1 },
        {
            field: "kap_email",
            headerName: "KAP Email",
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
        {
            field: "outcome",
            headerName: "Application Outcome",
            flex: 1,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === "Rejected" ? "error" : "success"}
                    size="small"
                />
            ),
        },
        {
            field: "letter",
            headerName: "Feedback Letter",
            flex: 1,
            renderCell: (params) =>
                params.value !== "N/A" ? (
                    <IconButton
                        onClick={() => handleOpenDocumentModal(params.value)}
                        title="View Letter"
                    >
                        <VisibilityIcon color="primary" />
                    </IconButton>
                ) : (
                    "N/A"
                ),
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box display="flex" gap={1} sx={{ justifyContent: "center", alignItems: "center", marginTop: "5%" }}>
                    <IconButton
                        component={Link}
                        to={`/school-admission/school-applications-feedback/${encodeURIComponent(params.row.full_name)}?id=${params.row.app_id}&sop=${encodeURIComponent(params.row.sop)}&action=feedback&prop_id=${params.row.prop_id}&source=feedback`}
                        title="View Application"
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
                                                        Approved Application Feedbacks
                                                    </p>
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

            {/* Document Preview Modal */}
            <Dialog
                open={openDocumentModal}
                onClose={() => setOpenDocumentModal(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
                    Feedback Letter
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <iframe
                        src={selectedDocumentUrl}
                        width="100%"
                        height="600px"
                        title="Document Preview"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        sx={{ textTransform: "none" }}
                        onClick={() => setOpenDocumentModal(false)}
                    >
                        Close
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

export default ApplicationFeedbacks;