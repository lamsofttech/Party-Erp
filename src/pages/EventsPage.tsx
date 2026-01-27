// src/pages/EventsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Typography,
  Paper,
  IconButton,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
} from '@mui/material';
import { Add, List, CalendarMonth, Visibility, Delete } from '@mui/icons-material';
import { useNavigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';

import EventCalendar from '../components/Events/EventCalendar';
import EventForm from '../components/Events/EventForm';
import PageHeader from '../components/common/PageHeader';
import EventDetailModal from '../components/Events/EventDetailModal';
import { Event } from '../types/campaign';

const API_BASE_URL = 'https://skizagroundsuite.com/API/events.php';
const CREATE_EVENT_API_URL = 'https://skizagroundsuite.com/API/create_event.php';

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isMobile = useMediaQuery('(max-width:600px)');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(isMobile ? 'list' : 'calendar');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMobile) setViewMode('list');
  }, [isMobile]);

  const fetchEvents = useCallback(async (filters: { [key: string]: string | number | null } = {}) => {
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams(filters as Record<string, string>).toString();
    const url = `${API_BASE_URL}${queryParams ? `?${queryParams}` : ''}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const mappedEvents: Event[] = data.data.map((dbEvent: any) => ({
          eventId: dbEvent.event_id,
          name: dbEvent.name,
          description: dbEvent.description,
          startTime: dbEvent.start_time,
          endTime: dbEvent.end_time,
          location: dbEvent.location,
          latitude: dbEvent.latitude ? parseFloat(dbEvent.latitude) : undefined,
          longitude: dbEvent.longitude ? parseFloat(dbEvent.longitude) : undefined,
          associatedCampaignId: dbEvent.associated_campaign_id,
          status: dbEvent.status,
          organizer: dbEvent.organizer,
          attendeeCount: dbEvent.attendee_count ? parseInt(dbEvent.attendee_count, 10) : 0,
          notes: dbEvent.notes,
          createdAt: dbEvent.created_at,
          updatedAt: dbEvent.updated_at,
        }));
        setEvents(mappedEvents);
      } else {
        setError(data.message || 'Failed to fetch events. Please try again.');
        setEvents([]);
      }
    } catch (err: any) {
      console.error('Network or parsing error during event fetch:', err);
      setError('Could not connect to the server. Please check your network connection.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveEvent = async (eventToSave: Event) => {
    setLoading(true);
    setError(null);
    try {
      let response: Response;
      let data: any;

      if (eventToSave.eventId) {
        response = await fetch(`${API_BASE_URL}?id=${eventToSave.eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: eventToSave.name,
            description: eventToSave.description,
            startTime: eventToSave.startTime,
            endTime: eventToSave.endTime,
            location: eventToSave.location,
            latitude: eventToSave.latitude,
            longitude: eventToSave.longitude,
            associatedCampaignId: eventToSave.associatedCampaignId,
            status: eventToSave.status,
            organizer: eventToSave.organizer,
            attendeeCount: eventToSave.attendeeCount,
            notes: eventToSave.notes,
          }),
        });
        data = await response.json();
        if (!response.ok || data.status === 'error' || data.status === 'warning') {
          throw new Error(data.message || 'Failed to update event.');
        }
      } else {
        response = await fetch(CREATE_EVENT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: eventToSave.name,
            description: eventToSave.description,
            startTime: eventToSave.startTime,
            endTime: eventToSave.endTime,
            location: eventToSave.location,
            latitude: eventToSave.latitude,
            longitude: eventToSave.longitude,
            associatedCampaignId: eventToSave.associatedCampaignId,
            status: eventToSave.status,
            organizer: eventToSave.organizer,
            attendeeCount: eventToSave.attendeeCount,
            notes: eventToSave.notes,
          }),
        });
        data = await response.json();
        if (!response.ok || data.status === 'error') {
          throw new Error(data.message || 'Failed to create event.');
        }
      }

      handleCloseForm();
      await fetchEvents();
    } catch (err: any) {
      console.error('Error saving event:', err);
      setError(err.message || 'An unexpected error occurred while saving the event.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOW USED (Delete icon in table) — fixes TS6133
  const handleDeleteEvent = async (eventId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}?id=${eventId}`, { method: 'DELETE' });

      if (response.status === 204) {
        await fetchEvents();
        return;
      }

      const data = await response.json();
      if (!response.ok || data.status === 'error' || data.status === 'warning') {
        throw new Error(data.message || 'Failed to delete event.');
      }

      await fetchEvents();
    } catch (err: any) {
      console.error('Error deleting event:', err);
      setError(err.message || 'An unexpected error occurred while deleting the event.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialFilters: { [key: string]: string | number | null } = {};
    if (searchParams.get('campaignId')) {
      initialFilters.campaignId = parseInt(searchParams.get('campaignId') || '0', 10);
    }
    fetchEvents(initialFilters);
  }, [fetchEvents, viewMode, searchParams]);

  useEffect(() => {
    if (searchParams.get('add') === 'true' && searchParams.get('campaignId')) {
      const campaignId = parseInt(searchParams.get('campaignId') || '0', 10);
      if (!isNaN(campaignId) && campaignId > 0) {
        setEditingEvent({ associatedCampaignId: campaignId } as Event);
        setIsFormOpen(true);
      }
    }
  }, [searchParams]);

  const handleAddEventClick = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleViewEvent = (event: Event) => {
    setViewingEvent(event);
    setIsViewModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
    if (searchParams.has('add') || searchParams.has('campaignId')) {
      navigate(location.pathname, { replace: true });
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingEvent(null);
  };

  const showListOrCalendar = location.pathname === '/party-operations/events';

  const TypedEventCalendar =
    EventCalendar as unknown as React.ComponentType<{
      events: Event[];
      onEventClick: (event: Event) => void;
    }>;

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <PageHeader
        title="Event & Rally Management"
        description="Plan, coordinate, and track all political events and rallies effectively."
        action={
          showListOrCalendar && (
            <Box display="flex" gap={2}>
              {!isMobile && (
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => {
                    if (newMode !== null) setViewMode(newMode);
                  }}
                  aria-label="event view mode"
                >
                  <ToggleButton value="calendar" aria-label="calendar view">
                    <CalendarMonth />
                  </ToggleButton>
                  <ToggleButton value="list" aria-label="list view">
                    <List />
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
              {!isMobile && (
                <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleAddEventClick}>
                  New Event
                </Button>
              )}
            </Box>
          )
        }
      />

      {isFormOpen && (
        <EventForm open={isFormOpen} onClose={handleCloseForm} event={editingEvent} onSave={handleSaveEvent} />
      )}

      {isViewModalOpen && (
        <EventDetailModal open={isViewModalOpen} onClose={handleCloseViewModal} event={viewingEvent} />
      )}

      <Paper
        elevation={2}
        sx={{
          mt: 3,
          p: 2,
          maxWidth: 1200,
          margin: '24px auto',
          borderRadius: 2,
          minHeight: '400px',
          boxSizing: 'border-box',
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && showListOrCalendar ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading Events...
            </Typography>
          </Box>
        ) : showListOrCalendar ? (
          !isMobile && viewMode === 'calendar' ? (
            <TypedEventCalendar events={events} onEventClick={handleViewEvent} />
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Event Name</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.eventId} hover>
                      <TableCell>{ev.eventId}</TableCell>
                      <TableCell>
                        <Tooltip title={ev.name || ''}>
                          <Typography variant="body2" noWrap>
                            {ev.name || '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{ev.startTime ? new Date(ev.startTime).toLocaleString() : '—'}</TableCell>
                      <TableCell>{ev.endTime ? new Date(ev.endTime).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <Tooltip title={ev.location || ''}>
                          <Typography variant="body2" noWrap>
                            {ev.location || '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ev.status || '—'}
                          color={
                            ev.status?.toLowerCase() === 'active'
                              ? 'success'
                              : ev.status?.toLowerCase() === 'cancelled'
                                ? 'error'
                                : 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton aria-label="View" onClick={() => handleViewEvent(ev)} size="small">
                          <Visibility />
                        </IconButton>

                        <IconButton
                          aria-label="Delete"
                          size="small"
                          color="error"
                          onClick={() => {
                            if (!ev.eventId) return;
                            const ok = window.confirm('Are you sure you want to delete this event?');
                            if (ok) handleDeleteEvent(ev.eventId);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          <Outlet />
        )}
      </Paper>

      {isMobile && showListOrCalendar && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddEventClick}
          startIcon={<Add />}
          sx={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            borderRadius: '9999px',
            boxShadow: 3,
          }}
        >
          Add
        </Button>
      )}
    </Box>
  );
};

export default EventsPage;
