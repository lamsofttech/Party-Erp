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
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import * as XLSX from "xlsx";

interface Resource {
    id: number;
    title: string;
    description: string;
    type: string | null;
    category: string | null;
    link: string;
    phase: string;
    week: number;
    status: number;
    test_type: string;
    sn?: number; // Serial number for display
}

const Resources: React.FC = () => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [phases, setPhases] = useState<string[]>([]);
    const [weeks, setWeeks] = useState<number[]>([]);
    const [openAddModal, setOpenAddModal] = useState(false);
    const [openViewModal, setOpenViewModal] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [title, setTitle] = useState("");
    const [test_type, setTestType] = useState("");
    const [description, setDescription] = useState("");
    const [phase, setPhase] = useState("");
    const [week, setWeek] = useState<number | "">("");
    const [type, setType] = useState("");
    const [category, setCategory] = useState("");
    const [mockLink, setMockLink] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedType, setSelectedType] = useState("");
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/resources_api.php"; // Replace with your actual API URL

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=list`);
            if (response.data.success) {
                const resourcesWithSn = response.data.resources.map((res: Resource, index: number) => ({
                    ...res,
                    sn: index + 1,
                }));
                setResources(resourcesWithSn);
                setFilteredResources(resourcesWithSn);
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error fetching resources", severity: "error" });
        }
    };

    const fetchPhases = async (selectedTestType: string) => {
        try {
            const response = await axios.get(`${API_URL}?action=phases&test=${selectedTestType}`);
            if (response.data.success) {
                setPhases(response.data.phases);
            } else {
                setPhases([]);
                setSnackbar({ open: true, message: response.data.message || "No phases found for this test type!", severity: "error" });
            }
        } catch (error) {
            console.error("Error fetching phases", error);
        }
    };

    const fetchWeeks = async (selectedPhase: string, selectedTestType: string) => {
        try {
            const response = await axios.get(`${API_URL}?action=weeks&phase=${selectedPhase}&test=${selectedTestType}`);
            if (response.data.success) {
                setWeeks(response.data.weeks);
            } else {
                setWeeks([]);
                setSnackbar({ open: true, message: response.data.message || "No weeks found for this phase", severity: "error" });
            }
        } catch (error) {
            console.error("Error fetching weeks", error);
            setWeeks([]);
            setSnackbar({ open: true, message: "Error fetching weeks", severity: "error" });
        }
    };

    const handleTestTypeChange = (event: any) => {
        const selected = event.target.value as string;
        setTestType(selected);
        fetchPhases(selected);
    };

    const handlePhaseChange = (event: any) => {
        const selected = event.target.value as string;
        setPhase(selected);
        fetchWeeks(selected, test_type);
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredResources(
            resources.filter(
                (res) =>
                    res.title.toLowerCase().includes(query) ||
                    res.description.toLowerCase().includes(query) ||
                    (res.category && res.category.toLowerCase().includes(query)) ||
                    res.phase.toLowerCase().includes(query) ||
                    res.week.toString().includes(query)
            )
        );
    };

    const handleExportExcel = () => {
        const exportData = filteredResources.map((res) => ({
            Id: res.sn,
            Title: res.title,
            Description: res.description,
            TestType: res.test_type,
            Category: res.phase === "Phase 1" ? res.category : "Mock",
            Phase: res.phase,
            Week: res.week,
            Link: res.link,
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resources");
        XLSX.writeFile(workbook, "resources.xlsx");
    };

    const handleAddSubmit = async () => {
        if (!title || !description || !phase || !test_type || week === "") {
            setSnackbar({ open: true, message: "Please fill all required fields", severity: "error" });
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("action", "add");
        formData.append("title", title);
        formData.append("description", description);
        formData.append("phase", phase);
        formData.append("test_type", test_type);
        formData.append("week", week.toString());
        if (phase === "Phase 1") {
            formData.append("type", type);
            formData.append("category", category);
            if (type === "document" && file) {
                formData.append("fileToUpload", file); // File upload for document
            } else if (type === "video" && mockLink) {
                formData.append("link", mockLink); // Video link sent directly
            } else {
                setSnackbar({ open: true, message: "Please provide a file or video link", severity: "error" });
                setIsSubmitting(false);
                return;
            }
        } else if (phase === "Phase 2") {
            formData.append("mock_link", mockLink);
        }

        try {
            const response = await axios.post(API_URL, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (response.data.success) {
                setSnackbar({ open: true, message: "Resource added successfully", severity: "success" });
                setOpenAddModal(false);
                fetchResources();
                setTitle("");
                setDescription("");
                setTestType("");
                setPhase("");
                setWeek("");
                setType("");
                setCategory("");
                setMockLink("");
                setFile(null);
                setSelectedType("");
            } else {
                setSnackbar({ open: true, message: response.data.message || "Error adding resource", severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error submitting resource", severity: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewResource = (resource: Resource) => {
        setSelectedResource(resource);
        setOpenViewModal(true);
    };

    const handleDeleteResource = (resource: Resource) => {
        setSelectedResource(resource);
        setOpenDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedResource) return;
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("action", "delete");
        formData.append("id", selectedResource.id.toString());

        try {
            const response = await axios.post(API_URL, formData);
            if (response.data.success) {
                setSnackbar({ open: true, message: "Resource removed successfully", severity: "success" });
                setOpenDeleteModal(false);
                fetchResources();
            } else {
                setSnackbar({ open: true, message: response.data.message || "Error removing resource", severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error deleting resource", severity: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIframeSrc = (resource: Resource): string => {
        if (resource.type === "video") {
            try {
                const url = new URL(resource.link);
                let videoId: string | null = null;
                if (url.host === "www.youtube.com" && url.pathname === "/watch") {
                    videoId = url.searchParams.get("v");
                } else if (url.host === "youtu.be") {
                    videoId = url.pathname.split("/")[1];
                }
                if (videoId) {
                    return `https://www.youtube.com/embed/${videoId}`;
                }
            } catch (e) {
                console.error("Invalid URL:", resource.link);
            }
        }
        if (resource.phase === "Phase 1" && resource.type !== "video") {
            return `https://finkapinternational.qhtestingserver.com/login/main/res/${resource.link}`;
        }
        return resource.link;
    };

    const columns: GridColDef<Resource>[] = [
        { field: "sn", headerName: "Id", flex: 1 },
        { field: "title", headerName: "Title", flex: 2 },
        { field: "test_type", headerName: "Test Type", flex: 2 },
        { field: "description", headerName: "Description", flex: 2 },
        {
            field: "category",
            headerName: "Category",
            flex: 1,
            valueGetter: (_, row) => {
                return row.phase === "Phase 1" ? row.category : "Mock";
            },
        },
        { field: "phase", headerName: "Phase", flex: 1 },
        { field: "week", headerName: "Week", flex: 1 },
        {
            field: "action",
            headerName: "Action",
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <>
                    <IconButton onClick={() => handleViewResource(params.row)}>
                        <VisibilityIcon className="text-blue-600" />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteResource(params.row)}>
                        <DeleteIcon className="text-red-600" />
                    </IconButton>
                </>
            ),
        },
    ];

    return (
        <main className="min-h-[80vh] p-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white py-4 text-center">Resources</p>
            </div>

            <div className="flex flex-row gap-4 mb-4">
                <TextField
                    label="Search..."
                    variant="outlined"
                    fullWidth
                    value={searchQuery}
                    onChange={handleSearch}
                    sx={{ input: { backgroundColor: "white" }, flex: 1 }}
                />
                <Button variant="contained" color="primary" onClick={handleExportExcel}>
                    Export to Excel
                </Button>
                <Button variant="contained" color="primary" onClick={() => setOpenAddModal(true)}>
                    Add Resource
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-md">
                <DataGrid
                    rows={filteredResources}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: "No resources found!" }}
                    className="border-none"
                />
            </div>

            {/* Add Resource Modal */}
            <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Resource</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Title"
                        fullWidth
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        sx={{ mt: 2 }}
                        required
                    />
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Test Type</InputLabel>
                        <Select
                            value={test_type}
                            onChange={handleTestTypeChange}
                            label="Test Type"
                            required
                        >
                            <MenuItem value="GMAT">GMAT</MenuItem>
                            <MenuItem value="GRE">GRE</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{ mt: 2 }}
                        required
                    />
                    {test_type && (
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Phase</InputLabel>
                            <Select label="Phase" value={phase} onChange={handlePhaseChange} required>
                                <MenuItem value="">Select</MenuItem>
                                {phases.map((p) => (
                                    <MenuItem key={p} value={p}>
                                        {p}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {phase && (
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Week</InputLabel>
                            <Select label="Week" value={week} onChange={(e) => setWeek(e.target.value as number)} required>
                                <MenuItem value="">Select</MenuItem>
                                {weeks.map((w) => (
                                    <MenuItem key={w} value={w}>
                                        Week {w}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {phase === "Phase 1" && (
                        <>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    label="Type"
                                    value={type}
                                    onChange={(e) => {
                                        setType(e.target.value as string);
                                        setSelectedType(e.target.value as string); // Update selectedType
                                    }}
                                    required
                                >
                                    <MenuItem value="">Select</MenuItem>
                                    <MenuItem value="video">Video</MenuItem>
                                    <MenuItem value="document">Document</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>Category</InputLabel>
                                <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as string)} required>
                                    <MenuItem value="">Select</MenuItem>
                                    <MenuItem value="quant">Quant</MenuItem>
                                    <MenuItem value="verbal">Verbal</MenuItem>
                                    <MenuItem value="data_insights">Data Insights</MenuItem>
                                    <MenuItem value="general">General</MenuItem>
                                </Select>
                            </FormControl>
                            {selectedType === "document" && (
                                <input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    style={{ marginTop: "16px" }}
                                />
                            )}
                            {selectedType === "video" && (
                                <TextField
                                    label="Video Link"
                                    fullWidth
                                    value={mockLink}
                                    onChange={(e) => setMockLink(e.target.value)}
                                    sx={{ mt: 2 }}
                                    required
                                />
                            )}
                        </>
                    )}
                    {phase === "Phase 2" && (
                        <TextField
                            label="Mock Link"
                            fullWidth
                            value={mockLink}
                            onChange={(e) => setMockLink(e.target.value)}
                            sx={{ mt: 2 }}
                            required
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddModal(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddSubmit} color="primary" disabled={isSubmitting}>
                        {isSubmitting ? "Adding..." : "Add"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Resource Modal */}
            <Dialog open={openViewModal} onClose={() => setOpenViewModal(false)} maxWidth="lg" fullWidth>
                <DialogTitle>View Resource</DialogTitle>
                <DialogContent>
                    {selectedResource && (
                        <iframe
                            src={getIframeSrc(selectedResource)}
                            style={{ width: "100%", height: "500px" }}
                            title={selectedResource.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenViewModal(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>Are you sure you want to delete this resource?</DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteModal(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={confirmDelete} color="error" disabled={isSubmitting}>
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

export default Resources;