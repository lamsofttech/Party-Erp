// src/components/Events/EventDetailModal.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Grid,
  Chip,
  Stack,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import DescriptionIcon from '@mui/icons-material/Description';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CampaignIcon from '@mui/icons-material/Campaign';
import NotesIcon from '@mui/icons-material/Notes';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // For created/updated at
import { Event } from '../../types/campaign'; // Ensure this import is correct

interface EventDetailModalProps {
  open: boolean;
  onClose: () => void;
  event: Event | null;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ open, onClose, event }) => {
  if (!event) {
    return null; // Don't render if no event is provided
  }

  // Helper to format date/time
  const formatDate = (datetimeString?: string | null) => {
    if (!datetimeString) return 'N/A';
    try {
      const date = new Date(datetimeString);
      return date.toLocaleString(); // e.g., "7/17/2025, 1:00:00 PM"
    } catch (e) {
      return datetimeString; // Return as is if invalid date string
    }
  };

  // Determine Chip color based on status (example, customize as needed)
  const getStatusChipColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'success';
      case 'planned':
      case 'scheduled': // Assuming 'scheduled' is also a planning status
        return 'info';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'default'; // Or 'secondary' if you prefer
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md" // Increased max width for more content
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2, // Slightly rounded corners for a modern look
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <Typography variant="h6" component="div">
          <EventIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Event Details: <Box component="span" sx={{ fontWeight: 'bold' }}>{event.name}</Box>
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3, backgroundColor: '#fdfdfd' }}>
        <Grid container spacing={3}>
          {/* Section 1: Key Event Summary */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Typography variant="h5" color="primary">
                {event.name}
              </Typography>
              <Chip
                label={event.status.toUpperCase()}
                color={getStatusChipColor(event.status)}
                size="medium"
                sx={{ fontWeight: 'bold' }}
              />
            </Stack>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {/* Section 2: Core Details */}
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <ScheduleIcon color="action" />
              <Typography variant="subtitle1" color="text.secondary">
                <Box component="span" sx={{ fontWeight: 'bold' }}>Start Time:</Box> {formatDate(event.startTime)}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <ScheduleIcon color="action" />
              <Typography variant="subtitle1" color="text.secondary">
                <Box component="span" sx={{ fontWeight: 'bold' }}>End Time:</Box> {formatDate(event.endTime)}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <LocationOnIcon color="action" />
              <Typography variant="subtitle1" color="text.secondary">
                <Box component="span" sx={{ fontWeight: 'bold' }}>Location:</Box> {event.location || 'N/A'}
              </Typography>
            </Stack>
            {event.latitude && event.longitude && (
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <LocationOnIcon color="action" />
                <Typography variant="subtitle1" color="text.secondary">
                  <Box component="span" sx={{ fontWeight: 'bold' }}>Coordinates:</Box> {event.latitude}, {event.longitude}
                </Typography>
              </Stack>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <PersonIcon color="action" />
              <Typography variant="subtitle1" color="text.secondary">
                <Box component="span" sx={{ fontWeight: 'bold' }}>Organizer:</Box> {event.organizer || 'N/A'}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <GroupIcon color="action" />
              <Typography variant="subtitle1" color="text.secondary">
                <Box component="span" sx={{ fontWeight: 'bold' }}>Attendees:</Box> {event.attendeeCount || 'N/A'}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <CampaignIcon color="action" />
              <Typography variant="subtitle1" color="text.secondary">
                <Box component="span" sx={{ fontWeight: 'bold' }}>Associated Campaign ID:</Box> {event.associatedCampaignId || 'N/A'}
              </Typography>
            </Stack>
          </Grid>

          {/* Section 3: Description & Notes */}
          {(event.description || event.notes) && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              {event.description && (
                <Box mb={2}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <DescriptionIcon color="action" />
                    <Typography variant="h6" gutterBottom>Description</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ ml: 3, color: 'text.primary' }}>
                    {event.description}
                  </Typography>
                </Box>
              )}
              {event.notes && (
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                    <NotesIcon color="action" />
                    <Typography variant="h6" gutterBottom>Notes</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ ml: 3, color: 'text.primary' }}>
                    {event.notes}
                  </Typography>
                </Box>
              )}
            </Grid>
          )}

          {/* Section 4: Administrative/Meta Details (less prominent) */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
              Administrative Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Event ID:</strong> {event.eventId}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Created:</strong> {formatDate(event.createdAt)}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Updated:</strong> {formatDate(event.updatedAt)}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #eee', justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="primary" variant="contained" size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventDetailModal;