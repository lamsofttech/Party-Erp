// src/pages/IncidentReportingPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select'; // ✅ Correct import for Select & SelectChangeEvent
import { motion } from 'framer-motion';
import { PersonAdd, HomeWork, CheckCircle, GroupAdd } from '@mui/icons-material';

// Import the new modal components
import OnboardAgentModal from '../components/OnboardAgentModal';
import ViewAssignedAgentsModal from '../components/ViewAssignedAgentsModal';

// --- Interfaces for Data ---
interface County {
  id: string; // maps to county_code from API
  name: string; // maps to county_name from API
  code: string; // redundant, same as 'id'
}

interface Constituency {
  id: string; // maps to const_code from API
  name: string; // maps to constituency_name from API
  county_code: string;
}

interface Ward {
  id: string; // maps to ward_code from API
  name: string; // maps to ward_name from API
  const_code: string;
}

export interface Agent {
  id: string;
  name: string;
  status: 'Recruited' | 'Vetted' | 'Trained' | 'Assigned' | 'Available' | 'On Leave';
  assignedPollingStationId?: string;
  contact: string;
  county: string;
  constituency: string;
  ward: string;
}

export interface PollingStation {
  id: string; // API polling_station table ID
  name: string; // reg_centre_name / polling_station_name from API
  county: string;
  constituency: string;
  ward: string;
  agentCount: number; // calculated
  requiredAgents: number; // default or fetched
}

interface CountyStats {
  totalStations: number;
  agentsRequired: number;
  agentsRecruited: number;
  agentsVetted: number;
  agentsTrained: number;
  agentsAssigned: number;
  stationsWithAgents: number;
  stationsNeedingAgents: number;
}

// --- Dummy Data (to be replaced by API progressively) ---
const DUMMY_POLLING_STATIONS: { id: string; name: string; agentCount: number; requiredAgents: number }[] = [
  { id: '1', name: 'Kasarani Primary', agentCount: 2, requiredAgents: 3 },
  { id: '2', name: 'Ruaraka Secondary', agentCount: 3, requiredAgents: 3 },
  { id: '5', name: 'Kibra Community Centre', agentCount: 1, requiredAgents: 3 },
  { id: '3', name: 'Likoni Social Hall', agentCount: 1, requiredAgents: 2 },
  { id: '4', name: 'Mvita CDF Hall', agentCount: 2, requiredAgents: 2 },
  { id: '6', name: 'Manyatta Sports Ground', agentCount: 2, requiredAgents: 2 },
];

const DUMMY_AGENTS: Agent[] = [
  { id: 'AGT001', name: 'John Doe', status: 'Assigned', assignedPollingStationId: '1', contact: '0712345678', county: 'Nairobi', constituency: 'Kasarani', ward: 'Mwiki' },
  { id: 'AGT002', name: 'Jane Smith', status: 'Assigned', assignedPollingStationId: '2', contact: '0723456789', county: 'Nairobi', constituency: 'Ruaraka', ward: 'Baba Dogo' },
  { id: 'AGT003', name: 'Peter Jones', status: 'Available', contact: '0734567890', county: 'Nairobi', constituency: 'Kasarani', ward: 'Mwiki' },
  { id: 'AGT007', name: 'Alice Blue', status: 'Available', contact: '0778901234', county: 'Nairobi', constituency: 'Kibra', ward: 'Sarang’ombe' },
  { id: 'AGT004', name: 'Mary Brown', status: 'Trained', contact: '0745678901', county: 'Mombasa', constituency: 'Likoni', ward: 'Shika Adabu' },
  { id: 'AGT005', name: 'David Green', status: 'Recruited', contact: '0756789012', county: 'Mombasa', constituency: 'Mvita', ward: 'Majengo' },
  { id: 'AGT006', name: 'Sarah White', status: 'Assigned', assignedPollingStationId: '3', contact: '0767890123', county: 'Mombasa', constituency: 'Likoni', ward: 'Shika Adabu' },
  { id: 'AGT008', name: 'Robert Red', status: 'Vetted', contact: '0789012345', county: 'Kisumu', constituency: 'Kisumu Central', ward: 'Manyatta B' },
];

