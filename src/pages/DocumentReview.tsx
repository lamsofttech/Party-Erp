import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Paper,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    TextField,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { useLocation } from "react-router-dom";

interface DocumentData {
    id: number;
    full_name: string;
    isp_email: string;
    transcript_url: string;
    request_letter_url: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/transcripts_review_api.php";

const DocumentsReview: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get("email");
    const [loading, setLoading] = useState<boolean>(true);
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<DocumentData[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [viewModal, setViewModal] = useState<{ open: boolean; url: string }>({ open: false, url: "" });
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });

    useEffect(() => {
        fetchDocuments();
    }, [email]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}?action=list&email=${email}`);
            if (response.data.success) {
                setDocuments(response.data.data);
                setFilteredDocuments(response.data.data);
            } else {
                setSnackbar({ open: true, message: "Error fetching documents", severity: "error" });
            }
        } catch (error) {
            setSnackbar({ open: true, message: "Error connecting to server", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);

        if (query === "") {
            setFilteredDocuments(documents);
            return;
        }

        const filtered = documents.filter((doc) =>
            doc.full_name.toLowerCase().includes(query) ||
            doc.isp_email.toLowerCase().includes(query)
        );
        setFilteredDocuments(filtered);
    };

    // Export to Excel
    const handleExportExcel = () => {
        const exportData = filteredDocuments.map((doc) => ({
            "No.": doc.id,
            "Full Name": doc.full_name,
            "ISP Email": doc.isp_email,
            "Transcript URL": doc.transcript_url,
            "Request Letter URL": doc.request_letter_url,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Documents Review");
        XLSX.writeFile(workbook, "documents_review.xlsx");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-3"
        >
            <Paper elevation={3} className="p-4 mb-4 min-h-screen">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" className="font-semibold">
                        Documents Review
                    </Typography>
                    <Button variant="contained" onClick={handleExportExcel}>
                        Export to Excel
                    </Button>
                </Box>

                <Box mb={3}>
                    <TextField
                        label="Search documents..."
                        variant="outlined"
                        value={searchQuery}
                        onChange={handleSearch}
                        fullWidth
                    />
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>No.</TableCell>
                                    <TableCell>Full Name</TableCell>
                                    <TableCell>ISP Email</TableCell>
                                    <TableCell align="center">Transcript</TableCell>
                                    <TableCell align="center">Request Letter</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredDocuments.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{doc.id}</TableCell>
                                        <TableCell>{doc.full_name}</TableCell>
                                        <TableCell>{doc.isp_email}</TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                color="success"
                                                onClick={() => setViewModal({ open: true, url: doc.transcript_url })}
                                                size="small"
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                color="success"
                                                onClick={() => setViewModal({ open: true, url: doc.request_letter_url })}
                                                size="small"
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredDocuments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            No documents found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* View Document Modal */}
            <Dialog open={viewModal.open} onClose={() => setViewModal({ open: false, url: "" })} fullWidth maxWidth="md">
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Document Preview</Typography>
                        <IconButton onClick={() => setViewModal({ open: false, url: "" })}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {viewModal.url.endsWith('.pdf') ? (
                        <iframe src={viewModal.url} width="100%" height="500px" title="Document Preview" />
                    ) : (
                        <img src={viewModal.url} alt="Document" style={{ width: "100%", maxHeight: "500px" }} />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewModal({ open: false, url: "" })}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </motion.div>
    );
};

export default DocumentsReview;