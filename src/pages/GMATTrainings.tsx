import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    Button,
    Modal,
    Box,
    Typography,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    IconButton,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from '@mui/icons-material/Add';
import { motion } from "framer-motion";

interface Training {
    id: number;
    phase_name: string;
    weeks: number;
    sn?: number;
}

const GMATTrainings: React.FC = () => {
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [openAddModal, setOpenAddModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [addPhase, setAddPhase] = useState("");
    const [addWeeks, setAddWeeks] = useState("");
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editWeeks, setEditWeeks] = useState("");
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const API_URL =
        "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/gmat_phases_api.php";

    useEffect(() => {
        fetchTrainings();
    }, []);

    const fetchTrainings = async () => {
        try {
            const response = await axios.get(API_URL);
            if (response.data.success) {
                setTrainings(response.data.phases);
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error fetching trainings", severity: "error" });
        }
    };

    const handleAddSubmit = async () => {
        if (!addPhase || !addWeeks) {
            setSnackbar({ open: true, message: "Please fill all fields", severity: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await axios.post(API_URL, {
                action: "add",
                phase_name: addPhase,
                weeks: addWeeks,
            });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenAddModal(false);
                setAddPhase("");
                setAddWeeks("");
                fetchTrainings();
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error adding training", severity: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async () => {
        if (!editId || !editName || !editWeeks) {
            setSnackbar({ open: true, message: "Please fill all fields", severity: "warning" });
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await axios.post(API_URL, {
                action: "update",
                id: editId,
                phase_name: editName,
                weeks: editWeeks,
            });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenEditModal(false);
                fetchTrainings();
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error updating training", severity: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            const response = await axios.post(API_URL, { action: "delete", id: deleteId });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setOpenDeleteDialog(false);
                fetchTrainings();
            } else {
                setSnackbar({ open: true, message: response.data.message, severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error deleting training", severity: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns: GridColDef<Training>[] = [
        {
            field: "sn",
            headerName: "S/N",
            flex: 1,
            valueGetter: (_, row) => row.sn,
        },
        { field: "phase_name", headerName: "Phase", flex: 2 },
        { field: "weeks", headerName: "Training Weeks", flex: 1 },
        {
            field: "action",
            headerName: "Action",
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <>
                    <IconButton
                        onClick={() => {
                            setEditId(params.row.id);
                            setEditName(params.row.phase_name);
                            setEditWeeks(params.row.weeks.toString());
                            setOpenEditModal(true);
                        }}
                    >
                        <EditIcon className="text-blue-600" />
                    </IconButton>
                    <IconButton
                        onClick={() => {
                            setDeleteId(params.row.id);
                            setOpenDeleteDialog(true);
                        }}
                    >
                        <DeleteIcon className="text-red-600" />
                    </IconButton>
                </>
            ),
        },
    ];

    const rows = trainings.map((training, index) => ({ ...training, sn: index + 1 }));

    return (
        <main className="min-h-[80vh] p-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                    Cohorts Table
                </p>
            </div>

            <div className="flex justify-end mb-4">
                <Button variant="contained" color="primary" onClick={() => setOpenAddModal(true)}>
                    <AddIcon />
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-md">
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: "No trainings found!" }}
                    className="border-none"
                />
            </div>

            <Modal open={openAddModal} onClose={() => setOpenAddModal(false)}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "30%",
                        left: "40%",
                        transform: "translate(-50%, -50%)",
                        width:  400 , // Responsive width: 90% on mobile, 400px on larger screens
                        maxWidth: "100%", // Prevent overflow on small screens
                        bgcolor: "background.paper",
                        boxShadow: 24,
                        p: 4,
                        borderRadius: "8px",
                        display: "flex", // Use flexbox for internal layout
                        flexDirection: "column", // Stack children vertically
                        gap: 2, // Add consistent spacing between children
                    }}
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Typography variant="h6" className="font-bold">
                        Add Training
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>Phase</InputLabel>
                        <Select
                            value={addPhase}
                            onChange={(e) => setAddPhase(e.target.value)}
                            label="Phase"
                            required
                        >
                            <MenuItem value="Phase 1">Phase 1</MenuItem>
                            <MenuItem value="Phase 2">Phase 2</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Training Weeks"
                        type="number"
                        value={addWeeks}
                        onChange={(e) => setAddWeeks(e.target.value)}
                        required
                    />
                    <div className="flex justify-between gap-2">
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAddSubmit}
                            disabled={isSubmitting}
                            fullWidth
                        >
                            {isSubmitting ? "Adding..." : "Add"}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setOpenAddModal(false)}
                            disabled={isSubmitting}
                            fullWidth
                        >
                            Cancel
                        </Button>
                    </div>
                </Box>
            </Modal>

            <Modal open={openEditModal} onClose={() => setOpenEditModal(false)}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "30%",
                        left: "40%",
                        transform: "translate(-50%, -50%)",
                        width:  400 , // Responsive width: 90% on mobile, 400px on larger screens
                        maxWidth: "100%", // Prevent overflow on small screens
                        bgcolor: "background.paper",
                        boxShadow: 24,
                        p: 4,
                        borderRadius: "8px",
                        display: "flex", // Use flexbox for internal layout
                        flexDirection: "column", // Stack children vertically
                        gap: 2, // Add consistent spacing between children
                    }}
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Typography variant="h6" className="font-bold mb-4">
                        Edit Training
                    </Typography>
                    <TextField
                        fullWidth
                        label="Phase Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mb-4"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Training Weeks"
                        type="number"
                        value={editWeeks}
                        onChange={(e) => setEditWeeks(e.target.value)}
                        className="mb-4"
                        required
                    />
                    <div className="flex justify-between">
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleEditSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Updating..." : "Update"}
                        </Button>
                        <Button variant="outlined" onClick={() => setOpenEditModal(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    </div>
                </Box>
            </Modal>

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete this training?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} color="error" disabled={isSubmitting}>
                        {isSubmitting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
};

export default GMATTrainings;