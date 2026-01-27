import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, Container, useTheme } from '@mui/material';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, ResponsiveContainer } from 'recharts';

const lightColors = ['#006400', '#FFA500', '#FF4C4C', '#3B82F6', '#6366F1', '#EC4899', '#22C55E'];
const darkColors = ['#4ade80', '#facc15', '#fb7185', '#60a5fa', '#a78bfa', '#f472b6', '#34d399'];

const API_BASE = 'https://skizagroundsuite.com/API/nomenees';

const endpoints = {
  counts: `${API_BASE}/top-positions.php`,
  gender: `${API_BASE}/by-gender.php`,
  age: `${API_BASE}/by-age.php`,
  ward: `${API_BASE}/by-ward.php`,
  trend: `${API_BASE}/monthly-trend.php`,
  recent: `${API_BASE}/recent-activity.php`,
  rejection: `${API_BASE}/rejections-reasons.php`
};

const cardHoverStyle = {
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
  }
};

const NominationAnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const colors = theme.palette.mode === 'dark' ? darkColors : lightColors;

  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<any[]>([]);
  const [wardData, setWardData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countsRes, genderRes, ageRes, wardRes, trendRes, recentRes, rejectionRes] = await Promise.all([
          axios.get(endpoints.counts),
          axios.get(endpoints.gender),
          axios.get(endpoints.age),
          axios.get(endpoints.ward),
          axios.get(endpoints.trend),
          axios.get(endpoints.recent),
          axios.get(endpoints.rejection)
        ]);

        setCounts(countsRes.data);
        setGenderData(genderRes.data);
        setAgeData([
          { group: '18-25', value: ageRes.data.age_18_25 },
          { group: '26-35', value: ageRes.data.age_26_35 },
          { group: '36-45', value: ageRes.data.age_36_45 },
          { group: '46+', value: ageRes.data.age_46_plus },
        ]);
        setWardData(wardRes.data);
        setTrendData(trendRes.data);
        setRecentActivity(recentRes.data);
        setRejectionReasons(rejectionRes.data);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" fontWeight="bold" gutterBottom textAlign="center">
        🌟 Nominees Analytics Dashboard 🌟
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {counts && Object.entries(counts).map(([key, value], index) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Paper
              elevation={4}
              sx={{
                p: 3,
                textAlign: 'center',
                background: colors[index % colors.length],
                color: theme.palette.getContrastText(colors[index % colors.length]),
                borderRadius: '20px',
                ...cardHoverStyle
              }}
            >
              <Typography variant="h6">{key.toUpperCase()}</Typography>
              <Typography variant="h3" fontWeight="bold">{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: '20px', ...cardHoverStyle }}>
            <Typography variant="h6" gutterBottom>Gender Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={genderData} dataKey="count" nameKey="gender" outerRadius={100} label>
                  {genderData.map((_, index) => (
                    <Cell key={`gender-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: '20px', ...cardHoverStyle }}>
            <Typography variant="h6" gutterBottom>Age Bracket Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageData}>
                <XAxis dataKey="group" />
                <YAxis allowDecimals={false} />
                <Bar dataKey="value" fill={colors[1]} />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 3, my: 4, borderRadius: '20px', ...cardHoverStyle }}>
        <Typography variant="h6" gutterBottom>Nominees by Ward</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={wardData}>
            <XAxis dataKey="ward" />
            <YAxis allowDecimals={false} />
            <Bar dataKey="count" fill={colors[2]} />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, my: 4, borderRadius: '20px', ...cardHoverStyle }}>
        <Typography variant="h6" gutterBottom>Monthly Growth Trend</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Line type="monotone" dataKey="count" stroke={colors[3]} strokeWidth={3} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, my: 4, borderRadius: '20px', ...cardHoverStyle }}>
        <Typography variant="h6" gutterBottom>Rejection Reasons Breakdown</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={rejectionReasons} dataKey="count" nameKey="rejection_reason" outerRadius={100} label>
              {rejectionReasons.map((_, index) => (
                <Cell key={`reject-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, my: 4, borderRadius: '20px', ...cardHoverStyle }}>
        <Typography variant="h6" gutterBottom>Recent Nominee Activities</Typography>
        {recentActivity.map((item, idx) => (
          <Box key={idx} sx={{
            mb: 1,
            p: 2,
            background: theme.palette.mode === 'dark' ? '#1e293b' : '#f1f5f9',
            borderRadius: '12px',
            ...cardHoverStyle
          }}>
            <Typography variant="body1"><strong>{item.full_name}</strong> — {item.status}</Typography>
            <Typography variant="caption">Updated At: {item.updated_at}</Typography>
          </Box>
        ))}
      </Paper>
    </Container>
  );
};

export default NominationAnalyticsDashboard;
