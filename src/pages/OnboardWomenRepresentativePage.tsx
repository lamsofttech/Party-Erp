// pages/OnboardWomenRepresentativePage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  CircularProgress,
  LinearProgress,
  Alert,
  SelectChangeEvent,
  Modal,
  TextField,
} from '@mui/material';
import { motion } from 'framer-motion';
import { PersonAdd, HomeWork, CheckCircle, GroupAdd } from '@mui/icons-material';
import toast, { Toaster } from 'react-hot-toast';

// --- Interfaces for Data ---
interface RegionApiRow { region_id: number; region_name: string }
interface CountyApiRow { county_code: string; county_name: string }
interface PositionsApiRow { position_id: number; position_name: string; position_level: string }
interface PartiesApiRow { id: number; name: string }

interface Region { id: number; name: string }
interface County {
  id: string; // maps to county_code from API
  name: string; // maps to county_name from API
  code: string; // same as id
  region_id: number; // for internal linkage
}

export interface Candidate {
  id: string;
  name: string;
  status: 'Recruited' | 'Vetted' | 'Trained' | 'Assigned' | 'Available' | 'On Leave' | 'Pending';
  county: string;
  position: string;
  party: string;
  contact?: string;
}

interface PoliticalPosition { position_id: number; position_name: string; position_level: string }
interface PoliticalParty { id: number; name: string }

// Dummy data for demonstration. In a real application, this would come from an API.
const DUMMY_WOMEN_REP_CANDIDATES: Candidate[] = [
  { id: 'WR001', name: 'Faith Akinyi', status: 'Recruited', county: 'Nairobi', position: 'Women Representative', party: 'Party X', contact: 'faith.a@example.com' },
  { id: 'WR002', name: 'Susan Wanjiku', status: 'Vetted', county: 'Mombasa', position: 'Women Representative', party: 'Party Y', contact: 'susan.w@example.com' },
  { id: 'WR003', name: 'Aisha Omar', status: 'Pending', county: 'Kisumu', position: 'Women Representative', party: 'Party Z' },
  { id: 'WR004', name: 'Grace Mumbua', status: 'Assigned', county: 'Nairobi', position: 'Women Representative', party: 'Party X' },
  { id: 'WR005', name: 'Caroline Chemutai', status: 'Trained', county: 'Mombasa', position: 'Women Representative', party: 'Party A' },
  { id: 'WR006', name: 'Dorothy Anyango', status: 'Recruited', county: 'Kisumu', position: 'Women Representative', party: 'Party B' },
  { id: 'WR007', name: 'Emily Wambui', status: 'Vetted', county: 'Kiambu', position: 'Women Representative', party: 'Party C' },
];

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
    sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2, borderLeft: `5px solid ${color}` }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ color: color, mr: 1 }}>{icon}</Box>
      <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>{title}</Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>{value}</Typography>
    {typeof progress === 'number' && (
      <Box sx={{ width: '100%', mt: 1 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 5, mb: 0.5 }} color={progress === 100 ? 'success' : 'primary'} />
        {progressLabel && <Typography variant="caption" color="text.secondary">{progressLabel}</Typography>}
      </Box>
    )}
  </Card>
);

const TARGET_POSITION_NAME = 'Women Representative';

