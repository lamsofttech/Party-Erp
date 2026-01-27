import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Snackbar, Alert, TextField, IconButton } from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface Application {
    id: number;
    date: string;
    full_name: string;
    email: string;
    program: string;
    country: string;
    status: number;
    remark: string;
    gpa_doc: string | null;
    gpa: string | null;
    status_label: string;
}

const NewApplications: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success",
    });

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const response = await axios.get("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/Nominations/APIs/get_new_applications.php"); // Change to your API URL
            setApplications(response.data.applications);
            setFilteredApplications(response.data.applications);
        } catch (error) {
            setSnackbar({ open: true, message: "Error fetching data!", severity: "error" });
            console.error("Error fetching data:", error);
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredApplications(
            applications.filter(
                (app) =>
                    app.full_name.toLowerCase().includes(query) ||
                    app.email.toLowerCase().includes(query) ||
                    app.program.toLowerCase().includes(query) ||
                    app.country.toLowerCase().includes(query)
            )
        );
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };
    const onboardingType = "new-applications";

    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", flex: 1 },
        { field: "date", headerName: "Date", flex: 1 },
        { field: "full_name", headerName: "Full Name", flex: 1 },
        { field: "email", headerName: "Email", flex: 2 },
        { field: "program", headerName: "Program", flex: 1 },
        { field: "country", headerName: "Country", flex: 1 },
        { field: "status_label", headerName: "Status", flex: 1 },
        {
            field: "action",
            headerName: "Action",
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const fullName = encodeURIComponent(params.row.full_name);
                const id = encodeURIComponent(params.row.id);

                return (
                    <Link
                        to={`/Nominations/${onboardingType}/${fullName}?id=${id}`}
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
        <main className="min-h-[80vh]">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">New Applications Table</p>
            </div>

            <TextField
                label="Search..."
                variant="outlined"
                fullWidth
                onChange={handleSearch}
                value={searchQuery}
                sx={{ marginBottom: 2 }}
            />

            <DataGrid
                rows={filteredApplications}
                columns={columns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                localeText={{ noRowsLabel: "No rows found!" }}
            />

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default NewApplications;
