import React, { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { getWithdrawals, Withdrawal, updateWithdrawalStatus } from "../services/withdrawals";
import { TextField, Button, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Typography, TextareaAutosize, Table, TableBody, TableCell, TableRow } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Link } from "react-router-dom";

const Withdrawals: React.FC = () => {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [filteredData, setFilteredData] = useState<Withdrawal[]>([]);
    const [search, setSearch] = useState("");

    // State for modals
    const [openSettleModal, setOpenSettleModal] = useState(false);
    const [openRejectModal, setOpenRejectModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Withdrawal | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const membershipType = "withdrawn-members";

    useEffect(() => {
        const fetchData = async () => {
            const data = await getWithdrawals();
            setWithdrawals(data);
            setFilteredData(data); // Initialize filtered data
        };
        fetchData();
    }, []);

    // Handle search filtering
    useEffect(() => {
        setFilteredData(
            withdrawals.filter(
                (item) =>
                    item.fullnames.toLowerCase().includes(search.toLowerCase()) ||
                    item.email.toLowerCase().includes(search.toLowerCase()) ||
                    item.package.toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [search, withdrawals]);

    const handleStatusUpdate = async (memberNo: string, newStatus: string) => {
        // console.log("Member No.:",memberNo);
        const response = await updateWithdrawalStatus(memberNo, newStatus);
        if (response.success) {
            alert("Status updated successfully!");
            // Refresh the data
            const updatedData = await getWithdrawals();
            setWithdrawals(updatedData);
            setFilteredData(updatedData);
        } else {
            alert("Failed to update status!");
        }
    };

    // Open "Settle" Modal
    const handleOpenSettleModal = (member: Withdrawal) => {
        setSelectedMember(member);
        setOpenSettleModal(true);
    };

    // Open "Reject" Modal
    const handleOpenRejectModal = (member: Withdrawal) => {
        setSelectedMember(member);
        setOpenRejectModal(true);
    };

    // Handle Settlement Submission
    const handleSettle = async () => {
        if (selectedMember) {
            await handleStatusUpdate(selectedMember.member_no, "4"); // Change status to Settled
            setOpenSettleModal(false);
        }
    };

    // Handle Rejection Submission
    const handleReject = async () => {
        if (selectedMember && rejectReason.trim() !== "") {
            await handleStatusUpdate(selectedMember.member_no, "5"); // Change status to Rejected
            setOpenRejectModal(false);
            setRejectReason("");
        } else {
            alert("Please enter a reason for rejection.");
        }
    };

    // Column Definitions
    const columns: GridColDef[] = [
        { field: "member_no", headerName: "Member No.", flex: 2 },
        { field: "fullnames", headerName: "Name", flex: 2 },
        { field: "email", headerName: "Email", flex: 2 },
        { field: "country", headerName: "Country", flex: 1 },
        { field: "package", headerName: "Package", flex: 1 },
        { field: "date_requested", headerName: "Date Requested", flex: 2 },
        {
            field: "status",
            headerName: "Status",
            flex: 2,
            renderCell: (params) => (
                <span
                    style={{
                        padding: "2px 4px",
                        borderRadius: "4px",
                        backgroundColor:
                            params.value === "1" ? "#17a2b8" :
                                params.value === "2" ? "#28a745" :
                                    (params.value === "3" || params.value === "4") ? "#20B799" : "#dc3545",
                        color: "white",
                    }}
                >
                    {getStatusLabel(params.value)}
                </span>
            ),
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 3,
            renderCell: (params) => (
                <Box>
                    <Link to={`/members/${membershipType}/${encodeURIComponent(params.row.fullnames)}?email=${encodeURIComponent(params.row.email)}`}>
                        <IconButton>
                            <VisibilityIcon color="primary" />
                        </IconButton>
                    </Link>
                    {params.row.status === "1" && (
                        <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => handleStatusUpdate(params.row.member_no, "2")}
                            sx={{ mr: 1, textTransform: 'none' }}
                        >
                            Start
                        </Button>
                    )}
                    {params.row.status === "2" && (
                        <Button
                            variant="contained"
                            color="secondary"
                            size="small"
                            onClick={() => handleStatusUpdate(params.row.member_no, "3")}
                            sx={{ mr: 1, textTransform: 'none' }}
                        >
                            Continue
                        </Button>
                    )}
                    {(params.row.status === "3" || params.row.status === "4") && (
                        <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            onClick={() => handleOpenSettleModal(params.row)}
                            sx={{ mr: 1, textTransform: 'none' }}
                        >
                            Settle
                        </Button>
                    )}
                    <Button
                        sx={{ textTransform: 'none' }}
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleOpenRejectModal(params.row)}
                    >
                        Reject
                    </Button>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ width: "100%", margin: "auto", mt: 3, minHeight: "80vh" }}>
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">Withdrawn Members Table</p>
            </div>

            <TextField
                fullWidth
                variant="outlined"
                placeholder="Search..."
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 2 }}
            />

            <DataGrid
                rows={filteredData}
                columns={columns}
                getRowId={(row) => row.member_no}
                autoHeight
                pageSizeOptions={[5, 10, 20]}
                disableRowSelectionOnClick
                sortingMode="client"
            />

            {/* Settle Modal */}
            <Dialog open={openSettleModal} onClose={() => setOpenSettleModal(false)}>
                <DialogTitle>Settle Withdrawal</DialogTitle>
                <DialogContent>
                    <Table>
                        <TableBody>
                            <TableRow><TableCell><strong>Full Name:</strong></TableCell><TableCell>{selectedMember?.fullnames}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Email:</strong></TableCell><TableCell>{selectedMember?.email}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Package:</strong></TableCell><TableCell>{selectedMember?.package}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Total Payments:</strong></TableCell><TableCell>${selectedMember?.total_payments}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Total Expenditures:</strong></TableCell><TableCell>${selectedMember?.total_expenditures}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Balance:</strong></TableCell><TableCell>${((selectedMember?.total_payments ?? 0) - (selectedMember?.total_expenditures ?? 0)).toFixed(2)}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Country:</strong></TableCell><TableCell>{selectedMember?.country}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Date Enrolled:</strong></TableCell><TableCell>{selectedMember?.date_enrolled}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Converted:</strong></TableCell><TableCell>{selectedMember?.converted}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Exchange Rate:</strong></TableCell><TableCell>{selectedMember?.exchange_rate} {selectedMember?.rate_text}</TableCell></TableRow>
                            <TableRow><TableCell><strong>Refund Amount:</strong></TableCell><TableCell>${selectedMember?.refund_amount?.toFixed(2)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenSettleModal(false)}>Cancel</Button>
                    <Button sx={{ textTransform: 'none' }} onClick={handleSettle} color="success">Confirm</Button>
                </DialogActions>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={openRejectModal} onClose={() => setOpenRejectModal(false)}>
                <DialogTitle>Reject Withdrawal</DialogTitle>
                <DialogContent>
                    <Typography>Please provide a reason for rejecting <strong>{selectedMember?.fullnames}</strong>'s withdrawal request.</Typography>
                    <TextareaAutosize
                        minRows={3}
                        placeholder="Enter rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={{ width: "100%", marginTop: "10px", padding: "5px" }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setOpenRejectModal(false)}>Cancel</Button>
                    <Button sx={{ textTransform: 'none' }} onClick={handleReject} color="error">Reject</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case "1": return "New";
        case "2": return "In Progress";
        case "3":
        case "4": return "Make Settlement";
        default: return "Invalid";
    }
};

export default Withdrawals;
