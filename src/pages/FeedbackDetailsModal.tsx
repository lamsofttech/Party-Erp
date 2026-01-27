// src/pages/FeedbackDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Grid, TextField, CircularProgress, Alert, AlertTitle, MenuItem, Select,
  FormControl, InputLabel
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  FeedbackItem,
  FeedbackStatus,
  FeedbackType,
  FeedbackPriority,
  SentimentPolarity
} from '../types/feedback'; // Ensure this path is correct

interface FeedbackDetailsModalProps {
  open: boolean;
  onClose: () => void;
  feedbackItem: FeedbackItem;
  onUpdateFeedback: (updatedItem: FeedbackItem) => Promise<void>;
}

const FeedbackDetailsModal: React.FC<FeedbackDetailsModalProps> = ({
  open,
  onClose,
  feedbackItem,
  onUpdateFeedback,
}) => {
  const [editedItem, setEditedItem] = useState<FeedbackItem>(feedbackItem);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync internal state when feedbackItem prop changes
  useEffect(() => {
    if (feedbackItem) {
      setEditedItem(feedbackItem);
      setSaveError(null);
      setSaveSuccess(false);
    }
  }, [feedbackItem]);

  // Text / textarea / date fields
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Select handlers (typed for MUI SelectChangeEvent)
  const handleTypeChange = (e: SelectChangeEvent<FeedbackType>) => {
    const value = e.target.value as FeedbackType;
    setEditedItem(prev => ({ ...prev, type: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleStatusChange = (e: SelectChangeEvent<FeedbackStatus>) => {
    const value = e.target.value as FeedbackStatus;
    setEditedItem(prev => ({ ...prev, status: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handlePriorityChange = (e: SelectChangeEvent<FeedbackPriority>) => {
    const value = e.target.value as FeedbackPriority;
    setEditedItem(prev => ({ ...prev, priority: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Sentiment can be nullable/optional; treat empty string as "no sentiment"
  const handleSentimentChange = (
    e: SelectChangeEvent<SentimentPolarity | ''>
  ) => {
    const value = e.target.value as SentimentPolarity | '';
    setEditedItem(prev => ({
      ...prev,
      sentiment: (value === '' ? null : value) as unknown as SentimentPolarity | null,
    }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onUpdateFeedback(editedItem);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!feedbackItem) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Engagement Details - {editedItem.title}</DialogTitle>
      <DialogContent dividers>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {saveError}
          </Alert>
        )}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <AlertTitle>Success</AlertTitle>
            Engagement updated successfully!
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={editedItem.title}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={editedItem.description}
              onChange={handleTextChange}
              margin="normal"
              multiline
              rows={4}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" variant="outlined">
              <InputLabel>Type</InputLabel>
              <Select<FeedbackType>
                label="Type"
                name="type"
                value={editedItem.type}
                onChange={handleTypeChange}
              >
                {Object.values(FeedbackType).map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" variant="outlined">
              <InputLabel>Status</InputLabel>
              <Select<FeedbackStatus>
                label="Status"
                name="status"
                value={editedItem.status}
                onChange={handleStatusChange}
              >
                {Object.values(FeedbackStatus).map(status => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" variant="outlined">
              <InputLabel>Priority</InputLabel>
              <Select<FeedbackPriority>
                label="Priority"
                name="priority"
                value={editedItem.priority}
                onChange={handlePriorityChange}
              >
                {Object.values(FeedbackPriority).map(priority => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Source"
              name="source"
              value={editedItem.source}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="County"
              name="county"
              value={editedItem.county ?? ''}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Constituency"
              name="constituency"
              value={editedItem.constituency ?? ''}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ward"
              name="ward"
              value={editedItem.ward ?? ''}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Location Details"
              name="locationDetails"
              value={editedItem.locationDetails ?? ''}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Contact Method"
              name="contactMethod"
              value={editedItem.contactMethod ?? ''}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Contact Info"
              name="contactInfo"
              value={editedItem.contactInfo ?? ''}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Assigned To"
              name="assignedTo"
              value={editedItem.assignedTo ?? ''}
              onChange={handleTextChange}
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal" variant="outlined">
              <InputLabel>Sentiment</InputLabel>
              <Select<SentimentPolarity | ''>
                label="Sentiment"
                name="sentiment"
                value={(editedItem.sentiment ?? '') as SentimentPolarity | ''}
                onChange={handleSentimentChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {Object.values(SentimentPolarity).map(sentiment => (
                  <MenuItem key={sentiment} value={sentiment}>
                    {sentiment}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tags (comma-separated)"
              name="tags"
              value={
                Array.isArray(editedItem.tags)
                  ? editedItem.tags.join(', ')
                  : editedItem.tags ?? ''
              }
              onChange={e =>
                setEditedItem(prev => ({
                  ...prev,
                  tags: e.target.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(Boolean),
                }))
              }
              margin="normal"
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Follow-up Date"
              name="followUpDate"
              type="date"
              value={
                editedItem.followUpDate
                  ? new Date(editedItem.followUpDate)
                      .toISOString()
                      .split('T')[0]
                  : ''
              }
              onChange={handleTextChange}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Resolution Details"
              name="resolutionDetails"
              value={editedItem.resolutionDetails ?? ''}
              onChange={handleTextChange}
              margin="normal"
              multiline
              rows={3}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Submission Date:{' '}
              {new Date(editedItem.submissionDate).toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Last Updated:{' '}
              {new Date(editedItem.lastUpdated).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={isSaving}
        >
          {isSaving ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDetailsModal;
