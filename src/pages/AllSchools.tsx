import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
    Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Alert, Box, Select, MenuItem, FormControl, InputLabel,
    Checkbox, FormControlLabel, Typography, IconButton, Tooltip
} from '@mui/material';
import { Edit, Visibility, Block, CheckCircle } from '@mui/icons-material';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface School {
    id: number;
    school_name: string;
    partner: string;
    total_app: number;
    no_of_students: number;
    status: string;
    web_link?: string;
    founded?: number;
    undergrad?: number;
    postgrad?: number;
    acceptance?: number;
    yearly_fee?: number;
    city?: string;
    airport?: string;
    street?: string;
    zip_code?: string;
    state?: string;
    country?: string;
    app_portal?: string;
    lenders?: string;
    itwenty_submit?: string;
    itwenty_link?: string;
    itwenty_process?: string;
    verification?: string;
    verification_email?: string;
    affidavit_form?: null | string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/all_schools_api.php";

const AllSchools: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<'in' | 'out'>('in');
    const [openAddModal, setOpenAddModal] = useState<boolean>(false);
    const [openEditModal, setOpenEditModal] = useState<boolean>(false);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [addFormData, setAddFormData] = useState<any>({
        school_name: '',
        web_link: '',
        year_founded: '',
        partner: '',
        undergrad: '',
        postgrad: '',
        acceptance: '',
        yearly_fee: '',
        city: '',
        airport: '',
        street: '',
        zip_code: '',
        state: '',
        country: '',
        app_portal: '',
        lenders: [],
        itwenty_submit: '',
        itwenty_link: '',
        itwenty_process: '',
        need_ver: '',
        verification_email: '',
        affidavit_form: null,
    });
    const [editFormData, setEditFormData] = useState<any>({});
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [openConfirmModal, setOpenConfirmModal] = useState<boolean>(false);
    const [confirmSchool, setConfirmSchool] = useState<School | null>(null);
    const [isPhasing, setIsPhasing] = useState<boolean>(false);

    useEffect(() => {
        fetchSchools();
    }, [statusFilter]);

    const fetchSchools = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=fetch_schools&status=${statusFilter}`);
            if (response.data.message === 'success') {
                setSchools(response.data.data);
                setFilteredSchools(response.data.data);
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to fetch schools', severity: 'error' });
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredSchools(
            schools.filter((school) =>
                school.school_name.toLowerCase().includes(query)
            )
        );
    };

    const handleAddSchool = async () => {
        console.log('addFormData:', addFormData);

        // Validate required fields
        const requiredFields = [
            'school_name', 'web_link', 'year_founded', 'undergrad', 'postgrad',
            'acceptance', 'yearly_fee', 'city', 'airport', 'street', 'zip_code',
            'state', 'country', 'itwenty_submit', 'itwenty_link', 'itwenty_process', 'need_ver'
        ];
        const missingFields = requiredFields.filter(field => addFormData[field] === '' || addFormData[field] === undefined || addFormData[field] === null);
        if (missingFields.length > 0) {
            setSnackbar({
                open: true,
                message: `Please fill all required fields: ${missingFields.join(', ')}`,
                severity: 'error'
            });
            return;
        }

        // Validate numeric fields
        if (isNaN(Number(addFormData.year_founded)) || Number(addFormData.year_founded) <= 0) {
            setSnackbar({ open: true, message: 'Year Founded must be a valid positive number', severity: 'error' });
            return;
        }
        if (isNaN(Number(addFormData.undergrad)) || Number(addFormData.undergrad) < 0) {
            setSnackbar({ open: true, message: 'Undergraduate Students must be a valid non-negative number', severity: 'error' });
            return;
        }
        if (isNaN(Number(addFormData.postgrad)) || Number(addFormData.postgrad) < 0) {
            setSnackbar({ open: true, message: 'Postgraduate Students must be a valid non-negative number', severity: 'error' });
            return;
        }
        if (isNaN(Number(addFormData.acceptance)) || Number(addFormData.acceptance) < 0 || Number(addFormData.acceptance) > 100) {
            setSnackbar({ open: true, message: 'Acceptance Rate must be between 0 and 100', severity: 'error' });
            return;
        }
        if (isNaN(Number(addFormData.yearly_fee)) || Number(addFormData.yearly_fee) < 0) {
            setSnackbar({ open: true, message: 'Yearly Fee must be a valid non-negative number', severity: 'error' });
            return;
        }

        // Validate need_ver
        if (!['Yes', 'No'].includes(addFormData.need_ver)) {
            setSnackbar({ open: true, message: 'Requires Verification must be "Yes" or "No"', severity: 'error' });
            return;
        }

        setIsAdding(true);
        const form = new FormData();
        form.append('school_name', addFormData.school_name);
        form.append('web_link', addFormData.web_link);
        form.append('year_founded', addFormData.year_founded);
        form.append('partner', addFormData.partner || '');
        form.append('undergrad', addFormData.undergrad);
        form.append('postgrad', addFormData.postgrad);
        form.append('acceptance', addFormData.acceptance);
        form.append('yearly_fee', addFormData.yearly_fee);
        form.append('city', addFormData.city);
        form.append('airport', addFormData.airport);
        form.append('street', addFormData.street);
        form.append('zip_code', addFormData.zip_code);
        form.append('state', addFormData.state);
        form.append('country', addFormData.country);
        form.append('app_portal', addFormData.app_portal || '');
        addFormData.lenders.forEach((lender: string, index: number) => {
            form.append(`lenders[${index}]`, lender);
        });
        form.append('itwenty_submit', addFormData.itwenty_submit);
        form.append('itwenty_link', addFormData.itwenty_link);
        form.append('itwenty_process', addFormData.itwenty_process);
        form.append('need_ver', addFormData.need_ver);
        if (addFormData.need_ver === 'Yes') {
            form.append('ver_email', addFormData.verification_email || '');
        }
        if (addFormData.affidavit_form && addFormData.affidavit_form instanceof File) {
            form.append('affidavit_form', addFormData.affidavit_form);
        }
        form.append('action', 'add_school');

        try {
            console.log('Form Data:', Object.fromEntries(form));
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'School added successfully', severity: 'success' });
                setOpenAddModal(false);
                setAddFormData({
                    school_name: '',
                    web_link: '',
                    year_founded: '',
                    partner: '',
                    undergrad: '',
                    postgrad: '',
                    acceptance: '',
                    yearly_fee: '',
                    city: '',
                    airport: '',
                    street: '',
                    zip_code: '',
                    state: '',
                    country: '',
                    app_portal: '',
                    lenders: [],
                    itwenty_submit: '',
                    itwenty_link: '',
                    itwenty_process: '',
                    need_ver: '',
                    verification_email: '',
                    affidavit_form: null,
                });
                fetchSchools();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to add school', severity: 'error' });
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditSchool = async () => {
        console.log('editFormData:', editFormData);

        // Validate required fields
        const requiredFields = [
            'school_name', 'web_link', 'year_founded', 'undergrad', 'postgrad',
            'acceptance', 'yearly_fee', 'city', 'airport', 'street', 'zip_code',
            'state', 'country', 'itwenty_submit', 'itwenty_link', 'itwenty_process', 'need_ver'
        ];

        const missingFields = requiredFields.filter(field => editFormData[field] === '' || editFormData[field] === undefined || editFormData[field] === null);
        if (missingFields.length > 0) {
            console.log('Missing fields:', missingFields);
            setSnackbar({
                open: true,
                message: `Missing required fields: ${missingFields.join(', ')}`,
                severity: 'error'
            });
            return;
        }

        // Validate numeric fields
        if (isNaN(Number(editFormData.year_founded)) || Number(editFormData.year_founded) <= 0) {
            setSnackbar({ open: true, message: 'Year Founded must be a valid positive number', severity: 'error' });
            return;
        }
        if (isNaN(Number(editFormData.undergrad)) || Number(editFormData.undergrad) < 0) {
            setSnackbar({ open: true, message: 'Undergraduate Students must be a valid non-negative number', severity: 'error' });
            return;
        }
        if (isNaN(Number(editFormData.postgrad)) || Number(editFormData.postgrad) < 0) {
            setSnackbar({ open: true, message: 'Postgraduate Students must be a valid non-negative number', severity: 'error' });
            return;
        }
        if (isNaN(Number(editFormData.acceptance)) || Number(editFormData.acceptance) < 0 || Number(editFormData.acceptance) > 100) {
            setSnackbar({ open: true, message: 'Acceptance Rate must be between 0 and 100', severity: 'error' });
            return;
        }
        if (isNaN(Number(editFormData.yearly_fee)) || Number(editFormData.yearly_fee) < 0) {
            setSnackbar({ open: true, message: 'Yearly Fee must be a valid non-negative number', severity: 'error' });
            return;
        }

        // Validate need_ver
        if (!['Yes', 'No'].includes(editFormData.need_ver)) {
            setSnackbar({ open: true, message: 'Requires Verification must be "Yes" or "No"', severity: 'error' });
            return;
        }

        setIsEditing(true);
        const form = new FormData();
        form.append('id', selectedSchool!.id.toString());
        form.append('school_name', editFormData.school_name || '');
        form.append('web_link', editFormData.web_link || '');
        form.append('year_founded', editFormData.year_founded || '');
        form.append('partner', editFormData.partner || '');
        form.append('undergrad', editFormData.undergrad || '0');
        form.append('postgrad', editFormData.postgrad || '0');
        form.append('acceptance', editFormData.acceptance || '0');
        form.append('yearly_fee', editFormData.yearly_fee || '0');
        form.append('city', editFormData.city || '');
        form.append('airport', editFormData.airport || '');
        form.append('street', editFormData.street || '');
        form.append('zip_code', editFormData.zip_code || '');
        form.append('state', editFormData.state || '');
        form.append('country', editFormData.country || '');
        form.append('app_portal', editFormData.app_portal || '');
        editFormData.lenders.forEach((lender: string, index: number) => {
            form.append(`lenders[${index}]`, lender);
        });
        form.append('itwenty_submit', editFormData.itwenty_submit || '');
        form.append('itwenty_link', editFormData.itwenty_link || '');
        form.append('itwenty_process', editFormData.itwenty_process || '');
        form.append('need_ver', editFormData.need_ver);
        if (editFormData.need_ver === 'Yes') {
            form.append('ver_email', editFormData.verification_email || '');
        }
        if (editFormData.affidavit_form && editFormData.affidavit_form instanceof File) {
            form.append('affidavit_form', editFormData.affidavit_form);
        } else {
            form.append('existing_affidavit', editFormData.affidavit_form || '');
        }
        form.append('action', 'edit_school');

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'School updated successfully', severity: 'success' });
                setOpenEditModal(false);
                setEditFormData({});
                fetchSchools();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            console.error('Error:', error);
            setSnackbar({ open: true, message: 'Failed to update school', severity: 'error' });
        } finally {
            setIsEditing(false);
        }
    };

    const handlePhaseInOut = (school: School) => {
        setConfirmSchool(school);
        setOpenConfirmModal(true);
    };

    const confirmPhaseInOut = async () => {
        if (!confirmSchool) return;

        setIsPhasing(true);
        const form = new FormData();
        form.append('action', 'change_status');
        form.append('id', confirmSchool.id.toString());
        form.append('status', confirmSchool.status === 'in' ? 'out' : 'in');

        console.log('Phase In/Out FormData:');
        for (let [key, value] of form.entries()) {
            console.log(`${key}: ${value}`);
        }

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'School status updated', severity: 'success' });
                setOpenConfirmModal(false);
                setConfirmSchool(null);
                fetchSchools();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            console.error('Phase In/Out Error:', error);
            setSnackbar({ open: true, message: "Failed to update status", severity: 'error' });
        } finally {
            setIsPhasing(false);
        }
    };

    const handleEditClick = async (school: School) => {
        try {
            const form = new FormData();
            form.append('action', 'fetch_school_details');
            form.append('id', school.id.toString());

            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            console.log('API Response:', response.data);

            if (response.data.message === 'success') {
                setSelectedSchool(school);
                const lenders = response.data.data.lenders
                    ? typeof response.data.data.lenders === 'string'
                        ? response.data.data.lenders.split(',').filter((l: string) => l)
                        : Array.isArray(response.data.data.lenders)
                            ? response.data.data.lenders
                            : []
                    : [];
                // Initialize editFormData with all fields to prevent undefined values
                setEditFormData({
                    school_name: response.data.data.school_name || '',
                    web_link: response.data.data.web_link || '',
                    year_founded: response.data.data.founded || '',
                    partner: response.data.data.partner || '',
                    undergrad: response.data.data.undergrad || '',
                    postgrad: response.data.data.postgrad || '',
                    acceptance: response.data.data.acceptance || '',
                    yearly_fee: response.data.data.yearly_fee || '',
                    city: response.data.data.city || '',
                    airport: response.data.data.airport || '',
                    street: response.data.data.street || '',
                    zip_code: response.data.data.zip_code || '',
                    state: response.data.data.state || '',
                    country: response.data.data.country || '',
                    app_portal: response.data.data.app_portal || '',
                    lenders: lenders,
                    itwenty_submit: response.data.data.itwenty_submit || '',
                    itwenty_link: response.data.data.itwenty_link || '',
                    itwenty_process: response.data.data.itwenty_process || '',
                    need_ver: response.data.data.verification || 'No',
                    verification_email: response.data.data.verification_email || '',
                    affidavit_form: response.data.data.affidavit_form || null,
                });
                setOpenEditModal(true);
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to fetch school details', severity: 'error' });
        }
    };

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'Id', flex: 1 },
        { field: 'school_name', headerName: 'School Name', flex: 1 },
        {
            field: 'partner',
            headerName: 'Official Partner',
            flex: 1,
            renderCell: (params) => (params.value === 'Yes' ? '✅ Yes' : '❌ No'),
        },
        { field: 'total_app', headerName: 'Total App', flex: 1 },
        { field: 'no_of_students', headerName: 'Number of Students', flex: 1 },
        {
            field: 'action',
            headerName: 'Action',
            flex: 1,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View School">
                        <IconButton
                            color="primary"
                            component={Link}
                            to={`/school-admission/all-schools/${params.row.school_name}?id=${params.row.id}`}
                        >
                            <Visibility />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit School">
                        <IconButton
                            color="warning"
                            onClick={() => handleEditClick(params.row)}
                        >
                            <Edit />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={params.row.status === 'in' ? 'Phase Out' : 'Phase In'}>
                        <IconButton
                            color={params.row.status === 'in' ? 'error' : 'success'}
                            onClick={() => handlePhaseInOut(params.row)}
                            disabled={isPhasing}
                        >
                            {params.row.status === 'in' ? <Block /> : <CheckCircle />}
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    const renderForm = (isEdit: boolean) => {
        const formData = isEdit ? editFormData : addFormData;
        const setFormData = isEdit ? setEditFormData : setAddFormData;

        return (
            <Box component="form" sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 2,
                padding: 2,
                '& .MuiTextField-root': { marginBottom: 2 },
                '& .MuiFormControl-root': { marginBottom: 2 },
            }}>
                <TextField
                    label="School Name"
                    value={formData.school_name || ''}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Website Link"
                    value={formData.web_link || ''}
                    onChange={(e) => setFormData({ ...formData, web_link: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Year Founded"
                    type="number"
                    value={formData.year_founded || ''}
                    onChange={(e) => setFormData({ ...formData, year_founded: e.target.value })}
                    required
                    fullWidth
                />
                <FormControl fullWidth>
                    <InputLabel>Official Partner</InputLabel>
                    <Select
                        label="Official Partner"
                        value={formData.partner || ''}
                        onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
                        required
                    >
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                    </Select>
                </FormControl>
                <TextField
                    label="Undergraduate Students"
                    type="number"
                    value={formData.undergrad || ''}
                    onChange={(e) => setFormData({ ...formData, undergrad: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Postgraduate Students"
                    type="number"
                    value={formData.postgrad || ''}
                    onChange={(e) => setFormData({ ...formData, postgrad: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Acceptance Rate (%)"
                    type="number"
                    value={formData.acceptance || ''}
                    onChange={(e) => setFormData({ ...formData, acceptance: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Yearly Fee"
                    type="number"
                    value={formData.yearly_fee || ''}
                    onChange={(e) => setFormData({ ...formData, yearly_fee: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="City"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Nearest Airport"
                    value={formData.airport || ''}
                    onChange={(e) => setFormData({ ...formData, airport: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Street"
                    value={formData.street || ''}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Zip Code"
                    value={formData.zip_code || ''}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="State"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Country"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="Portal Link"
                    value={formData.app_portal || ''}
                    onChange={(e) => setFormData({ ...formData, app_portal: e.target.value })}
                    fullWidth
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography>Lenders</Typography>
                    {['MPOWER', 'Prodigy', 'Sallie', 'KAP'].map((lender) => (
                        <FormControlLabel
                            key={lender}
                            control={
                                <Checkbox
                                    checked={Array.isArray(formData.lenders) && formData.lenders.includes(lender)}
                                    onChange={(e) => {
                                        const lenders = Array.isArray(formData.lenders) ? formData.lenders : [];
                                        if (e.target.checked) {
                                            setFormData({ ...formData, lenders: [...lenders, lender] });
                                        } else {
                                            setFormData({ ...formData, lenders: lenders.filter((l: string) => l !== lender) });
                                        }
                                    }}
                                />
                            }
                            label={lender === 'MPOWER' ? 'MPOWER Financing' : lender === 'Prodigy' ? 'Prodigy Finance' : lender === 'Sallie' ? 'Sallie Mae' : 'ISP'}
                        />
                    ))}
                </Box>
                <FormControl fullWidth>
                    <InputLabel>Requires Verification</InputLabel>
                    <Select
                        label="Requires Verification"
                        value={formData.need_ver || ''}
                        onChange={(e) => setFormData({ ...formData, need_ver: e.target.value })}
                        required
                    >
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                    </Select>
                </FormControl>
                {formData.need_ver === 'Yes' && (
                    <TextField
                        label="Verification Email"
                        value={formData.verification_email || ''}
                        onChange={(e) => setFormData({ ...formData, verification_email: e.target.value })}
                        required
                        fullWidth
                    />
                )}
                <TextField
                    label="I-20 Submission"
                    value={formData.itwenty_submit || ''}
                    onChange={(e) => setFormData({ ...formData, itwenty_submit: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="I-20 Link/Email"
                    value={formData.itwenty_link || ''}
                    onChange={(e) => setFormData({ ...formData, itwenty_link: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    label="I-20 Process"
                    multiline
                    rows={4}
                    value={formData.itwenty_process || ''}
                    onChange={(e) => setFormData({ ...formData, itwenty_process: e.target.value })}
                    required
                    fullWidth
                />
                <TextField
                    type="file"
                    label="Affidavit Form"
                    inputProps={{ accept: 'application/pdf,.pdf' }}
                    InputLabelProps={{ shrink: true }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFormData({ ...formData, affidavit_form: e.target.files ? e.target.files[0] : null });
                    }}
                    fullWidth
                />
                {/* {isEdit && formData.affidavit_form && typeof formData.affidavit_form === 'string' && (
                    <Typography sx={{ gridColumn: 'span 2' }}>Existing Affidavit: {formData.affidavit_form}</Typography>
                )} */}
            </Box>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                All Schools
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField
                    label="Search Schools"
                    value={searchQuery}
                    onChange={handleSearch}
                    sx={{ width: '30%' }}
                />
                <Box>
                    <Button variant="outlined" color="primary" onClick={() => setOpenAddModal(true)} sx={{ mr: 1, textTransform: "none" }}>
                        Add School
                    </Button>
                    <Button
                        sx={{ textTransform: "none" }}
                        variant="contained"
                        color={statusFilter === 'in' ? 'error' : 'success'}
                        onClick={() => setStatusFilter(statusFilter === 'in' ? 'out' : 'in')}
                    >
                        {statusFilter === 'in' ? 'Phased Out Schools' : 'All Schools'}
                    </Button>
                </Box>
            </Box>
            <DataGrid
                rows={filteredSchools}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 10 },
                    },
                }}
                pageSizeOptions={[5, 10, 25]}
            />
            <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Add School</DialogTitle>
                <DialogContent>{renderForm(false)}</DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: "none" }} onClick={() => setOpenAddModal(false)}>Close</Button>
                    <Button sx={{ textTransform: "none" }} onClick={handleAddSchool} color="success" disabled={isAdding}>
                        {isAdding ? 'Adding...' : 'Add School'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openEditModal} onClose={() => { setOpenEditModal(false); setEditFormData({}); }} maxWidth="md" fullWidth>
                <DialogTitle>Edit School</DialogTitle>
                <DialogContent>{renderForm(true)}</DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: "none" }} onClick={() => { setOpenEditModal(false); setEditFormData({}); }}>Close</Button>
                    <Button sx={{ textTransform: "none" }} onClick={handleEditSchool} color="success" disabled={isEditing}>
                        {isEditing ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openConfirmModal} onClose={() => setOpenConfirmModal(false)}>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to {confirmSchool?.status === 'in' ? 'phase out' : 'phase in'} {confirmSchool?.school_name}?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmModal(false)} disabled={isPhasing}>Cancel</Button>
                    <Button onClick={confirmPhaseInOut} color="error" disabled={isPhasing}>
                        {isPhasing ? 'Processing...' : 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AllSchools;