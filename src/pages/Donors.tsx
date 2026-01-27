import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  Box, Typography, TextField, CircularProgress, Paper, Fab, Pagination, Snackbar, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import type { AlertColor } from "@mui/material/Alert";
import type { SelectChangeEvent } from "@mui/material/Select";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";

/** Types **/
type Donor = {
  id?: string | number;
  name: string;
  contact?: string;
  amount: number;
  method?: string;
  date?: string; // 'YYYY-MM-DD' or display string
};

type ApiResponse =
  | { status: "success"; donors: Donor[] }
  | { status: "error"; message?: string };

type SnackbarState = {
  open: boolean;
  message: string;
  severity: AlertColor; // 'success' | 'info' | 'warning' | 'error'
};

type NewDonor = {
  name: string;
  contact: string;
  amount: number;
  method: string;
  date: string; // 'YYYY-MM-DD'
};

const recordsPerPage = 10;

const Donors = () => {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  const [newDonor, setNewDonor] = useState<NewDonor>({
    name: "",
    contact: "",
    amount: 0,
    method: "",
    date: "",
  });

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const res = await axios.get<ApiResponse>("https://skizagroundsuite.com/API/fetch_donors.php");
      if (res.data.status === "success") {
        setDonors(res.data.donors ?? []);
      } else {
        setSnackbar({
          open: true,
          message: res.data.message || "Failed to fetch donors.",
          severity: "error",
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: "Server error while fetching donors.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const handleAddDonor = async () => {
    try {
      const res = await axios.post<ApiResponse>(
        "https://skizagroundsuite.com/API/add_donor.php",
        newDonor,
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.data.status === "success") {
        setSnackbar({ open: true, message: "Donor added successfully!", severity: "success" });
        setOpen(false);
        setNewDonor({ name: "", contact: "", amount: 0, method: "", date: "" });
        fetchDonors();
      } else {
        setSnackbar({
          open: true,
          message: res.data.message || "Failed to add donor.",
          severity: "error",
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: "Server error while adding donor.",
        severity: "error",
      });
    }
  };

  const formatKES = (amount: number) =>
    `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  // Alternatively:
  // const formatKES = (amount: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'KES' }).format(amount);

  const filteredDonors = useMemo<Donor[]>(
    () =>
      donors.filter((d) => {
        const q = searchQuery.toLowerCase();
        return (
          (d.name || "").toLowerCase().includes(q) ||
          (d.contact || "").toLowerCase().includes(q) ||
          (d.method || "").toLowerCase().includes(q) ||
          (d.date || "").toLowerCase().includes(q) ||
          ((d.amount ?? 0).toString().includes(searchQuery))
        );
      }),
    [donors, searchQuery]
  );

  const indexOfLastRecord = currentPage * recordsPerPage;
  const currentRecords = filteredDonors.slice(indexOfLastRecord - recordsPerPage, indexOfLastRecord);
  const totalPages = Math.ceil(filteredDonors.length / recordsPerPage);

  return (
    <Box sx={{ width: "100%", p: 2, maxWidth: "1000px", mx: "auto" }}>
      <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">
        🎯 Donors & Contributions
      </Typography>

      <TextField
        label="Search Donors"
        fullWidth
        size="medium"
        sx={{ mb: 3, fontSize: "1.4rem", "& .MuiInputBase-input": { fontSize: "1.4rem", p: 2 } }}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
        }}
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={80} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {currentRecords.map((d, idx) => (
            <Paper
              key={d.id ?? `${idx}-${d.name}`}
              elevation={4}
              sx={{ p: 4, borderRadius: 3, fontSize: "1.3rem", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}
            >
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                {idx + 1 + (currentPage - 1) * recordsPerPage}. {d.name}
              </Typography>
              <Typography sx={{ fontSize: "1.3rem", my: 1, fontWeight: 600, color: "#0A84FF" }}>
                Amount: {formatKES(d.amount)}
              </Typography>
              <Typography sx={{ fontSize: "1.2rem", mb: 1 }}>
                Method: <b>{d.method}</b>
              </Typography>
              <Typography sx={{ fontSize: "1.1rem", color: "text.secondary" }}>
                Date: {d.date}
              </Typography>
            </Paper>
          ))}
          {currentRecords.length === 0 && (
            <Typography sx={{ fontSize: "1.3rem", textAlign: "center", color: "text.secondary" }}>
              No donors found.
            </Typography>
          )}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={totalPages}
            size="large"
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            sx={{ "& .MuiPaginationItem-root": { fontSize: "1.6rem", minWidth: 48, minHeight: 48 } }}
          />
        </Box>
      )}

      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 80,
          height: 80,
          fontSize: "3rem",
          boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
        }}
      >
        +
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontSize: "1.8rem", textAlign: "center" }}>🧾 Quick Add Donor</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Full Name"
              required
              fullWidth
              value={newDonor.name}
              onChange={(e) => setNewDonor({ ...newDonor, name: e.target.value })}
              sx={{ fontSize: "1.4rem" }}
            />
            <TextField
              label="Contact Info"
              fullWidth
              value={newDonor.contact}
              onChange={(e) => setNewDonor({ ...newDonor, contact: e.target.value })}
              sx={{ fontSize: "1.4rem" }}
            />
            <TextField
              label="Amount (KES)"
              type="number"
              required
              fullWidth
              value={Number.isFinite(newDonor.amount) ? newDonor.amount : 0}
              onChange={(e) =>
                setNewDonor({ ...newDonor, amount: parseFloat(e.target.value) || 0 })
              }
              sx={{ fontSize: "1.4rem" }}
            />
            <FormControl fullWidth required>
              <InputLabel sx={{ fontSize: "1.4rem" }}>Payment Method</InputLabel>
              <Select
                value={newDonor.method}
                label="Payment Method"
                onChange={(e: SelectChangeEvent<string>) =>
                  setNewDonor({ ...newDonor, method: e.target.value as string })
                }
                sx={{ fontSize: "1.4rem" }}
              >
                <MenuItem value="M-PESA" sx={{ fontSize: "1.4rem" }}>
                  📱 M-PESA
                </MenuItem>
                <MenuItem value="PayPal" sx={{ fontSize: "1.4rem" }}>
                  💻 PayPal
                </MenuItem>
                <MenuItem value="Card" sx={{ fontSize: "1.4rem" }}>
                  💳 Card
                </MenuItem>
                <MenuItem value="Bank Transfer" sx={{ fontSize: "1.4rem" }}>
                  🏦 Bank Transfer
                </MenuItem>
                <MenuItem value="Crypto" sx={{ fontSize: "1.4rem" }}>
                  🪙 Crypto
                </MenuItem>
                <MenuItem value="Cash" sx={{ fontSize: "1.4rem" }}>
                  💵 Cash
                </MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date of Donation"
                value={newDonor.date ? dayjs(newDonor.date) : null}
                onChange={(date: Dayjs | null) =>
                  setNewDonor({ ...newDonor, date: date?.format("YYYY-MM-DD") || "" })
                }
                slotProps={{
                  textField: { fullWidth: true, required: true, sx: { fontSize: "1.4rem" } },
                }}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontSize: "1.4rem", px: 4, py: 1.5 }}>
            Cancel
          </Button>
          <Button onClick={handleAddDonor} variant="contained" sx={{ fontSize: "1.4rem", px: 4, py: 1.5 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Donors;
