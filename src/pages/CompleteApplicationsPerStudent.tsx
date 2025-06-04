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
    Modal,
    Typography,
    CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import * as XLSX from "xlsx";

interface StudentApplication {
    id: number;
    email: string;
    member_no: string;
    full_name: string;
    kap_email: string;
    action: string;
    sn?: number;
}

interface ApplicationDetail {
    id: number;
    university: string;
    program: string;
    status: string;
    sop: string;
    action: string;
    prop_id: string;
}

const CompleteStudentApplications: React.FC = () => {
    const [applications, setApplications] = useState<StudentApplication[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<StudentApplication[]>([]);
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
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
    const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
    const [applicationDetails, setApplicationDetails] = useState<ApplicationDetail[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/complete_applications_per_student.php";

    // Replace with dynamic user ID from auth context
    const userId = "4"; // TODO: Replace with actual user ID from auth context

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            setFilteredApplications(
                applications.filter(
                    (app) =>
                        app.member_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        app.kap_email.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredApplications(applications);
        }
    }, [searchQuery, applications]);

    const fetchApplications = async () => {
        try {
            const response = await axios.get(API_URL, {
                params: {
                    action: "get_student_applications",
                    userId,
                },
            });
            if (response.data.success) {
                const appsWithSn = response.data.applications.map((app: StudentApplication, index: number) => ({
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

    const fetchApplicationDetails = async (email: string, fullName: string) => {
        setLoadingDetails(true);
        try {
            const response = await axios.get(API_URL, {
                params: {
                    action: "get_student_application_details",
                    email,
                },
            });
            console.log("API Response:", response.data);
            if (response.data.success) {
                setApplicationDetails(response.data.details);
                setSelectedFullName(fullName);
                setModalOpen(true);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching application details",
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
            setLoadingDetails(false);
        }
    };

    const handleViewClick = (email: string, fullName: string) => {
        setSelectedEmail(email);
        fetchApplicationDetails(email, fullName);
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    const handleExportExcel = () => {
        const exportData = filteredApplications.map((app) => ({
            ID: app.sn,
            "Member No": app.member_no,
            "Full Name": app.full_name,
            "ISP Email": app.kap_email,
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Applications");
        XLSX.writeFile(workbook, "student_applications.xlsx");
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setApplicationDetails([]);
        setSelectedEmail(null);
        setSelectedFullName(null);
    };

    const columns: GridColDef[] = [
        { field: "sn", headerName: "ID", width: 70 },
        { field: "member_no", headerName: "Member No", flex: 1 },
        { field: "full_name", headerName: "Full Name", flex: 1 },
        { field: "kap_email", headerName: "ISP Email", flex: 1 },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <IconButton onClick={() => handleViewClick(params.row.email, params.row.full_name)}>
                        <VisibilityIcon color="primary" />
                    </IconButton>
                </Box>
            ),
        },
    ];

    const detailColumns: GridColDef[] = [
        { field: "university", headerName: "University", flex: 1 },
        { field: "program", headerName: "Program", flex: 1 },
        { field: "status", headerName: "Status", flex: 1 },
        {
            field: "actions",
            headerName: "Action",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <IconButton
                        component={Link}
                        to={`/school-admission/applications-per-student/${selectedFullName}?id=${params.row.id}&sop=${params.row.sop}&action=${params.row.action}&prop_id=${params.row.prop_id}`}
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
                                                        Student Applications Table
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

                <Modal
                    open={modalOpen}
                    onClose={handleCloseModal}
                    aria-labelledby="application-details-modal"
                    aria-describedby="application-details-description"
                >
                    <Box
                        sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "80%",
                            maxWidth: 800,
                            bgcolor: "background.paper",
                            boxShadow: 24,
                            p: 4,
                            borderRadius: 2,
                        }}
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                            <Typography id="application-details-modal" variant="h6" component="h2">
                                Application Details for {selectedEmail}
                            </Typography>
                            <IconButton onClick={handleCloseModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                        {loadingDetails ? (
                            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <div style={{ height: 300, width: "100%" }}>
                                <DataGrid
                                    rows={applicationDetails}
                                    columns={detailColumns}
                                    getRowId={(row) => row.id}
                                    pageSizeOptions={[5, 10]}
                                    initialState={{
                                        pagination: {
                                            paginationModel: { pageSize: 5 },
                                        },
                                    }}
                                    disableRowSelectionOnClick
                                />
                            </div>
                        )}
                    </Box>
                </Modal>

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
        </div>
    );
};

export default CompleteStudentApplications;