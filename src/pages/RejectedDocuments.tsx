import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { motion } from "framer-motion";

// Interfaces for type safety
interface Student {
  id: number;
  member_no: string;
  full_name: string;
  email: string;
  documents_count: number;
  intake?: string;
}

interface Intake {
  id: string;
  intake_name: string;
}

interface StudentDocDetail {
  sn: number;
  id: number;
  full_name: string;
  kap_email: string;
  doc_type: number;
  doc_type_name: string;
  document_name: string;
  doc_path: string;
  status: number;
  remarks: string;
}

interface ApiResponse {
  success: boolean;
  intake_name: string;
  intake_id: string;
  students: Student[];
  intakes: Intake[];
  message?: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/rejected_documents_api.php";

const RejectedDocuments: React.FC = () => {
  // State declarations
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [selectedIntake, setSelectedIntake] = useState<string>("");
  const [intakeName, setIntakeName] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDocuments, setStudentDocuments] = useState<StudentDocDetail[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState<boolean>(false);
  const [documentViewer, setDocumentViewer] = useState<{
    open: boolean;
    url: string;
    title: string;
  }>({ open: false, url: "", title: "" });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  // Fetch initial data (students and intakes)
  useEffect(() => {
    fetchData();
  }, [selectedIntake]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedIntake ? `${API_URL}?stage=${selectedIntake}` : API_URL;
      const response = await axios.get<ApiResponse>(url);
      if (response.data.success) {
        setStudents(response.data.students);
        setIntakes(response.data.intakes);
        setIntakeName(selectedIntake ? response.data.intake_name : "All Intakes");
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error fetching data",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error connecting to server",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific student's rejected documents
  const fetchStudentDocDetails = async (email: string) => {
    setDocumentsLoading(true);
    try {
      const response = await axios.get(API_URL, {
        params: { action: "documents", email },
      });
      if (response.data.success) {
        setStudentDocuments(response.data.data);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error fetching documents",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching documents",
        severity: "error",
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Handlers
  const handleViewDocuments = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentDocDetails(student.email);
    setOpenModal(true);
  };

  const handleOpenDocument = (doc: StudentDocDetail) => {
    setDocumentViewer({
      open: true,
      url: doc.doc_path,
      title: `${doc.full_name} - ${doc.doc_type_name}`,
    });
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleIntakeChange = (event: SelectChangeEvent) => {
    setSelectedIntake(event.target.value as string);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-3"
    >
      <Paper elevation={3} className="p-4 mb-4">
        {/* Intake Filter */}
        <Box className="mb-5 max-w-md">
          <FormControl fullWidth variant="outlined">
            <InputLabel id="intake-select-label">
              Select Intake to Filter
            </InputLabel>
            <Select
              labelId="intake-select-label"
              value={selectedIntake}
              onChange={handleIntakeChange}
              label="Select Intake to Filter"
            >
              <MenuItem value="">All Intakes</MenuItem>
              {intakes.map((intake) => (
                <MenuItem key={intake.id} value={intake.id}>
                  {intake.intake_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Students Table */}
        <Typography variant="h6" className="mb-3 font-semibold">
          Rejected Documents ({intakeName})
        </Typography>
        {loading ? (
          <Box className="flex justify-center py-8">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>No.</TableCell>
                    <TableCell>Member No</TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Email</TableCell>
                    {selectedIntake && <TableCell>Intake</TableCell>}
                    <TableCell>Documents</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.id}</TableCell>
                        <TableCell>{student.member_no}</TableCell>
                        <TableCell>{student.full_name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        {selectedIntake && <TableCell>{student.intake}</TableCell>}
                        <TableCell>
                          <Chip label={student.documents_count} color="success" />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            sx={{ textTransform: 'none' }}
                            color="primary"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewDocuments(student)}
                            size="small"
                          >
                            View Docs
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={selectedIntake ? 7 : 6} align="center">
                        No rejected documents found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={students.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>

      {/* Student Documents Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Documents for {selectedStudent?.full_name}
            </Typography>
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {documentsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : studentDocuments.length === 0 ? (
            <Typography align="center" py={4}>
              No rejected documents found
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>No.</TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>ISP Email</TableCell>
                    <TableCell>Document Type</TableCell>
                    <TableCell>Rejection Reason</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.sn}</TableCell>
                      <TableCell>{doc.full_name}</TableCell>
                      <TableCell>{doc.kap_email}</TableCell>
                      <TableCell>{doc.doc_type_name}</TableCell>
                      <TableCell>{doc.remarks}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={{ textTransform: 'none' }}
                          color="primary"
                          size="small"
                          onClick={() => handleOpenDocument(doc)}
                        >
                          View Document
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button sx={{ textTransform: 'none' }} onClick={() => setOpenModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Document Viewer Modal */}
      <Dialog
        open={documentViewer.open}
        onClose={() => setDocumentViewer({ ...documentViewer, open: false })}
        fullWidth
        maxWidth="lg"
        fullScreen
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{documentViewer.title}</Typography>
            <IconButton
              onClick={() => setDocumentViewer({ ...documentViewer, open: false })}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent style={{ height: "80vh", padding: 0 }}>
          <iframe
            src={documentViewer.url}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title="Document Viewer"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDocumentViewer({ ...documentViewer, open: false })}
            color="primary"
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </motion.div>
  );
};

export default RejectedDocuments;