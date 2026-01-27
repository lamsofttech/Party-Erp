import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import * as XLSX from "xlsx";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";

interface President {
  id: number;
  name: string;
  position_id: number;
  party: string;
  manifesto_url?: string | null;
  image_url?: string | null;
}

const PresidentAnalysis: React.FC = () => {
  const [presidents, setPresidents] = useState<President[]>([]);
  const [filteredPresidents, setFilteredPresidents] = useState<President[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    position_id: "",
    party: "",
    id: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [isEditing, setIsEditing] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPresidents();
  }, []);

  const fetchPresidents = async () => {
    try {
      const response = await axios.get("/API/get_presidents.php");
      if (response.data.status === "success") {
        const sortedPresidents = response.data.candidates.sort(
          (a: President, b: President) => a.id - b.id
        );
        setPresidents(sortedPresidents);
        setFilteredPresidents(sortedPresidents);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Failed to fetch candidates.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setSnackbar({
        open: true,
        message: "Error fetching candidates.",
        severity: "error",
      });
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredPresidents(
      presidents.filter(
        (president) =>
          president.name.toLowerCase().includes(query) ||
          president.party.toLowerCase().includes(query)
      )
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddOrUpdatePresident = async () => {
    if (!formData.name || !formData.position_id || !formData.party) {
      setSnackbar({
        open: true,
        message: "All fields are required.",
        severity: "error",
      });
      return;
    }

    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("position_id", formData.position_id);
      payload.append("party", formData.party);

      if (isEditing) {
        payload.append("id", formData.id);
        payload.append("action", "update");

        const response = await axios.post("/API/presidents_manage.php", payload);
        if (response.data.status === "success") {
          setSnackbar({
            open: true,
            message: "President updated successfully.",
            severity: "success",
          });
          setFormData({ name: "", position_id: "", party: "", id: "" });
          setOpenDialog(false);
          setIsEditing(false);
          fetchPresidents();
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || "Failed to update candidate.",
            severity: "error",
          });
        }
      } else {
        // You are still using the original endpoint for add
        const response = await axios.post("/API/add_president.php", payload);
        if (response.data.status === "success") {
          setSnackbar({
            open: true,
            message: "President added successfully.",
            severity: "success",
          });
          setFormData({ name: "", position_id: "", party: "", id: "" });
          setOpenDialog(false);
          fetchPresidents();
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || "Failed to add candidate.",
            severity: "error",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSnackbar({
        open: true,
        message: "Error processing request.",
        severity: "error",
      });
    }
  };

  const handleEdit = (president: President) => {
    setFormData({
      id: president.id.toString(),
      name: president.name,
      position_id: president.position_id.toString(),
      party: president.party,
    });
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    try {
      const payload = new FormData();
      payload.append("id", id.toString());
      payload.append("action", "delete");

      const response = await axios.post("/API/presidents_manage.php", payload);
      if (response.data.status === "success") {
        setSnackbar({
          open: true,
          message: "Candidate deleted successfully.",
          severity: "success",
        });
        fetchPresidents();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Failed to delete candidate.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting candidate:", error);
      setSnackbar({
        open: true,
        message: "Error deleting candidate.",
        severity: "error",
      });
    }
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", flex: 0.5 },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "party", headerName: "Party", flex: 1 },
    { field: "position_id", headerName: "Position ID", flex: 0.7 },
    {
      field: "manifesto_url",
      headerName: "Manifesto",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <a
            href={params.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View
          </a>
        ) : (
          "N/A"
        ),
    },
    {
      field: "image_url",
      headerName: "Image",
      flex: 0.8,
      renderCell: (params) =>
        params.value ? (
          <img
            src={params.value}
            alt="Candidate"
            className="h-10 w-10 object-cover rounded-full"
          />
        ) : (
          "N/A"
        ),
    },
    {
      field: "action",
      headerName: "Action",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex gap-2">
          <IconButton color="primary" onClick={() => handleEdit(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-[80vh] p-4">
      <div className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] rounded-xl mb-4 flex justify-between items-center px-4">
        <p className="font-bold text-[24px] text-white py-4 text-center">
          Presidential Candidates Analysis
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/president-results")}
            variant="contained"
            size="medium"
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              borderRadius: "8px",
              backgroundColor: "#1976d2",
              "&:hover": { backgroundColor: "#115293" },
              boxShadow: "0 3px 5px rgba(0,0,0,0.2)",
            }}
          >
            View Results
          </Button>
          <Button
            onClick={() => {
              setFormData({ name: "", position_id: "", party: "", id: "" });
              setIsEditing(false);
              setOpenDialog(true);
            }}
            variant="contained"
            size="medium"
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              borderRadius: "8px",
              backgroundColor: "#FF6B00",
              "&:hover": { backgroundColor: "#e85c00" },
              boxShadow: "0 3px 5px rgba(0,0,0,0.2)",
            }}
          >
            Add Candidate
          </Button>
        </div>
      </div>

      <div className="flex flex-row gap-4 mb-4">
        <TextField
          label="Search by Name, Party..."
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
            const worksheet = XLSX.utils.json_to_sheet(filteredPresidents);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Presidents");
            XLSX.writeFile(workbook, "presidents_analysis.xlsx");
          }}
        >
          Export to Excel
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md mt-4">
        <DataGrid
          rows={filteredPresidents}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: "No Presidential Candidates found." }}
          className="border-none"
        />
      </div>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Edit President Candidate" : "Add President Candidate"}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4 mt-2">
          <TextField
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            required
          />
          <TextField
            label="Position ID"
            name="position_id"
            value={formData.position_id}
            onChange={handleInputChange}
            fullWidth
            required
          />
          <TextField
            label="Party"
            name="party"
            value={formData.party}
            onChange={handleInputChange}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddOrUpdatePresident}>
            {isEditing ? "Update" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

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

export default PresidentAnalysis;
