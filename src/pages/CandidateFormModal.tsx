// src/pages/CandidateDetailsPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, CircularProgress, Alert, Grid, Card, CardContent,
  Button, Avatar, Divider, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Skeleton, useMediaQuery, Snackbar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Person, ArrowBack, Email, Phone, AccountCircle,
  LocationOn, Close, Edit, ContentCopy, Delete
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface CandidateDetails {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  photo_url: string;
  status: string;
  county_name: string;
  constituency_name: string;
  ward_name: string;
  party_name: string;
  position_name: string;
}

const DOMAIN_BASE_URL = 'https://skizagroundsuite.com/';
const API = (path: string) => `${DOMAIN_BASE_URL}API/${path}`;

const CACHE_KEY = (id: string) => `candidate:${id}:v1`;
const CACHE_TTL_MS = 2 * 60 * 1000;

const normalizeUrl = (relativePath: string) => {
  if (!relativePath) {
    return 'https://placehold.co/240x240/E0E0E0/333333?text=No+Photo';
  }
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const clean = relativePath.replace(/^\/+/, '');
  return `${DOMAIN_BASE_URL}${clean.startsWith('API/') ? '' : 'API/'}${clean}`;
};

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('active') || s.includes('approved')) return 'success';
  if (s.includes('pending') || s.includes('vet')) return 'warning';
  if (s.includes('inactive') || s.includes('reject')) return 'error';
  return 'default';
};

// small fetch helper with retry/backoff
async function fetchJSON(url: string, init?: RequestInit, retries = 1): Promise<any> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 300));
      return fetchJSON(url, init, retries - 1);
    }
    throw e;
  }
}