// Helper component for statistics cards
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  progressLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, progress, progressLabel }) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: 2,
      borderLeft: `5px solid ${color}`,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ color: color, mr: 1 }}>{icon}</Box>
      <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
      {value}
    </Typography>
    {progress !== undefined && (
      <Box sx={{ width: '100%', mt: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 5, mb: 0.5 }}
          color={progress === 100 ? 'success' : 'primary'}
        />
        <Typography variant="caption" color="text.secondary">
          {progressLabel}
        </Typography>
      </Box>
    )}
  </Card>
);

const IncidentReportingPage: React.FC = () => {
  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [countyFetchError, setCountyFetchError] = useState<string | null>(null);
  const [loadingCounties, setLoadingCounties] = useState<boolean>(true);

  const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([]);
  const [constituencyFetchError, setConstituencyFetchError] = useState<string | null>(null);
  const [loadingConstituencies, setLoadingConstituencies] = useState<boolean>(false);

  const [availableWards, setAvailableWards] = useState<Ward[]>([]);
  const [wardFetchError, setWardFetchError] = useState<string | null>(null);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

  // State for raw polling stations fetched from API
  const [rawApiPollingStations, setRawApiPollingStations] = useState<PollingStation[]>([]);
  const [pollingStationFetchError, setPollingStationFetchError] = useState<string | null>(null);
  const [loadingPollingStations, setLoadingPollingStations] = useState<boolean>(false);

  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [selectedCountyCode, setSelectedCountyCode] = useState<string | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<string>('');
  const [selectedConstituencyCode, setSelectedConstituencyCode] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedWardCode, setSelectedWardCode] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [countyStats, setCountyStats] = useState<CountyStats | null>(null);
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [viewMode, setViewMode] = useState<'stations' | 'agents'>('stations');

  // Agent Onboarding Modal
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [selectedPollingStationForOnboard, setSelectedPollingStationForOnboard] = useState<PollingStation | null>(null);

  // View Assigned Agents Modal
  const [isViewAgentsModalOpen, setIsViewAgentsModalOpen] = useState<boolean>(false);
  const [selectedPollingStationForView, setSelectedPollingStationForView] = useState<PollingStation | null>(null);

  // --- Fetch Data from APIs ---
  useEffect(() => {
    const fetchCounties = async () => {
      setLoadingCounties(true);
      setCountyFetchError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/get_counties.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          const fetchedCounties: County[] = result.data.map((item: any) => ({
            id: item.county_code,
            name: item.county_name,
            code: item.county_code,
          }));
          setAvailableCounties(fetchedCounties);
        } else {
          console.error('Unexpected county payload:', result);
          setCountyFetchError("County data isn't in the expected format.");
          setAvailableCounties([]);
        }
      } catch (error) {
        console.error('Failed to fetch counties:', error);
        setCountyFetchError(
          `Could not load counties. Please ensure the API is running correctly at https://skizagroundsuite.com/API/get_counties.php. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        setLoadingCounties(false);
      }
    };

    fetchCounties();
  }, []);

  useEffect(() => {
    if (!selectedCountyCode) {
      setAvailableConstituencies([]);
      setSelectedConstituency('');
      setSelectedConstituencyCode(null);
      setSelectedWard('');
      setSelectedWardCode(null);
      return;
    }

    const fetchConstituencies = async (countyCode: string) => {
      setLoadingConstituencies(true);
      setConstituencyFetchError(null);
      try {
        const response = await fetch(`https://skizagroundsuite.com/API/get_constituencies.php?county_code=${countyCode}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          const fetchedConstituencies: Constituency[] = result.data.map((item: any) => ({
            id: item.const_code,
            name: item.constituency_name,
            county_code: countyCode,
          }));
          setAvailableConstituencies(fetchedConstituencies);
        } else {
          console.error('Unexpected constituencies payload:', result);
          setConstituencyFetchError("Constituency data isn't in the expected format.");
          setAvailableConstituencies([]);
        }
      } catch (error) {
        console.error('Failed to fetch constituencies:', error);
        setConstituencyFetchError(
          `Could not load constituencies. Please ensure the API is running correctly. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        setLoadingConstituencies(false);
      }
    };

    fetchConstituencies(selectedCountyCode);
  }, [selectedCountyCode]);

  useEffect(() => {
    if (!selectedConstituencyCode) {
      setAvailableWards([]);
      setSelectedWard('');
      setSelectedWardCode(null);
      return;
    }

    const fetchWards = async (constCode: string) => {
      setLoadingWards(true);
      setWardFetchError(null);
      try {
        const response = await fetch(`https://skizagroundsuite.com/API/get_wards.php?const_code=${constCode}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          const fetchedWards: Ward[] = result.data.map((item: any) => ({
            id: item.ward_code,
            name: item.ward_name,
            const_code: constCode,
          }));
          setAvailableWards(fetchedWards);
        } else {
          console.error('Unexpected wards payload:', result);
          setWardFetchError("Ward data isn't in the expected format.");
          setAvailableWards([]);
        }
      } catch (error) {
        console.error('Failed to fetch wards:', error);
        setWardFetchError(
          `Could not load wards. Please ensure the API is running correctly at https://skizagroundsuite.com/API/get_wards.php. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        setLoadingWards(false);
      }
    };

    fetchWards(selectedConstituencyCode);
  }, [selectedConstituencyCode]);

  useEffect(() => {
    if (!selectedWardCode) {
      setRawApiPollingStations([]);
      return;
    }

    const fetchPollingStations = async (wardCode: string) => {
      setLoadingPollingStations(true);
      setPollingStationFetchError(null);
      try {
        const response = await fetch(`https://skizagroundsuite.com/API/get_polling_stations.php?ward_code=${wardCode}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.polling_centers)) {
          const fetchedRawStations: PollingStation[] = result.polling_centers.map((item: any) => ({
            id: String(item.id),
            name: item.polling_station_name,
            county: selectedCounty,
            constituency: selectedConstituency,
            ward: selectedWard,
            agentCount: 0,
            requiredAgents: 0,
          }));
          setRawApiPollingStations(fetchedRawStations);
        } else {
          console.error('Unexpected polling stations payload:', result);
          setPollingStationFetchError('Polling station data is not in the expected format.');
          setRawApiPollingStations([]);
        }
      } catch (error) {
        console.error('Failed to fetch polling stations:', error);
        setPollingStationFetchError(
          `Could not load polling stations. Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setLoadingPollingStations(false);
      }
    };

    fetchPollingStations(selectedWardCode);
  }, [selectedWardCode, selectedCounty, selectedConstituency, selectedWard]);

  // --- Data Transformation and Aggregation ---
  const fetchDataAndAggregate = useCallback(() => {
    if (!selectedCounty) {
      setPollingStations([]);
      setAgents([]);
      setCountyStats(null);
      return;
    }

    setLoadingData(true);

    const timeoutId = setTimeout(() => {
      let currentPollingStations: PollingStation[] = [];
      let filteredAgents: Agent[] = [];

      if (selectedWardCode && rawApiPollingStations.length > 0) {
        currentPollingStations = rawApiPollingStations;
      } else if (selectedConstituencyCode) {
        currentPollingStations = DUMMY_POLLING_STATIONS
          .filter((dps) => {
            const apiStation = rawApiPollingStations.find((aps) => String(aps.id) === dps.id);
            return apiStation?.constituency === selectedConstituency;
          })
          .map((dps) => ({
            id: dps.id,
            name: dps.name,
            county: selectedCounty,
            constituency: selectedConstituency,
            ward: '',
            agentCount: dps.agentCount,
            requiredAgents: dps.requiredAgents,
          }));
      } else {
        currentPollingStations = DUMMY_POLLING_STATIONS
          .filter((dps) => {
            const apiStation = rawApiPollingStations.find((aps) => String(aps.id) === dps.id);
            return apiStation?.county === selectedCounty;
          })
          .map((dps) => ({
            id: dps.id,
            name: dps.name,
            county: selectedCounty,
            constituency: '',
            ward: '',
            agentCount: dps.agentCount,
            requiredAgents: dps.requiredAgents,
          }));
      }

      currentPollingStations = currentPollingStations.map((station) => {
        const assignedAgents = DUMMY_AGENTS.filter((agent) => agent.assignedPollingStationId === station.id).length;
        const dummyStationData = DUMMY_POLLING_STATIONS.find((dps) => String(dps.id) === station.id);

        return {
          ...station,
          agentCount: assignedAgents,
          requiredAgents: dummyStationData ? dummyStationData.requiredAgents : 3,
        };
      });

      filteredAgents = DUMMY_AGENTS.filter((agent) => {
        let matches = agent.county === selectedCounty;
        if (selectedConstituency) matches = matches && agent.constituency === selectedConstituency;
        if (selectedWard) matches = matches && agent.ward === selectedWard;
        return matches;
      });

      const totalAgentsRequired = currentPollingStations.reduce((sum, ps) => sum + ps.requiredAgents, 0);

      const currentStats: CountyStats = {
        totalStations: currentPollingStations.length,
        agentsRequired: totalAgentsRequired,
        agentsRecruited: filteredAgents.filter((a) => a.status !== 'On Leave').length,
        agentsVetted: filteredAgents.filter((a) => ['Vetted', 'Trained', 'Assigned', 'Available'].includes(a.status)).length,
        agentsTrained: filteredAgents.filter((a) => ['Trained', 'Assigned', 'Available'].includes(a.status)).length,
        agentsAssigned: filteredAgents.filter((a) => a.status === 'Assigned').length,
        stationsWithAgents: currentPollingStations.filter((ps) => ps.agentCount >= ps.requiredAgents).length,
        stationsNeedingAgents: currentPollingStations.filter((ps) => ps.agentCount < ps.requiredAgents).length,
      };

      setPollingStations(currentPollingStations);
      setAgents(filteredAgents);
      setCountyStats(currentStats);
      setLoadingData(false);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [selectedCounty, selectedConstituency, selectedWard, selectedConstituencyCode, selectedWardCode, rawApiPollingStations]);

  // --- Change Handlers for Selects ---
  const handleCountyChange = (countyName: string) => {
    setSelectedCounty(countyName);
    const county = availableCounties.find((c) => c.name === countyName);
    setSelectedCountyCode(county ? county.id : null);
    setSelectedConstituency('');
    setSelectedConstituencyCode(null);
    setSelectedWard('');
    setSelectedWardCode(null);
    setRawApiPollingStations([]);
    setPollingStationFetchError(null);
  };

  const handleConstituencyChange = (constituencyName: string) => {
    setSelectedConstituency(constituencyName);
    const constituency = availableConstituencies.find((c) => c.name === constituencyName);
    setSelectedConstituencyCode(constituency ? constituency.id : null);
    setSelectedWard('');
    setSelectedWardCode(null);
    setRawApiPollingStations([]);
    setPollingStationFetchError(null);
  };

  const handleWardChange = (wardName: string) => {
    setSelectedWard(wardName);
    const ward = availableWards.find((w) => w.name === wardName);
    setSelectedWardCode(ward ? ward.id : null);
    setPollingStationFetchError(null);
  };

  useEffect(() => {
    fetchDataAndAggregate();
  }, [fetchDataAndAggregate]);

  const getAgentStatusChipColor = (status: Agent['status']) => {
    switch (status) {
      case 'Assigned':
        return 'success';
      case 'Available':
        return 'info';
      case 'Recruited':
        return 'primary';
      case 'Vetted':
        return 'warning';
      case 'Trained':
        return 'secondary';
      case 'On Leave':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateProgress = (current: number, total: number) => (total > 0 ? (current / total) * 100 : 0);

  // --- Agent Onboarding Modal Handlers ---
  const handleOpenOnboardModal = (station: PollingStation) => {
    setSelectedPollingStationForOnboard(station);
    setIsOnboardModalOpen(true);
  };

  const handleCloseOnboardModal = () => {
    setIsOnboardModalOpen(false);
    setSelectedPollingStationForOnboard(null);
  };

  const handleAgentOnboardedSuccess = () => {
    console.log('Agent onboarded successfully! Refreshing data...');
    fetchDataAndAggregate();
  };

  // --- View Assigned Agents Modal Handlers ---
  const handleOpenViewAgentsModal = (station: PollingStation) => {
    console.log('Opening view agents modal for:', station.name);
    setSelectedPollingStationForView(station);
    setIsViewAgentsModalOpen(true);
  };

  const handleCloseViewAgentsModal = () => {
    console.log('Closing view agents modal.');
    setIsViewAgentsModalOpen(false);
    setSelectedPollingStationForView(null);
  };

  return (
    <Box sx={{ p: 4 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          <GroupAdd sx={{ mr: 1 }} /> Agent Onboarding Room
        </Typography>

        {/* Hierarchical County > Constituency > Ward Selectors */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="county-select-label">County</InputLabel>
            {loadingCounties ? (
              <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
            ) : countyFetchError ? (
              <Alert severity="error" sx={{ mt: 1 }}>
                {countyFetchError}
              </Alert>
            ) : (
              <Select
                labelId="county-select-label"
                id="county-select"
                value={selectedCounty}
                label="County"
                onChange={(e: SelectChangeEvent<string>) => handleCountyChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select County</em>
                </MenuItem>
                {availableCounties.map((county) => (
                  <MenuItem key={county.id} value={county.name}>
                    {county.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          {selectedCounty && (
            <FormControl sx={{ minWidth: 200 }} disabled={!selectedCounty}>
              <InputLabel id="constituency-select-label">Constituency</InputLabel>
              {loadingConstituencies ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : constituencyFetchError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {constituencyFetchError}
                </Alert>
              ) : (
                <Select
                  labelId="constituency-select-label"
                  id="constituency-select"
                  value={selectedConstituency}
                  label="Constituency"
                  onChange={(e: SelectChangeEvent<string>) => handleConstituencyChange(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Constituency</em>
                  </MenuItem>
                  {availableConstituencies.map((constituency) => (
                    <MenuItem key={constituency.id} value={constituency.name}>
                      {constituency.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}

          {selectedConstituency && (
            <FormControl sx={{ minWidth: 200 }} disabled={!selectedConstituency}>
              <InputLabel id="ward-select-label">Ward</InputLabel>
              {loadingWards ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : wardFetchError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {wardFetchError}
                </Alert>
              ) : (
                <Select
                  labelId="ward-select-label"
                  id="ward-select"
                  value={selectedWard}
                  label="Ward"
                  onChange={(e: SelectChangeEvent<string>) => handleWardChange(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Ward</em>
                  </MenuItem>
                  {availableWards.map((ward) => (
                    <MenuItem key={ward.id} value={ward.name}>
                      {ward.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}
        </Box>

        {!selectedCounty ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography variant="h6">Please select a county to begin managing agents and polling stations.</Typography>
          </Box>
        ) : (
          <>
            {loadingData || loadingPollingStations ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {pollingStationFetchError && <Alert severity="error">{pollingStationFetchError}</Alert>}

                {countyStats && (
                  <Card variant="outlined" sx={{ mb: 4, p: 3, boxShadow: 2 }}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
                      Overview for {selectedCounty} County
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Total Stations" value={countyStats.totalStations} icon={<HomeWork fontSize="large" />} color="info.main" />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Agents Recruited"
                          value={countyStats.agentsRecruited}
                          icon={<PersonAdd fontSize="large" />}
                          color="primary.main"
                          progress={calculateProgress(countyStats.agentsRecruited, countyStats.agentsRequired)}
                          progressLabel={`Needed: ${countyStats.agentsRequired}`}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Agents Assigned"
                          value={countyStats.agentsAssigned}
                          icon={<CheckCircle fontSize="large" />}
                          color="success.main"
                          progress={calculateProgress(countyStats.agentsAssigned, countyStats.agentsRequired)}
                          progressLabel={`Assigned: ${countyStats.agentsAssigned}/${countyStats.agentsRequired}`}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Stations Fully Staffed"
                          value={countyStats.stationsWithAgents}
                          icon={<HomeWork fontSize="large" />}
                          color="warning.main"
                          progress={calculateProgress(countyStats.stationsWithAgents, countyStats.totalStations)}
                          progressLabel={`Staffed: ${countyStats.stationsWithAgents}/${countyStats.totalStations}`}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                )}

                {/* Search & Filtering (County-Scoped) */}
                <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField label="Search Agents/Stations" variant="outlined" size="small" sx={{ flexGrow: 1, maxWidth: 300 }} />
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel id="agent-status-label" size="small">
                      Agent Status
                    </InputLabel>
                    <Select labelId="agent-status-label" label="Agent Status" size="small" value="">
                      <MenuItem value="">
                        <em>All</em>
                      </MenuItem>
                      <MenuItem value="Assigned">Assigned</MenuItem>
                      <MenuItem value="Available">Available</MenuItem>
                      <MenuItem value="Trained">Trained</MenuItem>
                      <MenuItem value="Vetted">Vetted</MenuItem>
                      <MenuItem value="Recruited">Recruited</MenuItem>
                      <MenuItem value="On Leave">On Leave</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => {
                      alert(
                        "This 'Onboard New Agent' button is currently not linked to a specific polling station. Please use the 'Onboard Agent' button on a station card, or extend the modal to select a station.",
                      );
                      setIsOnboardModalOpen(true);
                      setSelectedPollingStationForOnboard(null);
                    }}
                  >
                    Onboard New Agent
                  </Button>
                  <Button variant="outlined" onClick={() => setViewMode(viewMode === 'stations' ? 'agents' : 'stations')}>
                    Switch to {viewMode === 'stations' ? 'Agents List' : 'Stations List'}
                  </Button>
                </Box>

                {/* Display based on View Mode */}
                {viewMode === 'stations' ? (
                  <>
                    <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: 'medium' }}>
                      Polling Stations ({pollingStations.length})
                    </Typography>
                    {pollingStations.length === 0 ? (
                      <Typography color="text.secondary">No polling stations found for the selected criteria.</Typography>
                    ) : (
                      <Grid container spacing={3}>
                        {pollingStations.map((station) => (
                          <Grid item xs={12} sm={6} md={4} key={station.id}>
                            <motion.div whileHover={{ scale: 1.02 }} style={{ height: '100%' }}>
                              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <CardContent>
                                  <Typography variant="h6" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                                    {station.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {station.county} &gt; {station.constituency} {station.ward && `> ${station.ward}`}
                                  </Typography>
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="body1">
                                      Agents:{' '}
                                      <Chip
                                        label={`${station.agentCount} / ${station.requiredAgents}`}
                                        color={station.agentCount >= station.requiredAgents ? 'success' : 'warning'}
                                        size="small"
                                      />
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={calculateProgress(station.agentCount, station.requiredAgents)}
                                      sx={{ mt: 1, height: 8, borderRadius: 5 }}
                                      color={station.agentCount >= station.requiredAgents ? 'success' : 'primary'}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                      {station.agentCount >= station.requiredAgents ? 'Fully Staffed' : 'Needs more agents'}
                                    </Typography>
                                  </Box>
                                </CardContent>
                                <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                  <Button size="small" variant="outlined" onClick={() => handleOpenViewAgentsModal(station)}>
                                    View Agents
                                  </Button>
                                  <Button size="small" variant="contained" onClick={() => handleOpenOnboardModal(station)}>
                                    Onboard Agent
                                  </Button>
                                </Box>
                              </Card>
                            </motion.div>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </>
                ) : (
                  <>
                    <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: 'medium' }}>
                      Agents List ({agents.length})
                    </Typography>
                    {agents.length === 0 ? (
                      <Typography color="text.secondary">No agents found for the selected criteria.</Typography>
                    ) : (
                      <Grid container spacing={3}>
                        {agents.map((agent) => (
                          <Grid item xs={12} sm={6} md={4} key={agent.id}>
                            <motion.div whileHover={{ scale: 1.02 }} style={{ height: '100%' }}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="h6" component="div">
                                    {agent.name}{' '}
                                    <Chip label={agent.status} size="small" color={getAgentStatusChipColor(agent.status)} sx={{ ml: 1 }} />
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    ID: {agent.id} | Contact: {agent.contact}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Location: {agent.ward}, {agent.constituency}, {agent.county}
                                  </Typography>
                                  {agent.assignedPollingStationId && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                      Assigned to: PS- {agent.assignedPollingStationId}
                                    </Typography>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </motion.div>

      {/* Onboard Agent Modal */}
      {selectedPollingStationForOnboard && (
        <OnboardAgentModal
          open={isOnboardModalOpen}
          onClose={handleCloseOnboardModal}
          pollingStation={selectedPollingStationForOnboard}
          onAgentOnboarded={handleAgentOnboardedSuccess}
        />
      )}

      {/* View Assigned Agents Modal */}
      {selectedPollingStationForView && (
        <ViewAssignedAgentsModal
          open={isViewAgentsModalOpen}
          onClose={handleCloseViewAgentsModal}
          pollingStation={selectedPollingStationForView}
          agents={agents} // ✅ modal must accept this prop in its props interface
        />
      )}
    </Box>
  );
};

export default IncidentReportingPage;
