import React, { useState, useEffect, FC, useMemo } from 'react';

// ✅ Correct named import and instantiation for the HeatmapLayer component
import { HeatmapLayerFactory } from '@vgrid/react-leaflet-heatmap-layer';
const HeatmapLayer = HeatmapLayerFactory<[number, number, number]>();

import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Tabs,
  Tab, // ⬅️ Tabs + Tab added
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { motion } from 'framer-motion';

import {
  Gavel,
  Warning,
  CheckCircleOutline,
  Visibility,
  Edit,
  CameraAlt,
  Assignment,
  Add,
  Map,
} from '@mui/icons-material';
import { MapContainer, TileLayer } from 'react-leaflet';
import { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon not showing
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIcon;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Interfaces for Data (Updated to include latitude and longitude) ---
interface County {
  county_id: string;
  county_code: string;
  county_name: string;
}

interface Constituency {
  const_id: string;
  const_code: string;
  constituency_name: string;
  county_code: string;
}

interface Ward {
  ward_id: string;
  ward_code: string;
  ward_name: string;
  const_code: string;
}

interface Evidence {
  id: string;
  incident_id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  notes?: string;
  timestamp: string;
  geolocation?: string;
  hash: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  type:
  | 'Voter Suppression'
  | 'Voter Bribery'
  | 'KIEMS Kit Failure'
  | 'Form 34A Discrepancy'
  | 'Ballot Tampering'
  | 'Other';
  severity: 'High' | 'Medium' | 'Low';
  status: 'Reported' | 'Under Review' | 'Evidence Required' | 'Case Built' | 'Closed';
  county_code: string;
  constituency_code: string;
  ward_code: string;
  pollingStationName: string;
  agentName: string;
  timestamp: string;
  evidence: Evidence[];
  legalTeamNotes?: string;
  assignedLawyer?: string;
  latitude: number;
  longitude: number;
}

interface WarRoomStats {
  totalIncidents: number;
  incidentsByStatus: { [key: string]: number };
  totalEvidence: number;
}

// --- Helper component for the stats cards ---
const StatCard = ({
  title,
  value,
  icon,
  color,
  progress,
  progressLabel,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  progressLabel?: string;
}) => (
  <Card variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', boxShadow: 1 }}>
    <Box sx={{ color, mr: 2 }}>{icon}</Box>
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" component="div">
        {value}
      </Typography>
      {progress !== undefined && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={progress > 75 ? 'success' : 'warning'}
            sx={{ height: 6, borderRadius: 3 }}
          />
          {progressLabel && (
            <Typography variant="caption" color="text.secondary">
              {progressLabel}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  </Card>
);

// --- Dedicated Map Component with heatmap Layer ---
interface WarRoomMapDashboardProps {
  incidents: Incident[];
}

const WarRoomMapDashboard: FC<WarRoomMapDashboardProps> = ({ incidents }) => {
  const points = useMemo(() => {
    return incidents.map((incident) => {
      let intensity = 1;
      if (incident.severity === 'High') intensity = 3;
      else if (incident.severity === 'Medium') intensity = 2;
      return [incident.latitude, incident.longitude, intensity] as [number, number, number];
    });
  }, [incidents]);

  const position: LatLngTuple = [-1.286389, 36.817223]; // Centered on Kenya

  // Define the bounding box for Kenya to constrain the map view
  const kenyaBounds: LatLngTuple[] = [
    [-4.67, 33.9], // Southwest of Kenya
    [4.62, 41.8], // Northeast of Kenya
  ];

  return (
    <div
      style={{
        height: '500px',
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={position}
        zoom={6}
        minZoom={6}
        maxBounds={kenyaBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {incidents.length > 0 && (
          <HeatmapLayer
            points={points}
            longitudeExtractor={(m) => m[1]}
            latitudeExtractor={(m) => m[0]}
            intensityExtractor={(m) => m[2]}
            radius={20}
            blur={15}
            gradient={{ 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }}
          />
        )}
      </MapContainer>
    </div>
  );
};

// --- Main Dashboard Component ---
const LegalWarRoomDashboard: React.FC = () => {
  // NEW: view toggle (map vs incidents)
  const [activeView, setActiveView] = useState<'map' | 'incidents'>('map');

  const handleViewChange = (_: React.SyntheticEvent, newValue: 'map' | 'incidents') => {
    setActiveView(newValue);
  };

  const [selectedCountyCode, setSelectedCountyCode] = useState<string>('');
  const [selectedConstituencyCode, setSelectedConstituencyCode] = useState<string>('');
  const [selectedWardCode, setSelectedWardCode] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [warRoomStats, setWarRoomStats] = useState<WarRoomStats | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [openIncidentDialog, setOpenIncidentDialog] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([]);
  const [availableWards, setAvailableWards] = useState<Ward[]>([]);

  const [openAddIncidentModal, setOpenAddIncidentModal] = useState<boolean>(false);
  const [newIncidentForm, setNewIncidentForm] = useState<
    Omit<
      Incident,
      'id' | 'timestamp' | 'evidence' | 'legalTeamNotes' | 'assignedLawyer' | 'latitude' | 'longitude'
    >
  >({
    title: '',
    description: '',
    type: 'Voter Suppression',
    severity: 'Medium',
    status: 'Reported',
    county_code: '',
    constituency_code: '',
    ward_code: '',
    pollingStationName: '',
    agentName: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
  const [incidentToEdit, setIncidentToEdit] = useState<Incident | null>(null);
  const [editedIncidentForm, setEditedIncidentForm] = useState<Incident | null>(null);

  // --- Replace with your actual API base URL ---
  const API_BASE_URL = 'https://skizagroundsuite.com/API';

  // --- Fetch Geographical Data (Counties) ---
  useEffect(() => {
    const fetchCounties = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_counties.php`);
        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
          setAvailableCounties(result.data);
        } else {
          console.error(
            'API response for counties was not a success or data was not an array:',
            result,
          );
          setAvailableCounties([]);
        }
      } catch (e) {
        console.error('Failed to load geographical data:', e);
        setAvailableCounties([]);
      }
    };
    fetchCounties();
  }, [API_BASE_URL]);

  // --- Fetch Incidents from the API endpoint ---
  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/get_incidents_api.php`);
      if (!response.ok) {
        throw new Error(`Failed to fetch incidents. Status: ${response.status}`);
      }
      const result = await response.json();
      if (result.status === 'success' && Array.isArray(result.data)) {
        // Ensure each incident has a valid lat/lng. You may need to sanitize or provide defaults.
        const sanitizedIncidents = result.data.map((incident: any) => ({
          ...incident,
          latitude: incident.latitude || -1.286389, // Default to Kenya's center if null
          longitude: incident.longitude || 36.817223,
          evidence: Array.isArray(incident.evidence) ? incident.evidence : [], // Ensure evidence is an array
        }));
        setIncidents(sanitizedIncidents);
      } else {
        setError('API returned an error or invalid data structure.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch Real-time Statistics ---
  const fetchStats = async (
    countyCode: string = '',
    constituencyCode: string = '',
    wardCode: string = '',
  ) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const postOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(countyCode && { county_code: countyCode }),
          ...(constituencyCode && { constituency_code: constituencyCode }),
          ...(wardCode && { ward_code: wardCode }),
        }),
      };

      const [totalIncidentsRes, incidentsByStatusRes, totalEvidenceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/get_total_incidents.php`, postOptions),
        fetch(`${API_BASE_URL}/get_incidents_by_status.php`, postOptions),
        fetch(`${API_BASE_URL}/get_total_evidence.php`, postOptions),
      ]);

      const totalIncidentsResult = await totalIncidentsRes.json();
      const incidentsByStatusResult = await incidentsByStatusRes.json();
      const totalEvidenceResult = await totalEvidenceRes.json();

      if (
        totalIncidentsResult.status === 'success' &&
        incidentsByStatusResult.status === 'success' &&
        totalEvidenceResult.status === 'success'
      ) {
        setWarRoomStats({
          totalIncidents: totalIncidentsResult.data.total_incidents,
          incidentsByStatus: incidentsByStatusResult.data,
          totalEvidence: totalEvidenceResult.data.total_evidence,
        });
      } else {
        setStatsError('Failed to fetch one or more statistics.');
      }
    } catch (e: any) {
      setStatsError(e.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStats(selectedCountyCode, selectedConstituencyCode, selectedWardCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountyCode, selectedConstituencyCode, selectedWardCode]);

  useEffect(() => {
    if (incidentToEdit) {
      setEditedIncidentForm(incidentToEdit);
    }
  }, [incidentToEdit]);

  useEffect(() => {
    let filtered = incidents;
    if (selectedCountyCode) filtered = filtered.filter((inc) => inc.county_code === selectedCountyCode);
    if (selectedConstituencyCode)
      filtered = filtered.filter((inc) => inc.constituency_code === selectedConstituencyCode);
    if (selectedWardCode) filtered = filtered.filter((inc) => inc.ward_code === selectedWardCode);
    if (filterText)
      filtered = filtered.filter(
        (inc) =>
          inc.title.toLowerCase().includes(filterText.toLowerCase()) ||
          inc.description.toLowerCase().includes(filterText.toLowerCase()) ||
          inc.pollingStationName.toLowerCase().includes(filterText.toLowerCase()),
      );
    setFilteredIncidents(filtered);
  }, [
    incidents,
    selectedCountyCode,
    selectedConstituencyCode,
    selectedWardCode,
    filterText,
  ]);

  // --- Handlers for cascading dropdowns using fetch API ---
  const handleCountyChange = async (countyCode: string) => {
    setSelectedCountyCode(countyCode);
    setSelectedConstituencyCode('');
    setSelectedWardCode('');
    setAvailableConstituencies([]);
    setAvailableWards([]);
    if (countyCode) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/get_constituencies_by_county.php?county_code=${countyCode}`,
        );
        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
          setAvailableConstituencies(result.data);
        } else {
          console.error(
            'API response for constituencies was not a success or data was not an array:',
            result,
          );
          setAvailableConstituencies([]);
        }
      } catch (e) {
        console.error('Failed to fetch constituencies:', e);
        setAvailableConstituencies([]);
      }
    }
  };

  const handleConstituencyChange = async (constituencyCode: string) => {
    setSelectedConstituencyCode(constituencyCode);
    setSelectedWardCode('');
    setAvailableWards([]);
    if (constituencyCode) {
      try {
        const response = await fetch(`${API_BASE_URL}/get_wards.php?const_code=${constituencyCode}`);
        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
          setAvailableWards(result.data);
        } else {
          console.error(
            'API response for wards was not a success or data was not an array:',
            result,
          );
          setAvailableWards([]);
        }
      } catch (e) {
        console.error('Failed to fetch wards:', e);
        setAvailableWards([]);
      }
    }
  };

  const handleWardChange = (wardCode: string) => {
    setSelectedWardCode(wardCode);
  };

  const resetFilters = () => {
    setSelectedCountyCode('');
    setSelectedConstituencyCode('');
    setSelectedWardCode('');
    setFilterText('');
  };

  // --- Handler for submitting a new incident via the modal form ---
  const handleAddIncidentSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const formData = {
        title: newIncidentForm.title,
        description: newIncidentForm.description,
        type: newIncidentForm.type,
        severity: newIncidentForm.severity,
        status: newIncidentForm.status,
        countyCode: newIncidentForm.county_code,
        constituencyCode: newIncidentForm.constituency_code,
        wardCode: newIncidentForm.ward_code,
        pollingStationName: newIncidentForm.pollingStationName,
        agentName: newIncidentForm.agentName,
      };

      const response = await fetch(`${API_BASE_URL}/submit_incident.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to add incident.');
      }

      setOpenAddIncidentModal(false);
      fetchIncidents();
      fetchStats();
    } catch (e: any) {
      console.error('Error adding incident:', e);
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
      setNewIncidentForm({
        title: '',
        description: '',
        type: 'Voter Suppression',
        severity: 'Medium',
        status: 'Reported',
        county_code: '',
        constituency_code: '',
        ward_code: '',
        pollingStationName: '',
        agentName: '',
      });
    }
  };

  // --- Handlers for the Edit Incident Dialog ---
  const handleEditIncident = (incident: Incident) => {
    setIncidentToEdit(incident);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setIncidentToEdit(null);
    setEditedIncidentForm(null);
  };

  // Text inputs handler
  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (editedIncidentForm && name) {
      setEditedIncidentForm((prev) => ({ ...prev!, [name]: value as any }));
    }
  };

  // Select inputs handler (MUI Select requires SelectChangeEvent)
  const handleEditSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (editedIncidentForm && name) {
      setEditedIncidentForm((prev) => ({ ...prev!, [name]: value as any }));
    }
  };

  const handleUpdateIncident = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/update_incident.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedIncidentForm),
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        handleCloseEditDialog();
        fetchIncidents();
        fetchStats();
      } else {
        console.error('Failed to update incident:', result.message);
      }
    } catch (error) {
      console.error('Error updating incident:', error);
    }
  };

  const getSeverityColor = (severity: 'High' | 'Medium' | 'Low') => {
    switch (severity) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'Reported':
        return 'info';
      case 'Under Review':
        return 'warning';
      case 'Evidence Required':
        return 'error';
      case 'Case Built':
        return 'success';
      case 'Closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleViewDetails = (incident: Incident) => {
    setSelectedIncident(incident);
    setOpenIncidentDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenIncidentDialog(false);
    setSelectedIncident(null);
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <Box sx={{ p: 4, bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
        >
          <Gavel sx={{ mr: 1 }} /> AI-Driven Legal War Room Dashboard
        </Typography>

        {/* 🔹 View switcher (Map vs Incidents) */}
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            boxShadow: 1,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeView}
            onChange={handleViewChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              value="map"
              icon={<Map sx={{ mr: 0.5 }} />}
              iconPosition="start"
              label="Heat Map View"
            />
            <Tab
              value="incidents"
              icon={<Assignment sx={{ mr: 0.5 }} />}
              iconPosition="start"
              label="Incident Log View"
            />
          </Tabs>
        </Card>

        {/* 🌍 MAP VIEW - ONLY MAP + SHORT INFO */}
        {activeView === 'map' && (
          <motion.div variants={itemVariants} initial="hidden" animate="visible">
            <Card
              variant="outlined"
              sx={{ mb: 4, p: 2, boxShadow: 2, bgcolor: 'background.paper' }}
            >
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
                <Map sx={{ mr: 1 }} /> AI-Driven Incident Heat Map
              </Typography>

              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '500px',
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <WarRoomMapDashboard incidents={filteredIncidents} />
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                This heat map visualizes incidents with an AI-driven severity score. Areas in{' '}
                <strong>red</strong> indicate a high concentration of critical incidents, requiring
                immediate attention.
              </Alert>
            </Card>
          </motion.div>
        )}

        {/* 📊 INCIDENTS VIEW - STATS + FILTERS + TABLE */}
        {activeView === 'incidents' && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {statsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : statsError ? (
              <Alert severity="error">{statsError}</Alert>
            ) : warRoomStats ? (
              <motion.div variants={itemVariants} initial="hidden" animate="visible">
                <Card
                  variant="outlined"
                  sx={{ mb: 4, p: 3, boxShadow: 2, bgcolor: 'background.paper' }}
                >
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
                    Incidents Overview
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard
                        title="Total Incidents"
                        value={warRoomStats.totalIncidents}
                        icon={<Warning fontSize="large" />}
                        color="error.main"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard
                        title="Under Review"
                        value={warRoomStats.incidentsByStatus['Under Review'] || 0}
                        icon={<Assignment fontSize="large" />}
                        color="warning.main"
                        progress={
                          warRoomStats.totalIncidents > 0
                            ? ((warRoomStats.incidentsByStatus['Under Review'] || 0) /
                              warRoomStats.totalIncidents) *
                            100
                            : 0
                        }
                        progressLabel={`Pending: ${warRoomStats.incidentsByStatus['Reported'] || 0
                          }`}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard
                        title="Cases Built"
                        value={warRoomStats.incidentsByStatus['Case Built'] || 0}
                        icon={<CheckCircleOutline fontSize="large" />}
                        color="success.main"
                        progress={
                          warRoomStats.totalIncidents > 0
                            ? ((warRoomStats.incidentsByStatus['Case Built'] || 0) /
                              warRoomStats.totalIncidents) *
                            100
                            : 0
                        }
                        progressLabel={`${(
                          ((warRoomStats.incidentsByStatus['Case Built'] || 0) /
                            warRoomStats.totalIncidents) *
                          100
                        ).toFixed(2)}% of total`}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard
                        title="Evidence Collected"
                        value={warRoomStats.totalEvidence}
                        icon={<CameraAlt fontSize="large" />}
                        color="info.main"
                      />
                    </Grid>
                  </Grid>
                </Card>
              </motion.div>
            ) : null}

            {/* Filters + Actions */}
            <Box
              sx={{
                mb: 4,
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <TextField
                label="Search Incidents"
                variant="outlined"
                size="small"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 200 }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>County</InputLabel>
                <Select
                  value={selectedCountyCode}
                  label="County"
                  onChange={(e) => handleCountyChange(e.target.value as string)}
                >
                  <MenuItem value="">
                    <em>All Counties</em>
                  </MenuItem>
                  {availableCounties.map((county) => (
                    <MenuItem key={county.county_id} value={county.county_code}>
                      {county.county_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }} disabled={!selectedCountyCode}>
                <InputLabel>Constituency</InputLabel>
                <Select
                  value={selectedConstituencyCode}
                  label="Constituency"
                  onChange={(e) => handleConstituencyChange(e.target.value as string)}
                >
                  <MenuItem value="">
                    <em>All Constituencies</em>
                  </MenuItem>
                  {availableConstituencies.map((constituency) => (
                    <MenuItem key={constituency.const_id} value={constituency.const_code}>
                      {constituency.constituency_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }} disabled={!selectedConstituencyCode}>
                <InputLabel>Ward</InputLabel>
                <Select
                  value={selectedWardCode}
                  label="Ward"
                  onChange={(e) => handleWardChange(e.target.value as string)}
                >
                  <MenuItem value="">
                    <em>All Wards</em>
                  </MenuItem>
                  {availableWards.map((ward) => (
                    <MenuItem key={ward.ward_id} value={ward.ward_code}>
                      {ward.ward_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" onClick={resetFilters}>
                Clear Filters
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenAddIncidentModal(true)}
              >
                Add New Incident
              </Button>
            </Box>

            <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 'medium' }}>
              Incident Log
            </Typography>
            <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Incident ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reported By</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : filteredIncidents.length > 0 ? (
                    filteredIncidents.map((incident) => (
                      <TableRow
                        key={incident.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          {incident.id}
                        </TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell>{incident.pollingStationName}</TableCell>
                        <TableCell>
                          <Chip
                            label={incident.severity}
                            color={getSeverityColor(incident.severity)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={incident.status}
                            color={getStatusColor(incident.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{incident.agentName}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton onClick={() => handleViewDetails(incident)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Incident">
                            <IconButton onClick={() => handleEditIncident(incident)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No incidents found matching the criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Add New Incident Modal */}
        <Dialog
          open={openAddIncidentModal}
          onClose={() => setOpenAddIncidentModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add New Incident</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Incident Title"
                  value={newIncidentForm.title}
                  onChange={(e) =>
                    setNewIncidentForm({ ...newIncidentForm, title: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={newIncidentForm.description}
                  onChange={(e) =>
                    setNewIncidentForm({ ...newIncidentForm, description: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newIncidentForm.type}
                    label="Type"
                    onChange={(e) =>
                      setNewIncidentForm({
                        ...newIncidentForm,
                        type: e.target.value as Incident['type'],
                      })
                    }
                  >
                    <MenuItem value="Voter Suppression">Voter Suppression</MenuItem>
                    <MenuItem value="Voter Bribery">Voter Bribery</MenuItem>
                    <MenuItem value="KIEMS Kit Failure">KIEMS Kit Failure</MenuItem>
                    <MenuItem value="Form 34A Discrepancy">Form 34A Discrepancy</MenuItem>
                    <MenuItem value="Ballot Tampering">Ballot Tampering</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={newIncidentForm.severity}
                    label="Severity"
                    onChange={(e) =>
                      setNewIncidentForm({
                        ...newIncidentForm,
                        severity: e.target.value as Incident['severity'],
                      })
                    }
                  >
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newIncidentForm.status}
                    label="Status"
                    onChange={(e) =>
                      setNewIncidentForm({
                        ...newIncidentForm,
                        status: e.target.value as Incident['status'],
                      })
                    }
                  >
                    <MenuItem value="Reported">Reported</MenuItem>
                    <MenuItem value="Under Review">Under Review</MenuItem>
                    <MenuItem value="Evidence Required">Evidence Required</MenuItem>
                    <MenuItem value="Case Built">Case Built</MenuItem>
                    <MenuItem value="Closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Agent Name"
                  value={newIncidentForm.agentName}
                  onChange={(e) =>
                    setNewIncidentForm({ ...newIncidentForm, agentName: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>County</InputLabel>
                  <Select
                    name="county_code"
                    value={newIncidentForm.county_code}
                    label="County"
                    onChange={(e) =>
                      setNewIncidentForm({
                        ...newIncidentForm,
                        county_code: e.target.value as string,
                      })
                    }
                  >
                    {availableCounties.map((county) => (
                      <MenuItem key={county.county_id} value={county.county_code}>
                        {county.county_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth disabled={!newIncidentForm.county_code}>
                  <InputLabel>Constituency</InputLabel>
                  <Select
                    name="constituency_code"
                    value={newIncidentForm.constituency_code}
                    label="Constituency"
                    onChange={(e) =>
                      setNewIncidentForm({
                        ...newIncidentForm,
                        constituency_code: e.target.value as string,
                      })
                    }
                  >
                    {availableConstituencies.map((constituency) => (
                      <MenuItem key={constituency.const_id} value={constituency.const_code}>
                        {constituency.constituency_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth disabled={!newIncidentForm.constituency_code}>
                  <InputLabel>Ward</InputLabel>
                  <Select
                    name="ward_code"
                    value={newIncidentForm.ward_code}
                    label="Ward"
                    onChange={(e) =>
                      setNewIncidentForm({
                        ...newIncidentForm,
                        ward_code: e.target.value as string,
                      })
                    }
                  >
                    {availableWards.map((ward) => (
                      <MenuItem key={ward.ward_id} value={ward.ward_code}>
                        {ward.ward_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Polling Station Name"
                  value={newIncidentForm.pollingStationName}
                  onChange={(e) =>
                    setNewIncidentForm({
                      ...newIncidentForm,
                      pollingStationName: e.target.value,
                    })
                  }
                />
              </Grid>
            </Grid>
            {submitError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {submitError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddIncidentModal(false)} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleAddIncidentSubmit}
              color="primary"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Add Incident'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Incident Details Dialog */}
        <Dialog
          open={openIncidentDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Incident Details: {selectedIncident?.title}</DialogTitle>
          <DialogContent dividers>
            {selectedIncident && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Description
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {selectedIncident.description}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Type:</strong> {selectedIncident.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Severity:</strong>{' '}
                      <Chip
                        label={selectedIncident.severity}
                        color={getSeverityColor(selectedIncident.severity)}
                        size="small"
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Status:</strong>{' '}
                      <Chip
                        label={selectedIncident.status}
                        color={getStatusColor(selectedIncident.status)}
                        size="small"
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Location:</strong> {selectedIncident.pollingStationName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Reported By:</strong> {selectedIncident.agentName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Timestamp:</strong>{' '}
                      {new Date(selectedIncident.timestamp).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      Evidence ({selectedIncident.evidence.length})
                    </Typography>
                    <List dense>
                      {selectedIncident.evidence.map((ev) => (
                        <ListItem key={ev.id}>
                          <ListItemText
                            primary={`${ev.type.toUpperCase()} Evidence`}
                            secondary={`Notes: ${ev.notes || 'None'}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Incident Dialog */}
        <Dialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Incident</DialogTitle>
          <DialogContent dividers>
            {editedIncidentForm && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Title"
                    name="title"
                    value={editedIncidentForm.title}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    multiline
                    rows={4}
                    value={editedIncidentForm.description}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={editedIncidentForm.status}
                      label="Status"
                      onChange={handleEditSelectChange}
                    >
                      <MenuItem value="Reported">Reported</MenuItem>
                      <MenuItem value="Under Review">Under Review</MenuItem>
                      <MenuItem value="Evidence Required">Evidence Required</MenuItem>
                      <MenuItem value="Case Built">Case Built</MenuItem>
                      <MenuItem value="Closed">Closed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Severity</InputLabel>
                    <Select
                      name="severity"
                      value={editedIncidentForm.severity}
                      label="Severity"
                      onChange={handleEditSelectChange}
                    >
                      <MenuItem value="High">High</MenuItem>
                      <MenuItem value="Medium">Medium</MenuItem>
                      <MenuItem value="Low">Low</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleUpdateIncident} color="primary" variant="contained">
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  );
};

export default LegalWarRoomDashboard;
