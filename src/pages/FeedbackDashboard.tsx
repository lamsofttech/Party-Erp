// src/pages/FeedbackDashboard.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Grid, Button, useTheme, Card, CardContent,
  CircularProgress, Alert, AlertTitle, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Add as AddIcon, ArrowBack as ArrowBackIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import CountUp from 'react-countup';
import { Bar } from "react-chartjs-2";
import "chart.js/auto"; // Essential for Chart.js v3+

// IMPORTANT: Ensure your src/types/feedback.ts defines FeedbackStatus as an enum with string values.
// Example:
// export enum FeedbackStatus {
//   New = "New",
//   Assigned = "Assigned",
//   InProgress = "In Progress",
//   Actioned = "Actioned",
//   Escalated = "Escalated",
//   Closed = "Closed",
//   Rejected = "Rejected",
//   RequiresFollowUp = "Requires Follow-up",
//   Archived = "Archived",
// }

import { FeedbackItem, FeedbackStatus, FeedbackType } from '../types/feedback';

import FeedbackTable from './FeedbackTable';
import FeedbackDetailsModal from './FeedbackDetailsModal';
import FeedbackFormModal from './FeedbackFormModal';

// --- Configuration for your API ---
const API_BASE_URL = 'https://skizagroundsuite.com/API/v1';

