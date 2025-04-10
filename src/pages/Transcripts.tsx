import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";

// Interfaces
interface Student {
  id: number;
  member_no: string;
  full_name: string;
  email: string;
  documents_count: number;
}

interface VerifyOption {
  id: number;
  email: string;
  full_name: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/transcripts_api.php";

const Transcripts: React.FC = () => {
  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]); // For search functionality
  const [searchQuery, setSearchQuery] = useState<string>(""); // Search query state
  const [verifyOptions, setVerifyOptions] = useState<VerifyOption[]>([]);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Fetch data on mount
  useEffect(() => {
    fetchStudents();
    fetchVerifyOptions();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}?action=list`);
      if (response.data.success) {
        setStudents(response.data.data);
        setFilteredStudents(response.data.data); // Initialize filtered students
      } else {
        setSnackbar({ open: true, message: "Error fetching students", severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Error connecting to server", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifyOptions = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=verify-options`);
      if (response.data.success) {
        setVerifyOptions(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching verify options:", error);
    }
  };

  // Handle file input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  // Handle verification submission
  const handleVerifySubmit = async () => {
    if (!file || (!selectedStudent && !emailInput)) {
      setSnackbar({ open: true, message: "Please select a student or enter an email and upload a file", severity: "error" });
      return;
    }

    const formData = new FormData();
    formData.append("action", "verify");
    let email = emailInput;
    if (selectedStudent) {
      const [id, selectedEmail] = selectedStudent.split(",");
      formData.append("stu_id", id);
      email = selectedEmail;
    }
    formData.append("stu_email", email);
    formData.append("stu_doc", file);

    try {
      const response = await axios.post(API_URL, formData);
      if (response.data.success) {
        setSnackbar({ open: true, message: response.data.message, severity: "success" });
        setOpenModal(false);
        setSelectedStudent("");
        setEmailInput("");
        setFile(null);
        fetchStudents(); // Refresh the list
        fetchVerifyOptions();
      } else {
        setSnackbar({ open: true, message: response.data.message, severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Error verifying document", severity: "error" });
    }
  };

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    if (query === "") {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter((student) =>
      student.member_no.toLowerCase().includes(query) ||
      student.full_name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.documents_count.toString().includes(query)
    );

    setFilteredStudents(filtered);
  };

  // Export to Excel (excluding Action column)
  const handleExportExcel = () => {
    const exportData = filteredStudents.map((student) => ({
      "No.": student.id,
      "Member No": student.member_no,
      "Full Name": student.full_name,
      "Email": student.email,
      "Documents": student.documents_count,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Transcripts");
    XLSX.writeFile(workbook, "student_transcripts.xlsx");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-3"
    >
      <Paper elevation={3} className="p-4 mb-4 min-h-screen">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" className="font-semibold">
            Student Documents
          </Typography>
          <Button variant="contained" color="success" onClick={() => setOpenModal(true)}>
            Verify Documents
          </Button>
        </Box>

        {/* Search and Export Row */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <TextField
            label="Search students..."
            variant="outlined"
            value={searchQuery}
            onChange={handleSearch}
            sx={{ flex: 1, mr: 2 }}
          />
          <Button variant="contained" onClick={handleExportExcel}>
            Export to Excel
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>No.</TableCell>
                  <TableCell>Member No</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Documents</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.member_no}</TableCell>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell align="center">
                      <Chip label={student.documents_count} color="success" />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <IconButton
                          color="primary"
                          component={Link}
                          to={`/school-admission/application-documents/transcripts/${student.full_name}?email=${student.email}`}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No student documents found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Verification Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Verify Documents</Typography>
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="student-select-label">Select Student</InputLabel>
            <Select
              labelId="student-select-label"
              label="Select Student"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value as string)}
            >
              <MenuItem value="">Select Student</MenuItem>
              {verifyOptions.map((option) => (
                <MenuItem key={option.id} value={`${option.id},${option.email}`}>
                  {`${option.email} (${option.full_name})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Student Email (if not in list)"
            fullWidth
            margin="normal"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <Box mt={2}>
            <input
              accept="image/*,.pdf"
              style={{ display: "none" }}
              id="upload-file"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="upload-file">
              <Button variant="outlined" component="span" fullWidth>
                {file ? file.name : "Upload Document"}
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleVerifySubmit}>
            Verify
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </motion.div>
  );
};

export default Transcripts;