import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  SelectChangeEvent,
  AppBar,
  Toolbar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Container // Import Container for consistent layout
} from '@mui/material';
import { PersonAdd, HomeWork, CheckCircle, GroupAdd } from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast'; // For toast notifications

// --- Interfaces for Data ---
interface Region {
  id: number;
  name: string;
}

interface County {
  id: string;
  name: string;
  code: string;
  region_id: number;
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

const RecruitManageAgentsPage: React.FC = () => {
  const location = useLocation();

  const getTargetPositionName = useCallback(() => {
    if (location.pathname.includes('/governor-candidates')) {
      return 'Governor';
    } else if (location.pathname.includes('/senator-candidates')) {
      return 'Senator';
    }
    return '';
  }, [location.pathname]);

  const currentPositionType = getTargetPositionName();

  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [regionFetchError, setRegionFetchError] = useState<string | null>(null);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);

  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [countyFetchError, setCountyFetchError] = useState<string | null>(null);
  const [loadingCounties, setLoadingCounties] = useState<boolean>(false);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

  const [selectedCounty, setSelectedCounty] = useState<string>('');

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [countyStats, setCountyStats] = useState<CountyStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [selectedLocationForOnboard, setSelectedLocationForOnboard] = useState<{ regionName: string; countyName: string; targetPositionName: string } | null>(null);

  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true);
      setRegionFetchError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/regions_api.php');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result && result.status === "success" && Array.isArray(result.data)) {
          const fetchedRegions: Region[] = result.data.map((item: any) => ({
            id: item.region_id,
            name: item.region_name,
          }));
          setAvailableRegions(fetchedRegions);
        } else {
          console.error("API did not return expected success status or array data for regions:", result);
          setRegionFetchError("Region data is not in the expected format (missing 'data' array or 'status').");
          setAvailableRegions([]);
        }
      } catch (error) {
        console.error("Failed to fetch regions:", error);
        setRegionFetchError(`Could not load regions. Please ensure the API is running correctly at https://skizagroundsuite.com/API/regions_api.php. Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingRegions(false);
      }
    };

    fetchRegions();
  }, []);

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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result && result.status === "success" && Array.isArray(result.data)) {
          const fetchedCounties: County[] = result.data.map((item: any) => ({
            id: item.county_code,
            name: item.county_name,
            code: item.county_code,
            region_id: regionId
          }));
          setAvailableCounties(fetchedCounties);
        } else {
          console.error("API did not return expected success status or array data for counties:", result);
          setCountyFetchError("County data is not in the expected format (missing 'data' array or 'status').");
          setAvailableCounties([]);
        }
      } catch (error) {
        console.error("Failed to fetch counties:", error);
        setCountyFetchError(`Could not load counties. Please ensure the API is running correctly. Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingCounties(false);
      }
    };

    fetchCounties(selectedRegionId);
  }, [selectedRegionId]);

  const fetchDataAndAggregate = useCallback(async () => {
    if (!selectedRegionId) {
      setAgents([]);
      setCountyStats(null);
      return;
    }

    setLoadingData(true);

    setTimeout(() => {
      let filteredAgents: Agent[] = DUMMY_AGENTS;

      if (selectedRegionId) {
        const countiesInSelectedRegion = availableCounties.filter(c => c.region_id === selectedRegionId).map(c => c.name);
        filteredAgents = filteredAgents.filter(agent => countiesInSelectedRegion.includes(agent.county));
      }

      if (selectedCounty) {
        filteredAgents = filteredAgents.filter(agent => agent.county === selectedCounty);
      }

      const currentStats: CountyStats = {
        totalCountiesInRegion: selectedRegionId ? availableCounties.filter(c => c.region_id === selectedRegionId).length : 0,
        agentsRecruited: filteredAgents.filter(a => a.status !== 'On Leave').length,
        agentsVetted: filteredAgents.filter(a => ['Vetted', 'Trained', 'Assigned', 'Available'].includes(a.status)).length,
        agentsTrained: filteredAgents.filter(a => ['Trained', 'Assigned', 'Available'].includes(a.status)).length,
        agentsAssigned: filteredAgents.filter(a => a.status === 'Assigned').length,
      };

      setAgents(filteredAgents);
      setCountyStats(currentStats);
      setLoadingData(false);
    }, 800);
  }, [selectedRegionId, selectedCounty, availableCounties, currentPositionType]);

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

  useEffect(() => {
    fetchDataAndAggregate();
  }, [selectedRegionId, selectedCounty, fetchDataAndAggregate]);

  const handleOpenOnboardModal = (countyName: string) => {
    setSelectedLocationForOnboard({
      regionName: selectedRegion,
      countyName: countyName,
      targetPositionName: currentPositionType
    });
    setIsOnboardModalOpen(true);
  };

  const handleCloseOnboardModal = () => {
    setIsOnboardModalOpen(false);
    setSelectedLocationForOnboard(null);
  };

  const handleAgentOnboardedSuccess = () => {
    console.log('Candidate onboarded successfully! Refreshing data...');
    fetchDataAndAggregate();
  };

  return (
    <Box sx={{ p: 0 }}>
      <Toaster position="top-center" reverseOrder={false} />
      <AppBar position="static" sx={{ mb: 4, bgcolor: 'primary.main', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <Toolbar sx={{ py: { xs: 2, md: 1 }, justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 2, md: 0 } }}>
          <Typography variant="h4" component="h1" sx={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <GroupAdd sx={{ mr: 1, fontSize: '2.5rem' }} /> {currentPositionType ? `${currentPositionType}s Onboarding Room` : 'Candidate Onboarding Room'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pt: 0, pb: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FormControl sx={{ minWidth: 200 }} variant="outlined">
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

          {selectedRegion && (
            <FormControl sx={{ minWidth: 200 }} variant="outlined" disabled={!selectedRegionId}>
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
                {countyStats && (
                  <Card variant="outlined" sx={{ mb: 4, p: 3, boxShadow: 2 }}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
                      Overview for {selectedCounty || selectedRegion}
                    </Typography>
                    <Grid container spacing={3}>
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

                {availableCounties.length > 0 ? (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" gutterBottom>
                      {selectedCounty ? `Candidates in ${selectedCounty} County` : `Counties in ${selectedRegion} Region`}
                    </Typography>
                    <Grid container spacing={3}>
                      {availableCounties
                        .filter(county => !selectedCounty || county.name === selectedCounty)
                        .map((county) => (
                          <Grid item xs={12} sm={6} md={4} key={county.id}>
                            <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <Typography variant="h6" component="div" sx={{ mb: 1 }}>{county.name} County</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Candidates: {agents.filter(a => a.county === county.name).length}
                              </Typography>
                              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<PersonAdd />}
                                  onClick={() => handleOpenOnboardModal(county.name)}
                                >
                                  Onboard {currentPositionType || 'Candidate'}
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
      </Container>
      {isOnboardModalOpen && selectedLocationForOnboard && (
        <OnboardAgentModal
          open={isOnboardModalOpen}
          onClose={handleCloseOnboardModal}
          regionName={selectedLocationForOnboard.regionName}
          countyName={selectedLocationForOnboard.countyName}
          onAgentOnboarded={handleAgentOnboardedSuccess}
          targetPositionName={selectedLocationForOnboard.targetPositionName}
        />
      )}
    </Box>
  );
};

export default RecruitManageAgentsPage;

// --- Placeholder Modal Components (Assume these are in ../components/) ---
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
  targetPositionName: string;
}

const OnboardAgentModal: React.FC<OnboardAgentModalProps> = ({ open, onClose, regionName, countyName, onAgentOnboarded, targetPositionName }) => {
  const [candidateName, setCandidateName] = useState('');
  const [partyId, setPartyId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);

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

        if (result.status === "success" && Array.isArray(result.data)) {
          setAvailablePositions(result.data);

          if (targetPositionName) {
            const matchingPosition = result.data.find((pos: PoliticalPosition) =>
              pos.position_name.toLowerCase().trim() === targetPositionName.toLowerCase().trim()
            );

            if (matchingPosition) {
              console.log("✅ Auto-selected position:", matchingPosition.position_name, "ID:", matchingPosition.position_id);
              setPositionId(String(matchingPosition.position_id));
            } else {
              console.warn("❌ Could not find matching position for:", targetPositionName);
            }
          }
        } else {
          throw new Error("Unexpected API structure for positions");
        }
      } catch (error) {
        console.error("Failed to fetch political positions:", error);
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result && result.status === "success" && Array.isArray(result.data)) {
          setAvailableParties(result.data);
        } else {
          console.error("API did not return expected success status or array data for parties:", result);
          setPartiesError("Political parties data is not in the expected format.");
          setAvailableParties([]);
        }
      } catch (error) {
        console.error("Failed to fetch political parties:", error);
        setPartiesError(`Could not load political parties. Error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchPositions();
    fetchParties();
  }, [open, targetPositionName]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPhotoFile(event.target.files[0]);
    } else {
      setPhotoFile(null);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    let apiEndpoint = `https://skizagroundsuite.com/API/onboard_${targetPositionName.toLowerCase().replace(/\s/g, '')}_candidate.php`;

    let finalPositionId = positionId;
    if (!finalPositionId) {
      const matched = availablePositions.find(pos => pos.position_name.toLowerCase().trim() === targetPositionName.toLowerCase().trim());
      if (matched) {
        finalPositionId = String(matched.position_id);
      } else {
        const errorMessage = `Error: ${targetPositionName} position not found in available positions. Please try again or contact support.`;
        toast.error(errorMessage);
        setLoading(false);
        return;
      }
    }

    if (!candidateName || !partyId || !finalPositionId || !countyName) {
      const errorMessage = "Candidate Name, Political Party, Position, and County are required.";
      toast.error(errorMessage);
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', candidateName);
    formData.append('party_id', partyId);
    formData.append('position_id', finalPositionId);
    formData.append('county_name', countyName);
    formData.append('status', 'Pending'); // Default status

    if (photoFile) {
      formData.append('photo', photoFile);
    }
    if (contactEmail) {
      formData.append('contact_email', contactEmail);
    }
    if (contactPhone) {
      formData.append('contact_phone', contactPhone);
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        let errorMessage = 'Failed to onboard candidate.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.status === "success") {
        toast.success('Candidate onboarded successfully!');
        onAgentOnboarded(); // Trigger data refresh in parent
        setTimeout(onClose, 1500); // Close modal after a short delay
      } else {
        const errorMessage = result.message || 'Failed to onboard candidate.';
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = `Error onboarding candidate: ${err instanceof Error ? err.message : String(err)}`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="onboard-agent-modal-title" maxWidth="sm" fullWidth>
      <DialogTitle id="onboard-agent-modal-title">
        Onboard {targetPositionName} Candidate for {countyName} County{regionName ? `, ${regionName} Region` : ''}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fill in the details below to onboard a new {targetPositionName} candidate in {countyName}
          {regionName ? `, ${regionName} Region` : ''}.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Candidate Name"
              fullWidth
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
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
            <FormControl fullWidth required>
              <InputLabel id="position-select-label">Political Position</InputLabel>
              {loadingPositions ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : positionsError ? (
                <Alert severity="error" sx={{ mt: 1 }}>{positionsError}</Alert>
              ) : (
                <Select
                  labelId="position-select-label"
                  id="position-select"
                  value={positionId}
                  label="Political Position"
                  onChange={(e: SelectChangeEvent<string>) => setPositionId(e.target.value)}
                  disabled={!!targetPositionName} // Disable if targetPositionName is provided
                >
                  <MenuItem value="">
                    <em>Select Position</em>
                  </MenuItem>
                  {availablePositions.map((position) => (
                    <MenuItem key={position.position_id} value={String(position.position_id)}>
                      {position.position_name}
                    </MenuItem>
                  ))}
                </Select>
              )}
              {targetPositionName && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Position pre-selected as {targetPositionName}.
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Contact Email (Optional)"
              fullWidth
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Contact Phone (Optional)"
              fullWidth
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              component="label"
              sx={{ mt: 2 }}
            >
              Upload Photo (Optional)
              <input type="file" hidden onChange={handleFileChange} accept="image/*" />
            </Button>
            {photoFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {photoFile.name}
              </Typography>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Onboarding...' : 'Onboard Candidate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
