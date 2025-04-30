import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    Typography,
    IconButton,
} from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import CircularProgress from "@mui/material/CircularProgress";
import { GridCellParams } from "@mui/x-data-grid";
import AddIcon from '@mui/icons-material/Add';

// Define interfaces
interface ConsentForm {
    id: number;
    consent_type: string;
    school_name: string;
    loan_name: string;
    sign_type: string;
    URL: string;
}

interface ConsentType {
    id: number;
    consent_type: string;
}

interface School {
    id: number;
    school_name: string;
}

interface LoanType {
    id: number;
    loan_name: string;
}

interface Course {
    id: number;
    program_name: string;
}

const ConsentForms: React.FC = () => {
    const [consentForms, setConsentForms] = useState<ConsentForm[]>([]);
    const [filteredForms, setFilteredForms] = useState<ConsentForm[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [consentTypes, setConsentTypes] = useState<ConsentType[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [openAddModal, setOpenAddModal] = useState<boolean>(false);
    const [formData, setFormData] = useState<{
        consent_type: string;
        school_id: string;
        loan_id: string;
        sign_type: string;
        consent: File | string | null;
        courses: string[];
    }>({
        consent_type: "",
        school_id: "",
        loan_id: "",
        sign_type: "",
        consent: null,
        courses: [],
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });
    // const [currentPage, setCurrentPage] = useState<number>(1);
    // const rowsPerPage = 10;

    const [openViewModal, setOpenViewModal] = useState<boolean>(false);
    const [selectedConsent, setSelectedConsent] = useState<ConsentForm | null>(null);

    // API endpoint
    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/consent_forms_api.php";

    // Fetch consent forms and lookup details on mount
    useEffect(() => {
        fetchConsentForms();
        fetchLookupDetails();
    }, []);

    // Filter forms based on search query
    useEffect(() => {
        if (searchQuery) {
            setFilteredForms(
                consentForms.filter(
                    (form) =>
                        form.consent_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        form.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        form.loan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        form.sign_type.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredForms(consentForms);
        }
    }, [searchQuery, consentForms]);

    // Fetch consent forms
    const fetchConsentForms = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=fetch_consents`);
            // console.log('Raw response:', response.data);
            if (response.data.message === 'success') {
                const validData = response.data.data.filter(
                    (form: ConsentForm) =>
                        form &&
                        form.id &&
                        form.consent_type &&
                        form.school_name !== undefined &&
                        form.loan_name !== undefined &&
                        form.sign_type &&
                        form.URL
                );
                // console.log('Valid consent forms:', validData);
                setConsentForms(validData);
                setFilteredForms(validData);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Error fetching consent forms',
                    severity: 'error',
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Error connecting to server',
                severity: 'error',
            });
        }
    };

    const fetchLookupDetails = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=lookup_details`);
            if (response.data.message === 'success') {
                setConsentTypes(response.data.data.consent_types || []);
                setSchools(response.data.data.schools || []);
                setLoanTypes(response.data.data.loan_types || []);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Error fetching lookup details',
                    severity: 'error',
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Error connecting to server',
                severity: 'error',
            });
        }
    };

    const fetchSchoolCourses = async (schoolId: string) => {
        if (!schoolId || schoolId === 'Select Option') return;
        try {
            const response = await axios.get(`${API_URL}?action=fetch_school_courses&school_id=${schoolId}`);
            if (response.data.message === 'success') {
                setCourses(response.data.data || []);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Error fetching courses',
                    severity: 'error',
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Error connecting to server',
                severity: 'error',
            });
        }
    };

    // Handle form input changes
    const handleFormChange = (field: string, value: string | File | string[]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === "consent_type") {
            setFormData((prev) => ({
                ...prev,
                consent_type: value as string,
                school_id: "",
                loan_id: "",
                sign_type: "",
                consent: null,
                courses: [],
            }));
            setCourses([]);
        }
        if (field === "school_id" && value) {
            fetchSchoolCourses(value as string);
        }
        if (field === "sign_type" && !value) {
            setFormData((prev) => ({ ...prev, consent: null }));
        }
    };

    // Handle course selection
    const handleCourseChange = (courseId: string) => {
        setFormData((prev) => ({
            ...prev,
            courses: prev.courses.includes(courseId)
                ? prev.courses.filter((id) => id !== courseId)
                : [...prev.courses, courseId],
        }));
    };

    // Handle add consent form
    const handleAddConsent = async () => {
        if (!formData.consent_type) {
            setSnackbar({
                open: true,
                message: "Please select a consent type",
                severity: "warning",
            });
            return;
        }
        if (["2", "5"].includes(formData.consent_type)) {
            if (!formData.school_id) {
                setSnackbar({ open: true, message: "Please select a school", severity: "warning" });
                return;
            }
            if (!schools.some(school => school.id.toString() === formData.school_id)) {
                setSnackbar({ open: true, message: "Invalid school selected", severity: "warning" });
                return;
            }
        }
        if (formData.consent_type === "5" && formData.courses.length === 0) {
            setSnackbar({
                open: true,
                message: "Please select at least one course",
                severity: "warning",
            });
            return;
        }
        if (formData.consent_type === "4") {
            if (!formData.loan_id) {
                setSnackbar({ open: true, message: "Please select a loan provider", severity: "warning" });
                return;
            }
            if (!loanTypes.some(loan => loan.id.toString() === formData.loan_id)) {
                setSnackbar({ open: true, message: "Invalid loan provider selected", severity: "warning" });
                return;
            }
        }
        if (!formData.sign_type && ["1", "2", "3", "4", "5"].includes(formData.consent_type)) {
            setSnackbar({
                open: true,
                message: "Please select a signature type",
                severity: "warning",
            });
            return;
        }
        if (!formData.consent) {
            setSnackbar({
                open: true,
                message: "Please provide a consent document or URL",
                severity: "warning",
            });
            return;
        }

        setLoading(true);
        try {
            const payload = new FormData();
            // Remove action from payload since it will be in the query string
            payload.append('consent_type', formData.consent_type);
            if (formData.sign_type) payload.append('sign_type', formData.sign_type);
            if (['2', '5'].includes(formData.consent_type)) {
                payload.append('school_id', formData.school_id);
                formData.courses.forEach((courseId) => payload.append('courses[]', courseId));
            }
            if (formData.consent_type === '4') payload.append('loan_id', formData.loan_id);
            if (formData.consent instanceof File) {
                payload.append('consent', formData.consent);
            } else if (typeof formData.consent === 'string') {
                payload.append('link', formData.consent);
            }

            // Add action to the query string
            const response = await axios.post(`${API_URL}?action=new_consent`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.message === 'success') {
                setOpenAddModal(false);
                setFormData({ consent_type: '', school_id: '', loan_id: '', sign_type: '', consent: null, courses: [] });
                setCourses([]);
                fetchConsentForms();
                setSnackbar({
                    open: true,
                    message: 'Consent form added successfully',
                    severity: 'success',
                });
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Error adding consent form',
                    severity: 'error',
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'Error connecting to server',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle search input
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    // Capitalize words for display
    const capitalizeWords = (str: string | null | undefined) => {
        if (!str) return ''; // Handle null or undefined by returning an empty string
        return str.replace(/\b\w/g, (char) => char.toUpperCase());
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        {
            field: "consent_type",
            headerName: "Consent Type",
            flex: 1,
        },
        {
            field: "school_name",
            headerName: "School",
            flex: 2,
            valueGetter: (params: GridCellParams<ConsentForm>) => {
                // console.log('valueGetter params:', params);
                return params || 'N/A';
            }
        },
        {
            field: "loan_name",
            headerName: "Loan",
            flex: 1,
            valueGetter: (params: GridCellParams<ConsentForm>) => {
                // console.log('valueGetter params:', params);
                return params || 'N/A';
            }
        },
        {
            field: "sign_type",
            headerName: "Sign Type",
            flex: 1,
        },
        {
            field: "URL",
            headerName: "File",
            flex: 1,
            renderCell: (params) => (
                <IconButton
                    color="primary"
                    onClick={() => {
                        setSelectedConsent(params.row);
                        setOpenViewModal(true);
                    }}
                    aria-label="View consent form"
                >
                    <VisibilityIcon />
                </IconButton>
            ),
        },
    ];

    // Pagination
    // const paginatedForms = filteredForms.slice(
    //     (currentPage - 1) * rowsPerPage,
    //     currentPage * rowsPerPage
    // );
    // const totalPages = Math.ceil(filteredForms.length / rowsPerPage);

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
                                                        Consent Forms
                                                    </p>
                                                </div>
                                                <Box display="flex" justifyContent="end">
                                                    <Button
                                                        sx={{ textTransform: "none" }}
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={() => setOpenAddModal(true)}
                                                    >
                                                        <AddIcon />&nbsp; Add Consent Form
                                                    </Button>
                                                </Box>
                                            </div>

                                            <div className="card-body mb-4 mt-4">
                                                <div className="flex flex-row gap-4 mb-4">
                                                    <TextField
                                                        label="Search..."
                                                        variant="outlined"
                                                        fullWidth
                                                        value={searchQuery}
                                                        onChange={handleSearch}
                                                        sx={{ flex: 1 }}
                                                    />
                                                </div>

                                                <div style={{ height: 400, width: "100%" }}>
                                                    <DataGrid
                                                        rows={filteredForms}
                                                        columns={columns}
                                                        disableRowSelectionOnClick
                                                        getRowId={(row) => row.id}
                                                        sx={{
                                                            "& .capitalize-cell": {
                                                                "&:first-letter": {
                                                                    textTransform: "uppercase",
                                                                },
                                                                maxWidth: "10vw",
                                                            },
                                                        }}
                                                        initialState={{
                                                            pagination: {
                                                                paginationModel: { pageSize: 10 },
                                                            },
                                                        }}
                                                        pageSizeOptions={[5, 10, 25]}
                                                    />
                                                </div>

                                                {/* <Box
                                                    display="flex"
                                                    justifyContent="flex-end"
                                                    alignItems="center"
                                                    mt={2}
                                                    gap={2}
                                                >
                                                    <Button
                                                        variant="contained"
                                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                    >
                                                        Previous
                                                    </Button>
                                                    <Typography>
                                                        Page {currentPage} of {totalPages}
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        onClick={() =>
                                                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                                        }
                                                        disabled={currentPage === totalPages}
                                                    >
                                                        Next
                                                    </Button>
                                                </Box> */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Consent Form Modal */}
            <Dialog
                open={openAddModal}
                onClose={() => setOpenAddModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
                    Add Consent Form
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Consent Type</InputLabel>
                        <Select
                            label="Consent Type"
                            value={formData.consent_type}
                            onChange={(e) => handleFormChange("consent_type", e.target.value)}
                            required
                        >
                            <MenuItem value="">Select Option</MenuItem>
                            {consentTypes.map((type) => (
                                <MenuItem key={type.id} value={type.id.toString()}>
                                    {capitalizeWords(type.consent_type)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {["2", "5"].includes(formData.consent_type) && (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>School</InputLabel>
                            <Select
                            label="School"
                                value={formData.school_id}
                                onChange={(e) => handleFormChange("school_id", e.target.value)}
                            >
                                <MenuItem value="">Select Option</MenuItem>
                                {schools.map((school) => (
                                    <MenuItem key={school.id} value={school.id.toString()}>
                                        {school.school_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {formData.consent_type === "5" && formData.school_id && courses.length > 0 && (
                        <Box mt={2}>
                            <Typography>Select Course</Typography>
                            <Box pl={2} pt={1}>
                                {courses.map((course) => (
                                    <FormControlLabel
                                        key={course.id}
                                        control={
                                            <Checkbox
                                                checked={formData.courses.includes(
                                                    course.id.toString()
                                                )}
                                                onChange={() =>
                                                    handleCourseChange(course.id.toString())
                                                }
                                            />
                                        }
                                        label={course.program_name}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {formData.consent_type === "4" && (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Loan Providers</InputLabel>
                            <Select
                            label="Loan Providers"
                                value={formData.loan_id}
                                onChange={(e) => handleFormChange("loan_id", e.target.value)}
                            >
                                <MenuItem value="">Select Option</MenuItem>
                                {loanTypes.map((loan) => (
                                    <MenuItem key={loan.id} value={loan.id.toString()}>
                                        {loan.loan_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {["1", "2", "3", "4", "5"].includes(formData.consent_type) && (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Signature Type</InputLabel>
                            <Select
                            label="Signature Type"
                                value={formData.sign_type}
                                onChange={(e) => handleFormChange("sign_type", e.target.value)}
                                required
                            >
                                <MenuItem value="">Select Option</MenuItem>
                                <MenuItem value="hand">Hand Signature</MenuItem>
                                <MenuItem value="digital">Digital Signature</MenuItem>
                            </Select>
                        </FormControl>
                    )}

                    {formData.sign_type === "hand" && (
                        <TextField
                            label="Consent Document"
                            type="file"
                            fullWidth
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ accept: '.pdf, .docx' }}
                            onChange={(e) => {
                                const input = e.target as HTMLInputElement;
                                if (input.files && input.files[0]) {
                                    const file = input.files[0];
                                    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                                    if (!allowedTypes.includes(file.type)) {
                                        setSnackbar({
                                            open: true,
                                            message: 'Invalid file type. Please upload a PDF file.',
                                            severity: 'warning',
                                        });
                                        return;
                                    }
                                    handleFormChange("consent", input.files[0]);
                                }
                            }}
                        />
                    )}

                    {formData.sign_type === "digital" && (
                        <TextField
                            label="Consent URL"
                            fullWidth
                            margin="normal"
                            value={typeof formData.consent === "string" ? formData.consent : ""}
                            onChange={(e) => handleFormChange("consent", e.target.value)}
                            placeholder="https://example.com"
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: "none"}} onClick={() => setOpenAddModal(false)} disabled={loading}>
                        Close
                    </Button>
                    <Button sx={{ textTransform: "none"}} onClick={handleAddConsent} color="success" disabled={loading}>
                        {loading ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Adding...
                            </>
                        ) : (
                            "Add Consent"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={openViewModal}
                onClose={() => {
                    setOpenViewModal(false);
                    setSelectedConsent(null);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', marginBottom: '30px' }}>
                    View Consent Form
                </DialogTitle>
                <DialogContent>
                    {selectedConsent && (
                        <>
                            {selectedConsent.sign_type === 'Hand Signature' ? (
                                selectedConsent.URL.toLowerCase().endsWith('.pdf') ? (
                                    <embed
                                        src={selectedConsent.URL}
                                        type="application/pdf"
                                        width="100%"
                                        height="470px"
                                    />
                                ) : selectedConsent.URL.toLowerCase().endsWith('.docx') ? (
                                    <Box>
                                        <Typography>Preview not available for DOCX files.</Typography>
                                        <Button
                                            href={selectedConsent.URL}
                                            download
                                            variant="contained"
                                            color="primary"
                                        >
                                            Download DOCX
                                        </Button>
                                    </Box>
                                ) : (
                                    <img
                                        src={selectedConsent.URL}
                                        alt="Consent Document"
                                        style={{ width: '100%', maxHeight: '470px', objectFit: 'contain' }}
                                    />
                                )
                            ) : (
                                <iframe
                                    src={selectedConsent.URL}
                                    title="Consent Form"
                                    width="100%"
                                    height="470px"
                                    style={{ border: 'none' }}
                                />
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setOpenViewModal(false);
                            setSelectedConsent(null);
                        }}
                    >
                        Close
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
                <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default ConsentForms;