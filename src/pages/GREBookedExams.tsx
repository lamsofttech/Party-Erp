import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Snackbar, Alert } from "@mui/material";

interface BookedExam {
  id: number;
  email: string;
  exam_date: string;
  sn?: number; // Serial number added dynamically
}

const GREBookedExams: React.FC = () => {
  const [bookings, setBookings] = useState<BookedExam[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gre/APIs/gre_booked_exams_api.php";

  useEffect(() => {
    fetchBookedExams();
  }, []);

  const fetchBookedExams = async () => {
    try {
      const response = await axios.get(`${API_URL}`);
      if (response.data.success) {
        setBookings(response.data.bookings);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "No booked exams found",
          severity: "warning",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching booked exams",
        severity: "error",
      });
    }
  };

  const columns: GridColDef<BookedExam>[] = [
    {
      field: "sn",
      headerName: "Id",
      flex: 1,
      valueGetter: (_, row) => row.sn,
    },
    { field: "email", headerName: "Personal Email", flex: 2 },
    { field: "exam_date", headerName: "Exam Date", flex: 2 },
  ];

  const rows = bookings.map((booking, index) => ({ ...booking, sn: index + 1 }));

  return (
    <main className="min-h-[80vh] p-4">
      <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
        <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
          GRE Booked Exams
        </p>
      </div>

      <div className="bg-white mt-8 rounded-lg shadow-md">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: "No booked exams found!" }}
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

export default GREBookedExams;