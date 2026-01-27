import { useState, useEffect, useCallback, type SyntheticEvent, type ChangeEvent } from "react";
import {
  Container,
  Typography,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { motion } from "framer-motion";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import { Add } from "@mui/icons-material";

// Define status colors mapping
const statusColors: Record<
  string,
  "default" | "success" | "error" | "warning" | "info" | "primary" | "secondary"
> = {
  "Pending Vetting": "warning",
  Cleared: "success",
  Rejected: "error",
  Disqualified: "error",
  Withdrawn: "info",
  "Under Vetting": "info",
  New: "primary",
};

// Allowed status values
const STATUS_OPTIONS = [
  "New",
  "Pending Vetting",
  "Under Vetting",
  "Cleared",
  "Disqualified",
  "Withdrawn",
] as const;

// ---- Status type + normalizer ----
type NomineeStatus = typeof STATUS_OPTIONS[number];

function normalizeStatus(raw: unknown): NomineeStatus {
  const s = (raw ?? "").toString().trim();
  return s === "" ? "New" : (s as NomineeStatus);
}

// Define Nominee interface
interface Nominee {
  id: string;
  full_name: string;
  national_id: string;
  passport_number: string | null;
  date_of_birth: string;
  gender: "Male" | "Female" | "Other" | null;
  phone: string | null;
  email: string | null;
  physical_address: string | null;
  position: string | null;
  county: string | null;
  constituency: string | null;
  ward: string | null;
  membership_number: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  payment_date: string | null;
  payment_amount: number | null;
  loyalty_declaration: boolean | null;
  dispute_acceptance: boolean | null;
  finalized: boolean;
  created_at: string;
  status: NomineeStatus;
}

// Initial state
const initialNomineeState: Nominee = {
  id: "",
  full_name: "",
  national_id: "",
  passport_number: null,
  date_of_birth: "",
  gender: null,
  phone: null,
  email: null,
  physical_address: null,
  position: null,
  county: null,
  constituency: null,
  ward: null,
  membership_number: null,
  payment_reference: null,
  payment_method: null,
  payment_date: null,
  payment_amount: null,
  loyalty_declaration: null,
  dispute_acceptance: null,
  finalized: false,
  created_at: "",
  status: "New",
};

const API_BASE_URL = "https://skizagroundsuite.com/API";

const NomineeList = () => {
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [nomineeToDelete, setNomineeToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentNominee, setCurrentNominee] = useState<Nominee>(initialNomineeState);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");

  const navigate = useNavigate();

  // Snackbar util
  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning"
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (_event?: SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  // --- Fetch All Nominees ---
  const fetchNominees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/fetch_nominees.php`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const json = await response.json();

      if (json.status === "success") {
        setNominees(json.data);
      } else {
        setError(json.message || "Failed to fetch nominees.");
        setNominees([]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Fetch error:", err);
      setError("An unexpected error occurred while fetching nominees.");
      setNominees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch Single Nominee for Edit Modal ---
  const fetchSingleNominee = async (id: string) => {
    setEditLoading(true);
    setEditError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/fetch_single_nominee.php?id=${id}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const json = await response.json();

      if (json.status === "success") {
        const nomineeData: Nominee & Record<string, unknown> = json.data;

        // Normalize dates (YYYY-MM-DD for inputs)
        if (nomineeData.date_of_birth) {
          nomineeData.date_of_birth = nomineeData.date_of_birth.split(" ")[0];
        }
        if (nomineeData.payment_date) {
          nomineeData.payment_date = nomineeData.payment_date.split(" ")[0];
        }

        // Normalize booleans
        nomineeData.loyalty_declaration = !!nomineeData.loyalty_declaration;
        nomineeData.dispute_acceptance = !!nomineeData.dispute_acceptance;
        nomineeData.finalized = !!nomineeData.finalized;

        // Default/normalize status
        nomineeData.status = normalizeStatus((nomineeData as any).status);

        setCurrentNominee(nomineeData);
        setOpenEditDialog(true);
      } else {
        setEditError(json.message || "Failed to load nominee details.");
        showSnackbar(`Failed to load nominee details: ${json.message}`, "error");
        setOpenEditDialog(false);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Fetch single nominee error:", err);
      setEditError("An error occurred while loading nominee details.");
      showSnackbar("An error occurred while loading nominee details.", "error");
      setOpenEditDialog(false);
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    fetchNominees();
  }, [fetchNominees]);

  const refreshList = () => {
    fetchNominees();
    showSnackbar("Nominee list refreshed.", "info");
  };

  // --- Edit Handlers ---
  const handleEditClick = (id: string) => {
    fetchSingleNominee(id);
  };

  // Safe handler for inputs
  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const t = e.currentTarget;
    const key = t.name as keyof Nominee;

    // Payment amount (number | null)
    if (key === "payment_amount") {
      const raw = t.value;
      setCurrentNominee(prev => ({
        ...prev,
        payment_amount: raw === "" ? null : Number(raw),
      }));
      return;
    }

    // Checkboxes (booleans)
    if ("type" in t && t.type === "checkbox") {
      const checked = (t as HTMLInputElement).checked;
      setCurrentNominee(prev => ({
        ...prev,
        [key]: checked as Nominee[typeof key],
      }));
      return;
    }

    // Text / date / email etc.
    setCurrentNominee(prev => ({
      ...prev,
      [key]: (t as HTMLInputElement | HTMLTextAreaElement).value as Nominee[typeof key],
    }));
  };

  // MUI Select handler (gender/position/status)
  const handleMuiSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    if (!name) return;

    const key = name as keyof Nominee;

    // Nullable selects → null when empty
    if (key === "gender" || key === "position") {
      const normalized = value === "" ? null : value;
      setCurrentNominee(prev => ({
        ...prev,
        [key]: normalized as Nominee[typeof key],
      }));
      return;
    }

    // Status is non-nullable union → normalize
    if (key === "status") {
      setCurrentNominee(prev => ({
        ...prev,
        status: normalizeStatus(value),
      }));
      return;
    }

    // Fallback (not expected with current UI)
    setCurrentNominee(prev => ({
      ...prev,
      [key]: value as Nominee[typeof key],
    }));
  };

  // Switches
  const handleSwitchChange =
    (name: "loyalty_declaration" | "dispute_acceptance" | "finalized") =>
    (_e: ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setCurrentNominee((prev) => ({ ...prev, [name]: checked }));
    };

  // Save edit
  const handleSaveEdit = async () => {
    setEditLoading(true);
    setEditError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/update_nominee.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentNominee),
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const json = await response.json();

      if (json.status === "success") {
        showSnackbar("Nominee updated successfully!", "success");
        setOpenEditDialog(false);
        fetchNominees();
      } else {
        setEditError(json.message || "Failed to update nominee.");
        showSnackbar(`Failed to update nominee: ${json.message}`, "error");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Update fetch error:", err);
      setEditError("An error occurred while trying to update the nominee.");
      showSnackbar("An error occurred while trying to update the nominee.", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setCurrentNominee(initialNomineeState);
    setEditError(null);
  };

  // --- Delete Handlers ---
  const handleDeleteClick = (id: string) => {
    setNomineeToDelete(id);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!nomineeToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/delete_nominee.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: nomineeToDelete }),
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const json = await response.json();

      if (json.status === "success") {
        showSnackbar("Nominee deleted successfully!", "success");
        fetchNominees();
      } else {
        showSnackbar(`Failed to delete nominee: ${json.message}`, "error");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Delete fetch error:", err);
      showSnackbar("An error occurred while trying to delete the nominee.", "error");
    } finally {
      setOpenDeleteDialog(false);
      setNomineeToDelete(null);
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteDialog(false);
    setNomineeToDelete(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      {/* HEADER */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        mb={4}
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary">
            Candidate Management
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Efficiently track, vet, and manage political candidates.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshList}
            disabled={loading}
          >
            Refresh List
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate("/nominations/new/add")}
          >
            Add Candidate
          </Button>
        </Stack>
      </Box>

      {/* Nominees Table */}
      {loading ? (
        <Box textAlign="center" mt={8}>
          <CircularProgress color="primary" size={60} />
          <Typography variant="h6" color="text.secondary" mt={2}>
            Loading candidates...
          </Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 4, fontSize: "1.1rem" }}>
          {error}
        </Alert>
      ) : nominees.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "primary.light" }}>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1rem" }}>Candidate</TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1rem" }}>Position</TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1rem" }}>County</TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1rem" }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold", fontSize: "1rem" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nominees.map((nominee) => (
                  <TableRow
                    key={nominee.id}
                    hover
                    sx={{ cursor: "pointer", "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" onClick={() => navigate(`/nominees/${nominee.id}`)}>
                        <Avatar sx={{ bgcolor: "primary.main", mr: 2, width: 48, height: 48 }}>
                          {nominee.full_name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {nominee.full_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {nominee.national_id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{nominee.position || "-"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{nominee.county || "-"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={nominee.status}
                        color={statusColors[nominee.status] || "default"}
                        size="medium"
                        sx={{ fontSize: "0.9rem", p: "5px 8px" }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton onClick={() => navigate(`/nominees/${nominee.id}`)} color="primary" size="large">
                            <VisibilityIcon sx={{ fontSize: "1.8rem" }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Candidate">
                          <IconButton
                            onClick={() => handleEditClick(nominee.id)}
                            color="info"
                            size="large"
                            disabled={editLoading && currentNominee?.id === nominee.id}
                          >
                            {editLoading && currentNominee?.id === nominee.id ? (
                              <CircularProgress size={24} />
                            ) : (
                              <EditIcon sx={{ fontSize: "1.8rem" }} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Candidate">
                          <IconButton
                            onClick={() => handleDeleteClick(nominee.id)}
                            color="error"
                            size="large"
                            disabled={deleting && nomineeToDelete === nominee.id}
                          >
                            {deleting && nomineeToDelete === nominee.id ? (
                              <CircularProgress size={24} />
                            ) : (
                              <DeleteIcon sx={{ fontSize: "1.8rem" }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </motion.div>
      ) : (
        <Box textAlign="center" mt={8}>
          <Typography variant="h6" color="text.secondary">
            No candidates found.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ mt: 3, p: "12px 24px", fontSize: "1.1rem" }}
            onClick={() => navigate("/nominations/new/add")}
          >
            Add New Candidate
          </Button>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title" sx={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          {"Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description" sx={{ fontSize: "1.1rem" }}>
            Are you sure you want to delete this candidate? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDeleteCancel} color="primary" disabled={deleting} variant="outlined" size="large">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus disabled={deleting} variant="contained" size="large">
            {deleting ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Nominee Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} aria-labelledby="edit-dialog-title" maxWidth="md" fullWidth>
        <DialogTitle id="edit-dialog-title" sx={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          Edit Candidate: {currentNominee?.full_name || "N/A"}
        </DialogTitle>
        <DialogContent dividers>
          {editLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={300}>
              <CircularProgress size={60} />
              <Typography sx={{ ml: 3, fontSize: "1.1rem" }}>Loading candidate data...</Typography>
            </Box>
          ) : editError ? (
            <Alert severity="error" sx={{ mb: 2, fontSize: "1.1rem" }}>
              {editError}
            </Alert>
          ) : (
            <Box
              component="form"
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
                gap: 3,
                mt: 1,
              }}
            >
              {/* Personal Details */}
              <Typography variant="h6" sx={{ gridColumn: "1 / -1", mt: 2, mb: -1 }}>
                Personal Details
              </Typography>
              <TextField label="Full Name" name="full_name" value={currentNominee.full_name} onChange={handleEditChange} fullWidth />
              <TextField label="National ID" name="national_id" value={currentNominee.national_id} onChange={handleEditChange} fullWidth />
              <TextField label="Passport Number" name="passport_number" value={currentNominee.passport_number || ""} onChange={handleEditChange} fullWidth />
              <TextField
                label="Date of Birth"
                name="date_of_birth"
                type="date"
                value={currentNominee.date_of_birth}
                onChange={handleEditChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select label="Gender" name="gender" value={currentNominee.gender ?? ""} onChange={handleMuiSelectChange}>
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Phone" name="phone" value={currentNominee.phone || ""} onChange={handleEditChange} fullWidth />
              <TextField label="Email" name="email" type="email" value={currentNominee.email || ""} onChange={handleEditChange} fullWidth />
              <TextField
                label="Physical Address"
                name="physical_address"
                value={currentNominee.physical_address || ""}
                onChange={handleEditChange}
                fullWidth
                multiline
                rows={2}
                sx={{ gridColumn: { xs: "span 1", sm: "span 2", md: "span 3" } }}
              />

              {/* Political Details */}
              <Typography variant="h6" sx={{ gridColumn: "1 / -1", mt: 3, mb: -1 }}>
                Political Details
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Position</InputLabel>
                <Select label="Position" name="position" value={currentNominee.position || ""} onChange={handleMuiSelectChange}>
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  <MenuItem value="MCA">MCA</MenuItem>
                  <MenuItem value="MP">MP</MenuItem>
                  <MenuItem value="Woman Rep">Woman Rep</MenuItem>
                  <MenuItem value="Senator">Senator</MenuItem>
                  <MenuItem value="Governor">Governor</MenuItem>
                  <MenuItem value="President">President</MenuItem>
                </Select>
              </FormControl>
              <TextField label="County" name="county" value={currentNominee.county || ""} onChange={handleEditChange} fullWidth />
              <TextField label="Constituency" name="constituency" value={currentNominee.constituency || ""} onChange={handleEditChange} fullWidth />
              <TextField label="Ward" name="ward" value={currentNominee.ward || ""} onChange={handleEditChange} fullWidth />
              <TextField label="Membership Number" name="membership_number" value={currentNominee.membership_number || ""} onChange={handleEditChange} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" name="status" value={currentNominee.status} onChange={handleMuiSelectChange}>
                  {STATUS_OPTIONS.map((statusKey) => (
                    <MenuItem key={statusKey} value={statusKey}>
                      {statusKey}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Payment & Declaration */}
              <Typography variant="h6" sx={{ gridColumn: "1 / -1", mt: 3, mb: -1 }}>
                Payment & Declaration
              </Typography>
              <TextField label="Payment Reference" name="payment_reference" value={currentNominee.payment_reference || ""} onChange={handleEditChange} fullWidth />
              <TextField label="Payment Method" name="payment_method" value={currentNominee.payment_method || ""} onChange={handleEditChange} fullWidth />
              <TextField
                label="Payment Date"
                name="payment_date"
                type="date"
                value={currentNominee.payment_date || ""}
                onChange={handleEditChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Payment Amount"
                name="payment_amount"
                type="number"
                value={currentNominee.payment_amount ?? ""}
                onChange={handleEditChange}
                fullWidth
                inputProps={{ step: "0.01" }}
              />

              {/* Boolean Switches */}
              <Box
                sx={{
                  gridColumn: { xs: "span 1", sm: "span 2", md: "span 3" },
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                  mt: 1,
                  mb: -1,
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentNominee.loyalty_declaration || false}
                      onChange={handleSwitchChange("loyalty_declaration")}
                      color="primary"
                    />
                  }
                  label="Loyalty Declaration"
                  labelPlacement="end"
                  sx={{ flexGrow: 1 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentNominee.dispute_acceptance || false}
                      onChange={handleSwitchChange("dispute_acceptance")}
                      color="primary"
                    />
                  }
                  label="Dispute Acceptance"
                  labelPlacement="end"
                  sx={{ flexGrow: 1 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentNominee.finalized || false}
                      onChange={handleSwitchChange("finalized")}
                      color="primary"
                    />
                  }
                  label="Finalized"
                  labelPlacement="end"
                  sx={{ flexGrow: 1 }}
                />
              </Box>

              {/* Audit Info */}
              <Typography variant="h6" sx={{ gridColumn: "1 / -1", mt: 3, mb: -1 }}>
                Audit Information
              </Typography>
              <TextField
                label="Created At"
                name="created_at"
                value={currentNominee.created_at ? new Date(currentNominee.created_at).toLocaleString() : ""}
                fullWidth
                variant="filled"
                InputProps={{ readOnly: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseEditDialog} color="primary" disabled={editLoading} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} color="success" variant="contained" disabled={editLoading}>
            {editLoading ? <CircularProgress size={24} /> : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default NomineeList;
