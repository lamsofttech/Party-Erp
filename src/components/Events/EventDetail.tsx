import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Link,
  type ChipProps,
} from '@mui/material';
import {
  Edit,
  ArrowBack,
  LocationOn,
  CalendarMonth,
  AccessTime,
  People,
  AttachFile,
  NotificationsActive,
  TrendingUp,
} from '@mui/icons-material';

import { mockEvents, mockCampaigns } from '../../data/mockData';
// ✅ Alias your app Event to avoid DOM Event clash; DO NOT import EventStatus (it doesn't exist in your file)
import type { Event as CampaignEvent, Campaign } from '../../types/campaign';

import LoadingSpinner from '../common/LoadingSpinner';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<CampaignEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchEvent = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 300));

     const events = (mockEvents as any[]).map(e => ({ ...e, eventId: Number((e as any).eventId ?? (e as any).id ?? 0) })) as CampaignEvent[];


      // URL param is string; your event key is number
      const numericId = id ? Number(id) : NaN;
      const foundEvent: CampaignEvent | null =
        Number.isFinite(numericId)
          ? events.find((e) => e.eventId === numericId) ?? null
          : null;

      if (!cancelled) {
        setEvent(foundEvent);
        setLoading(false);
      }
    };

    fetchEvent();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (!event) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Event not found.</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/party-operations/events')} sx={{ mt: 2 }}>
          Back to Events
        </Button>
      </Box>
    );
  }

  // Your status is a free-form string (e.g., "0", "scheduled", "completed").
  // Map it to a Chip color safely.
  const getStatusColor = (status: string): ChipProps['color'] => {
    const s = status.toLowerCase();
    if (s === 'scheduled' || s === 'active' || s === 'ongoing') return 'info';
    if (s === 'completed' || s === 'done') return 'success';
    if (s === 'cancelled' || s === 'canceled') return 'error';
    if (s === 'archived') return 'default';
    // Your DB sample uses "0"—treat unknown codes as 'primary'
    return 'primary';
    // You can add more mappings (e.g., "postponed" → 'warning') if you enable MUI v6 color tokens
  };

  const associatedCampaign: Campaign | null =
  event.associatedCampaignId == null
    ? null
    : ((mockCampaigns as any[]).find(
        c => Number((c as any).id) === Number(event.associatedCampaignId)
      ) as Campaign | undefined) ?? null;


  // If you want to display date/time nicely, you can keep the raw strings (DB format)
  const startDateLabel = event.startTime; // "YYYY-MM-DD HH:MM:SS"
  const endDateLabel = event.endTime ?? null;

  return (
    <Box sx={{ p: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/party-operations/events')}>
          Back to Events
        </Button>
        <Typography variant="h4" fontWeight="bold">
          {event.name}
        </Typography>
        <Button variant="outlined" startIcon={<Edit />}>
          Edit Event
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" color="text.secondary" gutterBottom>Event Details</Typography>

            {event.description && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {event.description}
              </Typography>
            )}

            <Box mb={2} display="flex" alignItems="center" gap={1}>
              <CalendarMonth color="action" />
              <Typography variant="body2">{startDateLabel}</Typography>
              {endDateLabel && (
                <>
                  <AccessTime color="action" sx={{ ml: 2 }} />
                  <Typography variant="body2">{endDateLabel}</Typography>
                </>
              )}
            </Box>

            {event.location && (
              <Box mb={2} display="flex" alignItems="center" gap={1}>
                <LocationOn color="action" />
                <Typography variant="body2">{event.location}</Typography>
              </Box>
            )}

            <Chip label={event.status ?? 'Unknown'} color={getStatusColor(event.status ?? '')} size="medium" />

            {event.organizer && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Organizer:{' '}
                <Typography component="span" fontWeight="medium">
                  {event.organizer}
                </Typography>
              </Typography>
            )}

            {associatedCampaign && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Associated Campaign:{' '}
                <Link component={RouterLink} to={`/party-operations/${associatedCampaign.id}`} fontWeight="medium">
                  {associatedCampaign.name}
                </Link>
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="text.secondary" gutterBottom>Key Metrics</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <CardContent>
                    <People fontSize="small" color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      {event.attendeeCount ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Attendees</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {typeof event.latitude === 'number' && typeof event.longitude === 'number' && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                    <CardContent>
                      <LocationOn fontSize="small" color="secondary" />
                      <Typography variant="body2">
                        Lat: {event.latitude}, Lng: {event.longitude}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Geolocation</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, mb: 4, borderRadius: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_e, newValue: number) => setCurrentTab(newValue)}
          aria-label="event details tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Venue" icon={<LocationOn />} iconPosition="start" />
          <Tab label="People" icon={<People />} iconPosition="start" />
          <Tab label="Documents" icon={<AttachFile />} iconPosition="start" />
          <Tab label="Comms" icon={<NotificationsActive />} iconPosition="start" />
          <Tab label="Analysis" icon={<TrendingUp />} iconPosition="start" />
        </Tabs>
      </Paper>

      {currentTab === 0 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Venue</Typography>
          <Typography variant="body2" color="text.secondary">
            {event.location ? `Location: ${event.location}` : 'No venue details provided.'}
          </Typography>
          {typeof event.latitude === 'number' && typeof event.longitude === 'number' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Coordinates: {event.latitude}, {event.longitude}
            </Typography>
          )}
        </Paper>
      )}

      {currentTab === 1 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>People</Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary={`Organizer: ${event.organizer ?? 'N/A'}`}
                secondary={`Attendees: ${event.attendeeCount ?? 0}`}
              />
            </ListItem>
          </List>
        </Paper>
      )}

      {currentTab === 2 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Documents</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload and list event documents here.
          </Typography>
          <Button variant="outlined" startIcon={<AttachFile />} sx={{ mt: 2 }}>
            Upload Document
          </Button>
        </Paper>
      )}

      {currentTab === 3 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Communication</Typography>
          <Typography variant="body2" color="text.secondary">
            Track invites, announcements, press releases, etc.
          </Typography>
          <Button variant="outlined" startIcon={<NotificationsActive />} sx={{ mt: 2 }}>
            Send Announcement
          </Button>
        </Paper>
      )}

      {currentTab === 4 && (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Analysis</Typography>
          <Typography variant="body2" color="text.secondary">
            Notes: {event.notes ?? 'No notes yet.'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default EventDetail;
