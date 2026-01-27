// src/pages/RecruitManageAgentsPage.tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import { motion } from 'framer-motion';
import { PersonAdd, HomeWork, CheckCircle, GroupAdd } from '@mui/icons-material';

// Modals (ensure these paths and prop types match your components)
import OnboardMCACandidateModal from '../components/OnboardMCACandidateModal';
import ViewAssignedAgentsModal from '../components/ViewAssignedAgentsModal';

/** ---------- Types ---------- */
interface County {
  id: string;      // county_code
  name: string;    // county_name
  code: string;    // same as id
}

interface Constituency {
  id: string;          // const_code
  name: string;        // constituency_name
  county_code: string; // link to county
}

interface Ward {
  id: string;       // ward_code
  name: string;     // ward_name
  const_code: string;
}

export interface MCA {
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
  id: string;        // from API
  name: string;      // polling_station_name
  county: string;
  constituency: string;
  ward: string;
  agentCount: number;
  requiredAgents: number;
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

/** ---------- Dummy data (replace as your APIs expand) ---------- */
const DUMMY_POLLING_STATIONS: Array<{
  id: string;
  name: string;
  agentCount: number;
  requiredAgents: number;
}> = [
  { id: '1', name: 'Kasarani Primary', agentCount: 2, requiredAgents: 3 },
  { id: '2', name: 'Ruaraka Secondary', agentCount: 3, requiredAgents: 3 },
  { id: '5', name: 'Kibra Community Centre', agentCount: 1, requiredAgents: 3 },
  { id: '3', name: 'Likoni Social Hall', agentCount: 1, requiredAgents: 2 },
  { id: '4', name: 'Mvita CDF Hall', agentCount: 2, requiredAgents: 2 },
  { id: '6', name: 'Manyatta Sports Ground', agentCount: 2, requiredAgents: 2 },
];

const DUMMY_AGENTS: MCA[] = [
  { id: 'AGT001', name: 'John Doe', status: 'Assigned', assignedPollingStationId: '1', contact: '0712345678', county: 'Nairobi', constituency: 'Kasarani', ward: 'Mwiki' },
  { id: 'AGT002', name: 'Jane Smith', status: 'Assigned', assignedPollingStationId: '2', contact: '0723456789', county: 'Nairobi', constituency: 'Ruaraka', ward: 'Baba Dogo' },
  { id: 'AGT003', name: 'Peter Jones', status: 'Available', contact: '0734567890', county: 'Nairobi', constituency: 'Kasarani', ward: 'Mwiki' },
  { id: 'AGT007', name: 'Alice Blue', status: 'Available', contact: '0778901234', county: 'Nairobi', constituency: 'Kibra', ward: 'Sarang’ombe' },
  { id: 'AGT004', name: 'Mary Brown', status: 'Trained', contact: '0745678901', county: 'Mombasa', constituency: 'Likoni', ward: 'Shika Adabu' },
  { id: 'AGT005', name: 'David Green', status: 'Recruited', contact: '0756789012', county: 'Mombasa', constituency: 'Mvita', ward: 'Majengo' },
  { id: 'AGT006', name: 'Sarah White', status: 'Assigned', assignedPollingStationId: '3', contact: '0767890123', county: 'Mombasa', constituency: 'Likoni', ward: 'Shika Adabu' },
  { id: 'AGT008', name: 'Robert Red', status: 'Vetted', contact: '0789012345', county: 'Kisumu', constituency: 'Kisumu Central', ward: 'Manyatta B' },
];

/** ---------- Small UI helper ---------- */
interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  progress?: number;
  progressLabel?: string;
}

const StatCard = ({ title, value, icon, color, progress, progressLabel }: StatCardProps) => (
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
      <Box sx={{ color, mr: 1 }}>{icon}</Box>
      <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
      {value}
    </Typography>
    {typeof progress === 'number' && (
      <Box sx={{ width: '100%', mt: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 5, mb: 0.5 }}
          color={progress >= 100 ? 'success' : 'primary'}
        />
        <Typography variant="caption" color="text.secondary">
          {progressLabel}
        </Typography>
      </Box>
    )}
  </Card>
);

