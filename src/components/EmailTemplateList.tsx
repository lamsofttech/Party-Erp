// src/components/EmailTemplateList.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import PreviewIcon from '@mui/icons-material/Preview';

export interface Template {
  id: number;
  name: string;
  subject: string;
  body: string; // HTML
}

type Props = {
  onUse?: (t: Template) => void; // pass selected template to your composer
  fetchUrl?: string;             // override API if needed
};

const CACHE_KEY = 'emailTemplates.cache.v1';

const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
};

const EmailTemplateList: React.FC<Props> = ({
  onUse,
  fetchUrl = '/api/email/templates',
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isXs ? 6 : 12);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load cached first for instant paint
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { items: Template[]; ts: number };
        if (Array.isArray(parsed.items)) {
          setTemplates(parsed.items);
          setLastUpdated(parsed.ts);
        }
      } catch {}
    }
  }, []);

  // Online/offline awareness
  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(fetchUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Template[];
      const items = Array.isArray(data) ? data : [];
      setTemplates(items);
      const ts = Date.now();
      setLastUpdated(ts);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts }));
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError('Failed to load templates. Please try again.');
        console.error('Template fetch error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when online
  useEffect(() => {
    if (!offline) fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, fetchUrl]);

  // Search + sort
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(term) ||
            t.subject.toLowerCase().includes(term) ||
            stripHtml(t.body).toLowerCase().includes(term)
        )
      : templates;
    // Sort: most recently created first if id is incremental, else by name
    return [...base].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [templates, q]);

  const paged = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const onChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const onChangeRows = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleUse = (t: Template) => {
    if (onUse) onUse(t);
  };

  return (
    <Box sx={{ pt: 1 }}>
      {offline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You’re offline. Showing cached templates
          {lastUpdated ? ` (updated ${new Date(lastUpdated).toLocaleTimeString()})` : ''}.
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Typography variant="h6">Email Templates</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search templates"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
          <IconButton aria-label="Refresh" onClick={fetchTemplates} disabled={loading || offline}>
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Stack>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchTemplates} disabled={offline}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Phone view: cards */}
      {isXs ? (
        <Stack spacing={1.25}>
          {loading && templates.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Paper key={i} sx={{ p: 1.5 }}>
                  <Skeleton width="50%" />
                  <Skeleton width="70%" />
                  <Skeleton width="90%" />
                </Paper>
              ))
            : paged.map((t) => (
                <Paper key={t.id} sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontWeight: 600, pr: 1 }} noWrap title={t.name}>
                      {t.name}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t.subject || '(No subject)'}
                      sx={{ maxWidth: '55%' }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    {stripHtml(t.body).slice(0, 140)}
                    {stripHtml(t.body).length > 140 ? '…' : ''}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="contained" onClick={() => handleUse(t)}>
                      Use
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PreviewIcon />}
                      onClick={() => setPreview(t)}
                    >
                      Preview
                    </Button>
                  </Stack>
                </Paper>
              ))}

          {!loading && filtered.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No templates found.
              </Typography>
            </Paper>
          )}

          {filtered.length > 0 && (
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={onChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={onChangeRows}
              rowsPerPageOptions={[6, 12, 24]}
            />
          )}
        </Stack>
      ) : (
        // Desktop/tablet: table
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table stickyHeader size="small" aria-label="Email templates">
              <TableHead>
                <TableRow>
                  <TableCell width={280}>Name</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Excerpt</TableCell>
                  <TableCell width={170} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && templates.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton width="60%" /></TableCell>
                        <TableCell><Skeleton width="90%" /></TableCell>
                        <TableCell align="right"><Skeleton width="70%" /></TableCell>
                      </TableRow>
                    ))
                  : paged.map((t) => {
                      const plain = stripHtml(t.body);
                      return (
                        <TableRow key={t.id} hover>
                          <TableCell sx={{ maxWidth: 360 }}>
                            <Typography noWrap title={t.name}>{t.name}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 360 }}>
                            <Typography noWrap title={t.subject || '(No subject)'}>{t.subject || '(No subject)'}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 560 }}>
                            <Typography noWrap title={plain}>{plain}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button size="small" variant="contained" onClick={() => handleUse(t)}>
                                Use
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PreviewIcon />}
                                onClick={() => setPreview(t)}
                              >
                                Preview
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No templates found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filtered.length > 0 && (
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={onChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={onChangeRows}
              rowsPerPageOptions={[12, 24, 50, 100]}
            />
          )}
        </Paper>
      )}

      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </Typography>
      )}

      {/* Preview dialog */}
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isXs}
      >
        <DialogTitle>{preview?.name}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Subject: {preview?.subject || '(No subject)'}
          </Typography>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              p: 2,
              borderRadius: 1,
              backgroundColor: 'background.paper',
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: preview?.body || '' }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (preview) handleUse(preview);
              setPreview(null);
            }}
          >
            Use this template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailTemplateList;
