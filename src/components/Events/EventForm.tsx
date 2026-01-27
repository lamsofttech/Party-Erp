// src/components/Events/EventForm.tsx
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { mockCampaigns } from '../../data/mockData';

/** Local model used by the form (keeps us decoupled from your global Event type) */
type EventFormValues = {
  eventId?: number | null;
  name: string;
  description: string;
  startTime: string; // ISO string (datetime-local)
  endTime: string;   // ISO string (datetime-local)
  location: string;
  status: string;    // 'scheduled' | 'completed' | 'cancelled' | 'postponed'
  organizer: string;
  attendeeCount: number;
  notes: string;
  associatedCampaignId?: number | string | null;

  // Optional extras your UI references
  budget?: number | null;
  actualAttendance?: number | null;
  expensesIncurred?: number | null;
  volunteersAssigned?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  event: any | null; // tolerate any shape passed in
  onSave: (event: any) => Promise<void>; // accept any payload; parent can shape it for the API
}

const STATUS_OPTIONS = ['scheduled', 'completed', 'cancelled', 'postponed'] as const;

const emptyForm: EventFormValues = {
  eventId: null,
  name: '',
  description: '',
  startTime: '',
  endTime: '',
  location: '',
  status: 'scheduled',
  organizer: '',
  attendeeCount: 0,
  notes: '',
  associatedCampaignId: null,
  budget: null,
  actualAttendance: null,
  expensesIncurred: null,
  volunteersAssigned: null,
  latitude: null,
  longitude: null,
};

function normalizeIncoming(e: any | null | undefined): EventFormValues {
  if (!e || typeof e !== 'object') return { ...emptyForm };
  return {
    eventId: typeof e.eventId === 'number' ? e.eventId : (e.id ?? null),
    name: String(e.name ?? ''),
    description: String(e.description ?? ''),
    startTime: String(e.startTime ?? ''),
    endTime: String(e.endTime ?? ''),
    location: String(e.location ?? ''),
    status: String(e.status ?? 'scheduled'),
    organizer: String(e.organizer ?? e.leadOrganizer ?? ''),
    attendeeCount: Number.isFinite(e.attendeeCount) ? Number(e.attendeeCount) : 0,
    notes: String(e.notes ?? e.logistics ?? ''),
    associatedCampaignId:
      e.associatedCampaignId ?? e.campaignId ?? e.campaign_id ?? null,
    budget: Number.isFinite(e.budget) ? Number(e.budget) : null,
    actualAttendance: Number.isFinite(e.actualAttendance) ? Number(e.actualAttendance) : null,
    expensesIncurred: Number.isFinite(e.expensesIncurred) ? Number(e.expensesIncurred) : null,
    volunteersAssigned: Number.isFinite(e.volunteersAssigned) ? Number(e.volunteersAssigned) : null,
    latitude: Number.isFinite(e.latitude) ? Number(e.latitude) : null,
    longitude: Number.isFinite(e.longitude) ? Number(e.longitude) : null,
  };
}

const EventForm: React.FC<EventFormProps> = ({ open, onClose, event, onSave }) => {
  const [formData, setFormData] = useState<EventFormValues>(() => normalizeIncoming(event));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when the dialog opens or the incoming event changes
  useEffect(() => {
    setFormData(normalizeIncoming(event));
    setError(null);
  }, [event, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name?: string; value: unknown } }
  ) => {
    const { name, value } = e.target as { name?: string; value: unknown };
    if (!name) return;
    setFormData((prev) => ({ ...prev, [name]: value as any }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!name) return;
    const num = value === '' ? null : Number(value);
    setFormData((prev) => ({ ...prev, [name]: num as any }));
  };

  const validate = (): string | null => {
    if (!formData.name.trim()) return 'Event name is required.';
    if (!formData.startTime) return 'Start time is required.';
    if (!formData.location.trim()) return 'Location is required.';
    if (!formData.organizer.trim()) return 'Organizer is required.';
    if (formData.endTime) {
      const st = new Date(formData.startTime).getTime();
      const et = new Date(formData.endTime).getTime();
      if (!Number.isNaN(st) && !Number.isNaN(et) && et < st) {
        return 'End time must be after start time.';
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Pass through the normalized data; parent can map to API fields.
      // Keep only meaningful keys (avoid sending empty strings for optional numeric fields)
      const payload: any = { ...formData };
      if (payload.associatedCampaignId === '') payload.associatedCampaignId = null;

      await onSave(payload);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const campaigns = mockCampaigns || [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{formData.eventId ? 'Edit Event' : 'Create New Event'}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Event Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={formData.description}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="startTime"
              label="Start Time"
              type="datetime-local"
              fullWidth
              variant="outlined"
              value={formData.startTime ? formData.startTime.substring(0, 16) : ''}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="endTime"
              label="End Time"
              type="datetime-local"
              fullWidth
              variant="outlined"
              value={formData.endTime ? formData.endTime.substring(0, 16) : ''}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="location"
              label="Location"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="organizer"
              label="Organizer"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.organizer}
              onChange={handleChange}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="attendeeCount"
              label="Attendee Count"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.attendeeCount}
              onChange={handleNumberChange}
              inputProps={{ min: 0 }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="budget"
              label="Budget (KES)"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.budget ?? ''}
              onChange={handleNumberChange}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="status"
              label="Status"
              select
              fullWidth
              variant="outlined"
              value={formData.status}
              onChange={handleChange}
            >
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              margin="dense"
              name="associatedCampaignId"
              label="Associated Campaign"
              select
              fullWidth
              variant="outlined"
              value={formData.associatedCampaignId ?? ''}
              onChange={handleChange}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {campaigns.map((campaign) => (
                <MenuItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="notes"
              label="Notes / Logistics Details"
              type="text"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={formData.notes}
              onChange={handleChange}
            />
          </Grid>

          {formData.status === 'completed' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  name="actualAttendance"
                  label="Actual Attendance"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formData.actualAttendance ?? ''}
                  onChange={handleNumberChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  name="expensesIncurred"
                  label="Expenses Incurred (KES)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formData.expensesIncurred ?? ''}
                  onChange={handleNumberChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  name="volunteersAssigned"
                  label="Volunteers Assigned"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formData.volunteersAssigned ?? ''}
                  onChange={handleNumberChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : (formData.eventId ? 'Save Changes' : 'Create Event')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventForm;
