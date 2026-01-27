// src/pages/MediaMonitoringPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, TextField, MenuItem,
  CircularProgress, Alert, Snackbar, Card, CardContent, Chip,
  IconButton, Tooltip, Pagination
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  SentimentVerySatisfied as SentimentPositiveIcon,
  SentimentDissatisfied as SentimentNegativeIcon,
  SentimentNeutral as SentimentNeutralIcon,
  Public as PublicIcon,
  Newspaper as NewspaperIcon,
  Twitter as TwitterIcon,
  RssFeed as RssFeedIcon,
  Facebook as FacebookIcon,
  Visibility as VisibilityIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import { Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

interface MediaMention {
  id: string;
  source: string;
  platform: 'news' | 'twitter' | 'facebook' | 'blog' | 'other';
  sentiment: 'positive' | 'negative' | 'neutral';
  content: string;
  url: string;
  publishedAt: string;
  keywords: string[];
}

const API_BASE_URL = 'https://skizagroundsuite.com/API/v1/media-monitoring';

const fetchMentions = async (
  page: number,
  limit: number,
  filters: { query: string; platform: string; sentiment: string; startDate: string; endDate: string }
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    query: filters.query,
    platform: filters.platform,
    sentiment: filters.sentiment,
    startDate: filters.startDate,
    endDate: filters.endDate
  });
  const response = await fetch(`${API_BASE_URL}/mentions.php?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch media mentions');
  const json = await response.json();
  if (json.status !== 'success') throw new Error(json.message || 'API error');
  return json;
};

const MediaMonitoringPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  const [mentions, setMentions] = useState<MediaMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [sentimentChartData, setSentimentChartData] = useState<any>(null);
  const [platformChartData, setPlatformChartData] = useState<any>(null);
  const [trendChartData, setTrendChartData] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const mentionsPerPage = 8;

  useEffect(() => {
    loadMentions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, filterPlatform, filterSentiment, startDate, endDate]);

  const loadMentions = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { query: searchQuery, platform: filterPlatform, sentiment: filterSentiment, startDate, endDate };
      const resp = await fetchMentions(currentPage, mentionsPerPage, filters);
      setMentions(resp.data);
      setTotalPages(Math.ceil(resp.total / mentionsPerPage));

      setSentimentChartData({
        labels: ['Positive', 'Negative', 'Neutral'],
        datasets: [{
          data: [resp.sentimentSummary.positive, resp.sentimentSummary.negative, resp.sentimentSummary.neutral],
          backgroundColor: [theme.palette.success.main, theme.palette.error.main, theme.palette.warning.main],
          hoverOffset: 4
        }]
      });

      const labels = Object.keys(resp.platformSummary).filter(k => resp.platformSummary[k] > 0);
      setPlatformChartData({
        labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
        datasets: [{
          data: labels.map(l => resp.platformSummary[l]),
          backgroundColor: labels.map(l =>
            l === 'news' ? theme.palette.info.main :
            l === 'twitter' ? '#1DA1F2' :
            l === 'facebook' ? '#4267B2' :
            l === 'blog' ? theme.palette.secondary.main :
            theme.palette.grey[500]
          ),
          hoverOffset: 4
        }]
      });

      setTrendChartData({
        labels: resp.trends.map((t: any) => new Date(t.date).toLocaleDateString()),
        datasets: [{
          label: 'Mentions',
          data: resp.trends.map((t: any) => t.count),
          borderColor: primaryMain,
          backgroundColor: primaryMain + '33',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: primaryMain
        }]
      });
    } catch (e: any) {
      setError(e.message);
      setSnackbarMessage(e.message);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_: any, value: number) => setCurrentPage(value);

  const getSentimentIcon = (s: string) =>
    s === 'positive' ? <SentimentPositiveIcon color="success" /> :
    s === 'negative' ? <SentimentNegativeIcon color="error" /> :
    <SentimentNeutralIcon color="warning" />;

  const getSentimentColor = (s: string) =>
    s === 'positive' ? 'success' :
    s === 'negative' ? 'error' : 'warning';

  const getPlatformIcon = (p: string) =>
    p === 'news' ? <NewspaperIcon sx={{ color: theme.palette.info.main }} /> :
    p === 'twitter' ? <TwitterIcon sx={{ color: '#1DA1F2' }} /> :
    p === 'facebook' ? <FacebookIcon sx={{ color: '#4267B2' }} /> :
    p === 'blog' ? <RssFeedIcon sx={{ color: theme.palette.secondary.main }} /> :
    <PublicIcon sx={{ color: theme.palette.grey[500] }} />;

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: isDark ? '#121212' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Media Monitoring <InsightsIcon sx={{ verticalAlign: 'middle', ml: 1, color: primaryMain }} />
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 360, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" mb={2}>Sentiment Breakdown</Typography>
            {sentimentChartData ? <Box sx={{ height: 250 }}><Doughnut data={sentimentChartData} options={{ maintainAspectRatio: false }} /></Box> : <CircularProgress />}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 360, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="h6" mb={2}>Mentions by Platform</Typography>
            {platformChartData ? <Box sx={{ height: 250 }}><Doughnut data={platformChartData} options={{ maintainAspectRatio: false }} /></Box> : <CircularProgress />}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>Mentions Trend</Typography>
            {trendChartData ? <Box sx={{ height: 300 }}><Line data={trendChartData} options={{ maintainAspectRatio: false }} /></Box> : <CircularProgress />}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField label="Search" size="small" fullWidth value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select label="Platform" size="small" fullWidth value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              {['all', 'news', 'twitter', 'facebook', 'blog', 'other'].map(p => <MenuItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select label="Sentiment" size="small" fullWidth value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)}>
              {['all', 'positive', 'negative', 'neutral'].map(s => <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="Start Date" type="date" size="small" fullWidth value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="End Date" type="date" size="small" fullWidth value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={loadMentions} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Apply Filters'}
          </Button>
        </Box>
      </Paper>

      {loading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> :
        error ? <Alert severity="error">{error}</Alert> :
          mentions.length === 0 ? <Alert severity="info">No mentions found</Alert> :
            <Grid container spacing={3}>
              {mentions.map(m => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={m.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip label={m.sentiment} color={getSentimentColor(m.sentiment)} icon={getSentimentIcon(m.sentiment)} />
                        {getPlatformIcon(m.platform)}
                      </Box>
                      <Typography variant="subtitle2" mb={1}>{m.source}</Typography>
                      <Typography variant="body2" sx={{ mb: 1, minHeight: 70, overflow: 'hidden' }}>{m.content}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {m.keywords.map((k, idx) => <Chip key={idx} label={k} size="small" variant="outlined" />)}
                      </Box>
                    </CardContent>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="View Original"><IconButton size="small" href={m.url} target="_blank"><VisibilityIcon /></IconButton></Tooltip>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
      }

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />
      </Box>

      <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="error">{snackbarMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MediaMonitoringPage;
