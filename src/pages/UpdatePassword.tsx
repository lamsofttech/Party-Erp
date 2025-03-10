import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import * as XLSX from 'xlsx';

interface Member {
    id: number;
    fullnames: string;
    email: string;
    country: string;
    prog_email: string;
    newPassword: string;
}

const API_BASE_URL = 'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs';

const UpdatePassword: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [openUpdateAllDialog, setOpenUpdateAllDialog] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [updatingAll, setUpdatingAll] = useState(false);

    // Fetch members on component mount
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api_password_management.php`);
                const fetchedMembers = response.data.map((member: Member) => ({
                    ...member,
                    newPassword: generatePassword(),
                }));
                setMembers(fetchedMembers);
                setFilteredMembers(fetchedMembers);
            } catch (error) {
                setSnackbar({ open: true, message: 'Error fetching members!', severity: 'error' });
                console.error('Error fetching members:', error);
            }
        };
        fetchMembers();
    }, []);

    // Handle search
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredMembers(
            members.filter(
                (member) =>
                    member.fullnames.toLowerCase().includes(query) ||
                    member.email.toLowerCase().includes(query)
            )
        );
    };

    // Export to Excel
    const exportToExcel = () => {
        const exportData = filteredMembers.map((member, index) => ({
            'S/N': index + 1,
            'Full Name': member.fullnames,
            'Email': member.email,
            'Program Email': member.prog_email,
            'New Password': member.newPassword,
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Password Updates');
        XLSX.writeFile(workbook, 'password_updates.xlsx');
    };

    // Generate a random password
    const generatePassword = () => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const special_chars = '!@#$%^&*()-_+=<>?';
        const all_chars = uppercase + lowercase + '1234567890' + special_chars;

        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += '__';
        for (let i = 0; i < 3; i++) {
            password += special_chars[Math.floor(Math.random() * special_chars.length)];
        }
        for (let i = 0; i < 3; i++) {
            password += all_chars[Math.floor(Math.random() * all_chars.length)];
        }
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    };

    // Handle updating a member's password
    const handleUpdatePassword = async () => {
        if (!selectedMember) return;
        try {
            setUpdating(true);
            const response = await axios.post(`${API_BASE_URL}/api_password_management.php`, {
                action: 'update_password',
                email: selectedMember.email,
                newPassword: selectedMember.newPassword,
            });
            if (response.data.success) {
                setSnackbar({ open: true, message: 'Password updated successfully!', severity: 'success' });
                // setMembers(members.filter(member => member.id !== selectedMember.id));
                // setFilteredMembers(filteredMembers.filter(member => member.id !== selectedMember.id));
            } else {
                setSnackbar({ open: true, message: response.data.error || 'Failed to update password!', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error updating password!', severity: 'error' });
            console.error('Error:', error);
        } finally {
            setUpdating(false);
            setOpenConfirmDialog(false);
            setSelectedMember(null);
        }
    };

    // Handle updating all passwords
    const handleUpdateAll = async () => {
        try {
            setUpdatingAll(true);
            const response = await axios.post(`${API_BASE_URL}/api_password_management.php`, { action: 'update_all_passwords' });
            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: `Updated ${response.data.updated} passwords successfully!`,
                    severity: 'success',
                });
                // setMembers([]);
                // setFilteredMembers([]);
            } else {
                setSnackbar({ open: true, message: 'Failed to update passwords!', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error updating passwords!', severity: 'error' });
            console.error('Error:', error);
        } finally {
            setUpdatingAll(false);
            setOpenUpdateAllDialog(false);
        }
    };

    // Copy to clipboard
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setSnackbar({ open: true, message: 'Copied to clipboard!', severity: 'success' });
    };

    // Define DataGrid columns
    const columns: GridColDef[] = [
        { field: 'id', headerName: '#', flex: 1, renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
        { field: 'fullnames', headerName: 'Full Name', flex: 2 },
        { field: 'email', headerName: 'Email', flex: 1 },
        { field: 'country', headerName: 'Country', flex: 1 },
        {
            field: 'prog_email',
            headerName: 'Program Email',
            flex: 4,
            renderCell: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input type="text" value={params.value} readOnly style={{ flex: 1, marginRight: '5px'}} />
                    <Button onClick={() => handleCopy(params.value)} size="small" variant="outlined">
                        Copy
                    </Button>
                </div>
            ),
        },
        {
            field: 'newPassword',
            headerName: 'New Password',
            flex: 4,
            renderCell: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input type="text" value={params.value} readOnly style={{ flex: 1, marginRight: '5px' }} />
                    <Button onClick={() => handleCopy(params.value)} size="small" variant="outlined">
                        Copy
                    </Button>
                </div>
            ),
        },
        {
            field: 'action',
            headerName: 'Update',
            flex: 2,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    size='small'
                    color="primary"
                    onClick={() => {
                        setSelectedMember(params.row);
                        setOpenConfirmDialog(true);
                    }}
                >
                    Update
                </Button>
            ),
        },
    ];

    return (
        <main className="min-h-[80vh] py-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white py-4 text-center">
                    Emails to Update ({filteredMembers.length})
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <TextField label="Search by Name or Email" variant="outlined" fullWidth onChange={handleSearch} value={searchQuery} sx={{ flex: 1 }} />
                <Button variant="contained" onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">Export to Excel</Button>
                <Button variant="contained" color="success" onClick={() => setOpenUpdateAllDialog(true)}>
                    Update All
                </Button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataGrid
                    rows={filteredMembers}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: 'No members found!' }}
                    paginationMode="client"
                />
            </div>

            {/* Confirmation Dialog for Update Password */}
            <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
                <DialogTitle>Confirm Password Update</DialogTitle>
                <DialogContent>
                    <p>Are you sure you want to update the password for {selectedMember?.fullnames}?</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmDialog(false)} color="secondary">Cancel</Button>
                    <Button onClick={handleUpdatePassword} variant="contained" color="primary" disabled={updating}>{updating ? "Updating..." : "Update"}</Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog for Update All */}
            <Dialog open={openUpdateAllDialog} onClose={() => setOpenUpdateAllDialog(false)}>
                <DialogTitle>Confirm Update All Passwords</DialogTitle>
                <DialogContent>
                    <p>Are you sure you want to update all passwords?</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUpdateAllDialog(false)} color="secondary">Cancel</Button>
                    <Button onClick={handleUpdateAll} variant="contained" color="success" disabled={updatingAll}>{updatingAll ? "Updating..." : "Update All"}</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default UpdatePassword;