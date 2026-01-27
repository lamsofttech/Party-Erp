// src/components/EmailLogTable.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  Stack,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Skeleton,
  Chip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';

interface EmailLog {
  id: number;
  subject: string;
  recipient_count: number;
  sent_by: string;
  sent_at: string; // ISO string
}

const CACHE_KEY = 'emailLogs.cache.v1';

const EmailLogTable: React.FC = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // phones

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isXs ? 10 : 25);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load cached first for instant paint
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { logs: EmailLog[]; ts: number };
        if (Array.isArray(parsed.logs)) {
          setLogs(parsed.logs);
          setLastUpdated(parsed.ts);
        }
      } catch {}
    }
  }, []);

  // Online/offline awareness for PWA
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

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/email/logs', { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as EmailLog[];
      setLogs(Array.isArray(data) ? data : []);
      const ts = Date.now();
      setLastUpdated(ts);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ logs: data, ts }));
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError('Failed to load logs. Please try again.');
        console.error('Failed to load logs', e);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch (don’t block if offline)
  useEffect(() => {
    if (!offline) fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline]);

  // Filtered + sorted (newest first)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? logs.filter(
          (l) =>
            l.subject?.toLowerCase().includes(term) ||
            l.sent_by?.toLowerCase().includes(term)
        )
      : logs;
    return [...base].sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
  }, [logs, q]);

  // Current page slice
  const paged = useMemo(() => {
    if (isXs) return filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    return filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filtered, page, rowsPerPage, isXs]);

  const onChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const onChangeRows = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { hour12: false });

  return (
    <Box sx={{ pt: 1 }}>
      {offline && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You’re offline. Showing cached results{lastUpdated ? ` (updated ${new Date(lastUpdated).toLocaleTimeString()})` : ''}.
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Typography variant="h6">Sent Email History</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search subject or sender"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
          <IconButton
            aria-label="Refresh"
            onClick={fetchLogs}
            disabled={loading || offline}
          >
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Stack>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchLogs} disabled={offline}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Phone view: card list */}
      {isXs ? (
        <Stack spacing={1.25}>
          {loading && logs.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Paper key={i} sx={{ p: 1.5 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="40%" />
                  <Skeleton width="30%" />
                </Paper>
              ))
            : paged.map((log) => (
                <Paper key={log.id} sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 600, mb: 0.5 }} noWrap>
                    {log.subject || '(No subject)'}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`${log.recipient_count} recipients`} />
                    <Typography variant="body2" color="text.secondary">
                      By {log.sent_by}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {fmtTime(log.sent_at)}
                  </Typography>
                </Paper>
              ))}

          {!loading && filtered.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No email logs found.
              </Typography>
            </Paper>
          )}

          {/* Mobile pagination */}
          {filtered.length > 0 && (
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={onChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={onChangeRows}
              rowsPerPageOptions={[5, 10, 25]}
            />
          )}
        </Stack>
      ) : (
        // Desktop/tablet view: data table
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table stickyHeader size="small" aria-label="Email logs table">
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell width={120}>Recipients</TableCell>
                  <TableCell width={220}>Sent By</TableCell>
                  <TableCell width={220}>Sent At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && logs.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton width="60%" /></TableCell>
                        <TableCell><Skeleton width="70%" /></TableCell>
                        <TableCell><Skeleton width="80%" /></TableCell>
                      </TableRow>
                    ))
                  : paged.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ maxWidth: 480 }}>
                          <Typography noWrap title={log.subject}>
                            {log.subject || '(No subject)'}
                          </Typography>
                        </TableCell>
                        <TableCell>{log.recipient_count}</TableCell>
                        <TableCell>{log.sent_by}</TableCell>
                        <TableCell>{fmtTime(log.sent_at)}</TableCell>
                      </TableRow>
                    ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No email logs found.
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
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          )}
        </Paper>
      )}

      {/* Last updated footer */}
      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

export default EmailLogTable;
