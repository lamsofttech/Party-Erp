import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { TextField, IconButton, Button } from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import * as XLSX from 'xlsx';

interface Applicant {
    id: number;
    email: string;
    full_name: string;
    package: string;
}

const GMATApplicants: React.FC = () => {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");

    useEffect(() => {
        fetchApplicants();
    }, []);

    const fetchApplicants = async () => {
        try {
            const response = await axios.get("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/gmat_applicants_api.php"); // Replace with your API URL
            if (response.data.success) {
                setApplicants(response.data.applicants);
                setFilteredApplicants(response.data.applicants);
            } else {
                console.error(response.data.message);
            }
        } catch (error) {
            console.error("Error fetching applicants:", error);
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredApplicants(
            applicants.filter(
                (app) =>
                    app.full_name.toLowerCase().includes(query) ||
                    app.email.toLowerCase().includes(query) ||
                    app.package.toLowerCase().includes(query)
            )
        );
    };

    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", flex: 1 },
        { field: "email", headerName: "Email", flex: 2 },
        { field: "full_name", headerName: "Name", flex: 1 },
        { field: "package", headerName: "Package", flex: 1 },
        {
            field: "action",
            headerName: "Action",
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Link to={`/entrance-exams-gmat/applications/${params.row.full_name}?email=${params.row.email}`}>
                    <IconButton>
                        <VisibilityIcon className="text-blue-600" />
                    </IconButton>
                </Link>
            ),
        },
    ];

    return (
        <main className="min-h-[80vh] p-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">GMAT Applications Table</p>
            </div>

            <div className="flex flex-row gap-4 mb-4">
                <TextField
                    label="Search..."
                    variant="outlined"
                    fullWidth
                    value={searchQuery}
                    onChange={handleSearch}
                    sx={{ input: { backgroundColor: "white" }, flex: 1 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => {
                        const worksheet = XLSX.utils.json_to_sheet(filteredApplicants);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "GMAT Applicants");
                        XLSX.writeFile(workbook, "gmat_applicants.xlsx");
                    }}
                >
                    Export to Excel
                </Button>
            </div>


            <div className="bg-white rounded-lg shadow-md mt-4">
                <DataGrid
                    rows={filteredApplicants}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: "No applicants found!" }}
                    className="border-none"
                />
            </div>
        </main>
    );
};

export default GMATApplicants;