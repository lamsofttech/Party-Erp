import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    IconButton,
    Box,
    Snackbar,
    Alert,
    Typography
} from "@mui/material";
import { Link } from "react-router-dom";
import CheckIcon from "@mui/icons-material/Check";
import Tooltip from '@mui/material/Tooltip';
import * as XLSX from "xlsx";

interface GpaApproval {
    id: number;
    sn: number;
    fullnames: string;
    email: string;
    program: string;
    datetime: string;
    action_url: string;
}

const GPAApprovals: React.FC = () => {
    // State variables
    const [applications, setApplications] = useState<GpaApproval[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<GpaApproval[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error" | "info" | "warning",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/approve_gpa_api.php";

    // Fetch applications on component mount
    useEffect(() => {
        fetchApplications();
    }, []);

    // Improved search functionality
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.trim();
        setSearchQuery(query);

        const filtered = applications.filter((app) => {
            const searchString = [
                app.fullnames || '',
                app.email || '',
                app.program || ''
            ].join(' ').toLowerCase();

            return searchString.includes(query.toLowerCase());
        });

        setFilteredApplications(filtered);
    };

    // Fetch applications from API
    const fetchApplications = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(API_URL);
            if (response.data.success) {
                const appsWithSn = response.data.data.map((app: any, index: number) => ({
                    ...app,
                    sn: index + 1
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
            "Date Added": app.datetime,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "GPA Approvals");
        XLSX.writeFile(workbook, "gpa_approvals.xlsx");
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "sn", headerName: "# S/N", width: 80 },
        {
            field: "fullnames",
            headerName: "Full Name",
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body2">
                    {params.value}
                </Typography>
            )
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body2">
                    {params.value}
                </Typography>
            )
        },
        {
            field: "program",
            headerName: "Program",
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body2">
                    {params.value}
                </Typography>
            )
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
                        <Tooltip title="Approve GPA" arrow>
                            <IconButton
                                component={Link}
                                to={`/school-admission/GPA-dashboard/gpa-approval/${fullName}?id=${id}`}
                                color="success"
                            >
                                <CheckIcon />
                            </IconButton>
                        </Tooltip>
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
                                                        GPA Approvals ({applications.length})
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
                                                                py: 1,
                                                                display: 'flex',
                                                                alignItems: 'center'
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

export default GPAApprovals;