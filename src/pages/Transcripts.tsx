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
    if (selectedStudent) {
      formData.append("stu_id", selectedStudent);
    }
    formData.append("stu_email", emailInput);
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
      } else {
        setSnackbar({ open: true, message: response.data.message, severity: "error" });
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Error verifying document", severity: "error" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-3"
    >
      <Paper elevation={3} className="p-4 mb-4">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" className="font-semibold">
            Student Documents
          </Typography>
          <Button variant="contained" color="success" onClick={() => setOpenModal(true)}>
            Verify Documents
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
                  <TableCell>Documents</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.member_no}</TableCell>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Chip label={student.documents_count} color="success" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<VisibilityIcon />}
                        href={`/transcripts-view?email=${student.email}`}
                        size="small"
                      >
                        View Doc
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
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