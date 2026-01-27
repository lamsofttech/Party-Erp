// src/components/Campaigns/CampaignDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  LinearProgress,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
} from '@mui/material';
import {
  Edit,
  ArrowBack,
  AttachFile,
  TaskAlt,
  People,
  Event as EventIcon,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { mockCampaigns, mockEvents } from '../../data/mockData';
import LoadingSpinner from '../common/LoadingSpinner';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// ---- Local types aligned with mockData shape & fields used on this page ----
type CampaignStatus = 'Active' | 'Planned' | 'Completed' | 'Archived';

interface CampaignLike {
  id: string; // align with mockData (error showed string)
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  description: string;
  leadManager: string;
  budgetSpent: number;
  budgetAllocated: number;
  volunteersCount: number;
}

interface EventLike {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  status: 'Confirmed' | 'Tentative' | 'Cancelled' | string;
  associatedCampaignId?: string;
}

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      const found = (mockCampaigns as unknown as CampaignLike[]).find((c) => c.id === id);
      setCampaign(found ?? null);
      setLoading(false);
    };
    fetchCampaign();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (!campaign) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Campaign not found.</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/party-operations')} sx={{ mt: 2 }}>
          Back to Campaigns
        </Button>
      </Box>
    );
  }

  // Calculate budget utilization (guard against divide-by-zero)
  const budgetUtilization =
    campaign.budgetAllocated > 0
      ? (campaign.budgetSpent / campaign.budgetAllocated) * 100
      : 0;

  // Mock data for budget chart (replace with backend series if available)
  const budgetChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Budget Spent (KES)',
        data: [
          100000,
          250000,
          400000,
          600000,
          850000,
          campaign.budgetSpent * 0.9,
          campaign.budgetSpent,
        ],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Budget Allocated (KES)',
        data: Array(7).fill(campaign.budgetAllocated),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        borderDash: [5, 5],
      },
    ],
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Planned':
        return 'info';
      case 'Completed':
        return 'default';
      case 'Archived':
        return 'warning';
      default:
        return 'primary';
    }
  };

  // Filter events related to this campaign (IDs are strings)
  const relatedEvents = (mockEvents as unknown as EventLike[]).filter(
    (event) => event.associatedCampaignId === campaign.id
  );

  return (
    <Box sx={{ p: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/party-operations')}>
          Back to Campaigns
        </Button>
        <Typography variant="h4" fontWeight="bold">
          {campaign.name}
        </Typography>
        <Button variant="outlined" startIcon={<Edit />}>
          Edit Campaign
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Overview
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {campaign.description}
            </Typography>
            <Box mb={2}>
              <Chip label={campaign.status} color={getStatusColor(campaign.status)} size="medium" />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                From {campaign.startDate} to {campaign.endDate}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Lead Manager:{' '}
              <Typography component="span" fontWeight="medium">
                {campaign.leadManager}
              </Typography>
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Key Metrics
            </Typography>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                Budget Utilization:
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(budgetUtilization, 100)}
                color={budgetUtilization > 90 ? 'error' : budgetUtilization > 70 ? 'warning' : 'primary'}
                sx={{ height: 10, borderRadius: 5, mt: 1 }}
              />
              <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                KES {new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0 }).format(campaign.budgetSpent)} spent of KES{' '}
                {new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0 }).format(campaign.budgetAllocated)} (
                {budgetUtilization.toFixed(1)}%)
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <CardContent>
                    <People fontSize="small" color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      {campaign.volunteersCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Volunteers
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <CardContent>
                    <EventIcon fontSize="small" color="secondary" />
                    <Typography variant="h6" fontWeight="bold">
                      {relatedEvents.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Events
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 4, borderRadius: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          aria-label="campaign details tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Budget Analysis" icon={<AccountBalanceWallet />} iconPosition="start" />
          <Tab label="Associated Events" icon={<EventIcon />} iconPosition="start" />
          <Tab label="Team & Objectives" icon={<People />} iconPosition="start" />
          <Tab label="Documents" icon={<AttachFile />} iconPosition="start" />
          <Tab label="Reports" icon={<TaskAlt />} iconPosition="start" />
        </Tabs>
      </Paper>

      {currentTab === 0 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Budget Analysis
          </Typography>
          <Line
            data={budgetChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' as const },
                title: { display: true, text: 'Campaign Budget Spend Over Time' },
              },
              scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Amount (KES)' } },
                x: { title: { display: true, text: 'Time' } },
              },
            }}
          />
        </Paper>
      )}

      {currentTab === 1 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Associated Events
          </Typography>
          {relatedEvents.length > 0 ? (
            <List>
              {relatedEvents.map((event) => (
                <React.Fragment key={event.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => navigate(`/party-operations/events/${event.id}`)}
                      sx={{ justifyContent: 'space-between', pr: 2 }}
                    >
                      <ListItemText
                        primary={<Typography variant="body1" fontWeight="medium">{event.name}</Typography>}
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {event.date} at {event.time} - {event.location}
                          </Typography>
                        }
                      />
                      <Chip
                        label={event.status}
                        color={event.status === 'Confirmed' ? 'success' : 'info'}
                        size="small"
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No events associated with this campaign yet.
            </Typography>
          )}
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => navigate('/party-operations/events?add=true&campaignId=' + campaign.id)}
          >
            Link New Event
          </Button>
        </Paper>
      )}

      {currentTab === 2 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Team & Objectives
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="medium">
                Team Members:
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="John Doe - Campaign Manager" /></ListItem>
                <ListItem><ListItemText primary="Jane Smith - Field Coordinator" /></ListItem>
                <ListItem><ListItemText primary="Michael Ochieng - Logistics Lead" /></ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="medium">
                Objectives:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="🎯 Register 10,000 new voters" secondary="Current: 8,500 (85%)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📢 Hold 50 successful rallies" secondary="Current: 35 (70%)" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="📈 Increase social media engagement by 20%"
                    secondary="Current: 15% increase"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>
      )}

      {currentTab === 3 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Documents & Collateral
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Here you would see a list of uploaded campaign documents, media assets, etc.
          </Typography>
          <Button variant="outlined" startIcon={<AttachFile />} sx={{ mt: 2 }}>
            Upload Document
          </Button>
        </Paper>
      )}

      {currentTab === 4 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Reports & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This section would display generated reports and provide options for custom analytics on campaign performance.
          </Typography>
          <Button variant="outlined" sx={{ mt: 2 }}>
            Generate Custom Report
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default CampaignDetail;
