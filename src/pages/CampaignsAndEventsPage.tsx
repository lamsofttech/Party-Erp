import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  useTheme,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarTodayIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, EventContentArg, EventMountArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';

// Mock Data for demonstration purposes
const mockCampaigns = [
  { id: 1, name: 'Youth Engagement Drive 2025', type: 'Outreach', startDate: '2025-07-15', endDate: '2025-08-30', status: 'Ongoing', budget: 150000, progress: 60, description: 'Campaign to mobilize young voters across key regions.' },
  { id: 2, name: 'Community Health Initiative', type: 'Advocacy', startDate: '2025-09-01', endDate: '2025-10-15', status: 'Planned', budget: 80000, progress: 0, description: 'Promoting public health awareness in rural areas.' },
  { id: 3, name: 'Fundraising Gala 2024 (Completed)', type: 'Fundraising', startDate: '2024-11-10', endDate: '2024-11-10', status: 'Completed', budget: 200000, progress: 100, description: 'Annual gala to raise funds for party party-operations.' },
  { id: 4, name: 'Regional Leadership Summit', type: 'Training', startDate: '2025-08-05', endDate: '2025-08-07', status: 'Planned', budget: 30000, progress: 0, description: 'Training for party leaders from all regions.' },
];

const mockEvents = [
  { id: 101, title: 'Youth Rally - Nairobi', date: '2025-07-20', time: '14:00', location: 'Uhuru Park, Nairobi', campaignId: 1, status: 'Scheduled', description: 'Large youth mobilization event.' },
  { id: 102, title: 'Town Hall Meeting - Kisumu', date: '2025-08-10', time: '10:00', location: 'Kisumu Social Hall', campaignId: 1, status: 'Scheduled', description: 'Open forum for public discussion.' },
  { id: 103, title: 'Leadership Workshop - Mombasa', date: '2025-08-06', time: '09:00', location: 'Mombasa Serena Hotel', campaignId: 4, status: 'Scheduled', description: 'Interactive workshop for branch leaders.' },
  { id: 104, title: 'Medical Camp - Rural Makueni', date: '2025-09-15', time: '08:00', location: 'Wote Health Center', campaignId: 2, status: 'Scheduled', description: 'Free medical check-ups and awareness.' },
  { id: 105, title: 'Annual Fundraising Dinner', date: '2025-11-20', time: '18:30', location: 'Fairmont The Norfolk, Nairobi', campaignId: null, status: 'Scheduled', description: 'Major fundraising event.' },
];

const eventStatuses = ['Scheduled', 'Completed', 'Cancelled', 'Postponed'];
const campaignStatuses = ['Planned', 'Ongoing', 'Completed', 'Archived'];
const campaignTypes = ['Outreach', 'Advocacy', 'Fundraising', 'Training', 'Election'];

const CampaignsAndEventsPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  const [currentTab, setCurrentTab] = useState(0); // 0 for Events, 1 for Events List, 2 for Campaigns
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [openCampaignDialog, setOpenCampaignDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  const [events, setEvents] = useState(mockEvents);
  const [campaigns, setCampaigns] = useState(mockCampaigns);

  // Form states for Event
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    campaignId: '',
    status: 'Scheduled',
    description: '',
  });

  // Form states for Campaign
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: '',
    startDate: '',
    endDate: '',
    status: 'Planned',
    budget: 0,
    progress: 0,
    description: '',
  });

  // Transform events for FullCalendar
  const calendarEvents = events.map(event => ({
    id: event.id.toString(),
    title: event.title,
    date: event.date,
    extendedProps: {
      time: event.time,
      location: event.location,
      status: event.status,
      description: event.description,
      campaignName: mockCampaigns.find(c => c.id === event.campaignId)?.name || 'N/A',
    },
    backgroundColor: event.status === 'Completed' ? theme.palette.success.light : primaryMain,
    borderColor: event.status === 'Completed' ? theme.palette.success.dark : primaryMain,
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Event Dialog Handlers
  const handleOpenEventDialog = (event?: any) => {
    if (event) {
      setSelectedEvent(event);
      setNewEvent({
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        campaignId: event.campaignId || '',
        status: event.status,
        description: event.description,
      });
    } else {
      setSelectedEvent(null);
      setNewEvent({
        title: '', date: '', time: '', location: '', campaignId: '', status: 'Scheduled', description: ''
      });
    }
    setOpenEventDialog(true);
  };

  const handleCloseEventDialog = () => {
    setOpenEventDialog(false);
    setSelectedEvent(null);
  };

  const handleEventFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewEvent({ ...newEvent, [e.target.name]: e.target.value });
  };

  const handleSaveEvent = () => {
    if (selectedEvent) {
      // Update existing event
      setEvents(events.map(e => e.id === selectedEvent.id ? { ...e, ...newEvent, campaignId: newEvent.campaignId === '' ? null : Number(newEvent.campaignId) } : e));
    } else {
      // Add new event
      setEvents([...events, {
        id: events.length + 101, // Simple ID generation
        ...newEvent,
        campaignId: newEvent.campaignId === '' ? null : Number(newEvent.campaignId),
      }]);
    }
    handleCloseEventDialog();
  };

  const handleDeleteEvent = (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  // Campaign Dialog Handlers
  const handleOpenCampaignDialog = (campaign?: any) => {
    if (campaign) {
      setSelectedCampaign(campaign);
      setNewCampaign({
        name: campaign.name,
        type: campaign.type,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
        budget: campaign.budget,
        progress: campaign.progress,
        description: campaign.description,
      });
    } else {
      setSelectedCampaign(null);
      setNewCampaign({
        name: '', type: '', startDate: '', endDate: '', status: 'Planned', budget: 0, progress: 0, description: ''
      });
    }
    setOpenCampaignDialog(true);
  };

  const handleCloseCampaignDialog = () => {
    setOpenCampaignDialog(false);
    setSelectedCampaign(null);
  };

  const handleCampaignFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCampaign({ ...newCampaign, [e.target.name]: e.target.value });
  };

  const handleSaveCampaign = () => {
    if (selectedCampaign) {
      // Update existing campaign
      setCampaigns(campaigns.map(c => c.id === selectedCampaign.id ? { ...c, ...newCampaign } : c));
    } else {
      // Add new campaign
      setCampaigns([...campaigns, { id: campaigns.length + 1, ...newCampaign }]); // Simple ID generation
    }
    handleCloseCampaignDialog();
  };

  const handleDeleteCampaign = (id: number) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter(c => c.id !== id));
    }
  };

  const eventColumns = [
    { field: 'title', headerName: 'Event Title', width: 250 },
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'time', headerName: 'Time', width: 100 },
    { field: 'location', headerName: 'Location', width: 200 },
    {
      field: 'campaignId',
      headerName: 'Related Campaign',
      width: 180,
      valueGetter: (params: any) => mockCampaigns.find(c => c.id === params.row.campaignId)?.name || 'N/A',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'Scheduled' ? 'primary' :
            params.value === 'Completed' ? 'success' :
            params.value === 'Cancelled' ? 'error' : 'default'
          }
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params: any) => (
        <Box>
          <IconButton color="primary" size="small" onClick={() => handleOpenEventDialog(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDeleteEvent(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  const campaignColumns = [
    { field: 'name', headerName: 'Campaign Name', width: 250 },
    { field: 'type', headerName: 'Type', width: 150 },
    { field: 'startDate', headerName: 'Start Date', width: 120 },
    { field: 'endDate', headerName: 'End Date', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'Ongoing' ? 'primary' :
            params.value === 'Completed' ? 'success' :
            params.value === 'Planned' ? 'info' : 'default'
          }
        />
      ),
    },
    {
      field: 'budget',
      headerName: 'Budget (Ksh)',
      width: 150,
      renderCell: (params: any) => `Ksh ${params.value.toLocaleString()}`,
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 170,
      renderCell: (params: any) => (
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          <LinearProgress variant="determinate" value={params.value} sx={{ width: '70%', mr: 1 }} />
          <Typography variant="body2" color="text.secondary">{`${Math.round(params.value)}%`}</Typography>
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params: any) => (
        <Box>
          <IconButton color="primary" size="small" onClick={() => handleOpenCampaignDialog(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDeleteCampaign(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, background: isDark ? theme.palette.background.default : '#f0f2f5', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={700} mb={3} sx={{ color: theme.palette.text.primary }}>
        Campaign & Event Management
      </Typography>

      <Card sx={{ mb: 3, background: isDark ? theme.palette.background.paper : '#fff' }}>
        <CardContent>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="Campaign and Event Tabs">
            <Tab label="Events Calendar" icon={<CalendarTodayIcon />} iconPosition="start" />
            <Tab label="Events List" icon={<MeetingRoomIcon />} iconPosition="start" />
            <Tab label="Campaigns List" icon={<CampaignIcon />} iconPosition="start" />
          </Tabs>
        </CardContent>
      </Card>

      {/* Events Calendar Tab */}
      {currentTab === 0 && (
        <Card sx={{ p: 2, background: isDark ? theme.palette.background.paper : '#fff', boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEventDialog()}
                sx={{ backgroundColor: primaryMain, '&:hover': { backgroundColor: '#1a9970' } }}
              >
                Add New Event
              </Button>
            </Box>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={calendarEvents}
              eventClick={(info: EventClickArg) => {
                const eventId = Number(info.event.id);
                const clickedEvent = events.find(e => e.id === eventId);
                if (clickedEvent) {
                  handleOpenEventDialog(clickedEvent);
                }
              }}
              dateClick={(info: DateClickArg) => {
                setNewEvent(prev => ({ ...prev, date: info.dateStr }));
                handleOpenEventDialog();
              }}
              eventContent={(arg: EventContentArg) => (
                <Box sx={{
                  color: 'white',
                  borderRadius: 0.5,
                  p: '2px 4px',
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  <b>{arg.timeText}</b>
                  <i> {arg.event.title}</i>
                </Box>
              )}
              height="auto"
              eventDidMount={(info: EventMountArg) => {
                info.el.title = `${info.event.title} (${(info.event.extendedProps as any).status})\n${(info.event.extendedProps as any).location}`;
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Events List Tab */}
      {currentTab === 1 && (
        <Card sx={{ p: 2, background: isDark ? theme.palette.background.paper : '#fff', boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEventDialog()}
                sx={{ backgroundColor: primaryMain, '&:hover': { backgroundColor: '#1a9970' } }}
              >
                Add New Event
              </Button>
            </Box>
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={events}
                columns={eventColumns}
                pageSizeOptions={[5, 10, 20]}
                checkboxSelection
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: isDark ? alpha(primaryMain, 0.2) : primaryMain,
                    color: isDark ? theme.palette.text.primary : '#fff',
                  },
                  '& .MuiDataGrid-row': {
                    '&:nth-of-type(odd)': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : theme.palette.action.hover,
                    },
                  },
                  color: theme.palette.text.primary,
                  borderColor: theme.palette.divider,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List Tab */}
      {currentTab === 2 && (
        <Card sx={{ p: 2, background: isDark ? theme.palette.background.paper : '#fff', boxShadow: 3 }}>
          <CardContent>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCampaignDialog()}
                sx={{ backgroundColor: primaryMain, '&:hover': { backgroundColor: '#1a9970' } }}
              >
                Add New Campaign
              </Button>
            </Box>
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={campaigns}
                columns={campaignColumns}
                pageSizeOptions={[5, 10, 20]}
                checkboxSelection
                disableRowSelectionOnClick
                sx={{
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: isDark ? alpha(primaryMain, 0.2) : primaryMain,
                    color: isDark ? theme.palette.text.primary : '#fff',
                  },
                  '& .MuiDataGrid-row': {
                    '&:nth-of-type(odd)': {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : theme.palette.action.hover,
                    },
                  },
                  color: theme.palette.text.primary,
                  borderColor: theme.palette.divider,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Dialog (Add/Edit) */}
      <Dialog open={openEventDialog} onClose={handleCloseEventDialog} fullWidth maxWidth="sm">
        <DialogTitle>{selectedEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                name="title"
                label="Event Title"
                type="text"
                fullWidth
                value={newEvent.title}
                onChange={handleEventFormChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                name="date"
                label="Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newEvent.date}
                onChange={handleEventFormChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                name="time"
                label="Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newEvent.time}
                onChange={handleEventFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="location"
                label="Location"
                type="text"
                fullWidth
                value={newEvent.location}
                onChange={handleEventFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                margin="dense"
                name="campaignId"
                label="Related Campaign"
                fullWidth
                value={newEvent.campaignId}
                onChange={handleEventFormChange}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {campaigns.map((campaign) => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                margin="dense"
                name="status"
                label="Status"
                fullWidth
                value={newEvent.status}
                onChange={handleEventFormChange}
              >
                {eventStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
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
                value={newEvent.description}
                onChange={handleEventFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEventDialog}>Cancel</Button>
          <Button onClick={handleSaveEvent} variant="contained" sx={{ backgroundColor: primaryMain, '&:hover': { backgroundColor: '#1a9970' } }}>
            {selectedEvent ? 'Save Changes' : 'Add Event'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Dialog (Add/Edit) */}
      <Dialog open={openCampaignDialog} onClose={handleCloseCampaignDialog} fullWidth maxWidth="sm">
        <DialogTitle>{selectedCampaign ? 'Edit Campaign' : 'Add New Campaign'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                name="name"
                label="Campaign Name"
                type="text"
                fullWidth
                value={newCampaign.name}
                onChange={handleCampaignFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                margin="dense"
                name="type"
                label="Campaign Type"
                fullWidth
                value={newCampaign.type}
                onChange={handleCampaignFormChange}
              >
                {campaignTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                name="startDate"
                label="Start Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newCampaign.startDate}
                onChange={handleCampaignFormChange}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                name="endDate"
                label="End Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newCampaign.endDate}
                onChange={handleCampaignFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                margin="dense"
                name="status"
                label="Status"
                fullWidth
                value={newCampaign.status}
                onChange={handleCampaignFormChange}
              >
                {campaignStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="budget"
                label="Budget (Ksh)"
                type="number"
                fullWidth
                value={newCampaign.budget}
                onChange={handleCampaignFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="progress"
                label="Progress (%)"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 100 }}
                value={newCampaign.progress}
                onChange={handleCampaignFormChange}
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
                value={newCampaign.description}
                onChange={handleCampaignFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCampaignDialog}>Cancel</Button>
          <Button onClick={handleSaveCampaign} variant="contained" sx={{ backgroundColor: primaryMain, '&:hover': { backgroundColor: '#1a9970' } }}>
            {selectedCampaign ? 'Save Changes' : 'Add Campaign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampaignsAndEventsPage;