const FeedbackDashboard = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State for managing feedback data (now fetched from API)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for summary counts (fetched from API)
  const [summaryCounts, setSummaryCounts] = useState({
    total: 0,
    newToday: 0,
    actioned: 0,
    criticalIssues: 0,
    policySuggestions: 0,
  });

  // State for filter
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | ''>('');

  // Function to fetch data from the API
  const fetchFeedbackData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Build query parameters for the main feedback list
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('status', statusFilter);
      if (typeFilter) queryParams.append('type', typeFilter);

      // Fetch main interactions list
      const feedbackResponse = await fetch(`${API_BASE_URL}/interactions/interactions.php?${queryParams.toString()}`);
      if (!feedbackResponse.ok) {
        throw new Error(`Failed to fetch feedback: ${feedbackResponse.statusText}`);
      }
      const feedbackData = await feedbackResponse.json();

      // Ensure data is in the expected 'interactions' array and map dates
      setFeedback(
        feedbackData.interactions
          ? feedbackData.interactions.map((item: any) => ({
              ...item,
              submissionDate: item.submission_date, // Map from snake_case to camelCase
              lastUpdated: item.last_updated,
              followUpDate: item.follow_up_date,
            }))
          : []
      );

      // Fetch summary analytics
      const summaryResponse = await fetch(`${API_BASE_URL}/analytics/summary.php`);
      if (!summaryResponse.ok) {
        throw new Error(`Failed to fetch summary: ${summaryResponse.statusText}`);
      }
      const summaryData = await summaryResponse.json();
      setSummaryCounts({
        total: summaryData.total || 0,
        newToday: summaryData.newToday || 0,
        actioned: summaryData.actioned || 0,
        criticalIssues: summaryData.criticalIssues || 0,
        policySuggestions: summaryData.policySuggestions || 0,
      });

      // We remove the unused by-status fetch since chart is computed locally from `feedback`.
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  // Initial data fetch on component mount and when filters change
  useEffect(() => {
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  // --- Chart Data ---
  // Use enum members for labels to stay type-safe.
  const STATUS_LABELS: FeedbackStatus[] = [
    FeedbackStatus.New,
    FeedbackStatus.Assigned,
    FeedbackStatus.InProgress,
    FeedbackStatus.Actioned,
    FeedbackStatus.Escalated,
    FeedbackStatus.Closed,
    FeedbackStatus.Rejected,
    FeedbackStatus.RequiresFollowUp,
    FeedbackStatus.Archived,
  ];

  const feedbackStatusCounts = useMemo(() => {
    const counts = feedback.reduce((acc, item) => {
      acc[item.status as FeedbackStatus] = (acc[item.status as FeedbackStatus] || 0) + 1;
      return acc;
    }, {} as Record<FeedbackStatus, number>);

    const data = STATUS_LABELS.map(label => counts[label] || 0);
    return { labels: STATUS_LABELS, data };
  }, [feedback]);

  const chartData = {
    labels: feedbackStatusCounts.labels,
    datasets: [
      {
        label: 'Number of Engagements',
        backgroundColor: [
          '#FFC107', // New
          '#2196F3', // Assigned
          '#FF9800', // In Progress
          '#4CAF50', // Actioned
          '#D32F2F', // Escalated
          '#607D8B', // Closed
          '#F44336', // Rejected
          '#9C27B0', // Requires Follow-up
          '#B0BEC5', // Archived
        ],
        data: feedbackStatusCounts.data,
      },
    ],
  };

  const handleViewDetails = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setIsDetailsModalOpen(true);
  };

  const handleUpdateFeedback = async (updatedItem: FeedbackItem) => {
    try {
      // Convert camelCase keys to snake_case for the PHP backend
      const payload: any = Object.fromEntries(
        Object.entries(updatedItem).map(([key, value]) => [
          key.replace(/([A-Z])/g, '_$1').toLowerCase(),
          value,
        ])
      );

      if (!payload.id) {
        payload.id = updatedItem.id;
      }

      const response = await fetch(`${API_BASE_URL}/interactions/interactions.php?id=${updatedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${YOUR_AUTH_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to update feedback: ${response.statusText}`);
      }
      fetchFeedbackData();
      setSelectedFeedback(null);
      setIsDetailsModalOpen(false);
    } catch (err: any) {
      console.error("Error updating feedback:", err);
      setError(err.message || "Failed to update feedback.");
    }
  };

  const handleAddFeedback = async (
    newItem: Omit<FeedbackItem, 'id' | 'submissionDate' | 'status' | 'lastUpdated'>
  ) => {
    try {
      const payload = Object.fromEntries(
        Object.entries(newItem).map(([key, value]) => [
          key.replace(/([A-Z])/g, '_$1').toLowerCase(),
          value,
        ])
      );

      const response = await fetch(`${API_BASE_URL}/interactions/interactions.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${YOUR_AUTH_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to add feedback: ${response.statusText}`);
      }
      fetchFeedbackData();
      setIsFormModalOpen(false);
    } catch (err: any) {
      console.error("Error adding feedback:", err);
      setError(err.message || "Failed to add new feedback.");
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Political Intelligence...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Alert severity="error">
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          {error} <br />
          Please ensure the backend API is running at `{API_BASE_URL}`.
          <Button onClick={fetchFeedbackData} startIcon={<RefreshIcon />} sx={{ mt: 1 }}>
            Try Again
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: isDark ? '#0c0c0c' : '#f0f2f5' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Constituent Engagement & Intelligence
        </Typography>
        <Box>
          <Button
            component={RouterLink}
            to="/communications"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back to Communications
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsFormModalOpen(true)}
          >
            Log New Interaction
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchFeedbackData}
            sx={{ ml: 2 }}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Total Engagements</Typography>
              <Typography variant="h3" fontWeight={700}><CountUp end={summaryCounts.total} duration={1} /></Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">New Today</Typography>
              <Typography variant="h3" fontWeight={700}><CountUp end={summaryCounts.newToday} duration={1} /></Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Actioned Issues</Typography>
              <Typography variant="h3" fontWeight={700}><CountUp end={summaryCounts.actioned} duration={1} /></Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Critical Issues</Typography>
              <Typography variant="h3" fontWeight={700}><CountUp end={summaryCounts.criticalIssues} duration={1} /></Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Section */}
      <Box mb={4} p={3} borderRadius={2}
        sx={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}
      >
        <Typography variant="h6" fontWeight={600} mb={2}>Filter Intelligence</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="status-filter-label">Engagement Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus)}
                label="Engagement Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value={FeedbackStatus.New}>New</MenuItem>
                <MenuItem value={FeedbackStatus.Assigned}>Assigned</MenuItem>
                <MenuItem value={FeedbackStatus.InProgress}>In Progress</MenuItem>
                <MenuItem value={FeedbackStatus.Actioned}>Actioned</MenuItem>
                <MenuItem value={FeedbackStatus.Escalated}>Escalated</MenuItem>
                <MenuItem value={FeedbackStatus.Closed}>Closed</MenuItem>
                <MenuItem value={FeedbackStatus.Rejected}>Rejected</MenuItem>
                <MenuItem value={FeedbackStatus.RequiresFollowUp}>Requires Follow-up</MenuItem>
                <MenuItem value={FeedbackStatus.Archived}>Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="type-filter-label">Engagement Type</InputLabel>
              <Select
                labelId="type-filter-label"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as FeedbackType)}
                label="Engagement Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="Constituent Grievance">Constituent Grievance</MenuItem>
                <MenuItem value="Policy Suggestion">Policy Suggestion</MenuItem>
                <MenuItem value="Campaign Strategy Idea">Campaign Strategy Idea</MenuItem>
                <MenuItem value="Volunteer Report">Volunteer Report</MenuItem>
                <MenuItem value="Sentiment (Positive)">Sentiment (Positive)</MenuItem>
                <MenuItem value="Sentiment (Negative)">Sentiment (Negative)</MenuItem>
                <MenuItem value="Media Monitoring Alert">Media Monitoring Alert</MenuItem>
                <MenuItem value="Rival Party Activity">Rival Party Activity</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Box>

      {/* Feedback List Table */}
      <Box p={3} borderRadius={2} mb={4}
        sx={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}
      >
        <Typography variant="h6" fontWeight={600} mb={2}>Comprehensive Engagement Log</Typography>
        <FeedbackTable feedback={feedback} onViewDetails={handleViewDetails} />
      </Box>

      {/* Chart Section */}
      <Box mt={4} p={3} borderRadius={2}
        sx={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}
      >
        <Typography fontWeight={600} mb={2}>📊 Engagement Status Distribution</Typography>
        <Box sx={{ height: 300 }}>
          <Bar
            data={chartData}
            options={{
              maintainAspectRatio: false,
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      let label = context.dataset.label || '';
                      if (label) label += ': ';
                      if (context.parsed.y !== null) label += context.parsed.y;
                      return label;
                    },
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: 'Number of Engagements' },
                  ticks: {
                    stepSize: 1,
                    callback: function (value) {
                      if (Number.isInteger(value)) return value as any;
                      return null;
                    },
                  },
                },
                x: {
                  grid: { display: false },
                  title: { display: true, text: 'Engagement Status' },
                },
              },
            }}
          />
        </Box>
      </Box>

      {/* Modals */}
      {selectedFeedback && (
        <FeedbackDetailsModal
          open={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          feedbackItem={selectedFeedback}
          onUpdateFeedback={handleUpdateFeedback}
        />
      )}
      <FeedbackFormModal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleAddFeedback}
      />
    </Box>
  );
};

export default FeedbackDashboard;
