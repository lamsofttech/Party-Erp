import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    Chip,
    Box,
    Snackbar,
    Alert,
    Typography
} from "@mui/material";
import * as XLSX from "xlsx";

interface GpaApplication {
    id: number;
    sn: number;
    fullnames: string;
    email: string;
    program: string;
    gpa_status: number;
    gpa_remark: string;
    status_label: string;
    status_class: string;
    datetime: string;
    request_date: string;
}

const PendingGpaCalculations: React.FC = () => {
    // State variables
    const [applications, setApplications] = useState<GpaApplication[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<GpaApplication[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error" | "info" | "warning",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/pending_gpa_api.php";

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
                        app.status_label.toLowerCase().includes(searchQuery.toLowerCase())
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

    // Handle search input changes
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.trim();
        setSearchQuery(query);
        
        // Filter applications
        const filtered = applications.filter((app) => {
            // Create a search string from all relevant fields
            const searchString = [
                app.fullnames || '',
                app.email || '',
                app.program || '',
                app.status_label || ''
            ].join(' ').toLowerCase();

            return searchString.includes(query.toLowerCase());
        });

        setFilteredApplications(filtered);
    };

    // Export data to Excel
    const handleExportExcel = () => {
        const exportData = filteredApplications.map((app) => ({
            ID: app.sn,
            "Full Name": app.fullnames,
            Email: app.email,
            Program: app.program,
            Status: app.status_label,
            "GPA Remark": app.gpa_remark,
            "Date Added": app.datetime
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pending GPA Applications");
        XLSX.writeFile(workbook, "pending_gpa_applications.xlsx");
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "sn", headerName: "# S/N", width: 80 },
        {
            field: "fullnames",
            headerName: "Full Name",
            flex: 1,
            renderCell: (params) => (
                <Box>
                    {params.value}
                    <Chip
                        label={params.row.status_label}
                        size="small"
                        sx={{
                            ml: 1,
                            backgroundColor: params.row.status_class.includes('success') ?
                                '#4CAF50' : 
                                params.row.status_class.includes('warning') ?
                                '#FFA500' : '#F44336',
                            color: 'white'
                        }}
                    />
                </Box>
            )
        },
        { field: "email", headerName: "Email", flex: 1 },
        { field: "program", headerName: "Program", flex: 1 },
        { 
            field: "gpa_remark", 
            headerName: "GPA Remark", 
            flex: 1,
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
                        {params.value || 'No remark'}
                    </Typography>
                </Box>
            )
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
                                                        Pending GPA Calculations ({applications.length})
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
                                                        onChange={handleSearch}
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

export default PendingGpaCalculations;