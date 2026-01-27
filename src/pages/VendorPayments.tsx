import React, { useEffect, useState } from "react";
import {
  CircularProgress,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { motion } from "framer-motion";
import { Add, Edit, Delete, Visibility } from "@mui/icons-material";

// Interfaces for better type checking
interface Payment {
  id: number;
  vendor_id: number;
  vendor_name: string;
  amount: number;
  payment_date: string;
  reference: string;
  notes: string;
}

interface Vendor {
  id: number;
  vendor_name: string;
}

type SnackbarState = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info";
};

type PaymentFormState = {
  id: number;
  vendor_id: string; // keep as string for Select; convert to number on submit
  amount: string; // keep as string for TextField; convert to number on submit
  payment_date: string;
  reference: string;
  notes: string;
};

const VendorPayments: React.FC = () => {
  // 1️⃣ State Management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view">("add");

  // State for the payment form (new or edited payment)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    id: 0,
    vendor_id: "",
    amount: "",
    payment_date: "",
    reference: "",
    notes: "",
  });

  // 2️⃣ Fetch Payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://skizagroundsuite.com/API/get_vendor_payments.php"
      );
      const result = await response.json();
      if (result.status === "success") {
        setPayments(result.data);
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      showSnackbar("Failed to fetch payments.", "error");
    } finally {
      setLoading(false);
    }
  };

  // New: Fetch Vendors
  const fetchVendors = async () => {
    try {
      const response = await fetch(
        "https://skizagroundsuite.com/API/get_vendors.php"
      );
      const result = await response.json();
      if (result.status === "success") {
        setVendors(result.data);
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      showSnackbar("Failed to fetch vendors for payment form.", "error");
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchVendors();
  }, []);

  // 3️⃣ Snackbar Utility
  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  // Helper to reset form state
  const resetPaymentForm = () => {
    setPaymentForm({
      id: 0,
      vendor_id: "",
      amount: "",
      payment_date: "",
      reference: "",
      notes: "",
    });
  };

  // 4️⃣ Action Handlers
  const handleAdd = () => {
    setDialogMode("add");
    setSelectedPayment(null);
    resetPaymentForm();
    setDialogOpen(true);
  };

  const handleEdit = (payment: Payment) => {
    setDialogMode("edit");
    setSelectedPayment(payment);
    setPaymentForm({
      id: payment.id,
      vendor_id: String(payment.vendor_id), // Select expects string
      amount: String(payment.amount), // TextField value is string
      payment_date: payment.payment_date,
      reference: payment.reference,
      notes: payment.notes,
    });
    setDialogOpen(true);
  };

  const handleView = (payment: Payment) => {
    setDialogMode("view");
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;
    try {
      const response = await fetch(
        `https://skizagroundsuite.com/API/delete_vendor_payment.php?id=${id}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (result.status === "success") {
        setPayments((prev) => prev.filter((p) => p.id !== id));
        showSnackbar("Payment deleted successfully.", "success");
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      showSnackbar("Failed to delete payment.", "error");
    }
  };

  // Text inputs / textarea change handler
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => {
      const key = name as keyof PaymentFormState;
      return { ...prev, [key]: value } as PaymentFormState;
    });
  };

  // MUI Select change handler (fixes TS2322)
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const name = event.target.name as keyof PaymentFormState;
    const value = event.target.value;
    setPaymentForm((prev) => ({ ...prev, [name]: value } as PaymentFormState));
  };

  const handlePaymentSubmit = async () => {
    setLoading(true);
    const endpoint =
      dialogMode === "add"
        ? "https://skizagroundsuite.com/API/add_vendor_payment.php"
        : "https://skizagroundsuite.com/API/update_vendor_payment.php";

    const method = dialogMode === "add" ? "POST" : "PUT";

    // Prepare data for API
    const dataToSend = {
      ...paymentForm,
      vendor_id: Number(paymentForm.vendor_id),
      amount: Number(paymentForm.amount),
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });
      const result = await response.json();

      if (result.status === "success") {
        showSnackbar(
          `Payment ${dialogMode === "add" ? "added" : "updated"} successfully!`,
          "success"
        );
        setDialogOpen(false);
        fetchPayments();
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      console.error(`Error ${dialogMode}ing payment:`, error);
      showSnackbar(`Failed to ${dialogMode} payment.`, "error");
    } finally {
      setLoading(false);
    }
  };

  // 5️⃣ Filtered Payments
  const filteredPayments = payments.filter((p) =>
    `${p.vendor_name} ${p.reference} ${p.notes}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          💰 Vendor Payments
        </h1>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          Add Payment
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <TextField
          label="Search payments..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <CircularProgress />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Date</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment, index) => (
                    <TableRow key={payment.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{payment.vendor_name}</TableCell>
                      <TableCell>
                        KES {payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell>{payment.reference || "-"}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleView(payment)}
                          size="small"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleEdit(payment)}
                          size="small"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(payment.id)}
                          size="small"
                        >
                          <Delete fontSize="small" color="error" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </motion.div>
      )}

      {/* Dialog for View / Add / Edit */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogMode === "view"
            ? "View Payment"
            : dialogMode === "edit"
            ? "Edit Payment"
            : "Add Payment"}
        </DialogTitle>
        <DialogContent dividers>
          {dialogMode === "view" && selectedPayment ? (
            <div className="space-y-3 p-2">
              <p>
                <strong>Vendor:</strong> {selectedPayment.vendor_name}
              </p>
              <p>
                <strong>Amount:</strong> KES{" "}
                {selectedPayment.amount.toLocaleString()}
              </p>
              <p>
                <strong>Payment Date:</strong> {selectedPayment.payment_date}
              </p>
              <p>
                <strong>Reference:</strong> {selectedPayment.reference || "-"}
              </p>
              <p>
                <strong>Notes:</strong> {selectedPayment.notes || "-"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <FormControl fullWidth variant="outlined" size="small" required>
                <InputLabel id="vendor-select-label">Vendor</InputLabel>
                <Select
                  labelId="vendor-select-label"
                  id="vendor-select"
                  name="vendor_id"
                  value={paymentForm.vendor_id}
                  onChange={handleSelectChange}
                  label="Vendor"
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>Select a Vendor</em>
                  </MenuItem>
                  {vendors.map((vendor) => (
                    <MenuItem key={vendor.id} value={String(vendor.id)}>
                      {vendor.vendor_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Amount (KES)"
                variant="outlined"
                fullWidth
                size="small"
                name="amount"
                type="number"
                value={paymentForm.amount}
                onChange={handleFormChange}
                required
                disabled={loading}
              />
              <TextField
                label="Payment Date"
                variant="outlined"
                fullWidth
                size="small"
                name="payment_date"
                type="date"
                value={paymentForm.payment_date}
                onChange={handleFormChange}
                InputLabelProps={{ shrink: true }}
                required
                disabled={loading}
              />
              <TextField
                label="Reference"
                variant="outlined"
                fullWidth
                size="small"
                name="reference"
                value={paymentForm.reference}
                onChange={handleFormChange}
                disabled={loading}
              />
              <TextField
                label="Notes"
                variant="outlined"
                fullWidth
                size="small"
                name="notes"
                multiline
                rows={3}
                value={paymentForm.notes}
                onChange={handleFormChange}
                disabled={loading}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Close
          </Button>
          {dialogMode !== "view" && (
            <Button
              variant="contained"
              onClick={handlePaymentSubmit}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : dialogMode === "edit" ? (
                "Save Changes"
              ) : (
                "Add Payment"
              )}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default VendorPayments;
