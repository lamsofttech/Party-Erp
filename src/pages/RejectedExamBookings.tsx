import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Snackbar, Alert } from "@mui/material";

interface RejectedBooking {
  id: number;
  fullnames: string;
  email: string;
  comment: string;
  test_type: string;
  sn?: number; // Serial number added dynamically
}

const RejectedBookings: React.FC = () => {
  const [bookings, setBookings] = useState<RejectedBooking[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/rejected_bookings_api.php";

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
          message: response.data.message || "No rejected bookings found",
          severity: "warning",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching rejected bookings",
        severity: "error",
      });
    }
  };

  const columns: GridColDef<RejectedBooking>[] = [
    {
      field: "sn",
      headerName: "Id",
      flex: 1,
      valueGetter: (_, row) => row.sn,
    },
    { field: "fullnames", headerName: "Name", flex: 2 },
    { field: "email", headerName: "Personal Email", flex: 2 },
    { field: "test_type", headerName: "Test Type", flex: 2 },
    { field: "comment", headerName: "Rejection Reason", flex: 2 },
  ];

  const rows = bookings.map((booking, index) => ({ ...booking, sn: index + 1 }));

  return (
    <main className="min-h-[80vh] p-4">
      <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4">
        <p className="font-bold text-[24px] text-white dark:text-white py-4 text-center">
          Rejected Bookings
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
          localeText={{ noRowsLabel: "No rejected bookings found!" }}
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

export default RejectedBookings;