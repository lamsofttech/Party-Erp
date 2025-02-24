import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { TextField, IconButton, Button, Snackbar, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import * as XLSX from 'xlsx';

interface Cosigner {
    id: number;
    dateSubmitted: string;
    fullName: string;
    email: string;
    studentEmail: string;
    status: number; // 2 = Not accepted, 4 = Accepted
}

const Cosigners: React.FC = () => {
    const [cosigners, setCosigners] = useState<Cosigner[]>([]);
    const [filteredCosigners, setFilteredCosigners] = useState<Cosigner[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Fetch data from API on component mount
    useEffect(() => {
        const fetchCosigners = async () => {
            try {
                const response = await axios.get(
                    'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/get_cosigners.php'
                );
                const data = response.data;
                if (!Array.isArray(data)) {
                    throw new Error('API response is not an array');
                }
                const validData = data.filter((row: any) => row.id !== undefined && row.id !== null);
                setCosigners(validData);
                setFilteredCosigners(validData);
            } catch (error) {
                setSnackbar({ open: true, message: 'Error fetching cosigners!', severity: 'error' });
                console.error('Error fetching data:', error);
                setCosigners([]);
                setFilteredCosigners([]);
            }
        };
        fetchCosigners();
    }, []);

    // Filter cosigners when search query changes
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredCosigners(
            cosigners.filter(
                (cosigner) =>
                    cosigner.fullName.toLowerCase().includes(query) ||
                    cosigner.email.toLowerCase().includes(query) ||
                    cosigner.studentEmail.toLowerCase().includes(query)
            )
        );
    };

    // Export to Excel function
    const exportToExcel = () => {
        const exportData = filteredCosigners.map((cosigner, index) => ({
            'S/N': index + 1,
            'Date Submitted': cosigner.dateSubmitted,
            'Full Name': cosigner.fullName,
            'Email': cosigner.email,
            'Student Email': cosigner.studentEmail,
            'Status': cosigner.status === 2 ? 'Not accepted cosign' : 'Accepted cosign',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cosigners');
        XLSX.writeFile(workbook, 'cosigners.xlsx');
    };

    // Handle snackbar close
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Define DataGrid columns
    const columns: GridColDef[] = [
        {
            field: 'id',
            headerName: '#',
            flex: 1,
            renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
        },
        { field: 'dateSubmitted', headerName: 'Date Submitted', flex: 2 },
        { field: 'fullName', headerName: 'Full Name', flex: 3 },
        { field: 'email', headerName: 'Email', flex: 2 },
        { field: 'studentEmail', headerName: 'Student', flex: 2 },
        {
            field: 'status',
            headerName: 'Status',
            flex: 1,
            renderCell: (params) => (
                <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                        params.row.status === 2
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-green-200 text-green-800'
                    }`}
                >
                    {params.row.status === 2 ? 'Not accepted cosign' : 'Accepted cosign'}
                </span>
            ),
        },
        {
            field: 'action',
            headerName: 'Action',
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const fullName = encodeURIComponent(params.row.fullName);
                const id = encodeURIComponent(params.row.id);
                return (
                    <Link
                        to={`/onboarding/cosigners/${fullName}?id=${id}`}
                    >
                        <IconButton>
                            <VisibilityIcon color="primary" />
                        </IconButton>
                    </Link>
                );
            },
        },
    ];

    return (
        <main className="min-h-[80vh] py-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white py-4 text-center">
                    All Cosigners ({filteredCosigners.length})
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <TextField
                    label="Search by Name, Email, or Student Email"
                    variant="outlined"
                    fullWidth
                    onChange={handleSearch}
                    value={searchQuery}
                    sx={{ flex: 1 }}
                />
                <Button
                    variant="contained"
                    onClick={exportToExcel}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    Export to Excel
                </Button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataGrid
                    rows={filteredCosigners}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: 'No cosigners found!' }}
                    paginationMode="client"
                    autoHeight
                />
            </div>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default Cosigners;