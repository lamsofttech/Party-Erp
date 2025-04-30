import React, { useState, useEffect } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
    Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Alert, Box, Select, MenuItem, FormControl, InputLabel,
    Checkbox, FormControlLabel, Typography, IconButton, Tooltip
} from '@mui/material';
import { Edit, Visibility, Block, CheckCircle } from '@mui/icons-material';

import axios from 'axios';

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
    affidavit_form?: string;
    verification?: string;
    verification_email?: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/all_schools_api.php"; // Update with your API URL

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
    const [formData, setFormData] = useState<any>({});
    const [needVerification, setNeedVerification] = useState<string>('No');

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
        const form = new FormData();
        Object.keys(formData).forEach((key) => {
            if (key === 'lenders') {
                form.append(key, formData[key].join(','));
            } else if (key === 'affidavit_form') {
                form.append(key, formData[key][0]);
            } else {
                form.append(key, formData[key]);
            }
        });
        form.append('action', 'add_school');

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'School added successfully', severity: 'success' });
                setOpenAddModal(false);
                fetchSchools();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to add school', severity: 'error' });
        }
    };

    const handleEditSchool = async () => {
        const form = new FormData();
        Object.keys(formData).forEach((key) => {
            if (key === 'lenders') {
                form.append(key, formData[key].join(','));
            } else if (key === 'affidavit_form') {
                form.append(key, formData[key][0]);
            } else {
                form.append(key, formData[key]);
            }
        });
        form.append('action', 'edit_school');
        form.append('id', selectedSchool!.id.toString());

        try {
            const response = await axios.post(API_URL, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'School updated successfully', severity: 'success' });
                setOpenEditModal(false);
                fetchSchools();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to update school', severity: 'error' });
        }
    };

    const handlePhaseInOut = async (school: School) => {
        if (!window.confirm(`Are you sure you want to ${school.status === 'in' ? 'phase out' : 'phase in'} this school?`)) return;
        try {
            const response = await axios.post(API_URL, {
                action: 'change_status',
                id: school.id,
                status: school.status === 'in' ? 'out' : 'in',
            });
            if (response.data.message === 'success') {
                setSnackbar({ open: true, message: 'School status updated', severity: 'success' });
                fetchSchools();
            } else {
                setSnackbar({ open: true, message: response.data.data, severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
        }
    };

    const handleEditClick = async (school: School) => {
        try {
            const response = await axios.post(API_URL, { action: 'fetch_school_details', id: school.id });
            if (response.data.message === 'success') {
                setSelectedSchool(school);
                setFormData({
                    ...response.data.data,
                    lenders: response.data.data.lenders.split(','),
                });
                setNeedVerification(response.data.data.verification || 'No');
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
                            onClick={() => alert('View functionality not implemented')}
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
                        >
                            {params.row.status === 'in' ? <Block /> : <CheckCircle />}
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    const renderForm = (isEdit: boolean) => (
        <Box component="form" sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
                label="School Name"
                value={formData.school_name || ''}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                required
            />
            <TextField
                label="Website Link"
                value={formData.web_link || ''}
                onChange={(e) => setFormData({ ...formData, web_link: e.target.value })}
                required
            />
            <TextField
                label="Year Founded"
                type="number"
                value={formData.founded || ''}
                onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                required
            />
            <FormControl>
                <InputLabel>Official Partner</InputLabel>
                <Select
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
            />
            <TextField
                label="Postgraduate Students"
                type="number"
                value={formData.postgrad || ''}
                onChange={(e) => setFormData({ ...formData, postgrad: e.target.value })}
                required
            />
            <TextField
                label="Acceptance Rate (%)"
                type="number"
                value={formData.acceptance || ''}
                onChange={(e) => setFormData({ ...formData, acceptance: e.target.value })}
                required
            />
            <TextField
                label="Yearly Fee"
                type="number"
                value={formData.yearly_fee || ''}
                onChange={(e) => setFormData({ ...formData, yearly_fee: e.target.value })}
                required
            />
            <TextField
                label="City"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
            />
            <TextField
                label="Nearest Airport"
                value={formData.airport || ''}
                onChange={(e) => setFormData({ ...formData, airport: e.target.value })}
                required
            />
            <TextField
                label="Street"
                value={formData.street || ''}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                required
            />
            <TextField
                label="Zip Code"
                value={formData.zip_code || ''}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                required
            />
            <TextField
                label="State"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
            />
            <TextField
                label="Country"
                value={formData.country || ''}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
            />
            <TextField
                label="Portal Link"
                value={formData.app_portal || ''}
                onChange={(e) => setFormData({ ...formData, app_portal: e.target.value })}
            />
            <Box>
                <Typography>Lenders</Typography>
                {['MPOWER', '8B', 'Sallie', 'KAP'].map((lender) => (
                    <FormControlLabel
                        key={lender}
                        control={
                            <Checkbox
                                checked={formData.lenders?.includes(lender) || false}
                                onChange={(e) => {
                                    const lenders = formData.lenders || [];
                                    if (e.target.checked) {
                                        setFormData({ ...formData, lenders: [...lenders, lender] });
                                    } else {
                                        setFormData({ ...formData, lenders: lenders.filter((l: string) => l !== lender) });
                                    }
                                }}
                            />
                        }
                        label={lender === 'MPOWER' ? 'MPOWER Financing' : lender === '8B' ? '8B Education Investments' : lender === 'Sallie' ? 'Sallie Mae' : 'ISP'}
                    />
                ))}
            </Box>
            <FormControl>
                <InputLabel>Requires Verification</InputLabel>
                <Select
                    value={needVerification}
                    onChange={(e) => {
                        setNeedVerification(e.target.value as string);
                        setFormData({ ...formData, need_ver: e.target.value });
                    }}
                >
                    <MenuItem value="No">No</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                </Select>
            </FormControl>
            {needVerification === 'Yes' && (
                <TextField
                    label="Verification Email"
                    value={formData.verification_email || ''}
                    onChange={(e) => setFormData({ ...formData, verification_email: e.target.value })}
                    required
                />
            )}
            <TextField
                label="I-20 Submission"
                value={formData.itwenty_submit || ''}
                onChange={(e) => setFormData({ ...formData, itwenty_submit: e.target.value })}
            />
            <TextField
                label="I-20 Link/Email"
                value={formData.itwenty_link || ''}
                onChange={(e) => setFormData({ ...formData, itwenty_link: e.target.value })}
            />
            <TextField
                label="I-20 Process"
                multiline
                rows={4}
                value={formData.itwenty_process || ''}
                onChange={(e) => setFormData({ ...formData, itwenty_process: e.target.value })}
            />
            <TextField
                type="file"
                label="Affidavit Form"
                InputLabelProps={{ shrink: true }}
                onChange={(e: any) => setFormData({ ...formData, affidavit_form: e.target.files })}
            />
            {isEdit && formData.affidavit_form && (
                <Typography>Existing Affidavit: {formData.affidavit_form}</Typography>
            )}
        </Box>
    );

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
                    <Button onClick={() => setOpenAddModal(false)}>Close</Button>
                    <Button onClick={handleAddSchool} color="success">Add School</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit School</DialogTitle>
                <DialogContent>{renderForm(true)}</DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditModal(false)}>Close</Button>
                    <Button onClick={handleEditSchool} color="success">Save</Button>
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