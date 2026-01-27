import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    Box,
    Button,
    TextField,
    Snackbar,
    Alert,
    Typography,
    CircularProgress,
} from "@mui/material";
import { Download } from "@mui/icons-material";
import * as XLSX from "xlsx";

interface ExamResult {
    id: number;
    name: string;
    exam_type: string;
    score: string;
    date_taken: string;
    status: string;
}

const ExamResults: React.FC = () => {
    const [results, setResults] = useState<ExamResult[]>([]);
    const [filteredResults, setFilteredResults] = useState<ExamResult[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const response = await axios.get("/api/get_exam_results.php");
            if (response.data.status === "success") {
                setResults(response.data.results);
                setFilteredResults(response.data.results);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Failed to fetch results.",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching results.",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredResults(
            results.filter(
                (result) =>
                    result.name.toLowerCase().includes(query) ||
                    result.exam_type.toLowerCase().includes(query) ||
                    result.status.toLowerCase().includes(query)
            )
        );
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredResults);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Exam Results");
        XLSX.writeFile(workbook, "exam_results.xlsx");
    };

    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", flex: 0.5 },
        { field: "name", headerName: "Name", flex: 1 },
        { field: "exam_type", headerName: "Exam Type", flex: 1 },
        { field: "score", headerName: "Score", flex: 0.7 },
        { field: "date_taken", headerName: "Date Taken", flex: 1 },
        { field: "status", headerName: "Status", flex: 0.7 },
    ];

    return (
        <Box className="px-3">
            <Typography
                variant="h5"
                fontWeight="bold"
                sx={{
                    mb: 2,
                    background: "linear-gradient(0deg, #2164A6 80.26%, rgba(33, 100, 166, 0) 143.39%)",
                    color: "white",
                    py: 2,
                    textAlign: "center",
                    borderRadius: "8px",
                }}
            >
                Exam Results
            </Typography>

            <Box className="flex flex-row gap-4 mb-4">
                <TextField
                    label="Search by Name, Exam Type, Status..."
                    variant="outlined"
                    fullWidth
                    value={searchQuery}
                    onChange={handleSearch}
                />
                <Button
                    onClick={exportToExcel}
                    variant="contained"
                    color="primary"
                    startIcon={<Download />}
                    sx={{ textTransform: "none" }}
                >
                    Export to Excel
                </Button>
            </Box>

            {loading ? (
                <Box className="flex justify-center items-center h-40">
                    <CircularProgress />
                </Box>
            ) : (
                <div style={{ height: 500, width: "100%" }}>
                    <DataGrid
                        rows={filteredResults}
                        columns={columns}
                        pageSizeOptions={[5, 10, 25]}
                        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                        getRowId={(row) => row.id}
                        disableRowSelectionOnClick
                    />
                </div>
            )}

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
        </Box>
    );
};

export default ExamResults;
