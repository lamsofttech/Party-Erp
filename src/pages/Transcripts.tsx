import { SetStateAction, useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import {
  Box, Typography, TextField, Button, Tabs, Tab, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Snackbar, Alert, CircularProgress
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { styled } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import VerifiedIcon from "@mui/icons-material/Verified";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

interface Student {
  id: string;
  fullnames: string;
  email: string;
  num_requests?: number;
  total_requests?: number;
}

interface RequestDetail {
  id?: string;
  school_name: string;
  request_id: number;
  status: number;
  requested_at: string;
  verified_at?: string;
}

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/transcript_verification.php";

// Custom theme colors (unchanged)
const colors = {
  primary: "#1a9970",
  secondary: "#2164a6",
  lightPrimary: "#e6f5f0",
  lightSecondary: "#e6f0f7",
  gradient: "linear-gradient(135deg, #1a9970 0%, #2164a6 100%)",
  gradientHover: "linear-gradient(135deg, #158063 0%, #185289 100%)",
  pending: "#f59e0b",
  verified: "#10b981",
  text: "#1e293b",
  lightText: "#64748b",
  border: "#e2e8f0",
  background: "#f8fafc"
};

// // Styled components (unchanged)
// const PageContainer = styled(Box)(({ theme }) => ({
//   background: colors.background,
//   minHeight: "100vh",
//   padding: theme.spacing(4),
//   borderRadius: theme.spacing(1),
// }));

const StyledTab = styled(Tab)(({ }) => ({
  color: colors.lightText,
  '&.Mui-selected': {
    color: colors.secondary,
    fontWeight: 600,
  },
}));

const StyledTabs = styled(Tabs)(({ }) => ({
  '& .MuiTabs-indicator': {
    backgroundColor: colors.secondary,
  },
}));

const SearchBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(0.5, 2),
  marginBottom: theme.spacing(3),
}));

const GradientButton = styled(Button)(({ }) => ({
  background: colors.gradient,
  color: "#fff",
  '&:hover': {
    background: colors.gradientHover,
  },
}));

const PrimaryButton = styled(Button)(({ }) => ({
  backgroundColor: colors.primary,
  color: "#fff",
  '&:hover': {
    backgroundColor: "#158063",
  },
}));

const SecondaryButton = styled(Button)(({ }) => ({
  backgroundColor: colors.secondary,
  color: "#fff",
  '&:hover': {
    backgroundColor: "#185289",
  },
}));

const OutlinedButton = styled(Button)(({ }) => ({
  border: `1px solid ${colors.secondary}`,
  color: colors.secondary,
  '&:hover': {
    backgroundColor: colors.lightSecondary,
  },
}));

const StatusChip = styled(Chip)(({ status }: { status: string }) => ({
  backgroundColor: status === 'Pending' ? `${colors.pending}20` : `${colors.verified}20`,
  color: status === 'Pending' ? colors.pending : colors.verified,
  fontWeight: 500,
}));

