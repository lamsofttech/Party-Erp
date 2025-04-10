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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Snackbar,
    Alert,
    Box,
    Typography,
    Chip
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import * as XLSX from "xlsx";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

interface Intake {
    id: number;
    intake_name: string;
    start_date: string;
    end_date: string;
    applications: number;
    status: number;
    sn?: number; // Serial number for display
}

const Intakes: React.FC = () => {
    // State variables
    const [intakes, setIntakes] = useState<Intake[]>([]);
    const [filteredIntakes, setFilteredIntakes] = useState<Intake[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [openAddModal, setOpenAddModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openEndModal, setOpenEndModal] = useState(false);
    const [selectedIntake, setSelectedIntake] = useState<Intake | null>(null);
    const [year, setYear] = useState<string>("");
    const [intakeType, setIntakeType] = useState<string>("");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/intakes_api.php";

    // Fetch intakes on component mount
    useEffect(() => {
        fetchIntakes();
    }, []);

    // Filter intakes when search query changes
    useEffect(() => {
        if (searchQuery) {
            setFilteredIntakes(
                intakes.filter(
                    (intake) =>
                        intake.intake_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        intake.start_date.includes(searchQuery) ||
                        intake.end_date.includes(searchQuery) ||
                        intake.applications.toString().includes(searchQuery)
                )
            );
        } else {
            setFilteredIntakes(intakes);
        }
    }, [searchQuery, intakes]);

    // Fetch intakes from API
    const fetchIntakes = async () => {
        try {
            const response = await axios.get(API_URL);
            if (response.data.success) {
                const intakesWithSn = response.data.intakes.map((intake: Intake, index: number) => ({
                    ...intake,
                    status: Number(intake.status),
                    sn: index + 1,
                }));
                setIntakes(intakesWithSn);
                setFilteredIntakes(intakesWithSn);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching intakes",
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
        const exportData = filteredIntakes.map((intake) => ({
            ID: intake.sn,
            Intake: intake.intake_name,
            "Start Date": intake.start_date,
            "End Date": intake.end_date,
            Applications: intake.applications,
            Status: intake.status === 1 ? "On Progress" : "Closed",
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Intakes");
        XLSX.writeFile(workbook, "intakes.xlsx");
    };

    // Handle add intake submission
    const handleAddSubmit = async () => {
        if (!year || !intakeType || !startDate || !endDate) {
            setSnackbar({
                open: true,
                message: "Please fill all required fields",
                severity: "error",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const formatDate = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const start_date = formatDate(startDate);
            const end_date = formatDate(endDate);

            console.log("Before formatting:", { startDate, endDate });
            const response = await axios.post(API_URL, {
                action: "add",
                year: year,
                intake: intakeType,
                start_date,
                end_date,
            });

            console.log({
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate.toISOString().split("T")[0],
            });

            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: "Intake added successfully",
                    severity: "success",
                });
                setOpenAddModal(false);
                resetForm();
                fetchIntakes();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error adding intake",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error submitting data",
                severity: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit intake submission
    const handleEditSubmit = async () => {
        if (!selectedIntake || !year || !intakeType || !startDate || !endDate) {
            setSnackbar({
                open: true,
                message: "Please fill all required fields",
                severity: "error",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post(API_URL, {
                action: "update",
                id: selectedIntake.id,
                year: year,
                intake: intakeType,
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate.toISOString().split("T")[0],
            });

            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: "Intake updated successfully",
                    severity: "success",
                });
                setOpenEditModal(false);
                resetForm();
                fetchIntakes();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error updating intake",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error submitting data",
                severity: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle end intake confirmation
    const handleEndIntake = async () => {
        if (!selectedIntake) return;

        setIsSubmitting(true);
        try {
            const response = await axios.post(API_URL, {
                action: "end",
                id: selectedIntake.id,
            });

            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: "Intake ended successfully",
                    severity: "success",
                });
                setOpenEndModal(false);
                fetchIntakes();
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error ending intake",
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
            setIsSubmitting(false);
        }
    };

    // Open edit modal with intake data
    const handleOpenEdit = (intake: Intake) => {
        setSelectedIntake(intake);

        // Parse intake name to get year and type
        const parts = intake.intake_name.split(" ");
        setIntakeType(parts[0]);
        setYear(parts[1]);

        // Parse dates
        setStartDate(new Date(intake.start_date));
        setEndDate(new Date(intake.end_date));

        setOpenEditModal(true);
    };

    // Open end intake confirmation modal
    const handleOpenEndModal = (intake: Intake) => {
        setSelectedIntake(intake);
        setOpenEndModal(true);
    };

    // Reset form fields
    const resetForm = () => {
        setYear("");
        setIntakeType("");
        setStartDate(null);
        setEndDate(null);
        setSelectedIntake(null);
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: "sn", headerName: "ID", width: 70 },
        { field: "intake_name", headerName: "Intake", flex: 1 },
        { field: "start_date", headerName: "Start Date", flex: 1 },
        { field: "end_date", headerName: "End Date", flex: 1 },
        { field: "applications", headerName: "Applications", flex: 1 },
        {
            field: "status",
            headerName: "Status",
            flex: 1,
            renderCell: (params) => (
                params.row.status === 1 ?
                    <Chip label="On Progress" variant="outlined" color="success" size="small" icon={<span className="fas fa-spinner" />} /> :
                    <Chip label="Closed" color="warning" size="small" icon={<span className="fas fa-calendar-times" />} />
            )
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <IconButton component={Link} to={`/school-admission/intakes/${params.row.intake_name}?id=${params.row.id}`}>
                        <VisibilityIcon color="primary" />
                    </IconButton>
                    <IconButton onClick={() => handleOpenEdit(params.row)}>
                        <EditIcon color="warning" />
                    </IconButton>
                    {params.row.status === 1 && (
                        <IconButton onClick={() => handleOpenEndModal(params.row)}>
                            <CancelIcon color="error" />
                        </IconButton>
                    )}
                </Box>
            ),
        },
    ];

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                                                        <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">Intakes Table</p>
                                                    </div>
                                                    <div className="d-flex justify-content-end mb-4">
                                                        <Button
                                                            variant="contained"
                                                            sx={{ textTransform: 'none' }}
                                                            color="primary"
                                                            startIcon={<AddIcon />}
                                                            onClick={() => setOpenAddModal(true)}
                                                        >
                                                            Add Intake
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
                                                        <Button
                                                            sx={{ textTransform: 'none' }}
                                                            variant="contained"
                                                            color="primary"
                                                            size="small"
                                                            onClick={handleExportExcel}
                                                        >
                                                            Export to Excel
                                                        </Button>
                                                    </div>

                                                    <div style={{ height: 400, width: '100%' }}>
                                                        <DataGrid
                                                            rows={filteredIntakes}
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
            </div>

            {/* Add Intake Modal */}
            <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)}>
                <DialogTitle>Add Application Intake</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ mt: 2 }}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Select Year</InputLabel>
                            <Select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                label="Select Year"
                                required
                            >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value={new Date().getFullYear().toString()}>
                                    {new Date().getFullYear()}
                                </MenuItem>
                                <MenuItem value={(new Date().getFullYear() + 1).toString()}>
                                    {new Date().getFullYear() + 1}
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="normal">
                            <InputLabel>Select Intake</InputLabel>
                            <Select
                                value={intakeType}
                                onChange={(e) => setIntakeType(e.target.value)}
                                label="Select Intake"
                                required
                            >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="Spring">Spring</MenuItem>
                                <MenuItem value="Fall">Fall</MenuItem>
                            </Select>
                        </FormControl>

                        <DatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={(newValue) => setStartDate(newValue)}
                            slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                        />

                        <DatePicker
                            label="End Date"
                            value={endDate}
                            onChange={(newValue) => setEndDate(newValue)}
                            slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenAddModal(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddSubmit}
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{ textTransform: 'none' }}
                    >
                        {isSubmitting ? "Adding..." : "Add Intake"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Intake Modal */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)}>
                <DialogTitle>Edit Application Intake</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ mt: 2 }}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Select Year</InputLabel>
                            <Select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                label="Select Year"
                                required
                            >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value={new Date().getFullYear().toString()}>
                                    {new Date().getFullYear()}
                                </MenuItem>
                                <MenuItem value={(new Date().getFullYear() + 1).toString()}>
                                    {new Date().getFullYear() + 1}
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="normal">
                            <InputLabel>Select Intake</InputLabel>
                            <Select
                                value={intakeType}
                                onChange={(e) => setIntakeType(e.target.value)}
                                label="Select Intake"
                                required
                            >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="Spring">Spring</MenuItem>
                                <MenuItem value="Fall">Fall</MenuItem>
                            </Select>
                        </FormControl>

                        <DatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={(newValue) => setStartDate(newValue)}
                            slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                        />

                        <DatePicker
                            label="End Date"
                            value={endDate}
                            onChange={(newValue) => setEndDate(newValue)}
                            slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenEditModal(false)}>Cancel</Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        color="success"
                        disabled={isSubmitting}
                        sx={{ textTransform: 'none' }}
                    >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* End Intake Confirmation Modal */}
            <Dialog open={openEndModal} onClose={() => setOpenEndModal(false)}>
                <DialogTitle>End Intake</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to end the intake "{selectedIntake?.intake_name}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenEndModal(false)}>Cancel</Button>
                    <Button
                        onClick={handleEndIntake}
                        sx={{ textTransform: 'none' }}
                        variant="contained"
                        color="error"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Processing..." : "End Intake"}
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
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </LocalizationProvider>
    );
};

export default Intakes;