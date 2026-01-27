import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Snackbar, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, IconButton } from "@mui/material";
import { Plus, RefreshCw, Eye } from "lucide-react";

interface Candidate {
    id: number;
    name: string;
    position_id: number;
    county_code?: string | null;
    const_code?: string | null;
    ward_code?: string | null;
    image_url?: string | null;
}

const Candidates: React.FC = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "warning" });
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: "", position_id: "", county_code: "", const_code: "", ward_code: "", image_url: "" });

    const ADD_CANDIDATE_API = "https://skizagroundsuite.com/API/add_candidate.php";
    const GET_CANDIDATES_API = "https://skizagroundsuite.com/API/get_candidates.php";

    useEffect(() => { fetchCandidates(); }, []);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const response = await axios.get(GET_CANDIDATES_API);
            if (response.data.status === "success") {
                const sortedCandidates = response.data.candidates.sort((a: Candidate, b: Candidate) => a.id - b.id);
                setCandidates(sortedCandidates);
            } else {
                setSnackbar({ open: true, message: response.data.message || "No candidates found.", severity: "warning" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error fetching candidates.", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddCandidate = async () => {
        if (!formData.name || !formData.position_id) {
            setSnackbar({ open: true, message: "Name and Position ID are required.", severity: "warning" });
            return;
        }
        try {
            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => { payload.append(key, value); });
            const response = await axios.post(ADD_CANDIDATE_API, payload);
            if (response.data.status === "success") {
                setSnackbar({ open: true, message: response.data.message, severity: "success" });
                setFormData({ name: "", position_id: "", county_code: "", const_code: "", ward_code: "", image_url: "" });
                setOpenDialog(false);
                fetchCandidates();
            } else {
                setSnackbar({ open: true, message: response.data.message || "Failed to add candidate.", severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error adding candidate.", severity: "error" });
        }
    };

    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", width: 70, sortable: true },
        { field: "name", headerName: "Name", flex: 1, sortable: true },
        { field: "position_id", headerName: "Position ID", width: 120, sortable: true },
        { field: "county_code", headerName: "County Code", width: 120, sortable: true },
        { field: "const_code", headerName: "Constituency Code", width: 150, sortable: true },
        { field: "ward_code", headerName: "Ward Code", width: 120, sortable: true },
        {
            field: "image_url",
            headerName: "View",
            width: 80,
            sortable: false,
            renderCell: (params) => (
                params.value ? (
                    <IconButton component="a" href={params.value} target="_blank" rel="noopener noreferrer" aria-label="View Image">
                        <Eye size={20} />
                    </IconButton>
                ) : "N/A"
            )
        }
    ];

    return (
        <main className="min-h-screen p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Candidate Management</h1>
                <div className="flex gap-2">
                    <Button variant="outlined" startIcon={<RefreshCw size={18} />} onClick={fetchCandidates} disabled={loading}>
                        {loading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setOpenDialog(true)}>
                        Add Candidate
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <CircularProgress />
                    </div>
                ) : (
                    <DataGrid
                        rows={candidates}
                        columns={columns}
                        pageSizeOptions={[5, 10, 25]}
                        initialState={{
                            sorting: { sortModel: [{ field: "id", sort: "asc" }] },
                            pagination: { paginationModel: { pageSize: 10 } }
                        }}
                        getRowId={(row) => row.id}
                        disableRowSelectionOnClick
                        localeText={{ noRowsLabel: "No candidates found." }}
                        className="border-none min-h-[400px]"
                    />
                )}
            </div>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle className="font-semibold">Add Candidate</DialogTitle>
                <DialogContent className="flex flex-col gap-4 mt-2">
                    <TextField label="Name" name="name" value={formData.name} onChange={handleInputChange} fullWidth required />
                    <TextField label="Position ID" name="position_id" value={formData.position_id} onChange={handleInputChange} fullWidth required />
                    <TextField label="County Code" name="county_code" value={formData.county_code} onChange={handleInputChange} fullWidth />
                    <TextField label="Constituency Code" name="const_code" value={formData.const_code} onChange={handleInputChange} fullWidth />
                    <TextField label="Ward Code" name="ward_code" value={formData.ward_code} onChange={handleInputChange} fullWidth />
                    <TextField label="Image URL" name="image_url" value={formData.image_url} onChange={handleInputChange} fullWidth />
                </DialogContent>
                <DialogActions className="px-6 pb-4">
                    <Button onClick={() => setOpenDialog(false)} variant="text">Cancel</Button>
                    <Button variant="contained" onClick={handleAddCandidate} disabled={loading}>Add Candidate</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
};

export default Candidates;
