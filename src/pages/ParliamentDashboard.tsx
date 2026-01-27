// src/pages/ParliamentDashboard.tsx  (MPOnboardingView)
import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Input,
  Alert,
  type SelectChangeEvent,   // keep this one since you’re using it
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';



// If MCA modal is in another file, ensure the path is correct:
import OnboardMCACandidateModal from '../components/OnboardMCACandidateModal';

/* --------------------------------
   Types (local to keep it self-contained)
-----------------------------------*/
interface Region {
  id: number;
  name: string;
}

interface County {
  id: string;        // county_code
  name: string;      // county_name
  code?: string;
  region_id: number;
}

interface Constituency {
  id: string;        // const_code
  name: string;      // constituency_name
}

interface Ward {
  id: string;                 // ward_code or ward_id
  name: string;               // ward_name
  constituency_code: string;
}

interface PoliticalPosition {
  position_id: number;
  position_name: string;
  position_level: string;
}

interface PoliticalParty {
  id: number;
  name: string;
}

/* --------------------------------
   MP Onboarding Modal (inline)
-----------------------------------*/
interface OnboardMPCandidateModalProps {
  open: boolean;
  onClose: () => void;
  countyName: string;
  constituencyName: string;
  onCandidateOnboarded: () => void;
}

function OnboardMPCandidateModal({
  open, onClose, countyName, constituencyName, onCandidateOnboarded
}: OnboardMPCandidateModalProps) {
  const [candidateName, setCandidateName] = useState('');
  const [partyId, setPartyId] = useState<string>('');       // party_id
  const [positionId, setPositionId] = useState<string>(''); // MP position_id
  const [mpPositionName, setMpPositionName] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

        if (result?.status === 'success' && Array.isArray(result.data)) {
          const mpPosition = result.data.find(
            (pos: PoliticalPosition) => pos.position_name === 'Member of National Assembly'
          );
          if (mpPosition) {
            setPositionId(String(mpPosition.position_id));
            setMpPositionName(mpPosition.position_name);
          } else {
            setPositionsError("Required position 'Member of National Assembly' not found.");
            setPositionId('');
            setMpPositionName('Not Found');
          }
        } else {
          setPositionsError('Political positions data is not in the expected format.');
        }
      } catch (err) {
        setPositionsError(
          `Could not load political positions. Error: ${err instanceof Error ? err.message : String(err)}`
        );
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

        if (result?.status === 'success' && Array.isArray(result.data)) {
          setAvailableParties(result.data);
        } else {
          setPartiesError('Political parties data is not in the expected format.');
          setAvailableParties([]);
        }
      } catch (err) {
        setPartiesError(
          `Could not load political parties. Error: ${err instanceof Error ? err.message : String(err)}`
        );
        setAvailableParties([]);
      } finally {
        setLoadingParties(false);
      }
    };

    fetchPositions();
    fetchParties();
  }, [open]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhotoFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!candidateName || !partyId || !positionId || !countyName || !constituencyName) {
      let validationMessage =
        'Please fill in all required fields: Candidate Name, Political Party, and Position. Ensure location details (County & Constituency) are selected from the main view.';
      if (!positionId) validationMessage += ' (Position could not be auto-detected or loaded).';
      setError(validationMessage);
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', candidateName);
    formData.append('party_id', partyId);
    formData.append('position_id', positionId);
    formData.append('county_name', countyName);
    formData.append('constituency_name', constituencyName);
    if (photoFile) formData.append('photo', photoFile);
    formData.append('status', 'Pending');
    if (contactEmail) formData.append('contact_email', contactEmail);
    if (contactPhone) formData.append('contact_phone', contactPhone);

    try {
      const response = await fetch('https://skizagroundsuite.com/API/onboard_candidate_constituency.php', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to onboard candidate.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setSuccess('Candidate onboarded successfully!');
        onCandidateOnboarded();
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
      <DialogTitle>Onboard MP Candidate</DialogTitle>
      <DialogContent>
        <Typography gutterBottom sx={{ mb: 1 }}>
          County: <strong>{countyName}</strong>
        </Typography>
        <Typography gutterBottom sx={{ mb: 2 }}>
          Constituency: <strong>{constituencyName}</strong>
        </Typography>

        <TextField
          label="Candidate Full Name"
          fullWidth
          margin="normal"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          disabled={loading}
          required
        />

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
              disabled
            >
              {positionId && mpPositionName ? (
                <MenuItem value={positionId}>{mpPositionName}</MenuItem>
              ) : (
                <MenuItem value=""><em>Loading Position...</em></MenuItem>
              )}
            </Select>
          )}
        </FormControl>

        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Candidate Photo
          </Typography>
          <Input
            type="file"
            onChange={handleFileChange}
            disabled={loading}
            inputProps={{ accept: 'image/*' }}
          />
          {photoFile && <Typography variant="caption" sx={{ ml: 1 }}>{photoFile.name}</Typography>}
        </Box>

        <TextField
          label="Contact Email"
          fullWidth
          margin="normal"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          disabled={loading}
          type="email"
        />
        <TextField
          label="Contact Phone"
          fullWidth
          margin="normal"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          disabled={loading}
          type="tel"
        />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* --------------------------------
   Main Page: MPOnboardingView
-----------------------------------*/
function MPOnboardingView() {
  const [availableRegions, setAvailableRegions] = useState<Region[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedCountyCode, setSelectedCountyCode] = useState<string | null>(null);

  const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([]);
  const [selectedConstituencyCode, setSelectedConstituencyCode] = useState<string | null>(null);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [openMPModal, setOpenMPModal] = useState(false);
  const [openMCAModal, setOpenMCAModal] = useState(false);

  // Expanded to include codes + ward info for MCA modal
  const [modalLocation, setModalLocation] = useState<{
    countyName: string;
    countyCode?: string;
    constituencyName: string;
    constituencyCode?: string;
    wardName?: string;
    wardCode?: string;
  } | null>(null);

  const [availableWards, setAvailableWards] = useState<Ward[]>([]);

  // Fetch Regions
  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true);
      try {
        const res = await fetch('https://skizagroundsuite.com/API/regions_api.php');
        const result = await res.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
          setAvailableRegions(result.data.map((item: any) => ({
            id: item.region_id,
            name: item.region_name
          })));
        } else {
          console.error('Unexpected regions payload:', result);
        }
      } catch (err) {
        console.error('Failed to fetch regions', err);
      } finally {
        setLoadingRegions(false);
      }
    };
    fetchRegions();
  }, []);

  // Fetch Counties by Region
  useEffect(() => {
    if (!selectedRegionId) {
      setAvailableCounties([]);
      setSelectedCounty('');
      setSelectedCountyCode(null);
      setAvailableConstituencies([]);
      setSelectedConstituencyCode(null);
      setAvailableWards([]);
      return;
    }

    const fetchCounties = async (regionId: number) => {
      setLoadingCounties(true);
      try {
        const res = await fetch(`https://skizagroundsuite.com/API/counties_by_region_api.php?region_id=${regionId}`);
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
          const counties = data.data.map((item: any) => ({
            id: item.county_code,
            name: item.county_name,
            region_id: regionId
          }));
          setAvailableCounties(counties);
        } else {
          console.error('Unexpected counties payload:', data);
        }
      } catch (err) {
        console.error('Failed to fetch counties', err);
      } finally {
        setLoadingCounties(false);
      }
    };
    fetchCounties(selectedRegionId);
  }, [selectedRegionId]);

  // Fetch Constituencies by County
  useEffect(() => {
    if (!selectedCountyCode) {
      setAvailableConstituencies([]);
      setSelectedConstituencyCode(null);
      setAvailableWards([]);
      return;
    }

    const fetchConstituencies = async (countyCode: string) => {
      setLoadingConstituencies(true);
      try {
        const paddedCode = String(countyCode).padStart(3, '0');
        const res = await fetch(`https://skizagroundsuite.com/API/get_constituencies_by_county.php?county_code=${paddedCode}`);
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
          const constituencies = data.data.map((item: any) => ({
            id: item.const_code,
            name: item.constituency_name
          }));
          setAvailableConstituencies(constituencies);
        } else {
          console.error('Unexpected constituencies payload:', data);
        }
      } catch (err) {
        console.error('Failed to fetch constituencies', err);
      } finally {
        setLoadingConstituencies(false);
      }
    };
    fetchConstituencies(selectedCountyCode);
  }, [selectedCountyCode]);

  // Fetch Wards by Constituency
  useEffect(() => {
    if (!selectedConstituencyCode) {
      setAvailableWards([]);
      return;
    }

    const fetchWards = async (constCode: string) => {
      setLoadingWards(true);
      try {
        const res = await fetch(`https://skizagroundsuite.com/API/get_wards_by_constituency.php?constituency_code=${constCode}`);
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
          const wards = data.data.map((item: any) => ({
            id: item.ward_code ?? item.ward_id,
            name: item.ward_name,
            constituency_code: constCode
          }));
          setAvailableWards(wards);
        } else {
          console.error('Unexpected wards payload:', data);
        }
      } catch (err) {
        console.error('Failed to fetch wards', err);
      } finally {
        setLoadingWards(false);
      }
    };
    fetchWards(selectedConstituencyCode);
  }, [selectedConstituencyCode]);

  const handleRegionChange = (e: SelectChangeEvent<string>) => {
    const regionName = e.target.value;
    setSelectedRegion(regionName);
    const region = availableRegions.find(r => r.name === regionName);
    setSelectedRegionId(region ? region.id : null);
    setSelectedCounty('');
    setSelectedCountyCode(null);
    setAvailableCounties([]);
    setAvailableConstituencies([]);
    setSelectedConstituencyCode(null);
    setAvailableWards([]);
  };

  const handleCountyChange = (e: SelectChangeEvent<string>) => {
    const countyName = e.target.value;
    setSelectedCounty(countyName);
    const foundCounty = availableCounties.find(c => c.name === countyName);
    setSelectedCountyCode(foundCounty ? String(foundCounty.id) : null);
    setAvailableConstituencies([]);
    setSelectedConstituencyCode(null);
    setAvailableWards([]);
  };

  const handleConstituencyChange = (e: SelectChangeEvent<string>) => {
    const constituencyName = e.target.value;
    const foundConstituency = availableConstituencies.find(c => c.name === constituencyName);
    setSelectedConstituencyCode(foundConstituency ? String(foundConstituency.id) : null);
    setAvailableWards([]);
  };

  const handleOpenOnboardMPModal = (constituencyName: string) => {
    if (!selectedCounty) {
      alert('Please select a County first.');
      return;
    }
    setModalLocation({ countyName: selectedCounty, constituencyName });
    setOpenMPModal(true);
  };

  const handleOpenOnboardMCAModal = (ward: Ward) => {
    if (!selectedCounty) {
      alert('Please select a County first.');
      return;
    }
    setModalLocation({
      countyName: selectedCounty,
      countyCode: selectedCountyCode ?? undefined,
      constituencyName: availableConstituencies.find(c => c.id === selectedConstituencyCode)?.name || '',
      constituencyCode: selectedConstituencyCode ?? undefined,
      wardName: ward.name,
      wardCode: ward.id,
    });
    setOpenMCAModal(true);
  };

  const handleCloseMPModal = () => {
    setOpenMPModal(false);
    setModalLocation(null);
  };

  const handleCloseMCAModal = () => {
    setOpenMCAModal(false);
    setModalLocation(null);
  };

  const handleCandidateOnboardedSuccess = () => {
    // Optional: refresh lists here
    console.log('Candidate onboarded successfully!');
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        <PersonAdd sx={{ mr: 1 }} /> Candidate Onboarding
      </Typography>

      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="region-select-label">Region</InputLabel>
          {loadingRegions ? (
            <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
          ) : (
            <Select
              labelId="region-select-label"
              id="region-select"
              value={selectedRegion}
              label="Region"
              onChange={handleRegionChange}
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
          <FormControl sx={{ minWidth: 200 }} disabled={!selectedRegionId}>
            <InputLabel id="county-select-label">County</InputLabel>
            {loadingCounties ? (
              <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
            ) : (
              <Select
                labelId="county-select-label"
                id="county-select"
                value={selectedCounty}
                label="County"
                onChange={handleCountyChange}
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
        )}

        {selectedCounty && (
          <FormControl sx={{ minWidth: 200 }} disabled={!selectedCountyCode}>
            <InputLabel id="constituency-select-label">Constituency</InputLabel>
            {loadingConstituencies ? (
              <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
            ) : (
              <Select
                labelId="constituency-select-label"
                id="constituency-select"
                value={
                  selectedConstituencyCode
                    ? availableConstituencies.find(c => c.id === selectedConstituencyCode)?.name || ''
                    : ''
                }
                label="Constituency"
                onChange={handleConstituencyChange}
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
      </Box>

      {/* --- MP Onboarding Section --- */}
      {selectedConstituencyCode && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            MP Candidates in {availableConstituencies.find(c => c.id === selectedConstituencyCode)?.name || 'Selected Constituency'}
          </Typography>
          <Card sx={{ width: 250, p: 2 }}>
            <CardContent>
              <Typography variant="h6">
                Onboard MP for {availableConstituencies.find(c => c.id === selectedConstituencyCode)?.name}
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                sx={{ mt: 2 }}
                onClick={() =>
                  handleOpenOnboardMPModal(
                    availableConstituencies.find(c => c.id === selectedConstituencyCode)?.name || ''
                  )
                }
              >
                Onboard MP Candidate
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      <hr style={{ margin: '40px 0' }} />

      {/* --- MCA Onboarding Section --- */}
      {selectedConstituencyCode && availableWards.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            MCA Candidates in {availableConstituencies.find(c => c.id === selectedConstituencyCode)?.name || 'Selected Constituency'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {loadingWards ? (
              <CircularProgress sx={{ m: 4 }} />
            ) : (
              availableWards.map((w) => (
                <Card key={w.id} sx={{ width: 250, p: 2 }}>
                  <CardContent>
                    <Typography variant="h6">{w.name} Ward</Typography>
                    <Button
                      variant="contained"
                      startIcon={<PersonAdd />}
                      sx={{ mt: 2 }}
                      onClick={() => handleOpenOnboardMCAModal(w)}
                    >
                      Onboard MCA Candidate
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        </Box>
      )}

      {!selectedConstituencyCode && selectedCounty && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="h6">Please select a constituency to view MCA onboarding options.</Typography>
        </Box>
      )}

      {selectedConstituencyCode && availableWards.length === 0 && !loadingWards && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="h6">No wards found for the selected constituency.</Typography>
        </Box>
      )}

      {/* MP Onboarding Modal */}
      {openMPModal && modalLocation && (
        <OnboardMPCandidateModal
          open={openMPModal}
          onClose={handleCloseMPModal}
          countyName={modalLocation.countyName}
          constituencyName={modalLocation.constituencyName}
          onCandidateOnboarded={handleCandidateOnboardedSuccess}
        />
      )}

      {/* MCA Onboarding Modal
         NOTE: OnboardMCACandidateModal requires pollingStationId:string.
         We pass the wardCode as a temporary stand-in so TypeScript compiles.
         Replace with a real polling-station selection and pass its ID. */}
      {openMCAModal && modalLocation && modalLocation.constituencyCode && modalLocation.wardCode && modalLocation.countyCode && (
        <OnboardMCACandidateModal
          open={openMCAModal}
          onClose={handleCloseMCAModal}
          countyName={modalLocation.countyName}
          countyCode={modalLocation.countyCode}
          constituencyName={modalLocation.constituencyName}
          constituencyCode={modalLocation.constituencyCode}
          wardName={modalLocation.wardName!}
          wardCode={modalLocation.wardCode!}
          pollingStationId={modalLocation.wardCode!}  
          onCandidateOnboarded={handleCandidateOnboardedSuccess}
        />
      )}
    </Box>
  );
}

export default MPOnboardingView;
