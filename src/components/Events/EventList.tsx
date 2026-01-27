// src/components/Events/EventList.tsx
// src/components/Events/EventList.tsx
import React from 'react';
import { Box, Chip, IconButton, Tooltip, Paper } from '@mui/material'; // Import Paper here
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Edit, Delete, Visibility } from '@mui/icons-material';
import { Event } from '../../types/campaign'; // Adjust path if needed based on your project structure

interface EventListProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (eventId: number) => void;
  onView: (event: Event) => void; // Added for the new detail modal
}

// Helper function to map status values to a display string (e.g., '0' to 'Pending')
const displayStatus = (statusValue: string) => {
  if (statusValue === '0') {
    return 'Pending'; // Map '0' to 'Pending' for display
  }
  return statusValue;
};

// Helper function to get Material-UI Chip color based on the actual (or mapped) status string
const getStatusChipColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'success'; // Green for confirmed
    case 'scheduled':
      return 'info';    // Blue for scheduled
    case 'completed':
      return 'primary'; // Default blue/purple for completed
    case 'cancelled':
      return 'error';   // Red for cancelled
    case 'pending': // Corresponds to our mapped '0' status
      return 'warning'; // Orange for pending/warning
    default:
      return 'default'; // Grey for any other status
  }
};

const EventList: React.FC<EventListProps> = ({ events, onEdit, onDelete, onView }) => {
  const columns: GridColDef[] = [
    { field: 'eventId', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Event Name', width: 200 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    { field: 'startTime', headerName: 'Start Time', width: 180 },
    { field: 'endTime', headerName: 'End Time', width: 180 },
    { field: 'location', headerName: 'Location', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const statusText = displayStatus(params.value as string); // Get the display text for the status
        const chipColor = getStatusChipColor(statusText); // Get the color based on the display text

        return (
          <Chip
            label={statusText.toUpperCase()} // Display status in uppercase for emphasis
            color={chipColor} // Apply the determined color
            size="small" // Make the chip small
            sx={{ fontWeight: 'bold' }} // Make text bold
          />
        );
      },
    },
    { field: 'organizer', headerName: 'Organizer', width: 130 },
    { field: 'attendeeCount', headerName: 'Attendees', type: 'number', width: 100 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton onClick={() => onView(params.row as Event)} color="info" size="small">
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Event">
            <IconButton onClick={() => onEdit(params.row as Event)} color="primary" size="small">
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Event">
            <IconButton onClick={() => onDelete(params.row.eventId as number)} color="error" size="small">
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    // Wrap DataGrid in a Paper component to give it a distinct "suspended card" look.
    // It will be centered because its parent (the main Paper in EventsPage) is centered.
    <Paper
      elevation={4} // Higher elevation than the outer Paper (which has elevation 2) for a more "suspended" feel
      sx={{
        height: '100%',     // Take 100% height of its parent container
        width: '100%',      // Take 100% width
        borderRadius: 2,    // Apply rounded corners consistent with modern design
        p: 2,               // Add internal padding for better spacing around the DataGrid
        display: 'flex',    // Enable flexbox for proper internal layout
        flexDirection: 'column', // Stack children vertically
      }}
    >
      <DataGrid
        rows={events}
        columns={columns}
        getRowId={(row) => row.eventId}
        pageSizeOptions={[5, 10, 25]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10, page: 0 },
          },
        }}
        // Allow the DataGrid to grow and fill the available height within its new Paper container
        sx={{
          flexGrow: 1,
        }}
        disableRowSelectionOnClick
      />
    </Paper>
  );
};

export default EventList;