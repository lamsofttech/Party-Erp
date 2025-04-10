import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    DataGrid,
    GridColDef,
} from "@mui/x-data-grid";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from "@mui/material";

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/get_access_requests.php";

interface AccessRequest {
    admin_email: string;
    student_email: string;
    reason: string;
    status: string;
    created_at: string;
}

const AccessRequests: React.FC = () => {
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
    const [confirmAction, setConfirmAction] = useState<"accept" | "deny" | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await axios.get(API_URL);
            // console.log(response.data);
            if (response.data.success) {
                setRequests(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching access requests", error);
        }
    };

    const handleConfirm = async () => {
        if (!selectedRequest || !confirmAction) return;

        try {
            await axios.post(API_URL, {
                admin_email: selectedRequest.admin_email,
                student_email: selectedRequest.student_email,
                action: confirmAction,
            });

            fetchRequests(); // Refresh data after action
            setConfirmAction(null);
            setSelectedRequest(null);
        } catch (error) {
            console.error("Error updating request", error);
        }
    };

    const handleOpenModal = (request: AccessRequest, action: "accept" | "deny") => {
        setSelectedRequest(request);
        setConfirmAction(action);
    };

    const columns: GridColDef[] = [
        { field: "admin_email", headerName: "Admin Email", flex: 1 },
        { field: "student_email", headerName: "Student Email", flex: 2 },
        { field: "country", headerName: "Country", flex: 1 },
        { field: "reason", headerName: "Reason", flex: 1 },
        { field: "status", headerName: "Status", flex: 1 },
        {
            field: "created_at",
            headerName: "Created At",
            flex: 1,
            //   valueGetter: (params) => {
            //     console.log("Params Object:", params); // Debugging

            //     if (!params.row?.created_at) return "N/A"; // Ensure row and value exist

            //     const parsedDate = new Date(params.row.created_at);
            //     if (isNaN(parsedDate.getTime())) {
            //       console.error("Invalid Date Format:", params.row.created_at);
            //       return "Invalid Date";
            //     }

            //     return parsedDate.toLocaleString();
            //   },
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 2,
            renderCell: (params) => (
                <>
                    <Button
                        sx={{ textTransform: 'none' }}
                        variant="contained"
                        color="success"
                        onClick={() => handleOpenModal(params.row, "accept")}
                    >
                        Accept
                    </Button>
                    <Button
                        sx={{ textTransform: 'none' }}
                        variant="contained"
                        color="error"
                        onClick={() => handleOpenModal(params.row, "deny")}
                        style={{ marginLeft: 8 }}
                    >
                        Deny
                    </Button>
                </>
            ),
        },
    ];

    const filteredRequests = requests.filter((request) =>
        Object.values(request)
            .join(" ")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ minHeight: "80vh", width: "100%" }}>
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">Access Requests Table</p>
            </div>
            <TextField
                label="Search"
                variant="outlined"
                fullWidth
                margin="normal"
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <DataGrid
                rows={filteredRequests.map((r, index) => ({ id: index, ...r }))}
                columns={columns}
                pageSizeOptions={[5, 10, 20]}
                disableRowSelectionOnClick
            />

            {/* Confirmation Modal */}
            <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)}>
                <DialogTitle>
                    {confirmAction === "accept" ? "Confirm Acceptance" : "Confirm Denial"}
                </DialogTitle>
                <DialogContent>
                    Are you sure you want to {confirmAction} this request?
                </DialogContent>
                <DialogActions>
                    <Button sx={{ textTransform: 'none' }} onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button sx={{ textTransform: 'none' }} onClick={handleConfirm} color="primary">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default AccessRequests;
