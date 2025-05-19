import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { TextField, Button, Snackbar, Alert } from "@mui/material";
import * as XLSX from "xlsx";

interface Program {
    program_id: string;
    program_name: string;
    isstem: string;
    entrance_exam: string;
}

const AllPrograms: React.FC = () => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    useEffect(() => {
        fetchPrograms();
    }, []);

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/all_programs_api.php";
    const fetchPrograms = async () => {
        try {
            const response = await axios.get(`${API_URL}?action=fetch_programs`);
            if (response.data.message === 'success') {
                setPrograms(response.data.data);
                setFilteredPrograms(response.data.data);
            } else {
                console.error(response.data.message || "Failed to fetch programs");
                setSnackbar({
                    open: true,
                    message: response.data.message || 'Error fetching programs',
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
        // try {
        //     const response = await axios.get(
        //         "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/all_programs_api.php",
        //         {
        //             params: {
        //                 action: "fetch_programs",
        //             },
        //         }
        //     );
        //     console.log("API Response:", response);

        //     if (response.data.code === 200 && response.data.status === "success") {
        //         const fetchedPrograms: Program[] = response.data.data.map(
        //             (item: any) => ({
        //                 program_id: item.program_id,
        //                 program_name: item.program_name,
        //                 isstem: item.isstem,
        //                 entrance_exam: item.entrance_exam,
        //             })
        //         );
        //         setPrograms(fetchedPrograms);
        //         setFilteredPrograms(fetchedPrograms);
        //     } else {
        //         console.error(response.data.message || "Failed to fetch programs");
        //     }
        // } catch (error) {
        //     console.error("Error fetching programs:", error);
        // }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredPrograms(
            programs.filter(
                (prog) =>
                    (prog.program_name || "").toLowerCase().includes(query) ||
                    (prog.program_id || "").toLowerCase().includes(query) ||
                    (prog.isstem || "").toLowerCase().includes(query) ||
                    (prog.entrance_exam || "").toLowerCase().includes(query)
            )
        );
    };

    const columns: GridColDef[] = [
        { field: "program_id", headerName: "Program Code", flex: 1 },
        { field: "program_name", headerName: "Program Name", flex: 2 },
        { field: "isstem", headerName: "Designation", flex: 1 },
        { field: "entrance_exam", headerName: "Entrance Exam", flex: 1 },
    ];

    return (
        <main className="min-h-[80vh] p-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                    All Programs
                </p>
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
                    sx={{ textTransform: "none" }}
                    color="primary"
                    size="small"
                    onClick={() => {
                        const worksheet = XLSX.utils.json_to_sheet(filteredPrograms);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "Programs");
                        XLSX.writeFile(workbook, "programs.xlsx");
                    }}
                >
                    Export to Excel
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-md mt-4">
                <DataGrid
                    rows={filteredPrograms}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25, 50, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    getRowId={(row) => row.program_id}
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: "No programs found!" }}
                    className="border-none"
                />
            </div>

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
        </main>
    );
};

export default AllPrograms;