/** ---------- Page ---------- */
const RecruitManageAgentsPage = () => {
  const navigate = useNavigate();

  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [countyFetchError, setCountyFetchError] = useState<string | null>(null);
  const [loadingCounties, setLoadingCounties] = useState<boolean>(true);

  const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([]);
  const [constituencyFetchError, setConstituencyFetchError] = useState<string | null>(null);
  const [loadingConstituencies, setLoadingConstituencies] = useState<boolean>(false);

  const [availableWards, setAvailableWards] = useState<Ward[]>([]);
  const [wardFetchError, setWardFetchError] = useState<string | null>(null);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

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
  const [, setAgents] = useState<MCA[]>([]); // keep setter only to avoid unused variable

  // Modals
  const [isOnboardMCAModalOpen, setIsOnboardMCAModalOpen] = useState<boolean>(false);
  const [selectedPollingStationForOnboard, setSelectedPollingStationForOnboard] = useState<PollingStation | null>(null);

  const [isViewAgentsModalOpen, setIsViewAgentsModalOpen] = useState<boolean>(false);
  const [selectedPollingStationForView, setSelectedPollingStationForView] = useState<PollingStation | null>(null);

  /** -------- Fetch: Counties -------- */
  useEffect(() => {
    const fetchCounties = async () => {
      setLoadingCounties(true);
      setCountyFetchError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/get_counties.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result?.status === 'success' && Array.isArray(result.data)) {
          const fetched: County[] = result.data.map((item: any) => ({
            id: String(item.county_code),
            name: String(item.county_name),
            code: String(item.county_code),
          }));
          setAvailableCounties(fetched);
        } else {
          setCountyFetchError("County data format unexpected (missing 'status' or 'data').");
          setAvailableCounties([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setCountyFetchError(`Could not load counties. Error: ${msg}`);
      } finally {
        setLoadingCounties(false);
      }
    };

    void fetchCounties();
  }, []);

  /** -------- Fetch: Constituencies (by county) -------- */
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
        const response = await fetch(`https://skizagroundsuite.com/API/get_constituencies.php?county_code=${encodeURIComponent(countyCode)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result?.status === 'success' && Array.isArray(result.data)) {
          const fetched: Constituency[] = result.data.map((item: any) => ({
            id: String(item.const_code),
            name: String(item.constituency_name),
            county_code: countyCode,
          }));
          setAvailableConstituencies(fetched);
        } else {
          setConstituencyFetchError("Constituency data format unexpected.");
          setAvailableConstituencies([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setConstituencyFetchError(`Could not load constituencies. Error: ${msg}`);
      } finally {
        setLoadingConstituencies(false);
      }
    };

    void fetchConstituencies(selectedCountyCode);
  }, [selectedCountyCode]);

  /** -------- Fetch: Wards (by constituency) -------- */
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
        const response = await fetch(`https://skizagroundsuite.com/API/get_wards.php?const_code=${encodeURIComponent(constCode)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result?.status === 'success' && Array.isArray(result.data)) {
          const fetched: Ward[] = result.data.map((item: any) => ({
            id: String(item.ward_code),
            name: String(item.ward_name),
            const_code: constCode,
          }));
          setAvailableWards(fetched);
        } else {
          setWardFetchError("Ward data format unexpected.");
          setAvailableWards([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setWardFetchError(`Could not load wards. Error: ${msg}`);
      } finally {
        setLoadingWards(false);
      }
    };

    void fetchWards(selectedConstituencyCode);
  }, [selectedConstituencyCode]);

  /** -------- Fetch: Polling Stations (by ward) -------- */
  useEffect(() => {
    if (!selectedWardCode) {
      setRawApiPollingStations([]);
      return;
    }

    const fetchPollingStations = async (wardCode: string) => {
      setLoadingPollingStations(true);
      setPollingStationFetchError(null);
      try {
        const response = await fetch(`https://skizagroundsuite.com/API/get_polling_stations.php?ward_code=${encodeURIComponent(wardCode)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result?.status === 'success' && Array.isArray(result.polling_centers)) {
          const fetched: PollingStation[] = result.polling_centers.map((item: any) => ({
            id: String(item.id),
            name: String(item.polling_station_name ?? item.reg_centre_name ?? 'Polling Station'),
            county: selectedCounty,
            constituency: selectedConstituency,
            ward: selectedWard,
            agentCount: 0,       // will be merged below
            requiredAgents: 0,   // will be merged below
          }));
          setRawApiPollingStations(fetched);
        } else {
          setPollingStationFetchError("Polling station data format unexpected.");
          setRawApiPollingStations([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setPollingStationFetchError(`Could not load polling stations. Error: ${msg}`);
      } finally {
        setLoadingPollingStations(false);
      }
    };

    void fetchPollingStations(selectedWardCode);
  }, [selectedWardCode, selectedCounty, selectedConstituency, selectedWard]);

  /** -------- Aggregation (sync, production-friendly) -------- */
  const fetchDataAndAggregate = useCallback(() => {
    if (!selectedCounty) {
      setPollingStations([]);
      setAgents([]);
      setCountyStats(null);
      return;
    }

    setLoadingData(true);

    // Determine base station list
    let currentStations: PollingStation[] = [];

    if (selectedWardCode && rawApiPollingStations.length > 0) {
      // Ward selected: rely on API data for the stations in that ward, then merge counts from dummy + agents
      currentStations = rawApiPollingStations.map((apiStation) => {
        const agentsAssigned = DUMMY_AGENTS.filter((ag) => ag.assignedPollingStationId === apiStation.id).length;
        const dummyInfo = DUMMY_POLLING_STATIONS.find((dps) => dps.id === apiStation.id);

        return {
          ...apiStation,
          agentCount: agentsAssigned,
          requiredAgents: dummyInfo ? dummyInfo.requiredAgents : 3, // sensible default
        };
      });
    } else if (selectedConstituency) {
      // Constituency selected (no ward): approximate from dummy stations that appear in this constituency via agents
      const stationIdsInConst = new Set(
        DUMMY_AGENTS
          .filter((ag) => ag.county === selectedCounty && ag.constituency === selectedConstituency && ag.assignedPollingStationId)
          .map((ag) => ag.assignedPollingStationId as string)
      );

      currentStations = DUMMY_POLLING_STATIONS
        .filter((dps) => stationIdsInConst.has(dps.id))
        .map((dps) => {
          const agentsAssigned = DUMMY_AGENTS.filter((ag) => ag.assignedPollingStationId === dps.id).length;
          return {
            id: dps.id,
            name: dps.name,
            county: selectedCounty,
            constituency: selectedConstituency,
            ward: '',
            agentCount: agentsAssigned,
            requiredAgents: dps.requiredAgents,
          };
        });
    } else {
      // County only: approximate from dummy stations that appear in the county via agents
      const stationIdsInCounty = new Set(
        DUMMY_AGENTS
          .filter((ag) => ag.county === selectedCounty && ag.assignedPollingStationId)
          .map((ag) => ag.assignedPollingStationId as string)
      );

      currentStations = DUMMY_POLLING_STATIONS
        .filter((dps) => stationIdsInCounty.has(dps.id))
        .map((dps) => {
          const agentsAssigned = DUMMY_AGENTS.filter((ag) => ag.assignedPollingStationId === dps.id).length;
          return {
            id: dps.id,
            name: dps.name,
            county: selectedCounty,
            constituency: '',
            ward: '',
            agentCount: agentsAssigned,
            requiredAgents: dps.requiredAgents,
          };
        });
    }

    // Filter agents by current selection
    const filteredAgents: MCA[] = DUMMY_AGENTS.filter((ag) => {
      let matches = ag.county === selectedCounty;
      if (selectedConstituency) matches = matches && ag.constituency === selectedConstituency;
      if (selectedWard) matches = matches && ag.ward === selectedWard;
      return matches;
    });

    // Stats
    const stats: CountyStats = {
      totalStations: currentStations.length,
      agentsRequired: currentStations.reduce((sum, ps) => sum + ps.requiredAgents, 0),
      agentsRecruited: filteredAgents.filter((a) => a.status !== 'On Leave').length,
      agentsVetted: filteredAgents.filter((a) => ['Vetted', 'Trained', 'Assigned', 'Available'].includes(a.status)).length,
      agentsTrained: filteredAgents.filter((a) => ['Trained', 'Assigned', 'Available'].includes(a.status)).length,
      agentsAssigned: filteredAgents.filter((a) => a.status === 'Assigned').length,
      stationsWithAgents: new Set(filteredAgents.map((a) => a.assignedPollingStationId).filter(Boolean)).size,
      stationsNeedingAgents: currentStations.filter((ps) => ps.agentCount < ps.requiredAgents).length,
    };

    setPollingStations(currentStations);
    setAgents(filteredAgents);
    setCountyStats(stats);
    setLoadingData(false);
  }, [selectedCounty, selectedConstituency, selectedWard, selectedWardCode, rawApiPollingStations]);

  useEffect(() => {
    fetchDataAndAggregate();
  }, [fetchDataAndAggregate]);

  /** -------- Helpers -------- */
  const calculateProgress = (current: number, total: number) => (total > 0 ? (current / total) * 100 : 0);

  const handleCountyChange = (countyName: string) => {
    setSelectedCounty(countyName);
    const county = availableCounties.find((c) => c.name === countyName);
    setSelectedCountyCode(county ? county.id : null);
    setSelectedConstituency('');
    setSelectedConstituencyCode(null);
    setSelectedWard('');
    setSelectedWardCode(null);
    setRawApiPollingStations([]);
  };

  const handleConstituencyChange = (constituencyName: string) => {
    setSelectedConstituency(constituencyName);
    const constituency = availableConstituencies.find((c) => c.name === constituencyName);
    setSelectedConstituencyCode(constituency ? constituency.id : null);
    setSelectedWard('');
    setSelectedWardCode(null);
    setRawApiPollingStations([]);
  };

  const handleWardChange = (wardName: string) => {
    setSelectedWard(wardName);
    const ward = availableWards.find((w) => w.name === wardName);
    setSelectedWardCode(ward ? ward.id : null);
  };

  /** -------- Modal Handlers -------- */
  const handleOpenOnboardMCAModal = (station: PollingStation) => {
    setSelectedPollingStationForOnboard(station);
    setIsOnboardMCAModalOpen(true);
  };

  const handleCloseOnboardMCAModal = () => {
    setIsOnboardMCAModalOpen(false);
    setSelectedPollingStationForOnboard(null);
  };

  const handleMCAOnboardedSuccess = () => {
    // Recompute aggregates after a successful onboarding
    fetchDataAndAggregate();
  };

  const handleOpenViewAgentsModal = (station: PollingStation) => {
    setSelectedPollingStationForView(station);
    setIsViewAgentsModalOpen(true);
  };

  const handleCloseViewAgentsModal = () => {
    setIsViewAgentsModalOpen(false);
    setSelectedPollingStationForView(null);
  };

  /** -------- Render -------- */
  return (
    <Box sx={{ p: 4 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          <GroupAdd sx={{ mr: 1 }} /> MCA Onboarding Room
        </Typography>

        {/* Selectors */}
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
                onChange={(e: SelectChangeEvent<string>) => handleCountyChange(e.target.value as string)}
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
                  onChange={(e: SelectChangeEvent<string>) => handleConstituencyChange(e.target.value as string)}
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
                  onChange={(e: SelectChangeEvent<string>) => handleWardChange(e.target.value as string)}
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
            <Typography variant="h6">Please select a county to begin managing MCAs and polling stations.</Typography>
          </Box>
        ) : (
          <>
            {loadingData && <LinearProgress sx={{ my: 2 }} />}

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Stations"
                  value={countyStats?.totalStations ?? 0}
                  icon={<HomeWork fontSize="large" />}
                  color="#1976d2"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Agents Required"
                  value={countyStats?.agentsRequired ?? 0}
                  icon={<GroupAdd fontSize="large" />}
                  color="#388e3c"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Agents Assigned"
                  value={countyStats?.agentsAssigned ?? 0}
                  icon={<CheckCircle fontSize="large" />}
                  color="#f57c00"
                  progress={calculateProgress(countyStats?.agentsAssigned ?? 0, countyStats?.agentsRequired ?? 0)}
                  progressLabel={`${calculateProgress(
                    countyStats?.agentsAssigned ?? 0,
                    countyStats?.agentsRequired ?? 0
                  ).toFixed(0)}% of required agents assigned`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Stations with Agents"
                  value={countyStats?.stationsWithAgents ?? 0}
                  icon={<HomeWork fontSize="large" />}
                  color="#d32f2f"
                  progress={calculateProgress(countyStats?.stationsWithAgents ?? 0, countyStats?.totalStations ?? 0)}
                  progressLabel={`${calculateProgress(
                    countyStats?.stationsWithAgents ?? 0,
                    countyStats?.totalStations ?? 0
                  ).toFixed(0)}% of stations have agents`}
                />
              </Grid>
            </Grid>

            {/* Polling Stations */}
            {selectedWard && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Polling Stations in {selectedWard}
                </Typography>
                {pollingStationFetchError ? (
                  <Alert severity="error">{pollingStationFetchError}</Alert>
                ) : loadingPollingStations ? (
                  <LinearProgress />
                ) : pollingStations.length === 0 ? (
                  <Alert severity="info">No polling stations found for this ward.</Alert>
                ) : (
                  <Grid container spacing={3}>
                    {pollingStations.map((station) => (
                      <Grid item xs={12} sm={6} md={4} key={station.id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <HomeWork color="primary" sx={{ mr: 1 }} />
                              <Typography variant="h6" component="h3">
                                {station.name}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Agents: {station.agentCount} / {station.requiredAgents}
                            </Typography>
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleOpenOnboardMCAModal(station)}
                                startIcon={<PersonAdd />}
                              >
                                Onboard MCA
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => handleOpenViewAgentsModal(station)}
                              >
                                View Assigned
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* CTA: View MCAs for Ward */}
            {selectedWardCode && selectedWard && (
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  color="secondary"
                  onClick={() => navigate(`/ward-candidates/${selectedWardCode}/${encodeURIComponent(selectedWard)}`)}
                >
                  View MCAs for {selectedWard}
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Onboard MCA Modal */}
        {selectedPollingStationForOnboard && (
          <OnboardMCACandidateModal
            open={isOnboardMCAModalOpen}
            onClose={handleCloseOnboardMCAModal}
            wardCode={selectedWardCode ?? ''}
            pollingStationId={selectedPollingStationForOnboard.id}
            onSuccess={handleMCAOnboardedSuccess}
          />
        )}

        {/* View Assigned Agents Modal */}
        {selectedPollingStationForView && (
          <ViewAssignedAgentsModal
            open={isViewAgentsModalOpen}
            onClose={handleCloseViewAgentsModal}
            pollingStation={selectedPollingStationForView}
          />
        )}
      </motion.div>
    </Box>
  );
};

export default RecruitManageAgentsPage;
