import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    DataGrid,
    GridColDef,
    GridToolbarContainer,
    GridToolbarExport,
    GridToolbarColumnsButton,
    GridToolbarFilterButton,
    GridToolbarDensitySelector
} from "@mui/x-data-grid";
import {
    TextField,
    Button,
    IconButton,
    Box,
    Typography,
    Chip,
    Paper,
    Avatar,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DescriptionIcon from "@mui/icons-material/Description";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import * as XLSX from "xlsx";

interface StudentDocument {
    sn: number;
    member_no: string;
    full_name: string;
    email: string;
    document_count: number;
}

interface StudentDocDetail {
    sn: number;
    id: number;
    full_name: string;
    kap_email: string;
    doc_type: number;
    document_name: string;
    doc_path: string;
    proposed_id?: number;
    status?: number;
    doc_type_name: string;
}

interface DocumentViewerState {
    open: boolean;
    url: string;
    title: string;
    docId: number;
    docType: number;
    email: string;
    proposedId?: number;
}

interface RejectionFormState {
    open: boolean;
    docId: number;
    email: string;
    docType: number;
    remark: string;
    attachment: File | null;
    isSubmitting: boolean;
}

interface ConfirmationState {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

interface RejectionFormState {
    open: boolean;
    docId: number;
    email: string;
    docType: number;
    remark: string;
    attachment: File | null;
    isSubmitting: boolean;
}

interface DocumentTypeMap {
    [key: number]: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/students_documents_api.php";

function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport
                printOptions={{ disableToolbarButton: true }}
                csvOptions={{
                    fileName: 'student_documents',
                    delimiter: ',',
                    utf8WithBom: true,
                }}
            />
        </GridToolbarContainer>
    );
}

const StudentDocuments: React.FC = () => {
    const [students, setStudents] = useState<StudentDocument[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<StudentDocument[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error" | "info" | "warning",
    });
    const [openModal, setOpenModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentDocument | null>(null);
    const [studentDocuments, setStudentDocuments] = useState<StudentDocDetail[]>([]);
    const [documentViewer, setDocumentViewer] = useState<DocumentViewerState>({
        open: false,
        url: '',
        title: '',
        docId: 0,
        docType: 0,
        email: '',
        proposedId: undefined
    });
    const [rejectionForm, setRejectionForm] = useState<RejectionFormState>({
        open: false,
        docId: 0,
        email: '',
        docType: 0,
        remark: '',
        attachment: null,
        isSubmitting: false
    });
    const [approving, setApproving] = useState(false);
    const [confirmation, setConfirmation] = useState<ConfirmationState>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const documentTypeMap: DocumentTypeMap = {
        1: "Application Form",
        2: "Personal Statement",
        3: "School Consent",
        4: "Academic Transcripts",
        5: "CV/Resume",
        6: "Passport",
        7: "Degree Certificate",
        8: "English Test",
        9: "Recommendation Letter",
        10: "Financial Statement",
        11: "Research Proposal",
        12: "Portfolio",
        13: "Birth Certificate",
        14: "School Consent",
    };

    const getDocumentTypeName = (typeId: number): string => {
        return documentTypeMap[typeId] || `Document Type ${typeId}`;
    };

    const fetchStudentDocuments = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(API_URL, {
                params: { action: 'list' }
            });

            if (response.data.success) {
                setStudents(response.data.data);
                setFilteredStudents(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching student documents",
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

    // Fetch specific student's documents
    const fetchStudentDocDetails = async (email: string) => {
        setDocumentsLoading(true);
        try {
            const response = await axios.get(API_URL, {
                params: { action: 'documents', email }
            });

            if (response.data.success) {
                setStudentDocuments(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error fetching documents",
                    severity: "error",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching documents",
                severity: "error",
            });
        } finally {
            setDocumentsLoading(false);
        }
    };

    // Handle view documents
    const handleViewDocuments = (student: StudentDocument) => {
        setSelectedStudent(student);
        fetchStudentDocDetails(student.email);
        setOpenModal(true);
    };

    // Handle open document in iframe
    const handleOpenDocument = (doc: StudentDocDetail) => {
        setDocumentViewer({
            open: true,
            url: doc.doc_path,
            title: `${doc.full_name} - ${doc.doc_type_name}`,
            docId: doc.id,
            docType: doc.doc_type,
            email: selectedStudent?.email || '',
            proposedId: doc.proposed_id
        });
    };

    // Handle approve document
    const handleApproveDocument = () => {
        setConfirmation({
            open: true,
            title: 'Confirm Approval',
            message: 'Are you sure you want to approve this document?',
            onConfirm: async () => {
                setApproving(true);
                try {
                    const formData = new FormData();
                    formData.append('action', 'approve'); // Add action in POST data
                    formData.append('mid', documentViewer.docId.toString());
                    formData.append('email', documentViewer.email);

                    const response = await axios.post(API_URL, formData);

                    if (response.data.success) {
                        setSnackbar({
                            open: true,
                            message: response.data.message,
                            severity: "success",
                        });
                        // Refresh both document lists
                        await fetchStudentDocDetails(documentViewer.email);
                        await fetchStudentDocuments();
                        setDocumentViewer({ ...documentViewer, open: false });
                    } else {
                        setSnackbar({
                            open: true,
                            message: response.data.message || "Error approving document",
                            severity: "error",
                        });
                    }
                } catch (error) {
                    console.error('Approval error:', error);
                    setSnackbar({
                        open: true,
                        message: "Error approving document",
                        severity: "error",
                    });
                } finally {
                    setApproving(false);
                    setConfirmation({ ...confirmation, open: false });
                }
            },
        });
    };

    // Handle reject document
    const handleRejectDocument = async () => {
        if (!rejectionForm.remark) {
            setSnackbar({
                open: true,
                message: "Please provide a reason for rejection",
                severity: "error",
            });
            return;
        }

        if (!rejectionForm.docId || !rejectionForm.email || !rejectionForm.docType) {
            setSnackbar({
                open: true,
                message: "Invalid document information for rejection",
                severity: "error",
            });
            return;
        }

        setRejectionForm({ ...rejectionForm, isSubmitting: true });
        try {
            const formData = new FormData();
            formData.append('action', 'reject');
            formData.append('id', rejectionForm.docId.toString());
            formData.append('email', rejectionForm.email);
            formData.append('remark', rejectionForm.remark);
            formData.append('doc_type', rejectionForm.docType.toString());

            if (rejectionForm.attachment) {
                formData.append('attachments', rejectionForm.attachment);
            }

            // Store email for later use
            const studentEmail = rejectionForm.email;

            const response = await axios.post(API_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                // First close both modals
                setDocumentViewer(prev => ({ ...prev, open: false }));
                setRejectionForm({
                    open: false,
                    docId: 0,
                    email: '',
                    docType: 0,
                    remark: '',
                    attachment: null,
                    isSubmitting: false
                });

                // Then refresh data
                await fetchStudentDocDetails(studentEmail);
                await fetchStudentDocuments();

                // Show success message
                setSnackbar({
                    open: true,
                    message: response.data.message,
                    severity: "success",
                });
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "Error rejecting document",
                    severity: "error",
                });
                setRejectionForm(prev => ({ ...prev, isSubmitting: false }));
            }
        } catch (error) {
            console.error('Rejection error:', error);
            setSnackbar({
                open: true,
                message: "Error rejecting document",
                severity: "error",
            });
            setRejectionForm(prev => ({ ...prev, isSubmitting: false }));
        }
    };
    // Handle open rejection form
    const handleOpenRejectionForm = () => {
        console.log('Opening rejection form with:', {
            docId: documentViewer.docId,
            email: documentViewer.email,
            docType: documentViewer.docType
        });

        if (!documentViewer.docId || !documentViewer.email || !documentViewer.docType) {
            setSnackbar({
                open: true,
                message: "Cannot open rejection form: Missing document information",
                severity: "error",
            });
            return;
        }

        setRejectionForm({
            ...rejectionForm,
            open: true,
            docId: documentViewer.docId,
            email: documentViewer.email,
            docType: documentViewer.docType,
            remark: '',
            attachment: null,
            isSubmitting: false
        });
    };

    // Handle search
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);

        if (query === "") {
            setFilteredStudents(students);
            return;
        }

        const filtered = students.filter(student =>
            student.member_no.toLowerCase().includes(query) ||
            student.full_name.toLowerCase().includes(query) ||
            student.email.toLowerCase().includes(query) ||
            student.document_count.toString().includes(query)
        );

        setFilteredStudents(filtered);
    };

    // Export to Excel
    const handleExportExcel = () => {
        const exportData = filteredStudents.map(student => ({
            "No.": student.sn,
            "Member No": student.member_no,
            "Full Name": student.full_name,
            "Email": student.email,
            "Documents": student.document_count
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Documents");
        XLSX.writeFile(workbook, "student_documents.xlsx");
    };

    // Columns configuration
    const columns: GridColDef[] = [
        {
            field: 'sn',
            headerName: 'No.',
            width: 70
        },
        {
            field: 'member_no',
            headerName: 'Member No',
            flex: 1
        },
        {
            field: 'full_name',
            headerName: 'Full Name',
            flex: 1
        },
        {
            field: 'email',
            headerName: 'Email',
            flex: 1.5
        },
        {
            field: 'document_count',
            headerName: 'Documents',
            flex: 1,
            renderCell: (params) => (
                <Chip
                    avatar={<Avatar><DescriptionIcon fontSize="small" /></Avatar>}
                    label={params.value}
                    color="primary"
                    variant="outlined"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1,
            sortable: false,
            renderCell: (params) => (
                <IconButton
                    onClick={() => handleViewDocuments(params.row)}
                    color="primary"
                >
                    <VisibilityIcon />
                </IconButton>
            ),
        },
    ];

    // Initial data fetch
    useEffect(() => {
        fetchStudentDocuments();
    }, []);

    return (
        <div className="px-3">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-12">
                        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 3
                                }}
                            >
                                <Typography
                                    variant="h4"
                                    sx={{
                                        color: '#2164A6'
                                    }}
                                >
                                    Student's Documents
                                </Typography>
                                <Button
                                    variant="outlined"
                                    sx={{ textTransform: 'none' }}
                                    color="primary"
                                >
                                    Approved Documents
                                </Button>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <TextField
                                    label="Search students..."
                                    variant="outlined"
                                    fullWidth
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    InputProps={{
                                        endAdornment: (
                                            <Button
                                                variant="contained"
                                                onClick={handleExportExcel}
                                                sx={{ ml: 1, textTransform: 'none' }}
                                            >
                                                Export
                                            </Button>
                                        )
                                    }}
                                />
                            </Box>

                            <Box sx={{ height: 600, width: '100%' }}>
                                <DataGrid
                                    rows={filteredStudents}
                                    columns={columns}
                                    loading={isLoading}
                                    slots={{
                                        toolbar: CustomToolbar,
                                    }}
                                    pageSizeOptions={[10, 25, 50]}
                                    getRowId={(row) => row.email}
                                    disableRowSelectionOnClick
                                    sx={{
                                        '& .MuiDataGrid-cell': {
                                            display: 'flex',
                                            alignItems: 'center',
                                        },
                                    }}
                                />
                            </Box>
                        </Paper>
                    </div>
                </div>
            </div>

            {/* Documents List Modal */}
            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            Documents for {selectedStudent?.full_name}
                        </Typography>
                        <IconButton onClick={() => setOpenModal(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {documentsLoading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <LinearProgress sx={{ width: '100%' }} />
                        </Box>
                    ) : studentDocuments.length === 0 ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <Typography>No documents found</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>No.</TableCell>
                                        <TableCell>Full Name</TableCell>
                                        <TableCell>ISP Email</TableCell>
                                        <TableCell>Document Type</TableCell>
                                        <TableCell>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {studentDocuments.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell>{doc.sn}</TableCell>
                                            <TableCell>{doc.full_name}</TableCell>
                                            <TableCell>{doc.kap_email}</TableCell>
                                            <TableCell>{doc.doc_type_name || getDocumentTypeName(doc.doc_type)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="contained"
                                                    sx={{ textTransform: 'none' }}
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => handleOpenDocument(doc)}
                                                >
                                                    View Document
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenModal(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Document Viewer Modal */}
            <Dialog
                open={documentViewer.open}
                onClose={() => setDocumentViewer({ ...documentViewer, open: false })}
                fullWidth
                maxWidth="lg"
                fullScreen
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6">
                                {documentViewer.title}
                            </Typography>
                            {documentViewer.docType === 3 && documentViewer.proposedId && (
                                <Typography variant="subtitle1">
                                    School: {documentViewer.proposedId} | Program: {documentViewer.proposedId}
                                </Typography>
                            )}
                        </Box>
                        <div className="flex gap-10">
                            <Button
                                variant="contained"
                                sx={{ textTransform: 'none' }}
                                onClick={() => handleApproveDocument()}
                                color="success"
                                startIcon={<CheckIcon />}
                                disabled={approving}
                            >
                                {approving ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                                onClick={() => handleOpenRejectionForm()}
                                sx={{ textTransform: 'none' }}
                                color="error"
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                disabled={approving}
                            >
                                Reject
                            </Button>
                        </div>
                        <IconButton onClick={() => setDocumentViewer({ ...documentViewer, open: false })}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent style={{ height: '80vh', padding: 0 }}>
                    <iframe
                        src={documentViewer.url}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        title="Document Viewer"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDocumentViewer({ ...documentViewer, open: false })}
                        color="primary"
                        sx={{ textTransform: 'none' }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rejection Form Modal */}
            <Dialog
                open={rejectionForm.open}
                onClose={() => setRejectionForm({ ...rejectionForm, open: false })}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            Reject Document
                        </Typography>
                        <IconButton
                            onClick={() => setRejectionForm({ ...rejectionForm, open: false })}
                            disabled={rejectionForm.isSubmitting}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <TextField
                            label="Reason for Rejection"
                            multiline
                            rows={4}
                            fullWidth
                            value={rejectionForm.remark}
                            onChange={(e) => setRejectionForm({ ...rejectionForm, remark: e.target.value })}
                            variant="outlined"
                            required
                        />
                    </Box>
                    <Box mt={2}>
                        <input
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            id="rejection-attachment"
                            type="file"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setRejectionForm({ ...rejectionForm, attachment: e.target.files[0] });
                                }
                            }}
                        />
                        <label htmlFor="rejection-attachment">
                            <Button sx={{ textTransform: 'none' }} variant="outlined" component="span" fullWidth>
                                {rejectionForm.attachment ?
                                    `Attachment: ${rejectionForm.attachment.name}` :
                                    "Attach Screenshot (Optional)"}
                            </Button>
                        </label>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRejectionForm({ ...rejectionForm, open: false })}
                        disabled={rejectionForm.isSubmitting}
                        sx={{ textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleRejectDocument()}
                        color="error"
                        variant="contained"
                        sx={{ textTransform: 'none' }}
                        disabled={!rejectionForm.remark || rejectionForm.isSubmitting}
                    >
                        {rejectionForm.isSubmitting ? 'Submitting...' : 'Submit Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmation.open}
                onClose={() => setConfirmation({ ...confirmation, open: false })}
            >
                <DialogTitle>{confirmation.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmation.message}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmation({ ...confirmation, open: false })}
                        color="primary"
                        sx={{ textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        sx={{ textTransform: 'none' }}
                        onClick={confirmation.onConfirm}
                        color="primary"
                        variant="contained"
                        disabled={approving}
                    >
                        {approving ? 'Approving...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default StudentDocuments;