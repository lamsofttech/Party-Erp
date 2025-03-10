import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';

interface Student {
    id: number;
    fullnames: string;
    email: string;
    suggestedProgramEmail: string;
    suggestedPassword: string;
}

const API_BASE_URL = 'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs'; // Replace with actual API URL

const Onboarding: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [confirming, setConfirming] = useState(false);

    // Fetch students on mount
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/students_to_onboard.php`);
                setStudents(response.data);
                setFilteredStudents(response.data);
            } catch (error) {
                setSnackbar({ open: true, message: 'Error fetching students!', severity: 'error' });
                console.error('Error fetching data:', error);
            }
        };
        fetchStudents();
    }, []);

    // Handle search
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredStudents(
            students.filter(
                (student) =>
                    student.fullnames.toLowerCase().includes(query) ||
                    student.email.toLowerCase().includes(query)
            )
        );
    };

    // Export to Excel
    const exportToExcel = () => {
        const exportData = filteredStudents.map((student, index) => ({
            'S/N': index + 1,
            'Full Name': student.fullnames,
            'Email': student.email,
            'Suggested Program Email': student.suggestedProgramEmail,
            'Suggested Email Password': student.suggestedPassword,
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students to Onboard');
        XLSX.writeFile(workbook, 'students_to_onboard.xlsx');
    };

    // Open confirmation dialog
    const handleOpenConfirmDialog = (student: Student) => {
        setSelectedStudent(student);
        setOpenConfirmDialog(true);
    };

    // Close confirmation dialog
    const handleCloseConfirmDialog = () => {
        setOpenConfirmDialog(false);
        setSelectedStudent(null);
    };

    // Confirm onboarding
    const handleConfirmOnboard = async () => {
        if (!selectedStudent) return;

        setConfirming(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/confirm_onboard.php`, {
                id: selectedStudent.id,
                programEmail: selectedStudent.suggestedProgramEmail,
                password: selectedStudent.suggestedPassword,
            });
            if (response.data.success) {
                setSnackbar({ open: true, message: response.data.success, severity: 'success' });
                setStudents(students.filter((student) => student.id !== selectedStudent.id));
                setFilteredStudents(filteredStudents.filter((student) => student.id !== selectedStudent.id));
            } else {
                setSnackbar({ open: true, message: response.data.error || 'Failed to confirm onboarding!', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Error confirming onboarding!', severity: 'error' });
            console.error('Error:', error);
        } finally {
            setConfirming(false);
            handleCloseConfirmDialog();
        }
    };

    // Copy to clipboard
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setSnackbar({ open: true, message: 'Copied to clipboard!', severity: 'success' });
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: 'id', headerName: '#', width: 50, renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
        { field: 'fullnames', headerName: 'Full Name', flex: 2 },
        { field: 'email', headerName: 'Email', flex: 2 },
        {
            field: 'suggestedProgramEmail',
            headerName: 'Suggested Program Email',
            flex: 3,
            renderCell: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input type="text" value={params.value} readOnly style={{ flex: 1, marginRight: '5px' }} />
                    <Button onClick={() => handleCopy(params.value)} size="small" variant="outlined">Copy</Button>
                </div>
            ),
        },
        {
            field: 'suggestedPassword',
            headerName: 'Suggested Email Password',
            flex: 3,
            renderCell: (params) => (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <input type="text" value={params.value} readOnly style={{ flex: 1, marginRight: '0px' }} />
                    <Button onClick={() => handleCopy(params.value)} size="small" variant="outlined">Copy</Button>
                </div>
            ),
        },
        {
            field: 'action',
            headerName: 'Onboard',
            flex: 2,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Button variant="contained" size='small' color="success" onClick={() => handleOpenConfirmDialog(params.row)}>
                    Confirm Created
                </Button>
            ),
        },
    ];

    return (
        <main className="min-h-[80vh] py-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white py-4 text-center">
                    Students to Onboard ({filteredStudents.length})
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <TextField label="Search by Name or Email" variant="outlined" fullWidth onChange={handleSearch} value={searchQuery} sx={{ flex: 1 }} />
                <Button variant="contained" onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">
                    Export to Excel
                </Button>
            </div>

            <div className='flex items-center justify-start gap-4 py-2'>
                <Link to='/onboarding/onboard/disable-program-email'>
                    <Button variant='outlined' color='error'>Disable Program Email</Button>
                </Link>
                <Link to='/onboarding/onboard/update-password'>
                    <Button variant='outlined' color='success'>Update Password</Button>
                </Link>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataGrid
                    rows={filteredStudents}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: 'No students found!' }}
                    paginationMode="client"
                />
            </div>

            <Dialog open={openConfirmDialog} onClose={handleCloseConfirmDialog}>
                <DialogTitle>Confirm Onboarding</DialogTitle>
                <DialogContent>
                    Are you sure you want to confirm the email created for <b>{selectedStudent?.fullnames}?</b>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog} color="secondary">Cancel</Button>
                    <Button onClick={handleConfirmOnboard} variant="contained" color="primary" disabled={confirming}>{confirming ? 'Confirming...' : 'Confirm'}</Button>
                </DialogActions>
            </Dialog>

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

export default Onboarding;