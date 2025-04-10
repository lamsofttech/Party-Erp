import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { TextField, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import * as XLSX from 'xlsx';

interface Applicant {
    id: number;
    datetime: string;
    fullnames: string;
    id_no: string;
    email: string;
    phone: string;
    gpa: string;
    credit_report_status: string;
    id_card: string;
}

const API_BASE_URL = 'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs';

const CreditReportReview: React.FC = () => {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [openImageDialog, setOpenImageDialog] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [openActionDialog, setOpenActionDialog] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
    const [action, setAction] = useState('');
    const [repoStatus, setRepoStatus] = useState('');
    const [creditRemark, setCreditRemark] = useState('');
    const [reasonCosigner, setReasonCosigner] = useState('');
    const [creditReportFile, setCreditReportFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchApplicants = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/get_credit_report_review.php`);
                if (!Array.isArray(response.data)) throw new Error('API response is not an array');
                setApplicants(response.data);
                setFilteredApplicants(response.data);
            } catch (error) {
                setSnackbar({ open: true, message: 'Error fetching applicants!', severity: 'error' });
                console.error('Error fetching data:', error);
            }
        };
        fetchApplicants();
    }, []);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredApplicants(
            applicants.filter(
                (app) =>
                    app.fullnames.toLowerCase().includes(query) ||
                    app.email.toLowerCase().includes(query) ||
                    app.id_no.toLowerCase().includes(query) ||
                    app.phone.toLowerCase().includes(query)
            )
        );
    };

    const exportToExcel = () => {
        const exportData = filteredApplicants.map((app, index) => ({
            'S/N': index + 1,
            'Date': app.datetime,
            'Full Name': app.fullnames,
            'ID Number': app.id_no,
            'Email': app.email,
            'Phone': app.phone,
            'GPA': app.gpa,
            'Status': app.credit_report_status,
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Credit Report Review');
        XLSX.writeFile(workbook, 'credit_report_review.xlsx');
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const handleOpenImageDialog = (url: string) => {
        setSelectedImageUrl(url);
        setOpenImageDialog(true);
    };

    const handleCloseImageDialog = () => {
        setOpenImageDialog(false);
        setSelectedImageUrl(null);
    };

    const handleOpenActionDialog = async (id: number) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/credit_report_action.php?id=${id}`);
            setSelectedApplicant(response.data.applicant);
            setOpenActionDialog(true);
        } catch (error) {
            setSnackbar({ open: true, message: 'Error fetching applicant details!', severity: 'error' });
            console.error('Error fetching applicant:', error);
        }
    };

    const handleCloseActionDialog = () => {
        setOpenActionDialog(false);
        setSelectedApplicant(null);
        setAction('');
        setRepoStatus('');
        setCreditRemark('');
        setReasonCosigner('');
        setCreditReportFile(null);
        setSubmitting(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData();
        formData.append('id', selectedApplicant?.id.toString() || '');
        formData.append('action', action);
        if (action !== 'request_id') {
            formData.append('repo_status', repoStatus);
            formData.append('credit_remark', creditRemark);
        }
        if (action === 'cosigner') formData.append('reason_cosigner', reasonCosigner);
        if (creditReportFile) formData.append('credit_report', creditReportFile);

        try {
            const response = await axios.post(`${API_BASE_URL}/credit_report_action.php`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSnackbar({ open: true, message: response.data.message, severity: 'success' });
            handleCloseActionDialog();
            // Refresh applicants list
            const updatedResponse = await axios.get(`${API_BASE_URL}/get_credit_report_review.php`);
            setApplicants(updatedResponse.data);
            setFilteredApplicants(updatedResponse.data);
        } catch (error: any) {
            setSnackbar({ open: true, message: error.response?.data?.message || 'Action failed!', severity: 'error' });
            console.error('Error submitting action:', error);
        } finally {
            setSubmitting(false); // Reset submitting state regardless of success or failure
        }
    };

    const columns: GridColDef[] = [
        { field: 'id', headerName: '#', flex: 1, renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1 },
        { field: 'datetime', headerName: 'Date', flex: 2 },
        {
            field: 'fullnames',
            headerName: 'Full Name',
            flex: 3,
            renderCell: (params) => {
                const fullName = params.row.fullnames.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                const status = params.row.credit_report_status;
                return (
                    <span className="flex items-center gap-2">
                        {fullName}
                        {status && (
                            status === 'view ID card' ? (
                                <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-1 rounded">ID Re-uploaded</span>
                            ) : (
                                <span className="bg-green-200 text-green-800 text-xs font-medium px-2 py-1 rounded">{status}</span>
                            )
                        )}
                    </span>
                );
            },
        },
        {
            field: 'id_no',
            headerName: 'ID Number',
            flex: 2,
            renderCell: (params) => {
                const idNo = params.row.id_no.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                const idCardUrl = `https://internationalscholars.qhtestingserver.com/apply/uploadfolder/${params.row.id_card}`;
                return (
                    <p>
                        {idNo}{' '}
                        <span className="text-blue-500 hover:underline cursor-pointer" onClick={() => handleOpenImageDialog(idCardUrl)}>
                            View
                        </span>
                    </p>
                );
            },
        },
        { field: 'email', headerName: 'Email', flex: 2, renderCell: (params) => params.row.email.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') },
        { field: 'phone', headerName: 'Phone', flex: 1, renderCell: (params) => params.row.phone.toLowerCase().split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') },
        { field: 'gpa', headerName: 'GPA', flex: 1 },
        {
            field: 'action',
            headerName: 'Action',
            flex: 2,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Button sx={{ textTransform: 'none' }} variant="contained" color="success" onClick={() => handleOpenActionDialog(params.row.id)}>
                    Action
                </Button>
            ),
        },
    ];

    return (
        <main className="min-h-[80vh] py-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white py-4 text-center">
                    Waiting Credit Report Review ({filteredApplicants.length})
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <TextField label="Search by Name, Email, ID Number, or Phone" variant="outlined" fullWidth onChange={handleSearch} value={searchQuery} sx={{ flex: 1 }} />
                <Button sx={{ textTransform: 'none' }} variant="contained" onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">Export to Excel</Button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <DataGrid
                    rows={filteredApplicants}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: 'No applicants found!' }}
                    paginationMode="client"
                />
            </div>

            <Dialog open={openImageDialog} onClose={handleCloseImageDialog} maxWidth="md">
                <DialogTitle>ID Card Image</DialogTitle>
                <DialogContent>
                    {selectedImageUrl ? (
                        <img src={selectedImageUrl} alt="ID Card" />
                    ) : (
                        <p>No image available</p>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={handleCloseImageDialog} variant="contained" color="primary">Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openActionDialog} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Generate Credit Report for {selectedApplicant?.fullnames} (ID: {selectedApplicant?.id_no})</DialogTitle>
                <DialogContent>
                    {selectedApplicant ? (
                        <form onSubmit={handleSubmit}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Select an Action</InputLabel>
                                <Select label="Select an Action" value={action} onChange={(e) => setAction(e.target.value)} required>
                                    <MenuItem value="">Select an action</MenuItem>
                                    <MenuItem value="approve">Approve</MenuItem>
                                    <MenuItem value="cosigner">Request Cosigner</MenuItem>
                                    <MenuItem value="request_id">Request National ID</MenuItem>
                                </Select>
                            </FormControl>

                            {action === 'cosigner' && (
                                <FormControl component="fieldset" margin="normal">
                                    <RadioGroup value={reasonCosigner} onChange={(e) => setReasonCosigner(e.target.value)}>
                                        <FormControlLabel value="low_gpa" control={<Radio />} label="Low GPA" />
                                        <FormControlLabel value="bad_credit_report" control={<Radio />} label="Delinquent Account" />
                                        <FormControlLabel value="low_gpa_bad_credit" control={<Radio />} label="Low GPA & Delinquent Account" />
                                        <FormControlLabel value="huge_debt" control={<Radio />} label="Huge Debt" />
                                        <FormControlLabel value="huge_debt_low_gpa" control={<Radio />} label="Low GPA & Huge Debt" />
                                    </RadioGroup>
                                </FormControl>
                            )}

                            {action && action !== 'request_id' && (
                                <>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Credit Report Status</InputLabel>
                                        <Select label="Credit Report Status" value={repoStatus} onChange={(e) => setRepoStatus(e.target.value)} required>
                                            <MenuItem value="">Select</MenuItem>
                                            <MenuItem value="1">Good credit history</MenuItem>
                                            <MenuItem value="2">Needs reworking</MenuItem>
                                            <MenuItem value="3">No history</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Credit Status Remark"
                                        fullWidth
                                        multiline
                                        rows={4}
                                        margin="normal"
                                        value={creditRemark}
                                        onChange={(e) => setCreditRemark(e.target.value)}
                                        required
                                    />
                                    {(repoStatus === '1' || repoStatus === '2') && (
                                        <div className='mt-2'>
                                            <InputLabel>Upload Credit Report</InputLabel>
                                            <TextField
                                                type="file"
                                                inputProps={{ accept: 'application/pdf' }}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreditReportFile(e.target.files?.[0] || null)}
                                                fullWidth
                                                margin="normal"
                                                required
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <DialogActions>
                                <Button sx={{ textTransform: 'none' }} onClick={handleCloseActionDialog} color="secondary">Cancel</Button>
                                <Button sx={{ textTransform: 'none' }} type="submit" variant="contained" color="primary" disabled={!action || submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
                            </DialogActions>
                        </form>
                    ) : (
                        <p>Loading applicant data...</p>
                    )}
                </DialogContent>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
};

export default CreditReportReview;