import React, { useState, useEffect } from "react";
import {
  Box, Typography, Container, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, CircularProgress,
  Alert, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton,
  Toolbar, AppBar, Grid, Chip
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from "@mui/icons-material";

const API_BASE_URL = 'https://skizagroundsuite.com/API';

const partyColors = {
  primary: "#006400",
  secondary: "#FFA500",
};

// Map numeric statuses to labels
const statusMap = {
  1: "Pending Vetting",
  2: "Approved",
  3: "Rejected",
  4: "Payment Pending",
};

// Map numeric statuses to chip colors
const getStatusChipColor = (statusCode) => {
  switch (statusCode) {
    case 1: return "warning";
    case 2: return "success";
    case 3: return "error";
    case 4: return "info";
    default: return "default";
  }
};

const NomineeManagementPage = () => {
  const [allNominees, setAllNominees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [nomineeDetails, setNomineeDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch nominees
  const fetchAllNominees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/fetch_pending_vetting_nominees.php`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === "success") {
        setAllNominees(result.data.map(n => ({
          ...n,
          status: Number(n.status), // keep numeric
        })));
      } else {
        throw new Error(result.message || "Failed to fetch nominees.");
      }
    } catch (err) {
      console.error("Failed to load nominees:", err);
      setError(`Failed to load nominee records: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch nominee details
  const fetchNomineeDetails = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_nominee_details.php?id=${id}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      if (result.status === "success") return result.data;
      throw new Error(result.message || "Failed to fetch nominee details.");
    } catch (err) {
      console.error(`Failed to fetch details for ID ${id}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAllNominees();
  }, []);

  const handleViewDetails = async (nominee) => {
    setSelectedNominee(nominee);
    setNomineeDetails(null);
    setDetailsLoading(true);
    setOpenDetailDialog(true);
    try {
      const details = await fetchNomineeDetails(nominee.id);
      setNomineeDetails(details);
    } catch {
      setNomineeDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filter only pending nominees (status === 1)
  const filteredNominees = allNominees.filter(
    (n) => n.status === 1 && (
      n.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.id.toString().includes(searchTerm.toLowerCase()) ||
      (n.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.position.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ mb: 3 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h4" sx={{ color: partyColors.primary, fontWeight: 'bold' }}>
            Pending Nominee Vetting
          </Typography>
          <Button
            variant="contained"
            sx={{ bgcolor: partyColors.primary }}
            startIcon={<AddIcon />}
          >
            Add New Nominee
          </Button>
        </Toolbar>
      </AppBar>

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Search Nominees"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: <SearchIcon color="action" />,
          }}
        />
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchAllNominees}
          >
            Refresh Table
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={5}><CircularProgress size={60} /></Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper elevation={3}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: partyColors.primary }}>
                  <TableCell sx={{ color: "white" }}>ID</TableCell>
                  <TableCell sx={{ color: "white" }}>Full Name</TableCell>
                  <TableCell sx={{ color: "white" }}>Position</TableCell>
                  <TableCell sx={{ color: "white" }}>Status</TableCell>
                  <TableCell sx={{ color: "white" }}>County</TableCell>
                  <TableCell sx={{ color: "white" }}>Constituency</TableCell>
                  <TableCell sx={{ color: "white" }}>Ward</TableCell>
                  <TableCell sx={{ color: "white" }}>Polling Station</TableCell>
                  <TableCell sx={{ color: "white" }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredNominees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">No pending nominees found.</TableCell>
                  </TableRow>
                ) : (
                  filteredNominees.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{n.id}</TableCell>
                      <TableCell>{n.full_name}</TableCell>
                      <TableCell>{n.position}</TableCell>
                      <TableCell>
                        <Chip
                          label={statusMap[n.status] || "Unknown"}
                          color={getStatusChipColor(n.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{n.county}</TableCell>
                      <TableCell>{n.constituency}</TableCell>
                      <TableCell>{n.ward}</TableCell>
                      <TableCell>{n.polling_station}</TableCell>
                      <TableCell align="center">
                        <IconButton color="primary" onClick={() => handleViewDetails(n)}>
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: partyColors.primary, color: 'white' }}>
          Nominee Details: {selectedNominee?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <Box display="flex" justifyContent="center"><CircularProgress /></Box>
          ) : nomineeDetails ? (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography><strong>Email:</strong> {nomineeDetails.email || 'N/A'}</Typography>
                <Typography><strong>Phone:</strong> {nomineeDetails.phone || 'N/A'}</Typography>
                <Typography><strong>Address:</strong> {nomineeDetails.physical_address || 'N/A'}</Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography color="error">Details could not be loaded.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NomineeManagementPage;