const CandidateDetailsPage: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [candidate, setCandidate] = useState<CandidateDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // edit modal
  const [openModal, setOpenModal] = useState(false);
  const [formValues, setFormValues] = useState({ contact_email: '', contact_phone: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // delete confirm
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // snackbar
  const [snack, setSnack] = useState<{open:boolean; msg:string; sev:'success'|'error'|'warning'|'info'}>({
    open:false, msg:'', sev:'success'
  });

  const abortRef = useRef<AbortController | null>(null);

  const readCache = useCallback((): CandidateDetails | null => {
    if (!candidateId) return null;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY(candidateId));
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL_MS) return null;
      return data as CandidateDetails;
    } catch { return null; }
  }, [candidateId]);

  const saveCache = useCallback((data: CandidateDetails) => {
    if (!candidateId) return;
    try {
      sessionStorage.setItem(CACHE_KEY(candidateId), JSON.stringify({ ts: Date.now(), data }));
    } catch {}
  }, [candidateId]);

  const fetchCandidateDetails = useCallback(async () => {
    if (!candidateId) {
      setError('Candidate ID is missing.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);

    const cached = readCache();
    if (cached) {
      setCandidate(cached);
      setLoading(false); // render instantly, then revalidate below
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const result = await fetchJSON(
        API(`fetch_single_candidate.php?candidate_id=${encodeURIComponent(candidateId)}`),
        { signal: ctrl.signal as any },
        1
      );
      if (result.status === 'success' && result.data) {
        setCandidate(result.data);
        saveCache(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch candidate details.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (!cached) setError(`Failed to load candidate: ${err?.message || String(err)}`);
      setSnack({ open:true, msg:'Could not refresh candidate details', sev:'warning' });
    } finally {
      setLoading(false);
    }
  }, [candidateId, readCache, saveCache]);

  useEffect(() => {
    fetchCandidateDetails();
    return () => abortRef.current?.abort();
  }, [fetchCandidateDetails]);

  // photo preview lifecycle
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleOpenModal = () => {
    if (!candidate) return;
    setFormValues({ contact_email: candidate.contact_email || '', contact_phone: candidate.contact_phone || '' });
    setPhotoFile(null);
    setOpenModal(true);
  };
  const handleCloseModal = () => setOpenModal(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setPhotoFile(e.target.files[0]);
  };

  const emailError = useMemo(() => {
    if (!formValues.contact_email) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.contact_email) ? '' : 'Invalid email';
  }, [formValues.contact_email]);

  const phoneError = useMemo(() => {
    if (!formValues.contact_phone) return '';
    return /^(\+?\d[\d ()\-\.]{6,})$/.test(formValues.contact_phone) ? '' : 'Invalid phone';
  }, [formValues.contact_phone]);

  const isChanged = useMemo(() => {
    if (!candidate) return false;
    const emailChanged = (candidate.contact_email || '') !== formValues.contact_email;
    const phoneChanged = (candidate.contact_phone || '') !== formValues.contact_phone;
    const photoChanged = !!photoFile;
    return emailChanged || phoneChanged || photoChanged;
  }, [candidate, formValues, photoFile]);

  const handleUpdateSubmit = async () => {
    if (!candidate?.id) return;
    if (emailError || phoneError) return;

    setIsSubmitting(true);

    // optimistic update
    const prev = candidate;
    const optimistic: CandidateDetails = {
      ...candidate,
      contact_email: formValues.contact_email,
      contact_phone: formValues.contact_phone,
      photo_url: photoFile ? (photoPreview || candidate.photo_url) : candidate.photo_url,
    };
    setCandidate(optimistic);

    const formData = new FormData();
    formData.append('id', String(candidate.id));
    formData.append('contact_email', formValues.contact_email);
    formData.append('contact_phone', formValues.contact_phone);
    if (photoFile) formData.append('photo', photoFile);

    try {
      const result = await fetchJSON(API('update_candidate.php'), { method: 'POST', body: formData }, 0);
      if (result.status === 'success') {
        saveCache(optimistic);
        setSnack({ open:true, msg:'Candidate updated', sev:'success' });
        setOpenModal(false);
        // re-fetch to reflect server truth (e.g., stored photo url)
        await fetchCandidateDetails();
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (err) {
      setCandidate(prev);
      setSnack({ open:true, msg:'Update failed. Changes reverted.', sev:'error' });
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate?.id) return;
    setDeleting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(candidate.id));
      const result = await fetchJSON(API('delete_candidate.php'), { method: 'POST', body: formData }, 0);
      if (result.status === 'success') {
        setSnack({ open:true, msg:'Candidate deleted', sev:'success' });
        sessionStorage.removeItem(CACHE_KEY(String(candidate.id)));
        navigate(-1);
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (e) {
      setSnack({ open:true, msg:'Delete failed. Try again.', sev:'error' });
    } finally {
      setDeleting(false);
      setOpenDelete(false);
    }
  };

  const copyToClipboard = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setSnack({ open:true, msg:'Copied to clipboard', sev:'info' });
    } catch {
      setSnack({ open:true, msg:value, sev:'info' });
    }
  };

  if (loading && !candidate) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          p: 3,
          minHeight: '100dvh',
          paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={() => navigate(-1)} startIcon={<ArrowBack />}>Go Back</Button>
          <Button variant="outlined" onClick={fetchCandidateDetails}>Retry</Button>
        </Box>
      </Box>
    );
  }

  if (!candidate) {
    return (
      <Box
        sx={{
          p: 3,
          minHeight: '100dvh',
          paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <Alert severity="info">Candidate not found.</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }} startIcon={<ArrowBack />}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        bgcolor: 'background.default',
        minHeight: '100dvh',
        paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Button onClick={() => navigate(-1)} sx={{ mb: 2 }} startIcon={<ArrowBack />}>
          Back to Ward Candidates
        </Button>

        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm="auto" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Avatar
                src={normalizeUrl(candidate.photo_url)}
                alt={candidate.name}
                sx={{
                  width: 120,
                  height: 120,
                  mx: { xs: 'auto', sm: 0 },
                  border: (t) => `3px solid ${t.palette.primary.main}`,
                }}
                imgProps={{ loading: 'lazy', referrerPolicy: 'no-referrer' }}
              >
                <Person sx={{ fontSize: 60 }} />
              </Avatar>
            </Grid>
            <Grid item xs={12} sm>
              <Typography variant={isXs ? 'h5' : 'h4'} gutterBottom sx={{ fontWeight: 800 }}>
                {candidate.name || <Skeleton width={220} />}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="h6" color="text.secondary">{candidate.position_name}</Typography>
                <Chip label={candidate.status} color={getStatusColor(candidate.status)} size="small" />
              </Box>
              <Typography variant="body1" color="text.secondary">Party: {candidate.party_name}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                  <AccountCircle sx={{ mr: 1 }} /> Contact & Personal Details
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                  <Email color="action" />
                  <Typography variant="body1" sx={{ wordBreak: 'break-word', mr: 1 }}>
                    <strong>Email:</strong>{' '}
                    {candidate.contact_email ? (
                      <a href={`mailto:${candidate.contact_email}`}>{candidate.contact_email}</a>
                    ) : '—'}
                  </Typography>
                  {!!candidate.contact_email && (
                    <IconButton size="small" onClick={() => copyToClipboard(candidate.contact_email)} aria-label="Copy email">
                      <ContentCopy fontSize="inherit" />
                    </IconButton>
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone color="action" />
                  <Typography variant="body1" sx={{ mr: 1 }}>
                    <strong>Phone:</strong>{' '}
                    {candidate.contact_phone ? (
                      <a href={`tel:${candidate.contact_phone}`}>{candidate.contact_phone}</a>
                    ) : '—'}
                  </Typography>
                  {!!candidate.contact_phone && (
                    <IconButton size="small" onClick={() => copyToClipboard(candidate.contact_phone)} aria-label="Copy phone">
                      <ContentCopy fontSize="inherit" />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                  <LocationOn sx={{ mr: 1 }} /> Location Details
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="body1"><strong>Ward:</strong> {candidate.ward_name}</Typography>
                <Typography variant="body1"><strong>Constituency:</strong> {candidate.constituency_name}</Typography>
                <Typography variant="body1"><strong>County:</strong> {candidate.county_name}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<Edit />} onClick={handleOpenModal}>
            Edit Candidate
          </Button>
          <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setOpenDelete(true)}>
            Delete Candidate
          </Button>
        </Box>
      </motion.div>

      {/* Edit Candidate Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="sm"
        fullScreen={isXs}
        PaperProps={{
          sx: {
            borderRadius: isXs ? 0 : 3,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          Edit Candidate: {candidate?.name}
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Avatar
              src={photoPreview || (candidate?.photo_url ? normalizeUrl(candidate.photo_url) : undefined)}
              sx={{ width: 120, height: 120, mx: 'auto', mb: 1 }}
            />
            <Button variant="outlined" component="label" sx={{ alignSelf: 'center' }}>
              Upload Passport Photo
              <input type="file" hidden accept="image/*" onChange={handleFileChange} />
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              {photoFile?.name || 'No file selected'}
            </Typography>

            <TextField
              margin="dense"
              name="contact_email"
              label="Email Address"
              type="email"
              autoComplete="email"
              fullWidth
              value={formValues.contact_email}
              onChange={handleFormChange}
              error={!!emailError}
              helperText={emailError || ' '}
              inputProps={{ inputMode: 'email', style: { fontSize: 16 } }}
            />
            <TextField
              margin="dense"
              name="contact_phone"
              label="Phone Number"
              type="tel"
              autoComplete="tel"
              fullWidth
              value={formValues.contact_phone}
              onChange={handleFormChange}
              error={!!phoneError}
              helperText={phoneError || ' '}
              inputProps={{ inputMode: 'tel', style: { fontSize: 16 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Button onClick={handleCloseModal} color="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateSubmit}
            variant="contained"
            disabled={isSubmitting || !isChanged || !!emailError || !!phoneError}
          >
            {isSubmitting ? <CircularProgress size={22} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Candidate</DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to permanently delete <strong>{candidate?.name}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={22} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open:false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} sx={{ width: '100%' }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CandidateDetailsPage;
