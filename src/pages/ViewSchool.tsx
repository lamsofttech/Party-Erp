import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Typography, Button, Card, CardContent, CircularProgress, Dialog,
    TextField, Select, MenuItem, FormControl, InputLabel, Snackbar, Alert,
    IconButton, Tooltip, Chip, Grid, Divider, Avatar, Stack, Tab, Tabs, AlertColor
} from '@mui/material';
import {
    Edit, Delete, Block, CheckCircle, School,
    ArrowBack, Add, EmojiEvents, Money, Flight
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import axios from 'axios';
import { ReactNode } from 'react';

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/single_school_api.php";

interface School {
    id: number;
    school_name: string;
    founded: number;
    undergrad: number;
    postgrad: number;
    acceptance: number;
    city: string;
    airport: string;
    yearly_fee: number;
    lenders: string;
    total_app: number;
    status: string;
}

interface Program {
    id: number;
    program_id: string;
    program_name: string;
    isstem: string;
    entrance_exam: string;
    actual_cost: number;
    app_cost: string;
    web_link: string;
    total_app: number;
    status: string;
}

interface FormData {
    program_name: string;
    is_stem: string;
    program_link: string;
    entrance_exam: string;
    app_cost: string;
    is_waived: string;
}

interface GradientCardProps {
    children: ReactNode;
    sx?: object;
}

interface StatsCardProps {
    icon: ReactNode;
    title: string;
    value: string | number;
    color?: string;
}

const GradientCard: React.FC<GradientCardProps> = ({ children, sx = {} }) => (
    <Card
        elevation={3}
        sx={{
            position: 'relative',
            overflow: 'visible',
            borderRadius: '16px',
            background: 'linear-gradient(to right bottom, #ffffff, #f8f9ff)',
            ...sx
        }}
    >
        {children}
    </Card>
);

const StatsCard: React.FC<StatsCardProps> = ({ icon, title, value, color = '#4a6da7' }) => (
    <GradientCard sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {title}
                </Typography>
                <Avatar sx={{ bgcolor: `${color}15`, color: color }}>{icon}</Avatar>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {value}
            </Typography>
        </CardContent>
    </GradientCard>
);

const ViewSchool = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get("id");
    const [school, setSchool] = useState<School | null>(null);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [openAddModal, setOpenAddModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [formData, setFormData] = useState<FormData>({
        program_name: '',
        is_stem: '',
        program_link: '',
        entrance_exam: '',
        app_cost: '',
        is_waived: '',
    });
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: AlertColor;
    }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        fetchSchoolData();
        fetchPrograms();
    }, [id]);

    const fetchSchoolData = async () => {
        if (!id) {
            setSnackbar({ open: true, message: 'Invalid school ID', severity: 'error' });
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const form = new FormData();
            form.append('action', 'fetch_school_details');
            form.append('id', id);
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSchool(response.data.data);
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to fetch school details', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchPrograms = async () => {
        if (!id) {
            setSnackbar({ open: true, message: 'Invalid school ID', severity: 'error' });
            return;
        }
        try {
            const params = new URLSearchParams();
            params.append('action', 'fetch_school_programs');
            params.append('school_id', id);
            const response = await axios.post(API_URL, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            console.log('Fetch programs response:', response.data);
            if (response.data.message === 'success') {
                setPrograms(response.data.data);
            } else {
                console.error('Fetch programs failed:', response.data);
                setSnackbar({ open: true, message: response.data.data || 'Failed to fetch programs', severity: 'error' });
            }
        } catch (error: any) {
            console.error('Fetch programs error:', error.response?.data || error.message);
            setSnackbar({ open: true, message: 'Failed to fetch programs: ' + (error.response?.data?.data || error.message), severity: 'error' });
        }
    };

    const handleAddProgram = async () => {
        const requiredFields: (keyof FormData)[] = [
            'program_name', 'is_stem', 'program_link', 'entrance_exam', 'app_cost', 'is_waived'
        ];
        const missingFields = requiredFields.filter(field => formData[field] === '');
        if (missingFields.length > 0) {
            setSnackbar({
                open: true,
                message: `Please fill all required fields: ${missingFields.join(', ')}`,
                severity: 'error',
            });
            return;
        }
        if (!id) {
            setSnackbar({ open: true, message: 'Invalid school ID', severity: 'error' });
            return;
        }
        setIsSubmitting(true);
        const form = new FormData();
        form.append('action', 'add_program');
        form.append('school_id', id);
        form.append('program_name', formData.program_name);
        form.append('is_stem', formData.is_stem);
        form.append('program_link', formData.program_link);
        form.append('entrance_exam', formData.entrance_exam);
        form.append('app_cost', formData.app_cost);
        form.append('is_waived', formData.is_waived);

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'Program added successfully', severity: 'success' });
                setOpenAddModal(false);
                setFormData({ program_name: '', is_stem: '', program_link: '', entrance_exam: '', app_cost: '', is_waived: '' });
                fetchPrograms();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to add program', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditProgram = async () => {
        const requiredFields: (keyof FormData)[] = [
            'program_name', 'is_stem', 'program_link', 'entrance_exam', 'app_cost', 'is_waived'
        ];
        const missingFields = requiredFields.filter(field => formData[field] === '');
        if (missingFields.length > 0) {
            setSnackbar({
                open: true,
                message: `Please fill all required fields: ${missingFields.join(', ')}`,
                severity: 'error',
            });
            return;
        }
        if (!selectedProgram) {
            setSnackbar({ open: true, message: 'No program selected', severity: 'error' });
            return;
        }
        setIsSubmitting(true);
        const form = new FormData();
        form.append('action', 'edit_program');
        form.append('program_id', selectedProgram.id.toString());
        form.append('program_name', formData.program_name);
        form.append('isstem', formData.is_stem);
        form.append('program_link', formData.program_link);
        form.append('entrance_exam', formData.entrance_exam);
        form.append('app_cost', formData.app_cost);
        form.append('is_waived', formData.is_waived);

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'Program updated successfully', severity: 'success' });
                setOpenEditModal(false);
                setFormData({ program_name: '', is_stem: '', program_link: '', entrance_exam: '', app_cost: '', is_waived: '' });
                fetchPrograms();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to update program', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProgram = async () => {
        if (!selectedProgram) {
            setSnackbar({ open: true, message: 'No program selected', severity: 'error' });
            return;
        }
        setIsSubmitting(true);
        const form = new FormData();
        form.append('action', 'delete_program');
        form.append('id', selectedProgram.id.toString());

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'Program deleted successfully', severity: 'success' });
                setOpenConfirmModal(false);
                fetchPrograms();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to delete program', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhaseProgram = async (program: Program, status: 'in' | 'out') => {
        setIsSubmitting(true);
        const form = new FormData();
        form.append('action', 'change_program_status');
        form.append('id', program.id.toString());
        form.append('status', status);

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'Program status updated', severity: 'success' });
                fetchPrograms();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to update program status', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'program_id',
            headerName: 'Program Code',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Typography
                    variant="body2"
                    sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: '#4a6da7'
                    }}
                >
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'program_name',
            headerName: 'Program Name',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'isstem',
            headerName: 'Type',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Chip
                    label={params.value}
                    size="small"
                    color={params.value === 'STEM' ? 'primary' : 'secondary'}
                    variant="outlined"
                    sx={{
                        borderRadius: '6px',
                        fontWeight: 500
                    }}
                />
            )
        },
        {
            field: 'entrance_exam',
            headerName: 'Entrance Exam',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Typography variant="body2">
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'actual_cost',
            headerName: 'Fee (USD)',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 600 }}
                >
                    ${Number(params.value).toFixed(2)}
                </Typography>
            )
        },
        {
            field: 'app_cost',
            headerName: 'Waiver',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                params.value.toLowerCase() === 'waived' ? (
                    <Chip
                        label="Yes"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 500 }}
                    />
                ) : (
                    <Chip
                        label="No"
                        size="small"
                        color="default"
                        sx={{ fontWeight: 500 }}
                    />
                )
            ),
        },
        {
            field: 'total_app',
            headerName: 'Applications',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        fontWeight: 600,
                        bgcolor: params.value > 0 ? '#e3f2fd' : '#f5f5f5',
                        color: params.value > 0 ? '#1976d2' : '#757575'
                    }}
                />
            )
        },
        {
            field: 'status',
            headerName: 'Status',
            flex: 1,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Chip
                variant="outlined"
                    label={params.value === 'in' ? 'Phased In' : 'Phased Out'}
                    size="small"
                    color={params.value === 'in' ? 'success' : 'error'}
                    sx={{
                        fontWeight: 500,
                        borderRadius: '6px'
                    }}
                />
            )
        },
        {
            field: 'action',
            headerName: 'Actions',
            flex: 1.2,
            renderCell: (params: GridRenderCellParams<Program>) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit Program">
                        <IconButton
                            sx={{
                                color: '#ff9800',
                                '&:hover': {
                                    bgcolor: '#fff3e0',
                                }
                            }}
                            size="small"
                            onClick={() => {
                                setSelectedProgram(params.row);
                                setFormData({
                                    program_name: params.row.program_name,
                                    is_stem: params.row.isstem,
                                    program_link: params.row.web_link,
                                    entrance_exam: params.row.entrance_exam,
                                    app_cost: params.row.actual_cost.toString(),
                                    is_waived: params.row.app_cost.toLowerCase() === 'waived' ? 'Yes' : 'No',
                                });
                                setOpenEditModal(true);
                            }}
                        >
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Program">
                        <IconButton
                            sx={{
                                color: '#f44336',
                                '&:hover': {
                                    bgcolor: '#ffebee',
                                }
                            }}
                            size="small"
                            onClick={() => {
                                setSelectedProgram(params.row);
                                setOpenConfirmModal(true);
                            }}
                        >
                            <Delete fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={params.row.status === 'in' ? 'Phase Out' : 'Phase In'}>
                        <IconButton
                            sx={{
                                color: params.row.status === 'in' ? '#f44336' : '#4caf50',
                                '&:hover': {
                                    bgcolor: params.row.status === 'in' ? '#ffebee' : '#e8f5e9',
                                }
                            }}
                            size="small"
                            onClick={() => handlePhaseProgram(params.row, params.row.status === 'in' ? 'out' : 'in')}
                            disabled={isSubmitting}
                        >
                            {params.row.status === 'in' ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            ),
        },
    ];

    const renderProgramForm = () => (
        <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TextField
                        label="Program Name"
                        value={formData.program_name}
                        onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                        required
                        fullWidth
                        variant="outlined"
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Program Type</InputLabel>
                        <Select
                            value={formData.is_stem}
                            onChange={(e) => setFormData({ ...formData, is_stem: e.target.value })}
                            label="Program Type"
                            required
                        >
                            <MenuItem value="">Select</MenuItem>
                            <MenuItem value="STEM">STEM</MenuItem>
                            <MenuItem value="NON STEM">NON STEM</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Program Link"
                        value={formData.program_link}
                        onChange={(e) => setFormData({ ...formData, program_link: e.target.value })}
                        required
                        fullWidth
                        variant="outlined"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Entrance Exam</InputLabel>
                        <Select
                            value={formData.entrance_exam}
                            onChange={(e) => setFormData({ ...formData, entrance_exam: e.target.value })}
                            label="Entrance Exam"
                            required
                        >
                            <MenuItem value="">Select</MenuItem>
                            <MenuItem value="Optional">Optional</MenuItem>
                            <MenuItem value="GMAT">GMAT</MenuItem>
                            <MenuItem value="GRE">GRE</MenuItem>
                            <MenuItem value="GMAT or GRE">GMAT or GRE</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField
                        label="Application Cost (USD)"
                        type="number"
                        inputProps={{ step: '0.01' }}
                        value={formData.app_cost}
                        onChange={(e) => setFormData({ ...formData, app_cost: e.target.value })}
                        required
                        fullWidth
                        variant="outlined"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <FormControl fullWidth variant="outlined">
                        <InputLabel>Is Application Waived?</InputLabel>
                        <Select
                            value={formData.is_waived}
                            onChange={(e) => setFormData({ ...formData, is_waived: e.target.value })}
                            label="Is Application Waived?"
                            required
                        >
                            <MenuItem value="">Select</MenuItem>
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Box>
    );

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(145deg, #f6f8fd 0%, #f0f3fa 100%)',
            }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!school) {
        return (
            <Box sx={{
                p: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '50vh',
                background: 'linear-gradient(145deg, #f6f8fd 0%, #f0f3fa 100%)',
            }}>
                <Typography variant="h5" color="error" gutterBottom>
                    School not found
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/schools')}
                    sx={{
                        mt: 2,
                        background: 'linear-gradient(to right, #4a6da7, #6487c1)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(74, 109, 167, 0.2)',
                        textTransform: 'none',
                        '&:hover': {
                            background: 'linear-gradient(to right, #3d5c9a, #597bb5)',
                            boxShadow: '0 6px 16px rgba(74, 109, 167, 0.3)',
                        }
                    }}
                >
                    Back to Schools
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{
            p: { xs: 2, md: 4 },
            background: 'linear-gradient(145deg, #f6f8fd 0%, #f0f3fa 100%)',
            minHeight: '100vh',
            marginBottom: '20px',
            borderRadius: '8px',
        }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 }
            }}>
                <Box>
                    <Typography variant="h4" sx={{
                        fontWeight: 700,
                        color: '#1a2138',
                        fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif'
                    }}>
                        {school.school_name}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{
                        mb: 3,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 500,
                        },
                        '& .Mui-selected': {
                            color: '#4a6da7',
                            fontWeight: 600,
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#4a6da7',
                        }
                    }}
                >
                    <Tab label="School Overview" />
                    <Tab label="Programs" />
                </Tabs>

                {tabValue === 0 && (
                    <>
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatsCard
                                    icon={<School fontSize="small" />}
                                    title="Founded"
                                    value={school.founded}
                                    color="#4a6da7"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatsCard
                                    icon={<EmojiEvents fontSize="small" />}
                                    title="Acceptance Rate"
                                    value={`${school.acceptance}%`}
                                    color="#ff9800"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatsCard
                                    icon={<Money fontSize="small" />}
                                    title="Yearly Tuition"
                                    value={`$${Number(school.yearly_fee).toLocaleString()}`}
                                    color="#4caf50"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <StatsCard
                                    icon={<Flight fontSize="small" />}
                                    title="Nearest Airport"
                                    value={school.airport}
                                    color="#e91e63"
                                />
                            </Grid>
                        </Grid>

                        <GradientCard>
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1a2138' }}>
                                    School Details
                                </Typography>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                Location
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {school.city}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                Undergraduate Students
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {Number(school.undergrad).toLocaleString()}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                Postgraduate Students
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {Number(school.postgrad).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                Total Applications
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {Number(school.total_app).toLocaleString()}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                Lenders
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {school.lenders || 'None specified'}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                                                Status
                                            </Typography>
                                            <Chip
                                                label={school.status === 'in' ? 'Active' : 'Inactive'}
                                                color={school.status === 'in' ? 'success' : 'default'}
                                                sx={{ fontWeight: 500 }}
                                            />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </GradientCard>
                    </>
                )}

                {tabValue === 1 && (
                    <GradientCard>
                        <Box sx={{
                            p: 3,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 2, sm: 0 }
                        }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a2138' }}>
                                All Programs ({programs.length})
                            </Typography>

                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => {
                                    setFormData({
                                        program_name: '',
                                        is_stem: '',
                                        program_link: '',
                                        entrance_exam: '',
                                        app_cost: '',
                                        is_waived: ''
                                    });
                                    setOpenAddModal(true);
                                }}
                                sx={{
                                    background: 'linear-gradient(to right, #4a6da7, #6487c1)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(74, 109, 167, 0.2)',
                                    textTransform: 'none',
                                    '&:hover': {
                                        background: 'linear-gradient(to right, #3d5c9a, #597bb5)',
                                        boxShadow: '0 6px 16px rgba(74, 109, 167, 0.3)',
                                    }
                                }}
                            >
                                Add Program
                            </Button>
                        </Box>

                        <Divider />

                        <Box sx={{ p: 0 }}>
                            <DataGrid
                                rows={programs}
                                columns={columns}
                                initialState={{
                                    pagination: {
                                        paginationModel: { pageSize: 10 },
                                    },
                                }}
                                pageSizeOptions={[5, 10, 25]}
                                autoHeight
                                disableRowSelectionOnClick
                                sx={{
                                    border: 'none',
                                    '& .MuiDataGrid-columnHeader': {
                                        backgroundColor: '#f8f9ff',
                                        color: '#4a6da7',
                                        fontWeight: 600,
                                    },
                                    '& .MuiDataGrid-cell': {
                                        borderBottom: '1px solid #f0f3fa',
                                        display: 'flex', // Add flexbox
                                        alignItems: 'center',
                                    },
                                    '& .MuiDataGrid-row:hover': {
                                        backgroundColor: '#f8f9ff',
                                    },
                                }}
                            />
                        </Box>
                    </GradientCard>
                )}
            </Box>

            <Dialog
                open={openAddModal}
                onClose={() => setOpenAddModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
                        overflow: 'hidden'
                    }
                }}
            >
                <Box sx={{
                    p: 3,
                    background: 'linear-gradient(to right, #4a6da7, #6487c1)',
                    color: 'white'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Add New Program
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                        Create a new program for {school?.school_name}
                    </Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                    {renderProgramForm()}
                </Box>

                <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: '#f8f9ff' }}>
                    <Button
                        onClick={() => setOpenAddModal(false)}
                        variant="outlined"
                        sx={{
                            color: '#4a6da7',
                            borderColor: '#4a6da7',
                            '&:hover': { borderColor: '#3d5c9a', backgroundColor: 'rgba(74, 109, 167, 0.08)' }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAddProgram}
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                            background: 'linear-gradient(to right, #4a6da7, #6487c1)',
                            boxShadow: '0 4px 12px rgba(74, 109, 167, 0.2)',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #3d5c9a, #597bb5)',
                                boxShadow: '0 6px 16px rgba(74, 109, 167, 0.3)',
                            }
                        }}
                    >
                        {isSubmitting ? 'Adding...' : 'Add Program'}
                    </Button>
                </Box>
            </Dialog>

            <Dialog
                open={openEditModal}
                onClose={() => setOpenEditModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
                        overflow: 'hidden'
                    }
                }}
            >
                <Box sx={{
                    p: 3,
                    background: 'linear-gradient(to right, #ff9800, #ffb74d)',
                    color: 'white'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Edit Program
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                        Update program details for {selectedProgram?.program_name}
                    </Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                    {renderProgramForm()}
                </Box>

                <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: '#f8f9ff' }}>
                    <Button
                        onClick={() => setOpenEditModal(false)}
                        variant="outlined"
                        sx={{
                            color: '#ff9800',
                            borderColor: '#ff9800',
                            '&:hover': { borderColor: '#f57c00', backgroundColor: 'rgba(255, 152, 0, 0.08)' }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleEditProgram}
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                            background: 'linear-gradient(to right, #ff9800, #ffb74d)',
                            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)',
                            textTransform: 'none',
                            '&:hover': {
                                background: 'linear-gradient(to right, #f57c00, #ffa726)',
                                boxShadow: '0 6px 16px rgba(255, 152, 0, 0.3)',
                            }
                        }}
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Box>
            </Dialog>

            <Dialog
                open={openConfirmModal}
                onClose={() => setOpenConfirmModal(false)}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
                        overflow: 'hidden',
                        maxWidth: '400px'
                    }
                }}
            >
                <Box sx={{
                    p: 3,
                    background: 'linear-gradient(to right, #f44336, #e57373)',
                    color: 'white'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Confirm Delete
                    </Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Are you sure you want to delete this program?
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {selectedProgram?.program_name}
                    </Typography>
                </Box>

                <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, bgcolor: '#f8f9ff' }}>
                    <Button
                        onClick={() => setOpenConfirmModal(false)}
                        disabled={isSubmitting}
                        sx={{ color: '#616161' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteProgram}
                        variant="contained"
                        color="error"
                        disabled={isSubmitting}
                        sx={{
                            boxShadow: '0 4px 12px rgba(244, 67, 54, 0.2)',
                            textTransform: 'none',
                            '&:hover': {
                                boxShadow: '0 6px 16px rgba(244, 67, 54, 0.3)',
                            }
                        }}
                    >
                        {isSubmitting ? 'Deleting...' : 'Delete'}
                    </Button>
                </Box>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    severity={snackbar.severity}
                    sx={{
                        width: '100%',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px'
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ViewSchool;