const OnboardWomenRepresentativePage: React.FC = () => {
  // Regions
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [regionFetchError, setRegionFetchError] = useState<string | null>(null);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);

  // Counties
  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [countyFetchError, setCountyFetchError] = useState<string | null>(null);
  const [loadingCounties, setLoadingCounties] = useState<boolean>(false);

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>('');

  // Derived UI loading
  const loadingData = loadingRegions || loadingCounties;

  // Stats & candidates (derived from dummy data + filters)
  const womenRepCandidates = useMemo(() => {
    let filtered: Candidate[] = DUMMY_WOMEN_REP_CANDIDATES.filter(c => c.position === TARGET_POSITION_NAME);

    if (selectedRegionId) {
      const countiesInRegion = availableCounties.filter(c => c.region_id === selectedRegionId).map(c => c.name);
      filtered = filtered.filter(candidate => countiesInRegion.includes(candidate.county));
    }

    if (selectedCounty) {
      filtered = filtered.filter(candidate => candidate.county === selectedCounty);
    }

    return filtered;
  }, [selectedRegionId, selectedCounty, availableCounties]);

  const womenRepStats = useMemo(() => {
    const totalCountiesInRegion = selectedRegionId ? availableCounties.filter(c => c.region_id === selectedRegionId).length : 0;
    const recruited = womenRepCandidates.filter(c => ['Recruited', 'Vetted', 'Trained', 'Assigned', 'Available'].includes(c.status)).length;
    const vetted = womenRepCandidates.filter(c => ['Vetted', 'Trained', 'Assigned', 'Available'].includes(c.status)).length;
    const assigned = womenRepCandidates.filter(c => c.status === 'Assigned').length;
    const pending = womenRepCandidates.filter(c => c.status === 'Pending').length;

    return {
      totalCountiesInRegion: totalCountiesInRegion,
      candidatesRecruited: recruited,
      candidatesVetted: vetted,
      candidatesAssigned: assigned,
      candidatesPending: pending,
    };
  }, [availableCounties, selectedRegionId, womenRepCandidates]);

  // Onboarding modal state
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [selectedLocationForOnboard, setSelectedLocationForOnboard] = useState<{ regionName: string; countyName: string } | null>(null);

  // Onboarding form
  const [candidateName, setCandidateName] = useState('');
  const [partyId, setPartyId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>(''); // auto-filled
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Positions and parties
  const [availablePositions, setAvailablePositions] = useState<PoliticalPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const [availableParties, setAvailableParties] = useState<PoliticalParty[]>([]);
  const [loadingParties, setLoadingParties] = useState<boolean>(false);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  // --- Fetch Regions on component mount ---
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoadingRegions(true);
      setRegionFetchError(null);
      try {
        const response = await fetch('https://skizagroundsuite.com/API/regions_api.php', { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result: { status: string; data?: RegionApiRow[] } = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
          const fetched: Region[] = result.data.map((item) => ({ id: item.region_id, name: item.region_name }));
          setAvailableRegions(fetched);
        } else {
          setAvailableRegions([]);
          setRegionFetchError('Region data is not in the expected format.');
        }
      } catch (error: unknown) {
        if ((error as any)?.name === 'AbortError') return;
        setRegionFetchError(`Could not load regions. ${(error as Error).message ?? String(error)}`);
      } finally {
        setLoadingRegions(false);
      }
    })();

    return () => controller.abort();
  }, []);

  // --- Fetch Counties when selectedRegionId changes ---
  useEffect(() => {
    if (!selectedRegionId) {
      setAvailableCounties([]);
      setSelectedCounty('');
      return;
    }

    const controller = new AbortController();

    (async () => {
      setLoadingCounties(true);
      setCountyFetchError(null);
      try {
        const url = `https://skizagroundsuite.com/API/counties_by_region_api.php?region_id=${encodeURIComponent(String(selectedRegionId))}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result: { status: string; data?: CountyApiRow[] } = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
          const fetched: County[] = result.data.map((item) => ({
            id: item.county_code,
            name: item.county_name,
            code: item.county_code,
            region_id: selectedRegionId,
          }));
          setAvailableCounties(fetched);
        } else {
          setAvailableCounties([]);
          setCountyFetchError('County data is not in the expected format.');
        }
      } catch (error: unknown) {
        if ((error as any)?.name === 'AbortError') return;
        setCountyFetchError(`Could not load counties. ${(error as Error).message ?? String(error)}`);
      } finally {
        setLoadingCounties(false);
      }
    })();

    return () => controller.abort();
  }, [selectedRegionId]);

  const handleRegionChange = (event: SelectChangeEvent<string>) => {
    const regionName = event.target.value;
    setSelectedRegion(regionName);
    const region = availableRegions.find((r) => r.name === regionName) || null;
    setSelectedRegionId(region ? region.id : null);
    setSelectedCounty(''); // reset county when region changes
    setAvailableCounties([]);
  };

  const handleCountyChange = (event: SelectChangeEvent<string>) => {
    setSelectedCounty(event.target.value);
  };

  const handleOpenOnboardModal = (countyName: string) => {
    if (!selectedRegion || !selectedRegionId) {
      toast.error('Please select a region first before onboarding a candidate.');
      return;
    }

    setSelectedLocationForOnboard({ regionName: selectedRegion, countyName });
    // reset form
    setCandidateName('');
    setPartyId('');
    setPositionId('');
    setPhotoFile(null);
    setContactEmail('');
    setContactPhone('');
    setIsOnboardModalOpen(true);
  };

  const handleCloseOnboardModal = () => {
    setIsOnboardModalOpen(false);
    setSelectedLocationForOnboard(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPhotoFile(file);
  };

  // --- Fetch Political Positions and Parties for the Onboarding Modal ---
  useEffect(() => {
    if (!isOnboardModalOpen) return;

    const positionsController = new AbortController();
    const partiesController = new AbortController();

    const fetchPositions = async () => {
      setLoadingPositions(true);
      setPositionsError(null);
      try {
        const res = await fetch('https://skizagroundsuite.com/API/political_positions_api.php', { signal: positionsController.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result: { status: string; data?: PositionsApiRow[] } = await res.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
          setAvailablePositions(result.data);
          const matching = result.data.find((p) => p.position_name.toLowerCase().trim() === TARGET_POSITION_NAME.toLowerCase().trim());
          if (matching) {
            setPositionId(String(matching.position_id));
          } else {
            toast.error(`Required position "${TARGET_POSITION_NAME}" not found. Contact support.`);
          }
        } else {
          throw new Error('Unexpected API structure for political positions.');
        }
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return;
        const msg = (e as Error).message ?? String(e);
        setPositionsError(`Could not load political positions. ${msg}`);
        toast.error(`Failed to load political positions: ${msg}`);
      } finally {
        setLoadingPositions(false);
      }
    };

    const fetchParties = async () => {
      setLoadingParties(true);
      setPartiesError(null);
      try {
        const res = await fetch('https://skizagroundsuite.com/API/fetch_political_parties.php', { signal: partiesController.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result: { status: string; data?: PartiesApiRow[] } = await res.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
          setAvailableParties(result.data);
        } else {
          setAvailableParties([]);
          setPartiesError('Political parties data is not in the expected format.');
        }
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return;
        const msg = (e as Error).message ?? String(e);
        setPartiesError(`Could not load political parties. ${msg}`);
        toast.error(`Failed to load political parties: ${msg}`);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchPositions();
    fetchParties();

    return () => {
      positionsController.abort();
      partiesController.abort();
    };
  }, [isOnboardModalOpen]);

  const validateEmail = (email: string) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => !phone || /^(\+?\d[\d\s-]{7,})$/.test(phone);

  const handleOnboardingSubmit = useCallback(async () => {
    if (!selectedLocationForOnboard?.countyName) {
      toast.error('County is required.');
      return;
    }

    // ensure positionId is set (auto-selected)
    let finalPositionId = positionId;
    if (!finalPositionId) {
      const matched = availablePositions.find((pos) => pos.position_name.toLowerCase().trim() === TARGET_POSITION_NAME.toLowerCase().trim());
      if (matched) finalPositionId = String(matched.position_id);
    }

    if (!candidateName || !partyId || !finalPositionId) {
      toast.error('Candidate Name, Political Party, Position, and County are required.');
      return;
    }

    if (!validateEmail(contactEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!validatePhone(contactPhone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    setOnboardingLoading(true);

    const apiEndpoint = `https://skizagroundsuite.com/API/onboard_${TARGET_POSITION_NAME.toLowerCase().replace(/\s/g, '')}_candidate.php`;

    const formData = new FormData();
    formData.append('name', candidateName);
    formData.append('party_id', partyId);
    formData.append('position_id', finalPositionId);
    formData.append('county_name', selectedLocationForOnboard.countyName);
    formData.append('status', 'Pending');
    if (photoFile) formData.append('photo', photoFile);
    if (contactEmail) formData.append('contact_email', contactEmail);
    if (contactPhone) formData.append('contact_phone', contactPhone);

    try {
      const response = await fetch(apiEndpoint, { method: 'POST', body: formData });
      if (!response.ok) {
        const text = await response.text();
        try {
          const asJson = JSON.parse(text);
          throw new Error(asJson.message || 'Failed to onboard candidate.');
        } catch (_) {
          throw new Error(text || 'Failed to onboard candidate.');
        }
      }

      const result: { status: string; message?: string } = await response.json();
      if (result.status === 'success') {
        toast.success('Candidate onboarded successfully!');
        // Optionally: optimistic update could push to local list here if you add a real source of truth.
        setTimeout(() => {
          handleCloseOnboardModal();
        }, 1200);
      } else {
        toast.error(result.message || 'Failed to onboard candidate.');
      }
    } catch (err: unknown) {
      toast.error(`Error onboarding candidate: ${(err as Error).message ?? String(err)}`);
    } finally {
      setOnboardingLoading(false);
    }
  }, [availablePositions, candidateName, contactEmail, contactPhone, partyId, photoFile, positionId, selectedLocationForOnboard]);

  return (
    <Box sx={{ p: 4 }}>
      <Toaster position="top-center" reverseOrder={false} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
          <GroupAdd sx={{ mr: 1 }} /> Women Representative Candidate Onboarding & Management
        </Typography>

        <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="region-select-label">Region</InputLabel>
            {loadingRegions ? (
              <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
            ) : regionFetchError ? (
              <Alert severity="error" sx={{ mt: 1 }}>{regionFetchError}</Alert>
            ) : (
              <Select labelId="region-select-label" id="region-select" value={selectedRegion} label="Region" onChange={handleRegionChange}>
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
            <FormControl sx={{ minWidth: 200 }} disabled={!selectedRegionId}>
              <InputLabel id="county-select-label">County</InputLabel>
              {loadingCounties ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : countyFetchError ? (
                <Alert severity="error" sx={{ mt: 1 }}>{countyFetchError}</Alert>
              ) : (
                <Select labelId="county-select-label" id="county-select" value={selectedCounty} label="County" onChange={handleCountyChange}>
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
            <Typography variant="h6">Please select a region to begin managing Women Representative candidates.</Typography>
          </Box>
        ) : (
          <>
            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Card variant="outlined" sx={{ mb: 4, p: 3, boxShadow: 2 }}>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 'medium' }}>
                    Overview for {selectedCounty || selectedRegion}
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard title="Total Counties" value={womenRepStats.totalCountiesInRegion} icon={<HomeWork fontSize="large" />} color="info.main" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard title="Candidates Recruited" value={womenRepStats.candidatesRecruited} icon={<PersonAdd fontSize="large" />} color="primary.main" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard title="Candidates Vetted" value={womenRepStats.candidatesVetted} icon={<CheckCircle fontSize="large" />} color="success.main" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <StatCard title="Candidates Pending" value={womenRepStats.candidatesPending} icon={<GroupAdd fontSize="large" />} color="warning.main" />
                    </Grid>
                  </Grid>
                </Card>

                {availableCounties.length > 0 ? (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" gutterBottom>
                      {selectedCounty ? `Women Representative Candidates in ${selectedCounty} County` : `Counties in ${selectedRegion} Region for Women Representatives`}
                    </Typography>
                    <Grid container spacing={3}>
                      {availableCounties
                        .filter((county) => !selectedCounty || county.name === selectedCounty)
                        .map((county) => (
                          <Grid item xs={12} sm={6} md={4} key={county.id}>
                            <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                                {county.name} County
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Women Reps: {womenRepCandidates.filter((c) => c.county === county.name).length}
                              </Typography>
                              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button variant="contained" size="small" startIcon={<PersonAdd />} onClick={() => handleOpenOnboardModal(county.name)}>
                                  Onboard Women Rep
                                </Button>
                              </Box>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <Typography variant="h6">No counties found for the selected region, or no Women Rep data available.</Typography>
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </motion.div>

      <Modal open={isOnboardModalOpen} onClose={handleCloseOnboardModal} aria-labelledby="onboard-candidate-modal-title" aria-describedby="onboard-candidate-modal-description">
        <Box
          sx={{
            position: 'absolute' as const,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 600 },
            bgcolor: 'background.paper',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: 24,
            p: 4,
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 2,
          }}
        >
          <Typography id="onboard-candidate-modal-title" variant="h6" component="h2" gutterBottom>
            Onboard {TARGET_POSITION_NAME} Candidate for {selectedLocationForOnboard?.countyName} County
          </Typography>
          <Typography id="onboard-candidate-modal-description" sx={{ mt: 2, mb: 3 }} color="text.secondary">
            Fill in the details below to onboard a new {TARGET_POSITION_NAME} candidate in {selectedLocationForOnboard?.countyName}.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField label="Candidate Name" fullWidth value={candidateName} onChange={(e) => setCandidateName(e.target.value)} required />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="party-select-label">Political Party</InputLabel>
                {loadingParties ? (
                  <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
                ) : partiesError ? (
                  <Alert severity="error" sx={{ mt: 1 }}>{partiesError}</Alert>
                ) : (
                  <Select labelId="party-select-label" id="party-select" value={partyId} label="Political Party" onChange={(e: SelectChangeEvent<string>) => setPartyId(e.target.value)}>
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
                  <Select labelId="position-select-label" id="position-select" value={positionId} label="Political Position" onChange={(e: SelectChangeEvent<string>) => setPositionId(e.target.value)} disabled>
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
                {!!TARGET_POSITION_NAME && (positionId || !loadingPositions) && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Position pre-selected as <strong>{TARGET_POSITION_NAME}</strong>.
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Contact Email (Optional)" fullWidth type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Contact Phone (Optional)" fullWidth type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" component="label" sx={{ mt: 2 }}>
                Upload Photo (Optional)
                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
              </Button>
              {photoFile && (
                <Typography variant="body2" sx={{ mt: 1, ml: 1 }}>
                  Selected file: <strong>{photoFile.name}</strong>
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={handleCloseOnboardModal} disabled={onboardingLoading}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleOnboardingSubmit} disabled={onboardingLoading} startIcon={onboardingLoading ? <CircularProgress size={20} color="inherit" /> : null}>
                {onboardingLoading ? 'Onboarding...' : 'Onboard Candidate'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
    </Box>
  );
};

export default OnboardWomenRepresentativePage;
