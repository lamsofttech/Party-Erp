import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  CircularProgress,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { PersonAdd, HomeWork, CheckCircle, GroupAdd, HowToVote, QueryStats } from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// ====== ROUTE CONSTANTS (adjust paths if your app is mounted under /admin) ======
const ONBOARD_URL = '/nominations/onboard';
const COLLECT_URL = '/onboarding/Governor-candidates/results';
const RESULTS_URL = '/onboarding/Governor-candidates/view-results';

// --- Interfaces for Data ---
interface Region {
  id: number; // Maps to region_id from API
  name: string; // Maps to region_name from API
}

interface County {
  id: string; // Maps to county_code from API
  name: string; // Maps to county_name from API
  code: string; // Same as 'id'
  region_id: number; // To link back to region
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
  id: string;
  name: string;
  county: string;
  constituency: string;
  ward: string;
  agentCount: number;
  requiredAgents: number;
}

interface CountyStats {
  totalCountiesInRegion: number;
  agentsRecruited: number;
  agentsVetted: number;
  agentsTrained: number;
  agentsAssigned: number;
}

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

// --- Helper component for stats cards ---
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  progressLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, progress, progressLabel }) => (
  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2, borderLeft: `5px solid ${color}` }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ color: color, mr: 1 }}>{icon}</Box>
      <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>{title}</Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>{value}</Typography>
    {progress !== undefined && (
      <Box sx={{ width: '100%', mt: 1 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 5, mb: 0.5 }} color={progress === 100 ? 'success' : 'primary'} />
        <Typography variant="caption" color="text.secondary">{progressLabel}</Typography>
      </Box>
    )}
  </Card>
);

