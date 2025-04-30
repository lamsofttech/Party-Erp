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
    Typography,
    IconButton,
} from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';

// Define interface for relocated member
interface RelocatedMember {
    member_no: string;
    fullnames: string;
    prog_email: string;
    university: string;
    program: string;
    // no_of_students: number;
}

const Relocated: React.FC = () => {
    const [relocatedMembers, setRelocatedMembers] = useState<RelocatedMember[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<RelocatedMember[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [openViewModal, setOpenViewModal] = useState<boolean>(false);
    const [selectedMember, setSelectedMember] = useState<RelocatedMember | null>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/relocated_api.php";

    // Fetch relocated members on mount
    useEffect(() => {
        fetchRelocatedMembers();
    }, []);

    const fetchRelocatedMembers = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=fetch_relocated`);
            if (response.data.message === 'success') {
                setRelocatedMembers(response.data.data);
                setFilteredMembers(response.data.data);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Error fetching relocated members',
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

    // Filter members based on search query
    useEffect(() => {
        if (searchQuery) {
            setFilteredMembers(
                relocatedMembers.filter(
                    (member) =>
                        member.member_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        member.fullnames.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        member.prog_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        member.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        member.program.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredMembers(relocatedMembers);
        }
    }, [searchQuery, relocatedMembers]);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    // DataGrid columns
    const columns: GridColDef[] = [
        { field: 'member_no', headerName: 'Member No', flex: 1 },
        { field: 'fullnames', headerName: 'Full Name', flex: 1 },
        { field: 'prog_email', headerName: 'ISP Email', flex: 1 },
        { field: 'university', headerName: 'University', flex: 1 },
        { field: 'program', headerName: 'Program', flex: 1 },
        // { field: 'no_of_students', headerName: 'Loan', flex: 1 },
        {
            field: 'action',
            headerName: 'Action',
            flex: 1,
            renderCell: (params) => (
                <IconButton
                    color="primary"
                    onClick={() => {
                        setSelectedMember(params.row);
                        setOpenViewModal(true);
                    }}
                >
                    <VisibilityIcon />
                </IconButton>
            ),
        },
    ];

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
                                                        Relocated
                                                    </p>
                                                </div>
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
                                                        rows={filteredMembers}
                                                        columns={columns}
                                                        disableRowSelectionOnClick
                                                        getRowId={(row) => row.member_no}
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
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Student Modal */}
            <Dialog
                open={openViewModal}
                onClose={() => setOpenViewModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Student Details</DialogTitle>
                <DialogContent>
                    {selectedMember && (
                        <Box>
                            <Typography><strong>Member No:</strong> {selectedMember.member_no}</Typography>
                            <Typography><strong>Full Name:</strong> {selectedMember.fullnames}</Typography>
                            <Typography><strong>ISP Email:</strong> {selectedMember.prog_email}</Typography>
                            <Typography><strong>University:</strong> {selectedMember.university}</Typography>
                            <Typography><strong>Program:</strong> {selectedMember.program}</Typography>
                            {/* <Typography><strong>Loan:</strong> {selectedMember.no_of_students}</Typography> */}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenViewModal(false)}>Close</Button>
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

export default Relocated;