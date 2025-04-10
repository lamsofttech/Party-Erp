import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
    TextField,
    Button,
    Box,
    Snackbar,
    Alert,
    Typography,
    IconButton
} from "@mui/material";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";

interface ResubmissionApplication {
    id: number;
    sn: number;
    fullnames: string;
    email: string;
    program: string;
    gpa_status: number;
    transcript_comment: string;
    datetime: string;
    request_date: string | null;
}

const Resubmissions: React.FC = () => {
    // State variables
    const [applications, setApplications] = useState<ResubmissionApplication[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<ResubmissionApplication[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error" | "info" | "warning",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/resubmissions_api.php";

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
                        app.fullnames.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (app.transcript_comment && app.transcript_comment.toLowerCase().includes(searchQuery.toLowerCase()))
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    // Fetch applications from API
    const fetchApplications = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(API_URL);
            if (response.data.success) {
                setApplications(response.data.data);
                setFilteredApplications(response.data.data);
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
        } finally {
            setIsLoading(false);
        }
    };

    // Export data to Excel
    const handleExportExcel = () => {
        const exportData = filteredApplications.map((app) => ({
            ID: app.sn,
            "Full Name": app.fullnames,
            Email: app.email,
            Program: app.program,
            "Transcript Comment": app.transcript_comment,
            "Date Added": app.datetime,
            "Request Date": app.request_date || "N/A"
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resubmissions");
        XLSX.writeFile(workbook, "resubmissions.xlsx");
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "sn", headerName: "# S/N", width: 80 },
        { field: "fullnames", headerName: "Full Name", flex: 1 },
        { field: "email", headerName: "Email", flex: 1 },
        { field: "program", headerName: "Program", flex: 1 },
        {
            field: "transcript_comment",
            headerName: "Transcript Comment",
            flex: 2,
            renderCell: (params) => (
                <Box sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontStyle: params.value ? 'normal' : 'italic',
                            color: params.value ? 'text.primary' : 'text.secondary'
                        }}
                    >
                        {params.value || 'No comment available'}
                    </Typography>
                </Box>
            )
        },
        {
            field: "request_date",
            headerName: "Request Date",
            flex: 1,
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => {
                const fullName = encodeURIComponent(params.row.fullnames);
                const id = encodeURIComponent(params.row.id);
                return (
                    <Box>
                        <IconButton
                            color="primary"
                            component={Link}
                            to={`/school-admission/GPA-dashboard/transcript-resubmissions/${fullName}?id=${id}`}
                        >
                            <VisibilityIcon />
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
                                                        Transcript Resubmissions ({applications.length})
                                                    </p>
                                                </div>
                                                <div className="d-flex justify-content-between mb-4">
                                                    <Button
                                                        variant="contained"
                                                        sx={{ textTransform: 'none' }}
                                                        color="success"
                                                        onClick={handleExportExcel}
                                                        startIcon={<i className="fas fa-file-excel"></i>}
                                                    >
                                                        Export to Excel
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="card-body mb-4">
                                                <div className="flex flex-row gap-4 mb-4">
                                                    <TextField
                                                        label="Search applications..."
                                                        variant="outlined"
                                                        fullWidth
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        sx={{ flex: 1 }}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <i className="fas fa-search" style={{ marginRight: '8px', color: '#aaa' }}></i>
                                                            ),
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ height: 600, width: '100%' }}>
                                                    <DataGrid
                                                        rows={filteredApplications}
                                                        columns={columns}
                                                        loading={isLoading}
                                                        initialState={{
                                                            pagination: {
                                                                paginationModel: { pageSize: 10 },
                                                            },
                                                        }}
                                                        pageSizeOptions={[5, 10, 25]}
                                                        getRowId={(row) => row.id}
                                                        disableRowSelectionOnClick
                                                        sx={{
                                                            '& .MuiDataGrid-cell': {
                                                                alignItems: 'center',
                                                            },
                                                            '& .MuiDataGrid-columnHeaders': {
                                                                backgroundColor: '#f5f5f5',
                                                            },
                                                        }}
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

export default Resubmissions;