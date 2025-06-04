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
import * as XLSX from "xlsx";

interface SchoolApplication {
    id: number;
    app_id: string;
    email: string;
    member_no: string;
    full_name: string;
    kap_email: string;
    university: string;
    program: string;
    sop: string;
    app_status: number;
    status_label: string;
    assigned_to: string;
    assigned_to_name: string;
    action: string;
    prop_id: string; // Added for navigation
    sn?: number; // Serial number for display
}

const SchoolApplications: React.FC = () => {
    // State variables
    const [applications, setApplications] = useState<SchoolApplication[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<SchoolApplication[]>([]);
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

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/school_applications_api.php";

    // Fetch applications on component mount
    useEffect(() => {
        fetchApplications();
    }, []);

    // Filter applications when search query changes
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
                        app.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.status_label.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    // Fetch applications from API
    const fetchApplications = async () => {
        try {
            const response = await axios.get(API_URL, {
                params: { action: "get_completed_applications" },
            });
            if (response.data.success) {
                const appsWithSn = response.data.applications.map((app: SchoolApplication, index: number) => ({
                    ...app,
                    sn: index + 1,
                }));
                setApplications(appsWithSn);
                setFilteredApplications(appsWithSn);
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

    // Handle search input changes
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    // Export data to Excel
    const handleExportExcel = () => {
        const exportData = filteredApplications.map((app) => ({
            ID: app.sn,
            "Member No": app.member_no,
            "Full Name": app.full_name,
            "KAP Email": app.kap_email,
            University: app.university,
            Program: app.program,
            "Assigned To": app.assigned_to_name,
            Status: app.status_label,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "School Applications");
        XLSX.writeFile(workbook, "school_applications.xlsx");
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "sn", headerName: "ID", width: 70 },
        { field: "member_no", headerName: "Member No", flex: 1 },
        { field: "full_name", headerName: "Full Name", flex: 1 },
        { field: "kap_email", headerName: "KAP Email", flex: 1 },
        { field: "university", headerName: "University", flex: 1 },
        { field: "program", headerName: "Program", flex: 1 },
        { field: "assigned_to_name", headerName: "Assigned To", flex: 1 },
        {
            field: "status_label",
            headerName: "Status",
            flex: 1,
            renderCell: (params) => {
                let label = params.row.status_label;
                
                return (
                    <Chip
                        label={label}
                        variant="outlined"
                        color={"success"}
                        size="small"
                    />
                );
            },
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
                        to={`/school-admission/completed-school-applications/${params.row.full_name}?id=${params.row.id}&sop=${params.row.sop}&action=${params.row.action}&prop_id=${params.row.prop_id}`}
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
                                                        School Applications Table
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
                                                    <Button
                                                        sx={{ textTransform: "none" }}
                                                        variant="contained"
                                                        color="primary"
                                                        size="small"
                                                        onClick={handleExportExcel}
                                                    >
                                                        Export to Excel
                                                    </Button>
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

export default SchoolApplications;