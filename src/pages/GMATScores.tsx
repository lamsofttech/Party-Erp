import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Snackbar, Alert } from "@mui/material";

interface GMATScore {
    full_name: string;
    email: string;
    gmat_score: string;
    sn?: number;
}

const GMATScores: React.FC = () => {
    const [scores, setScores] = useState<GMATScore[]>([]);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "warning";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/gmat_scores_api.php";

    useEffect(() => {
        fetchScores();
    }, []);

    const fetchScores = async () => {
        try {
            const response = await axios.get(`${API_URL}`);
            if (response.data.success) {
                setScores(response.data.scores);
            } else {
                setSnackbar({
                    open: true,
                    message: response.data.message || "No scores found",
                    severity: "warning",
                });
            }
        } catch (error) {
            setSnackbar({
                open: true,
                message: "Error fetching scores",
                severity: "error",
            });
        }
    };

    const columns: GridColDef<GMATScore>[] = [
        { field: "sn", headerName: "Id", flex: 1, valueGetter: (_, row) => row.sn },
        { field: "full_name", headerName: "Full Name", flex: 2 },
        { field: "email", headerName: "Personal Email", flex: 2 },
        { field: "gmat_score", headerName: "GMAT Score", flex: 1 },
    ];

    const rows = scores.map((score, index) => ({ ...score, sn: index + 1 }));

    return (
        <main className="min-h-[80vh] p-4">
            <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
                <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
                    GMAT Scores
                </p>
            </div>

            <div className="bg-white mt-8 rounded-lg shadow-md">
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                    getRowId={(row) => row.email} // Assuming email is unique
                    disableRowSelectionOnClick
                    localeText={{ noRowsLabel: "No scores found!" }}
                    className="border-none"
                />
            </div>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </main>
    );
};

export default GMATScores;