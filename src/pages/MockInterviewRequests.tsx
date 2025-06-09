import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Box,
  Typography,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";

// Declare Calendly globally
declare global {
  interface Window {
    Calendly: {
        initPopupWidget: (options: { url: string }) => void;
    };
  }
}

interface MockInterviewRequest {
  id: string;
  stu_name: string;
  stu_email: string;
  mock_date: string;
  mock_time: string;
  interview_date: string;
  interview_time: string;
  frequency: number | string;
  event: string;
  cancel_url: string;
  sn?: number;
}

interface Category {
  id: string;
  category: string;
}

interface IntervieweeDetails {
  member_no: string;
  fullnames: string;
  prog_email: string;
  school_name: string;
  course: string;
  intake: string;
  visa_attempt: string;
  visa_date: string;
  with_family: string;
  status: number;
}

interface MeetingLog {
  meeting: string;
  time: string;
  date: string;
  advisor: string;
  marks: number;
  remarks: string;
}

const MockInterviewRequests: React.FC = () => {
  const [requests, setRequests] = useState<MockInterviewRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MockInterviewRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openAddCategoryModal, setOpenAddCategoryModal] = useState(false);
  const [openAddQuestionModal, setOpenAddQuestionModal] = useState(false);
  const [openRejectAllModal, setOpenRejectAllModal] = useState(false);
  const [openViewDetailsModal, setOpenViewDetailsModal] = useState(false);
  const [openViewLogsModal, setOpenViewLogsModal] = useState(false);
  const [openRemarkModal, setOpenRemarkModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MockInterviewRequest | null>(null);
  const [intervieweeDetails, setIntervieweeDetails] = useState<IntervieweeDetails | null>(null);
  const [meetingLogs, setMeetingLogs] = useState<MeetingLog[]>([]);
  const [selectedRemark, setSelectedRemark] = useState("");
  const [categoryForm, setCategoryForm] = useState({ family: "", financial: "", attempt: "" });
  const [questionForm, setQuestionForm] = useState({ category: "", question: "" });
  const [rejectAllRemark, setRejectAllRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const API_URL =
    "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/visa/APIs";

  useEffect(() => {
    fetchRequests();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredRequests(
        requests.filter(
          (request) =>
            request.stu_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.stu_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.mock_date.includes(searchQuery) ||
            request.interview_date.includes(searchQuery)
        )
      );
    } else {
      setFilteredRequests(requests);
    }
  }, [searchQuery, requests]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/mock_interview_api.php`);
      if (response.data.success) {
        const requestsWithSn = response.data.requests.map(
          (request: MockInterviewRequest, index: number) => ({
            ...request,
            sn: index + 1,
          })
        );
        setRequests(requestsWithSn);
        setFilteredRequests(requestsWithSn);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error fetching requests",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error connecting to server",
        severity: "error",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/mock_interview_api.php?action=categories`);
      if (response.data.success) {
        setCategories(response.data.categories);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error fetching categories",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error connecting to server",
        severity: "error",
      });
    }
  };

  const fetchIntervieweeDetails = async (email: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/mock_interview_api.php?action=interviewee_details&email=${email}`
      );
      if (response.data.success) {
        setIntervieweeDetails(response.data.details);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error fetching details",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error connecting to server",
        severity: "error",
      });
    }
  };

  const fetchMeetingLogs = async (email: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/mock_interview_api.php?action=meeting_logs&email=${email}`
      );
      if (response.data.success) {
        setMeetingLogs(response.data.logs);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error fetching logs",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error connecting to server",
        severity: "error",
      });
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleAddCategory = async () => {
    if (!categoryForm.family || !categoryForm.financial || !categoryForm.attempt) {
      setSnackbar({
        open: true,
        message: "Please fill all category fields",
        severity: "error",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/mock_interview_api.php`, {
        action: "add_category",
        family: categoryForm.family,
        financial: categoryForm.financial,
        attempt: categoryForm.attempt,
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || "Category added successfully",
          severity: "success",
        });
        setOpenAddCategoryModal(false);
        setCategoryForm({ family: "", financial: "", attempt: "" });
        fetchCategories();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error adding category",
          severity: response.data.message.includes("exists") ? "info" : "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting category",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!questionForm.category || !questionForm.question) {
      setSnackbar({
        open: true,
        message: "Please select a category and enter a question",
        severity: "error",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/mock_interview_api.php`, {
        action: "add_question",
        category: questionForm.category,
        question: questionForm.question,
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "Question added successfully",
          severity: "success",
        });
        setOpenAddQuestionModal(false);
        setQuestionForm({ category: "", question: "" });
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error adding question",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting question",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAllSubmit = async () => {
    if (!selectedRequest || !rejectAllRemark) {
      setSnackbar({
        open: true,
        message: "Please provide a remark",
        severity: "error",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/mock_interview_api.php`, {
        action: "reject_all",
        event: selectedRequest.event,
        remark: rejectAllRemark,
      });
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: "All requests rejected successfully",
          severity: "success",
        });
        setOpenRejectAllModal(false);
        setRejectAllRemark("");
        fetchRequests();
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || "Error rejecting requests",
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error submitting request",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddCategoryModal = () => setOpenAddCategoryModal(true);
  const handleOpenAddQuestionModal = () => setOpenAddQuestionModal(true);
  const handleOpenRejectAllModal = (request: MockInterviewRequest) => {
    setSelectedRequest(request);
    setRejectAllRemark("");
    setOpenRejectAllModal(true);
  };
  const handleOpenViewDetailsModal = async (request: MockInterviewRequest) => {
    setSelectedRequest(request);
    await fetchIntervieweeDetails(request.stu_email);
    setOpenViewDetailsModal(true);
  };
  const handleOpenViewLogsModal = async (request: MockInterviewRequest) => {
    setSelectedRequest(request);
    await fetchMeetingLogs(request.stu_email);
    setOpenViewLogsModal(true);
  };
  const handleOpenRemarkModal = (remark: string) => {
    setSelectedRemark(remark);
    setOpenRemarkModal(true);
  };

  const handleRejectOne = (cancel_url: string) => {
    window.Calendly.initPopupWidget({ url: cancel_url });
  };

  const columns: GridColDef[] = [
    { field: "sn", headerName: "ID", width: 70 },
    { field: "stu_name", headerName: "Student Name", flex: 1 },
    { field: "stu_email", headerName: "Email", flex: 1 },
    { field: "mock_date", headerName: "Meeting Date", flex: 1 },
    { field: "mock_time", headerName: "Meeting Time", flex: 1 },
    { field: "interview_date", headerName: "Interview Date", flex: 1 },
    { field: "interview_time", headerName: "Interview Time", flex: 1 },
    { field: "frequency", headerName: "Frequency", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 3,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <Button
              variant="contained"
              color="success"
              size="small"
              sx={{ textTransform: "none", mr: 1 }}
              onClick={() => handleOpenViewDetailsModal(params.row)}
            >
              View
            </Button>
          </Tooltip>
          <Tooltip title="Reject All">
            <IconButton
              onClick={() => handleOpenRejectAllModal(params.row)}
              disabled={isSubmitting}
            >
              <CancelIcon color="error" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reject One">
            <IconButton
              onClick={() => handleRejectOne(params.row.cancel_url)}
              disabled={isSubmitting}
            >
              <CancelIcon color="error" />
            </IconButton>
          </Tooltip>
          {params.row.frequency !== "First Time" && (
            <Tooltip title="View Logs">
              <Button
                variant="contained"
                color="success"
                size="small"
                sx={{ textTransform: "none", ml: 1 }}
                onClick={() => handleOpenViewLogsModal(params.row)}
              >
                View Logs
              </Button>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const hasAnyCategory = categories.some((cat) => cat.category === "Any, Any, Any");

  return (
    <div className="px-4 mb-8">
      <h1 className="text-3xl font-bold text-gray-800">Mock Interview Requests</h1>
      <Box display="flex" justifyContent="flex-end" gap={1} mb={2}>
        <Button
          variant="contained"
          color="info"
          size="small"
          onClick={handleOpenAddCategoryModal}
        >
          Add Category
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleOpenAddQuestionModal}
        >
          Add Questions
        </Button>
      </Box>
      <TextField
        label="Search..."
        variant="outlined"
        fullWidth
        value={searchQuery}
        onChange={handleSearch}
        sx={{ mb: 2 }}
      />
      <div style={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={filteredRequests}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[5, 10, 25]}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
        />
      </div>

      {/* Add Category Modal */}
      <Dialog open={openAddCategoryModal} onClose={() => setOpenAddCategoryModal(false)}>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Do you plan to travel with your family?</InputLabel>
              <Select
                value={categoryForm.family}
                onChange={(e) => setCategoryForm({ ...categoryForm, family: e.target.value })}
              >
                {hasAnyCategory && <MenuItem value="0">Any</MenuItem>}
                <MenuItem value="1">Yes</MenuItem>
                <MenuItem value="2">No</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Proof of finances</InputLabel>
              <Select
                value={categoryForm.financial}
                onChange={(e) => setCategoryForm({ ...categoryForm, financial: e.target.value })}
              >
                {hasAnyCategory && <MenuItem value="0">Any</MenuItem>}
                <MenuItem value="1">Bank</MenuItem>
                <MenuItem value="2">Loan</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Select Attempt</InputLabel>
              <Select
                value={categoryForm.attempt}
                onChange={(e) => setCategoryForm({ ...categoryForm, attempt: e.target.value })}
              >
                {hasAnyCategory && <MenuItem value="0">Any</MenuItem>}
                <MenuItem value="1">First Time</MenuItem>
                <MenuItem value="2">Subsequent</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddCategoryModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAddCategory}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Question Modal */}
      <Dialog open={openAddQuestionModal} onClose={() => setOpenAddQuestionModal(false)}>
        <DialogTitle>Add Question</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Category</InputLabel>
              <Select
                value={questionForm.category}
                onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value })}
              >
                <MenuItem value="">Select</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Question"
              variant="outlined"
              fullWidth
              multiline
              rows={4}
              value={questionForm.question}
              onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddQuestionModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAddQuestion}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject All Modal */}
      <Dialog open={openRejectAllModal} onClose={() => setOpenRejectAllModal(false)}>
        <DialogTitle>Cancel the Whole Slot</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel all requests for {selectedRequest?.stu_name}?
          </Typography>
          <TextField
            label="Remark"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={rejectAllRemark}
            onChange={(e) => setRejectAllRemark(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectAllModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectAllSubmit}
            variant="contained"
            color="error"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Cancelling..." : "Cancel Slot"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Modal */}
      <Dialog
        open={openViewDetailsModal}
        onClose={() => setOpenViewDetailsModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {intervieweeDetails && intervieweeDetails.status > 4
            ? "Mock Details"
            : "Mock Interviewee Details"}
        </DialogTitle>
        <DialogContent>
          {intervieweeDetails && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Student Details
                </Typography>
                <Typography>Member No: {intervieweeDetails.member_no}</Typography>
                <Typography>Full Name: {intervieweeDetails.fullnames}</Typography>
                <Typography>KAP Email: {intervieweeDetails.prog_email}</Typography>
                <Typography>School: {intervieweeDetails.school_name}</Typography>
                <Typography>Program: {intervieweeDetails.course}</Typography>
              </Box>
              {intervieweeDetails.status <= 4 && (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Visa Details
                  </Typography>
                  <Typography>Intake: {intervieweeDetails.intake}</Typography>
                  <Typography>Visa Attempt: {intervieweeDetails.visa_attempt}</Typography>
                  <Typography>Visa Date: {intervieweeDetails.visa_date}</Typography>
                  <Typography>
                    Travelling with Family: {intervieweeDetails.with_family}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {intervieweeDetails && intervieweeDetails.status <= 4 && (
            <Button
              variant="contained"
              color="success"
              onClick={() =>
                window.open(
                  `/interview_room?id=${selectedRequest?.id}&email=${selectedRequest?.stu_email}`,
                  "_blank"
                )
              }
            >
              Interview Room
            </Button>
          )}
          <Button onClick={() => setOpenViewDetailsModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* View Logs Modal */}
      <Dialog
        open={openViewLogsModal}
        onClose={() => setOpenViewLogsModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Meeting Logs for {selectedRequest?.stu_email}</DialogTitle>
        <DialogContent>
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>Meeting</th>
                <th>Time</th>
                <th>Date</th>
                <th>Advisor</th>
                <th>Total Marks</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {meetingLogs.map((log, index) => (
                <tr key={index}>
                  <td>{log.meeting}</td>
                  <td>{log.time}</td>
                  <td>{log.date}</td>
                  <td>{log.advisor}</td>
                  <td>{log.marks}</td>
                  <td>
                    {log.remarks.split(" ").length > 1 ? (
                      <>
                        {log.remarks.split(" ").slice(0, 3).join(" ")}...
                        <Button
                          variant="text"
                          color="primary"
                          onClick={() => handleOpenRemarkModal(log.remarks)}
                        >
                          Read more
                        </Button>
                      </>
                    ) : (
                      log.remarks
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewLogsModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Remark Modal */}
      <Dialog open={openRemarkModal} onClose={() => setOpenRemarkModal(false)}>
        <DialogTitle>More Remarks</DialogTitle>
        <DialogContent>
          <Typography>Remarks: {selectedRemark}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemarkModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default MockInterviewRequests;