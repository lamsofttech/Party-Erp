import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { TextField, IconButton, Button, Snackbar, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import * as XLSX from 'xlsx';

// Define TypeScript interface for applicant data (adjusted from previous version)
interface Applicant {
    id: number;
    dateApplied: string;
    fullName: string;
    badgeText: string;
    dateRequested: string | null;
    daysDifference: number | null;
    email: string;
    program: string;
    country: string;
    remark: string;
}

const PendingApplications: React.FC = () => {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
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

    const onboardingType = 'pending-applications';

    // Fetch data from API on component mount
    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const response = await axios.get(
                    'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/get_pending_applications.php' // Adjust to your API URL
                );
                setApplicants(response.data);
                setFilteredApplicants(response.data);
            } catch (error) {
                setSnackbar({ open: true, message: 'Error fetching data!', severity: 'error' });
                console.error('Error fetching data:', error);
            }
        };
        fetchApplications();
    }, []);

    // Filter applicants when search query changes
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredApplicants(
            applicants.filter(
                (app) =>
                    app.fullName.toLowerCase().includes(query) ||
                    app.email.toLowerCase().includes(query) ||
                    app.program.toLowerCase().includes(query)
            )
        );
    };

    // Export to Excel function
    const exportToExcel = () => {
        const exportData = filteredApplicants.map((app, index) => ({
            'S/N': index + 1,
            'Date Applied': app.dateApplied,
            'Full Name': app.fullName,
            Status: app.badgeText || '',
            'Date Requested': app.dateRequested
                ? `${app.dateRequested} (${app.daysDifference} days)`
                : 'No date',
            Email: app.email,
            Program: app.program,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending Applicants');
        XLSX.writeFile(workbook, 'pending_applicants.xlsx');
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
        { field: 'dateApplied', headerName: 'Date Applied', flex: 2 },
        {
            field: 'fullName',
            headerName: 'Full Name',
            flex: 3,
            renderCell: (params) => (
                <span className="flex items-center gap-2">
                    {params.row.fullName}{' '}
                    {params.row.badgeText && (
                        <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                            {params.row.badgeText}
                        </span>
                    )}
                </span>
            ),
        },
        { field: 'country', headerName: 'Country', flex: 1 },
        {
            field: 'dateRequested',
            headerName: 'Date Requested',
            flex: 2,
            renderCell: (params) =>
                params.row.dateRequested
                    ? `${params.row.dateRequested} (${params.row.daysDifference} days)`
                    : 'No date',
        },
        { field: 'email', headerName: 'Email', flex: 2 },
        { field: 'remark', headerName: 'Status', flex: 1 },
        { field: 'program', headerName: 'Program', flex: 1 },
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
                        to={`/onboarding/${onboardingType}/${fullName}?id=${id}`}
                        state={{ from: onboardingType }} // Pass onboardingType as state
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
                    Pending Applications Table
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <TextField
                    label="Search by Name, Email, or Program"
                    variant="outlined"
                    fullWidth
                    onChange={handleSearch}
                    value={searchQuery}
                    sx={{ flex: 1 }}
                />
                <Button
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={exportToExcel}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    Export to Excel
                </Button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataGrid
                    rows={filteredApplicants}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: 'No pending applications found!' }}
                    paginationMode="client"
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

export default PendingApplications;