// Component
const Transcripts = () => {
  const [tabValue, setTabValue] = useState(0);
  const [requests, setRequests] = useState([]);
  const [initialRequests, setInitialRequests] = useState([]);
  const [subsequentRequests, setSubsequentRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    email: "",
    requests: [],
    type: "all"
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning"
  }>({
    open: false,
    message: "",
    severity: "success"
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [initialRes, subsequentRes, allRes] = await Promise.all([
        axios.get(`${API_URL}?action=fetch_initial_requests`),
        axios.get(`${API_URL}?action=fetch_subsequent_requests`),
        axios.get(`${API_URL}?action=fetch_all_requests`)
      ]);

      setInitialRequests(initialRes.data.data.map((r: any, i: { toString: () => any; }) => ({ ...r, id: i.toString() })));
      setSubsequentRequests(subsequentRes.data.data.map((r: any, i: { toString: () => any; }) => ({ ...r, id: i.toString() })));
      setRequests(allRes.data.data.map((r: any, i: { toString: () => any; }) => ({ ...r, id: i.toString() })));
    } catch (error) {
      setSnackbar({ open: true, message: "Error fetching data", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (email: string, type: string) => {
    try {
      const response = await axios.get(`${API_URL}?action=fetch_request_details&student_email=${email}`);
      setDetailsModal({ open: true, email, requests: response.data.data.requests, type });
    } catch (error) {
      setSnackbar({ open: true, message: "Error fetching request details", severity: "error" });
    }
  };

  const handleUploadTranscript = async (email: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("transcript", file);
      formData.append("student_email", email);
      setIsUploading(true);
      try {
        await axios.post(`${API_URL}?action=upload_transcript`, formData);
        setSnackbar({ open: true, message: "Transcript uploaded successfully", severity: "success" });
        fetchAllData();
      } catch (error) {
        setSnackbar({ open: true, message: "Error uploading transcript", severity: "error" });
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleVerifyRequests = async (email: string, closeModal = false) => {
    const details = await axios.get(`${API_URL}?action=fetch_request_details&student_email=${email}`);
    const pendingIds = details.data.data.requests
      .filter((r: { status: number; }) => r.status === 1)
      .map((r: { request_id: any; }) => r.request_id);

    if (pendingIds.length === 0) {
      setSnackbar({ open: true, message: "No pending requests to verify", severity: "error" });
      return;
    }

    try {
      await axios.post(`${API_URL}?action=verify_requests`, { student_email: email, request_ids: pendingIds });
      setSnackbar({ open: true, message: "Requests verified successfully", severity: "success" });
      fetchAllData();
      if (closeModal) {
        setDetailsModal({ open: false, email: "", requests: [], type: "all" });
      } else if (detailsModal.open && detailsModal.email === email) {
        fetchRequestDetails(email, detailsModal.type);
        fetchAllData();
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>; // Type assertion
      const errorMessage = axiosError.response?.data?.message || "Error verifying request";
      console.error("Verification error:", axiosError.response?.data || axiosError.message);
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const handleVerifySingleRequest = async (email: string, request_id: number) => {
    try {
      await axios.post(`${API_URL}?action=verify_requests`, { student_email: email, request_ids: [request_id] });
      setSnackbar({ open: true, message: "Request verified successfully", severity: "success" });
      fetchAllData(); // Refresh main list
      fetchRequestDetails(email, detailsModal.type);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>; // Type assertion
      const errorMessage = axiosError.response?.data?.message || "Error verifying request";
      console.error("Verification error:", axiosError.response?.data || axiosError.message);
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const handleExport = (data: any[], filename: string) => {
    const exportData = data.map(d => ({
      "Full Name": d.fullnames,
      "Email": d.email,
      "Requests": d.num_requests || d.total_requests
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const filterData = (data: any[]) => {
    if (!search) return data;
    return data.filter(d =>
      d.fullnames?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase())
    );
  };

  const getDataForCurrentTab = () => {
    switch (tabValue) {
      case 0: return filterData(requests);
      case 1: return filterData(initialRequests);
      case 2: return filterData(subsequentRequests);
      default: return [];
    }
  };

  const handleTabChange = (_event: any, newValue: SetStateAction<number>) => {
    setTabValue(newValue);
    setSearch("");
  };

  const columns: GridColDef<Student>[] = [
    {
      field: "fullnames",
      headerName: "Full Name",
      flex: 1,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 500, color: colors.text, paddingTop: "8%" }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "email",
      headerName: "Email",
      flex: 2,
      renderCell: (params) => (
        <Typography sx={{ color: colors.lightText, paddingTop: "3.5%" }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: tabValue === 0 ? "total_requests" : "num_requests",
      headerName: tabValue === 0 ? "Total Requests" : "Pending Requests",
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={params.value || 0}
          size="small"
          sx={{
            bgcolor: colors.lightSecondary,
            color: colors.secondary,
            fontWeight: 600
          }}
        />
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 2,
      renderCell: (params: { row: { email: string; }; }) => {
        if (tabValue === 1) {
          return (
            <Box>
              {/* <PrimaryButton 
                variant="contained" 
                size="small"
                startIcon={<FileUploadIcon />}
                onClick={() => handleUploadTranscript(params.row.email)}
              >
                Upload
              </PrimaryButton>
              <SecondaryButton 
                variant="contained" 
                size="small"
                startIcon={<VerifiedIcon />}
                onClick={() => handleVerifyRequests(params.row.email)}
              >
                Verify
              </SecondaryButton> */}
              <OutlinedButton
                variant="outlined"
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() => fetchRequestDetails(params.row.email, "initial")}
                sx={{ textTransform: 'none' }}
              >
                View Details
              </OutlinedButton>
            </Box>
          );
        } else if (tabValue === 2) {
          return (
            <Box>
              {/* <SecondaryButton 
                variant="contained" 
                size="small"
                startIcon={<VerifiedIcon />}
                onClick={() => handleVerifyRequests(params.row.email)}
                sx={{ textTransform: 'none' }}
              >
                Verify Requests
              </SecondaryButton> */}
              <OutlinedButton
                variant="outlined"
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() => fetchRequestDetails(params.row.email, "subsequent")}
                sx={{ textTransform: 'none' }}
              >
                View Details
              </OutlinedButton>
            </Box>
          );
        } else {
          return (
            <OutlinedButton
              variant="outlined"
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={() => fetchRequestDetails(params.row.email, "all")}
              sx={{ textTransform: 'none' }}
            >
              View Details
            </OutlinedButton>
          );
        }
      },
    },
  ];

  const detailColumns: GridColDef<RequestDetail>[] = [
    {
      field: "school_name",
      headerName: "School",
      flex: 2,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 500, color: colors.text, paddingTop: "5%" }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <StatusChip
          status={params.value === 1 ? 'Pending' : 'Received'}
          label={params.value === 1 ? 'Pending' : 'Received'}
          icon={params.value === 1 ? undefined : <VerifiedIcon fontSize="small" />}
        />
      )
    },
    {
      field: "requested_at",
      headerName: "Requested",
      flex: 1.5,
      renderCell: (params) => (
        <Typography sx={{ color: colors.lightText, fontSize: '0.9rem', paddingTop: "8%" }}>
          {new Date(params.value).toLocaleString()}
        </Typography>
      )
    },
    {
      field: "verified_at",
      headerName: "Received",
      flex: 1.5,
      renderCell: (params) => (
        params.value ? (
          <Typography sx={{ color: colors.lightText, fontSize: '0.9rem', paddingTop: "8%" }}>
            {new Date(params.value).toLocaleString()}
          </Typography>
        ) : (
          <Typography sx={{ color: colors.lightText, fontStyle: 'italic', fontSize: '0.9rem' }}>
            Not verified
          </Typography>
        )
      )
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => {
        if (params.row.status === 1) {
          return (
            <SecondaryButton
              sx={{ textTransform: "none" }}
              variant="contained"
              size="small"
              startIcon={<VerifiedIcon />}
              onClick={() => handleVerifySingleRequest(detailsModal.email, params.row.request_id)}
            >
              Verify
            </SecondaryButton>
          );
        }
        return null;
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6 bg-gray-50 dark:bg-gray-700 min-h-screen mb-6 rounded-md"
    >
      {/* <PageContainer> */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: colors.text,
                backgroundImage: colors.gradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              Transcript Requests
            </Typography>
            <Typography sx={{ color: colors.lightText }}>
              Manage and process student transcript requests
            </Typography>
          </Box>
          <GradientButton
            sx={{ textTransform: 'none' }}
            startIcon={<DownloadIcon />}
            onClick={() => handleExport(getDataForCurrentTab(), `transcript_requests_${tabValue}`)}
          >
            Export to Excel
          </GradientButton>
        </Box>

        <Box sx={{ mb: 4 }}>
          <StyledTabs value={tabValue} onChange={handleTabChange}>
            <StyledTab label="All Requests" />
            <StyledTab label="Initial Requests" />
            <StyledTab label="Transcript Uploaded" />
          </StyledTabs>
        </Box>

        <SearchBox>
          <SearchIcon sx={{ color: colors.lightText, mr: 1 }} />
          <TextField
            placeholder="Search by name or email..."
            variant="standard"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ disableUnderline: true }}
          />
        </SearchBox>

        <Box sx={{
          bgcolor: '#fff',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
              <CircularProgress sx={{ color: colors.primary }} />
            </Box>
          ) : (
            <DataGrid
              rows={getDataForCurrentTab()}
              columns={columns}
              autoHeight
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: colors.lightPrimary,
                  color: colors.text,
                  fontWeight: 600,
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${colors.border}`,
                  alignItems: "center",
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: colors.background,
                },
              }}
            />
          )}
        </Box>
      {/* </PageContainer> */}

      {/* Details Modal */}
      <Dialog
        open={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, email: "", requests: [], type: "all" })}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2,
            paddingX: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}`, py: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: colors.text }}>
                {detailsModal.type === "subsequent" ? "Unverified Requests Details" : "Requests Details"}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.lightText }}>
                {detailsModal.email}
              </Typography>
            </Box>
            <IconButton onClick={() => setDetailsModal({ open: false, email: "", requests: [], type: "all" })}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <DataGrid
            rows={
              detailsModal.type === "subsequent"
                ? detailsModal.requests
                  .filter((r: RequestDetail) => r.status === 1)
                  .map((r: RequestDetail, i) => ({ ...r, id: i.toString() }))
                : detailsModal.requests.map((r: RequestDetail, i) => ({ ...r, id: i.toString() }))
            }
            columns={detailColumns}
            autoHeight
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 5 } },
            }}
            pageSizeOptions={[5, 10]}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: colors.lightSecondary,
                color: colors.text,
                fontWeight: 600,
              },
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${colors.border}`,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.border}` }}>
          {detailsModal.type === "initial" && (
            <PrimaryButton
              startIcon={<FileUploadIcon />}
              onClick={() => handleUploadTranscript(detailsModal.email)}
              sx={{ textTransform: 'none' }}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Transcript"}
            </PrimaryButton>
          )}
          {detailsModal.requests.some((r: RequestDetail) => r.status === 1) && (
            <GradientButton
              startIcon={<VerifiedIcon />}
              sx={{ textTransform: 'none' }}
              onClick={() => handleVerifyRequests(detailsModal.email, true)}
            >
              Verify All Pending Requests
            </GradientButton>
          )}
          <Button
            onClick={() => setDetailsModal({ open: false, email: "", requests: [], type: "all" })}
            sx={{ color: colors.lightText, textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{
            width: "100%",
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: 2,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </motion.div>
  );
};

export default Transcripts;