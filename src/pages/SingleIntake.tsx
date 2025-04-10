import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
    DataGrid,
    GridColDef,
    GridToolbar,
} from "@mui/x-data-grid";
import {
    TextField,
    Button,
    Snackbar,
    Alert,
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import * as XLSX from "xlsx";

interface Application {
    id: number;
    student_name: string;
    email: string;
    school: string;
    status: number;
}

interface IntakeData {
    intake: {
        id: number;
        intake_name: string;
        start_date: string;
        end_date: string;
        status: number;
    };
    applications: Application[];
    total_applications: number;
}

const ViewIntake: React.FC = () => {
    const location = useLocation();
    const [intakeData, setIntakeData] = useState<IntakeData | null>(null);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "info",
    });

    // Extract intake ID from URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const intakeId = queryParams.get("id");

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_intake_api.php";

    useEffect(() => {
        if (!intakeId) {
            setSnackbar({
                open: true,
                message: "Intake ID is missing",
                severity: "error",
            });
            return;
        }

        fetchIntakeData();
    }, [intakeId]);

    // Search effect
    useEffect(() => {
        if (!intakeData) return;

        if (searchQuery) {
            const filtered = intakeData.applications.filter(
                (app) =>
                    app.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    app.school.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredApplications(filtered);
        } else {
            setFilteredApplications(intakeData.applications);
        }
    }, [searchQuery, intakeData]);

    const fetchIntakeData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}?id=${intakeId}`);

            if (response.data.success) {
                setIntakeData(response.data.data);
                setFilteredApplications(response.data.data.applications);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Failed to fetch intake data",
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
            setLoading(false);
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    const handleExportExcel = () => {
        if (!intakeData) return;

        const exportData = filteredApplications.map((app, index) => ({
            "No.": index + 1,
            "Student Name": app.student_name,
            "School": app.school,
            "Email": app.email,
            "Status": getStatusText(app.status),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            `${intakeData.intake.intake_name} Applications`
        );
        XLSX.writeFile(workbook, `${intakeData.intake.intake_name} Applications.xlsx`);
    };

    const getStatusText = (status: number): string => {
        switch (status) {
            case 1:
                return "New";
            case 2:
                return "On Progress";
            case 3:
                return "Pending";
            case 4:
                return "Settled";
            default:
                return "Unknown";
        }
    };

    const getStatusColor = (status: number): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (status) {
            case 1:
                return "info";
            case 2:
                return "warning";
            case 3:
                return "secondary";
            case 4:
                return "success";
            default:
                return "default";
        }
    };

    const columns: GridColDef[] = [
        {
            field: "student_name",
            headerName: "Student Name",
            flex: 1,
            minWidth: 200,
        },
        {
            field: "school",
            headerName: "School",
            flex: 1,
            minWidth: 200,
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1,
            minWidth: 200,
        },
        {
            field: "status",
            headerName: "Status",
            flex: 0.5,
            minWidth: 120,
            renderCell: (params) => (
                <Chip
                    label={getStatusText(params.value as number)}
                    color={getStatusColor(params.value as number)}
                    size="small"
                />
            ),
        },
    ];

    return (
        <div className="px-3">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-12">
                        <Card sx={{ mb: 4 }}>
                            <CardContent>
                                {loading ? (
                                    <Typography variant="h5">Loading intake data...</Typography>
                                ) : intakeData ? (
                                    <>
                                        {/* Intake Title Banner */}
                                        <Box
                                            sx={{
                                                background: "linear-gradient(0deg, #2164A6 80.26%, rgba(33,100,166,0) 143.39%)",
                                                borderRadius: 2,
                                                mb: 4,
                                                py: 2,
                                                px: 2,
                                                display: "flex",
                                                justifyContent: "center",
                                                gap: 2,
                                                textAlign: "center",
                                                color: "white",
                                            }}
                                        >
                                            <Typography variant="h5" fontWeight="bold">
                                                {intakeData.intake.intake_name} Applications ({intakeData.total_applications})
                                            </Typography>
                                            <Box sx={{ display: "flex", justifyContent: "center" }}>
                                                <Chip
                                                    label={intakeData.intake.status === 1 ? "On Progress" : "Closed"}
                                                    color={intakeData.intake.status === 1 ? "success" : "warning"}
                                                    sx={{ fontWeight: "bold" }}
                                                />
                                            </Box>
                                        </Box>

                                        {/* Search and Export */}
                                        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                                            <TextField
                                                className="bg-white"
                                                placeholder="Search by name, email or school..."
                                                variant="outlined"
                                                fullWidth
                                                value={searchQuery}
                                                onChange={handleSearch}
                                                InputProps={{
                                                    startAdornment: <SearchIcon sx={{ color: "action.active", mr: 1 }} />,
                                                }}
                                            />
                                            <Button
                                                className="px-4"
                                                variant="contained"
                                                startIcon={<FileDownloadIcon />}
                                                onClick={handleExportExcel}
                                                sx={{ whiteSpace: "nowrap", textTransform: 'none' }}
                                            >
                                                Excel
                                            </Button>
                                        </Box>

                                        {/* Applications Table */}
                                        <Box sx={{ height: 500, width: "100%" }}>
                                            <DataGrid
                                                rows={filteredApplications}
                                                columns={columns}
                                                initialState={{
                                                    pagination: {
                                                        paginationModel: { pageSize: 10 },
                                                    },
                                                }}
                                                pageSizeOptions={[5, 10, 25, 50]}
                                                disableRowSelectionOnClick
                                                slots={{ toolbar: GridToolbar }}
                                                slotProps={{
                                                    toolbar: {
                                                        showQuickFilter: false,
                                                    },
                                                }}
                                                localeText={{ noRowsLabel: "No applicants found!" }}
                                            />
                                        </Box>
                                    </>
                                ) : (
                                    <Typography variant="h5">No intake data found</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Notification Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default ViewIntake;