// =================== MAIN PAGE ===================
const RecruitManageAgentsPage: React.FC = () => {
  // Router bits for tab navigation
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab (0=Onboard, 1=Collect Votes, 2=Governor Results)
  const tabValue = location.pathname.startsWith(RESULTS_URL)
    ? 2
    : location.pathname.startsWith(COLLECT_URL)
    ? 1
    : 0;

  // Regions
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [regionFetchError, setRegionFetchError] = useState<string | null>(null);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);

  // Counties (depend on region)
  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [countyFetchError, setCountyFetchError] = useState<string | null>(null);
  const [loadingCounties, setLoadingCounties] = useState<boolean>(false);

  // Selected geo
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>('');

  // Loading + stats
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [countyStats, setCountyStats] = useState<CountyStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Onboard modal
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [selectedLocationForOnboard, setSelectedLocationForOnboard] = useState<{ regionName: string; countyName: string; } | null>(null);

  // Motion preferences
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  // Fetch regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true);
      setRegionFetchError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/regions_api.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          const fetchedRegions: Region[] = result.data.map((item: any) => ({
            id: item.region_id,
            name: item.region_name,
          }));
          setAvailableRegions(fetchedRegions);
        } else {
          setRegionFetchError("Region data isn't in the expected format.");
          setAvailableRegions([]);
        }
      } catch (error) {
        setRegionFetchError(
          `Could not load regions. Ensure the API is running at the regions endpoint. Error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setLoadingRegions(false);
      }
    };

    fetchRegions();
  }, []);

  // Fetch counties when region changes
  useEffect(() => {
    if (!selectedRegionId) {
      setAvailableCounties([]);
      setSelectedCounty('');
      return;
    }

    const fetchCounties = async (regionId: number) => {
      setLoadingCounties(true);
      setCountyFetchError(null);
      try {
        const response = await fetch(`https://skizagroundsuite.com/API/counties_by_region_api.php?region_id=${regionId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          const fetchedCounties: County[] = result.data.map((item: any) => ({
            id: item.county_code,
            name: item.county_name,
            code: item.county_code,
            region_id: regionId,
          }));
          setAvailableCounties(fetchedCounties);
        } else {
          setCountyFetchError("County data isn't in the expected format.");
          setAvailableCounties([]);
        }
      } catch (error) {
        setCountyFetchError(
          `Could not load counties. Error: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        setLoadingCounties(false);
      }
    };

    fetchCounties(selectedRegionId);
  }, [selectedRegionId]);

  // Aggregate data (dummy for now)
  const fetchDataAndAggregate = useCallback(async () => {
    if (!selectedRegionId) {
      setAgents([]);
      setCountyStats(null);
      return;
    }

    setLoadingData(true);
    // Simulate processing delay only when needed
    setTimeout(() => {
      let filteredAgents: Agent[] = DUMMY_AGENTS;

      // By region
      const countiesInSelectedRegion = availableCounties
        .filter(c => c.region_id === selectedRegionId)
        .map(c => c.name);
      filteredAgents = filteredAgents.filter(agent => countiesInSelectedRegion.includes(agent.county));

      // By county (optional)
      if (selectedCounty) {
        filteredAgents = filteredAgents.filter(agent => agent.county === selectedCounty);
      }

      const currentStats: CountyStats = {
        totalCountiesInRegion: availableCounties.filter(c => c.region_id === selectedRegionId).length,
        agentsRecruited: filteredAgents.filter(a => a.status !== 'On Leave').length,
        agentsVetted: filteredAgents.filter(a => ['Vetted', 'Trained', 'Assigned', 'Available'].includes(a.status)).length,
        agentsTrained: filteredAgents.filter(a => ['Trained', 'Assigned', 'Available'].includes(a.status)).length,
        agentsAssigned: filteredAgents.filter(a => a.status === 'Assigned').length,
      };

      setAgents(filteredAgents);
      setCountyStats(currentStats);
      setLoadingData(false);
    }, 300);
  }, [selectedRegionId, selectedCounty, availableCounties]);

  useEffect(() => {
    fetchDataAndAggregate();
  }, [selectedRegionId, selectedCounty, fetchDataAndAggregate]);

  // Handlers
  const handleRegionChange = (regionName: string) => {
    setSelectedRegion(regionName);
    const region = availableRegions.find(r => r.name === regionName);
    setSelectedRegionId(region ? region.id : null);
    setSelectedCounty('');
    setAvailableCounties([]);
  };

  const handleCountyChange = (countyName: string) => {
    setSelectedCounty(countyName);
  };

  // Onboard modal handlers
  const handleOpenOnboardModal = (countyName: string) => {
    setSelectedLocationForOnboard({ regionName: selectedRegion, countyName });
    setIsOnboardModalOpen(true);
  };

  const handleCloseOnboardModal = () => {
    setIsOnboardModalOpen(false);
    setSelectedLocationForOnboard(null);
  };

  const handleAgentOnboardedSuccess = () => {
    fetchDataAndAggregate();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Top Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={tabValue} variant="scrollable" scrollButtons="auto" aria-label="navigation tabs">
          <Tab
            component={Link}
            to={ONBOARD_URL}
            icon={<GroupAdd />}
            iconPosition="start"
            label="Onboard Candidates"
          />
          <Tab
            component={Link}
            to={COLLECT_URL}
            icon={<HowToVote />}
            iconPosition="start"
            label="Collect Votes"
          />
          {/* >>> EXACTLY AFTER "Collect Votes" — independent page link <<< */}
          <Tab
            component={Link}
            to={RESULTS_URL}
            icon={<QueryStats />}
            iconPosition="start"
            label="Governor Results"
          />
        </Tabs>
      </Box>

      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: 3, fontWeight: 'bold', fontSize: { xs: '1.25rem', md: '1.5rem' } }}
        >
          <GroupAdd sx={{ mr: 1 }} /> Governors Onboarding Room11
        </Typography>

        {/* Region > County Selectors */}
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {/* Region */}
          <FormControl sx={{ minWidth: { xs: '100%', sm: 220 } }} fullWidth={isXs}>
            <InputLabel id="region-select-label">Region</InputLabel>
            {loadingRegions ? (
              <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
            ) : regionFetchError ? (
              <Alert severity="error" sx={{ mt: 1 }}>{regionFetchError}</Alert>
            ) : (
              <Select
                labelId="region-select-label"
                id="region-select"
                value={selectedRegion}
                label="Region"
                onChange={(e: SelectChangeEvent<string>) => handleRegionChange(e.target.value)}
                fullWidth
              >
                <MenuItem value="">
                  <em>Select Region</em>
                </MenuItem>
                {availableRegions.map((region) => (
                  <MenuItem key={region.id} value={region.name}>
                    {region.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          {/* County */}
          {selectedRegion && (
            <FormControl sx={{ minWidth: { xs: '100%', sm: 220 } }} disabled={!selectedRegionId} fullWidth={isXs}>
              <InputLabel id="county-select-label">County</InputLabel>
              {loadingCounties ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : countyFetchError ? (
                <Alert severity="error" sx={{ mt: 1 }}>{countyFetchError}</Alert>
              ) : (
                <Select
                  labelId="county-select-label"
                  id="county-select"
                  value={selectedCounty}
                  label="County"
                  onChange={(e: SelectChangeEvent<string>) => handleCountyChange(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>All Counties</em>
                  </MenuItem>
                  {availableCounties.map((county) => (
                    <MenuItem key={county.id} value={county.name}>
                      {county.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}
        </Box>

        {!selectedRegion ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography variant="h6">Please select a region to begin managing candidates.</Typography>
          </Box>
        ) : (
          <>
            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Overview */}
                {countyStats && (
                  <Card variant="outlined" sx={{ mb: 4, p: { xs: 2, md: 3 }, boxShadow: 2 }}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium', fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                      Overview for {selectedCounty || selectedRegion}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Total Counties"
                          value={countyStats.totalCountiesInRegion}
                          icon={<HomeWork fontSize="large" />}
                          color="info.main"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Candidates Recruited"
                          value={countyStats.agentsRecruited}
                          icon={<PersonAdd fontSize="large" />}
                          color="primary.main"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Candidates Vetted"
                          value={countyStats.agentsVetted}
                          icon={<CheckCircle fontSize="large" />}
                          color="success.main"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Candidates Assigned"
                          value={countyStats.agentsAssigned}
                          icon={<CheckCircle fontSize="large" />}
                          color="warning.main"
                        />
                      </Grid>
                    </Grid>
                  </Card>
                )}

                {/* County Cards */}
                {availableCounties.length > 0 ? (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                      {selectedCounty ? `Candidates in ${selectedCounty} County` : `Counties in ${selectedRegion} Region`}
                    </Typography>
                    <Grid container spacing={2}>
                      {availableCounties
                        .filter(county => !selectedCounty || county.name === selectedCounty)
                        .map((county) => (
                          <Grid item xs={12} sm={6} md={4} key={county.id}>
                            <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <Typography variant="h6" component="div" sx={{ mb: 1, fontSize: { xs: '1rem', md: '1.1rem' } }}>{county.name} County</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Agents: {agents.filter(a => a.county === county.name).length}
                              </Typography>
                              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<PersonAdd />}
                                  fullWidth={isXs}
                                  onClick={() => handleOpenOnboardModal(county.name)}
                                >
                                  Gubernatorial Onboarding
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<HowToVote />}
                                  fullWidth={isXs}
                                  onClick={() => navigate(COLLECT_URL)}
                                >
                                  Collect Votes
                                </Button>
                              </Box>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <Typography variant="h6">No counties found for the selected region.</Typography>
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </motion.div>

      {/* Onboard Candidate Modal */}
      {isOnboardModalOpen && selectedLocationForOnboard && (
        <OnboardAgentModal
          open={isOnboardModalOpen}
          onClose={handleCloseOnboardModal}
          regionName={selectedLocationForOnboard.regionName}
          countyName={selectedLocationForOnboard.countyName}
          onAgentOnboarded={handleAgentOnboardedSuccess}
        />
      )}
    </Box>
  );
};

export default RecruitManageAgentsPage;

// =================== GOVERNOR RESULTS PAGE (independent page) ===================
// Add a <Route path={RESULTS_URL} element={<GovernorResultsPage />} /> in your router.

interface GovernorResultRow {
  candidate_name: string;
  party_name: string;
  county_name: string;
  total_votes: number;
  polling_stations?: number;
  updated_at?: string;
}

export const GovernorResultsPage: React.FC = () => {
  // Tabs header on this page too (so the tab stays selected)
  const location = useLocation();
  const tabValue = location.pathname.startsWith(RESULTS_URL)
    ? 2
    : location.pathname.startsWith(COLLECT_URL)
    ? 1
    : 0;

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  // Region/County filters (self-contained)
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [regionFetchError, setRegionFetchError] = useState<string | null>(null);
  const [countyFetchError, setCountyFetchError] = useState<string | null>(null);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);
  const [loadingCounties, setLoadingCounties] = useState<boolean>(false);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>('');

  const [rows, setRows] = useState<GovernorResultRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const RESULTS_API = 'https://skizagroundsuite.com/API/governor_results.php';

  // Fetch regions
  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true);
      setRegionFetchError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/regions_api.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result?.status === 'success' && Array.isArray(result.data)) {
          const fetchedRegions: Region[] = result.data.map((item: any) => ({
            id: item.region_id,
            name: item.region_name,
          }));
          setAvailableRegions(fetchedRegions);
        } else {
          setRegionFetchError("Region data isn't in the expected format.");
          setAvailableRegions([]);
        }
      } catch (e) {
        setRegionFetchError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchRegions();
  }, []);

  // Fetch counties when region changes
  useEffect(() => {
    if (!selectedRegionId) {
      setAvailableCounties([]);
      setSelectedCounty('');
      return;
    }
    const fetchCounties = async (regionId: number) => {
      setLoadingCounties(true);
      setCountyFetchError(null);
      try {
        const response = await fetch(`https://skizagroundsuite.com/API/counties_by_region_api.php?region_id=${regionId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result?.status === 'success' && Array.isArray(result.data)) {
          const fetchedCounties: County[] = result.data.map((item: any) => ({
            id: item.county_code,
            name: item.county_name,
            code: item.county_code,
            region_id: regionId,
          }));
          setAvailableCounties(fetchedCounties);
        } else {
          setCountyFetchError('County data is not in the expected format.');
          setAvailableCounties([]);
        }
      } catch (e) {
        setCountyFetchError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingCounties(false);
      }
    };
    fetchCounties(selectedRegionId);
  }, [selectedRegionId]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedRegionId) params.set('region_id', String(selectedRegionId));
      if (selectedCounty) params.set('county_name', selectedCounty);

      const res = await fetch(`${RESULTS_API}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.status === 'success' && Array.isArray(json.data)) {
        setRows(json.data as GovernorResultRow[]);
      } else {
        setRows([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRegionId, selectedCounty]);

  useEffect(() => {
    // Initial load without filters (national view)
    fetchResults();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCSV = () => {
    const header = ['Candidate', 'Party', 'County', 'Total Votes', 'Polling Stations', 'Last Updated'];
    const lines = rows.map(r => [
      `"${r.candidate_name ?? ''}"`,
      `"${r.party_name ?? ''}"`,
      `"${r.county_name ?? ''}"`,
      `${r.total_votes ?? 0}`,
      `${r.polling_stations ?? ''}`,
      `"${r.updated_at ?? ''}"`,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const scope = selectedCounty
      ? `${selectedCounty} County`
      : selectedRegion
      ? `${selectedRegion} Region`
      : 'national';
    link.download = `governor_results_${scope.replace(/\s+/g, '_').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRegionChange = (regionName: string) => {
    setSelectedRegion(regionName);
    const region = availableRegions.find(r => r.name === regionName);
    setSelectedRegionId(region ? region.id : null);
    setSelectedCounty('');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Tabs header (same order; this page selects index 2) */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={tabValue} variant="scrollable" scrollButtons="auto" aria-label="navigation tabs">
          <Tab component={Link} to={ONBOARD_URL} icon={<GroupAdd />} iconPosition="start" label="Onboard Candidates" />
          <Tab component={Link} to={COLLECT_URL} icon={<HowToVote />} iconPosition="start" label="Collect Votes" />
          <Tab component={Link} to={RESULTS_URL} icon={<QueryStats />} iconPosition="start" label="Governor Results" />
        </Tabs>
      </Box>

      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
        <QueryStats sx={{ mr: 1 }} /> Governor Results
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: { xs: '100%', sm: 240 } }} fullWidth={isXs}>
          <InputLabel id="res-region-select-label">Region</InputLabel>
          {loadingRegions ? (
            <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
          ) : regionFetchError ? (
            <Alert severity="error" sx={{ mt: 1 }}>{regionFetchError}</Alert>
          ) : (
            <Select
              labelId="res-region-select-label"
              id="res-region-select"
              value={selectedRegion}
              label="Region"
              onChange={(e: SelectChangeEvent<string>) => handleRegionChange(e.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>All Regions</em>
              </MenuItem>
              {availableRegions.map((region) => (
                <MenuItem key={region.id} value={region.name}>
                  {region.name}
                </MenuItem>
              ))}
            </Select>
          )}
        </FormControl>

        <FormControl
          sx={{ minWidth: { xs: '100%', sm: 240 } }}
          fullWidth={isXs}
          disabled={!selectedRegionId}
        >
          <InputLabel id="res-county-select-label">County</InputLabel>
          {loadingCounties ? (
            <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
          ) : countyFetchError ? (
            <Alert severity="error" sx={{ mt: 1 }}>{countyFetchError}</Alert>
          ) : (
            <Select
              labelId="res-county-select-label"
              id="res-county-select"
              value={selectedCounty}
              label="County"
              onChange={(e: SelectChangeEvent<string>) => setSelectedCounty(e.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>All Counties</em>
              </MenuItem>
              {availableCounties.map((county) => (
                <MenuItem key={county.id} value={county.name}>
                  {county.name}
                </MenuItem>
              ))}
            </Select>
          )}
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={fetchResults} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Refresh Results'}
          </Button>
          <Button variant="outlined" onClick={exportCSV} disabled={rows.length === 0}>
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Results */}
      <Card variant="outlined" sx={{ p: 2 }}>
        {loading && (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && <Alert severity="error">Failed to load results: {error}</Alert>}

        {!loading && !error && rows.length === 0 && (
          <Alert severity="info">No results found for the selected filters.</Alert>
        )}

        {!loading && !error && rows.length > 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Candidate', 'Party', 'County', 'Total Votes', 'Polling Stations', 'Last Updated'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #eee' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{r.candidate_name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{r.party_name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{r.county_name}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5', fontWeight: 600 }}>
                      {typeof r.total_votes === 'number' && (r.total_votes as any).toLocaleString
                        ? r.total_votes.toLocaleString()
                        : r.total_votes}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{r.polling_stations ?? ''}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                      {r.updated_at ? new Date(r.updated_at).toLocaleString() : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Card>
    </Box>
  );
};

// --- Modal (MUI Dialog for mobile + a11y) ---
interface PoliticalPosition {
  position_id: number;
  position_name: string;
  position_level: string;
}

interface PoliticalParty {
  id: number;
  name: string;
}

interface OnboardAgentModalProps {
  open: boolean;
  onClose: () => void;
  regionName: string;
  countyName: string;
  onAgentOnboarded: () => void;
}

const OnboardAgentModal: React.FC<OnboardAgentModalProps> = ({ open, onClose, regionName, countyName, onAgentOnboarded }) => {
  const [candidateName, setCandidateName] = useState('');
  const [partyId, setPartyId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [availablePositions, setAvailablePositions] = useState<PoliticalPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(true);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const [availableParties, setAvailableParties] = useState<PoliticalParty[]>([]);
  const [loadingParties, setLoadingParties] = useState<boolean>(true);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchPositions = async () => {
      setLoadingPositions(true);
      setPositionsError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/political_positions_api.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          setAvailablePositions(result.data);
          const governorPosition = result.data.find((pos: PoliticalPosition) => pos.position_name === 'Governor');
          if (governorPosition) setPositionId(String(governorPosition.position_id));
        } else {
          setPositionsError('Political positions data is not in the expected format.');
          setAvailablePositions([]);
        }
      } catch (error) {
        setPositionsError(`Could not load political positions. Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingPositions(false);
      }
    };

    const fetchParties = async () => {
      setLoadingParties(true);
      setPartiesError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/fetch_political_parties.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === 'success' && Array.isArray(result.data)) {
          setAvailableParties(result.data);
        } else {
          setPartiesError('Political parties data is not in the expected format.');
          setAvailableParties([]);
        }
      } catch (error) {
        setPartiesError(`Could not load political parties. Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchPositions();
    fetchParties();
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) setPhotoFile(event.target.files[0]);
    else setPhotoFile(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!candidateName || !partyId || !positionId || !countyName) {
      setError('Candidate Name, Party, Position, and County are required.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', candidateName);
    formData.append('party_id', partyId);
    formData.append('position_id', positionId);
    formData.append('county_name', countyName);
    if (photoFile) formData.append('photo', photoFile);
    formData.append('status', 'Pending');
    if (contactEmail) formData.append('contact_email', contactEmail);
    if (contactPhone) formData.append('contact_phone', contactPhone);

    try {
      const response = await fetch('https://skizagroundsuite.com/API/onboard_candidate.php', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = 'Failed to onboard candidate.';
        try {
          const errorData = JSON.parse(errorText);
          message = errorData.message || message;
        } catch {
          message = `Server error: ${errorText}`;
        }
        throw new Error(message);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setSuccess('Candidate onboarded successfully!');
        onAgentOnboarded();
        setTimeout(onClose, 1500);
      } else {
        setError(result.message || 'Failed to onboard candidate.');
      }
    } catch (err) {
      setError(`Error onboarding candidate: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Onboard Candidate for {countyName} County</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
          Region: {regionName}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Candidate Full Name"
              fullWidth
              margin="normal"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              disabled={loading}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="party-select-label">Political Party</InputLabel>
              {loadingParties ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : partiesError ? (
                <Alert severity="error" sx={{ mt: 1 }}>{partiesError}</Alert>
              ) : (
                <Select
                  labelId="party-select-label"
                  id="party-select"
                  value={partyId}
                  label="Political Party"
                  onChange={(e: SelectChangeEvent<string>) => setPartyId(e.target.value)}
                  disabled={loading}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Select Party</em>
                  </MenuItem>
                  {availableParties.map((party) => (
                    <MenuItem key={party.id} value={String(party.id)}>
                      {party.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="position-select-label">Position Applied For</InputLabel>
              {loadingPositions ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : positionsError ? (
                <Alert severity="error" sx={{ mt: 1 }}>{positionsError}</Alert>
              ) : (
                <Select
                  labelId="position-select-label"
                  id="position-select"
                  value={positionId}
                  label="Position Applied For"
                  onChange={(e: SelectChangeEvent<string>) => setPositionId(e.target.value)}
                  disabled={loading || positionId !== ''} // Lock if auto-set (e.g., Governor)
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Select Position</em>
                  </MenuItem>
                  {availablePositions.map((position) => (
                    <MenuItem key={position.position_id} value={String(position.position_id)}>
                      {position.position_name} ({position.position_level})
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Contact Email (Optional)"
              fullWidth
              margin="normal"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Contact Phone (Optional)"
              fullWidth
              margin="normal"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" component="label" fullWidth sx={{ mt: 1, mb: 1 }} disabled={loading}>
              Upload Photo (Optional)
              <input type="file" hidden accept="image/*" onChange={handleFileChange} />
            </Button>
            {photoFile && (
              <Typography variant="body2" color="text.secondary">
                Selected: {photoFile.name}
              </Typography>
            )}
          </Grid>
        </Grid>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Onboard Candidate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
