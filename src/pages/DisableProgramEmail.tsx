import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

interface Member {
    id: number;
    fullnames: string;
    prog_email: string;
}

const API_BASE_URL = 'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs';

const DisableProgramEmail: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
    const [openUpdateAllDialog, setOpenUpdateAllDialog] = useState(false);

    // Fetch members on component mount
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/members_to_disable.php`);
                setMembers(response.data);
            } catch (error) {
                setSnackbar({ open: true, message: 'Error fetching members!', severity: 'error' });
                console.error('Error fetching members:', error);
            }
        };
        fetchMembers();
    }, []);

    // Handle disabling a member's program email
    const handleDisableEmail = async () => {
        if (selectedMemberId === null) return;
        try {
            const response = await axios.post(`${API_BASE_URL}/disable_program_email.php`, { id: selectedMemberId });
            if (response.data.success) {
                setSnackbar({ open: true, message: 'Email disabled successfully!', severity: 'success' });
                setMembers(members.filter(member => member.id !== selectedMemberId));
            } else {
                setSnackbar({ open: true, message: response.data.error || 'Failed to disable email!', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error disabling email!', severity: 'error' });
            console.error('Error:', error);
        } finally {
            setOpenConfirmDialog(false);
            setSelectedMemberId(null);
        }
    };

    // Handle updating all passwords
    const handleUpdateAll = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/update_all_passwords.php`);
            if (response.data.success) {
                setSnackbar({
                    open: true,
                    message: `Updated ${response.data.updated} passwords successfully!`,
                    severity: 'success',
                });
            } else {
                setSnackbar({ open: true, message: 'Failed to update passwords!', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error updating passwords!', severity: 'error' });
            console.error('Error:', error);
        } finally {
            setOpenUpdateAllDialog(false);
        }
    };

    // Define DataGrid columns
    const columns: GridColDef[] = [
        { 
            field: 'id', 
            headerName: '# S/N', 
            width: 70, 
            renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 
        },
        { field: 'fullnames', headerName: 'Full Name', flex: 1 },
        { field: 'prog_email', headerName: 'Program Email', flex: 1 },
        {
            field: 'action',
            headerName: 'Confirm Disabled',
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    color="error"
                    onClick={() => {
                        setSelectedMemberId(params.row.id);
                        setOpenConfirmDialog(true);
                    }}
                >
                    Disable
                </Button>
            ),
        },
    ];

    return (
        <main style={{ minHeight: '80vh', padding: '16px' }}>
            <div style={{ 
                background: 'linear-gradient(0deg, #2164A6 80.26%, rgba(33,100,166,0) 143.39%)', 
                borderRadius: '8px', 
                marginBottom: '16px' 
            }}>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', padding: '16px', textAlign: 'center' }}>
                    Emails to Update ({members.length})
                </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <Button sx={{ textTransform: 'none' }} variant="contained" color="success" onClick={() => setOpenUpdateAllDialog(true)}>
                    Update All
                </Button>
            </div>

            <div style={{ background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                <DataGrid
                    rows={members}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: 'No members found!' }}
                    paginationMode="client"
                    autoHeight
                />
            </div>

            {/* Confirmation Dialog for Disable Email */}
            <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
                <DialogTitle>Confirm Disable Email</DialogTitle>
                <DialogContent>
                    Are you sure you want to disable the program email for this member?
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenConfirmDialog(false)} color="secondary">Cancel</Button>
                    <Button sx={{ textTransform: 'none' }} onClick={handleDisableEmail} variant="contained" color="error">Disable</Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog for Update All */}
            <Dialog open={openUpdateAllDialog} onClose={() => setOpenUpdateAllDialog(false)}>
                <DialogTitle>Confirm Update All Passwords</DialogTitle>
                <DialogContent>
                    Are you sure you want to update all passwords?
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenUpdateAllDialog(false)} color="secondary">Cancel</Button>
                    <Button sx={{ textTransform: 'none' }} onClick={handleUpdateAll} variant="contained" color="success">Update All</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default DisableProgramEmail;