// src/pages/TurnoutGamePage.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Grid,
  Button,
  Chip,
  LinearProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { motion, AnimatePresence } from "framer-motion";

import { useTurnoutStore } from "../contexts/TurnoutStoreContext";
import { safeRandomUUID } from "../utils/safeRandomUUID";

type NavStateStation = {
  id: string;
  name: string;
  county?: string;
  constituency?: string;
  ward?: string;
  registered?: number;
};

type StationApi = {
  ok: boolean;
  station: {
    id: number;
    reg_centre_code: string;
    reg_centre_name: string;
    registered_voters: number | null;
    turn_out: number;
    percent: number | null;
  };
};

const TILE_BATCH_CHOICES = [5, 10, 20] as const;
const clamp = (v: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, v));

// ===== API CONFIG =====
const POST_API_URL =
  "https://skizagroundsuite.com/API/submit_turnout.php";
const GET_API_URL =
  "https://skizagroundsuite.com/API/get_turnout.php";

// Read token at call time (avoids SSR issues and stale tokens)
const getAuthToken = (): string =>
  typeof window !== "undefined"
    ? localStorage.getItem("turnout:token") ?? ""
    : "";

// Always build valid HeadersInit (no undefined values)
const buildPostHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

// keep GET simple to avoid preflight
const buildGetHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

// ---- simple offline queue ----
type DeltaItem = { stationId: string; delta: number; ts: number };
const QUEUE_KEY = "turnout:queue";

const readQueue = (): DeltaItem[] => {
  try {
    return (
      JSON.parse(
        (typeof window !== "undefined"
          ? localStorage.getItem(QUEUE_KEY)
          : "[]") || "[]"
      ) ?? []
    );
  } catch {
    return [];
  }
};
const writeQueue = (q: DeltaItem[]) => {
  try {
    if (typeof window !== "undefined")
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch { }
};
const enqueueDelta = (item: DeltaItem) => {
  const q = readQueue();
  q.push(item);
  writeQueue(q);
};

const sendChunk = async (clientId: string, events: DeltaItem[]) => {
  try {
    const res = await fetch(POST_API_URL, {
      method: "POST",
      headers: buildPostHeaders(),
      body: JSON.stringify({ clientId, events }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
};

const sendBeaconIfPossible = (clientId: string, events: DeltaItem[]) => {
  if (!("sendBeacon" in navigator) || !events.length) return false;
  try {
    const blob = new Blob([JSON.stringify({ clientId, events })], {
      type: "application/json",
    });
    return (navigator as any).sendBeacon(POST_API_URL, blob);
  } catch {
    return false;
  }
};

const flushQueue = async (clientId: string): Promise<boolean> => {
  const q = readQueue();
  if (!q.length) return true;
  const chunkSize = 25;
  const chunks: DeltaItem[][] = Array.from(
    { length: Math.ceil(q.length / chunkSize) },
    (_, i) => q.slice(i * chunkSize, (i + 1) * chunkSize)
  );
  for (const c of chunks) {
    const ok = await sendChunk(clientId, c);
    if (!ok) return false;
  }
  writeQueue([]);
  return true;
};

function getOrCreateClientId(): string {
  if (typeof window !== "undefined") {
    const key = "turnout:clientId";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = safeRandomUUID();
    localStorage.setItem(key, id);
    return id;
  }
  return safeRandomUUID();
}

const TurnoutGamePage: React.FC = () => {
  const { stationId } = useParams();
  const nav = useNavigate();
  const { state } = useLocation() as {
    state?: { station?: NavStateStation };
  };
  const { turnoutStore, incrementCheckedIn } = useTurnoutStore();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  useEffect(() => {
    if (!stationId) nav(-1);
  }, [stationId, nav]);

  const [serverTurnout, setServerTurnout] = useState<number | null>(null);
  const [apiRegistered, setApiRegistered] = useState<number | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const fetchCurrent = useCallback(async () => {
    if (!stationId) return;
    try {
      setFetchErr(null);
      const url = `${GET_API_URL}?stationId=${encodeURIComponent(
        stationId
      )}&_=${Date.now()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: buildGetHeaders(),
        cache: "no-store",
        mode: "cors",
      });
      if (!res.ok) throw new Error(`GET ${res.status}`);

      const json: StationApi = await res.json();
      if (!json?.ok || !json?.station) throw new Error("invalid_payload");

      const t = Number(json.station.turn_out ?? 0);
      const serverVal = Number.isFinite(t) ? t : 0;
      setServerTurnout(serverVal);

      const r = json.station.registered_voters;
      setApiRegistered(typeof r === "number" ? r : null);

      setLastUpdated(Date.now());

      const local = turnoutStore[stationId]?.checkedIn ?? 0;
      if (serverVal > local) {
        incrementCheckedIn(stationId, serverVal - local);
      }
    } catch (e: any) {
      setFetchErr(e?.message || "fetch_failed");
    }
  }, [stationId, turnoutStore, incrementCheckedIn]);

  useEffect(() => {
    void fetchCurrent();
  }, [fetchCurrent]);

  // live polling
  useEffect(() => {
    if (!stationId) return;
    let timer: number | undefined;
    const start = () => {
      if (timer) return;
      setIsPolling(true);
      timer = window.setInterval(() => {
        if (navigator.onLine && !document.hidden) void fetchCurrent();
      }, 4000);
    };
    const stop = () => {
      setIsPolling(false);
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    if (!document.hidden) start();

    const onVis = () => (document.hidden ? stop() : start());
    const onOffline = () => stop();
    const onOnline = () => start();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [stationId, fetchCurrent]);

  // flush queued posts when possible
  useEffect(() => {
    if (!clientId) return;
    const reSync = async () => {
      const ok = await flushQueue(clientId);
      if (ok) await fetchCurrent();
    };
    const go = () => {
      void reSync();
    };
    window.addEventListener("online", go);
    document.addEventListener("visibilitychange", go);
    const onBeforeUnload = () => {
      const q = readQueue();
      sendBeaconIfPossible(clientId, q.slice(-10));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", go);
      document.removeEventListener("visibilitychange", go);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [clientId, fetchCurrent]);

  const [batchSize, setBatchSize] =
    useState<(typeof TILE_BATCH_CHOICES)[number]>(10);
  const [visibleTiles, setVisibleTiles] = useState(10);
  const [stealth, setStealth] = useState(true);

  // --- GAME FEEL STATES ---
  const [tapFlash, setTapFlash] = useState(false);
  const [progressPulse, setProgressPulse] = useState(false);
  // combo is tracked via refs; we only keep the setter here to avoid TS6133
  const [, setComboCount] = useState(0);

  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [messageKey, setMessageKey] = useState(0);

  const lastTapRef = useRef<number | null>(null);
  const comboRef = useRef<number>(0);

  const stationName =
    state?.station?.name ?? (stationId ? `Station ${stationId}` : "Station");
  const storeEntry = stationId ? turnoutStore[stationId] : undefined;

  // Prefer API registered_voters (truth), then store/nav fallback
  const registeredRaw =
    (typeof apiRegistered === "number" ? apiRegistered : undefined) ??
    (typeof storeEntry?.registered === "number"
      ? storeEntry.registered
      : undefined) ??
    (typeof state?.station?.registered === "number"
      ? state.station.registered
      : undefined);

  // local counted (fast UI)
  const localCounted = storeEntry?.checkedIn ?? 0;

  // optimistic base so Remaining always reflects the best info
  const countBase = useMemo(
    () => Math.max(localCounted, serverTurnout ?? 0),
    [localCounted, serverTurnout]
  );

  // Cap = registered voters (fallback 500 only if unknown)
  const totalCap =
    typeof registeredRaw === "number" && registeredRaw > 0
      ? registeredRaw
      : 500;

  // Remaining shrinks as either local or server increases
  const remaining = Math.max(0, totalCap - countBase);

  // Progress based on the same optimistic base
  const pctDone = useMemo(
    () => (totalCap > 0 ? (countBase / totalCap) * 100 : 0),
    [countBase, totalCap]
  );

  // Turnout % (also from optimistic base vs registered)
  const turnoutPct = useMemo(() => {
    if (typeof registeredRaw === "number" && registeredRaw > 0) {
      return (countBase / registeredRaw) * 100;
    }
    return null;
  }, [countBase, registeredRaw]);

  const fmtPct = (p: number | null) =>
    p == null ? "—" : `${(Math.round(p * 10) / 10).toFixed(1)}%`;

  // keep tiles bounded
  useEffect(() => {
    setVisibleTiles((v) => Math.min(batchSize, remaining, Math.max(0, v)));
  }, [batchSize, remaining]);

  const tapAmount = useCallback(
    async (amount: number) => {
      if (!stationId || !clientId) return;
      const allowed = Math.max(0, Math.min(amount, remaining));
      if (allowed <= 0) return;

      // --- GAME FX: flash + pulse + combo ---
      setTapFlash(true);
      setProgressPulse((p) => !p);
      setTimeout(() => setTapFlash(false), 150);

      const now = Date.now();
      let nextCombo = 1;
      if (lastTapRef.current && now - lastTapRef.current < 4000) {
        nextCombo = comboRef.current + 1;
      }
      comboRef.current = nextCombo;
      lastTapRef.current = now;
      setComboCount(nextCombo);

      // Short, game-like messages
      let msg = "";
      if (nextCombo >= 5) msg = `STREAK x${nextCombo} 🔥`;
      else if (nextCombo === 4) msg = "On fire 🔥";
      else if (nextCombo === 3) msg = "Combo x3 💪";
      else if (nextCombo === 2) msg = "Combo x2 ⚡";
      else if (allowed >= 10) msg = "+10 boost 🚀";
      else if (allowed >= 5) msg = "Nice +5 🙌";
      else msg = "+1 locked ✅";

      setGameMessage(msg);
      setMessageKey((k) => k + 1);
      setTimeout(() => {
        setGameMessage(null);
      }, 900);

      // optimistic local update
      incrementCheckedIn(stationId, allowed);

      // queue + flush
      enqueueDelta({ stationId, delta: allowed, ts: Date.now() });
      const ok = await flushQueue(clientId);
      if (ok) await fetchCurrent();

      setVisibleTiles((prev) => Math.max(0, prev - allowed));
    },
    [stationId, clientId, remaining, incrementCheckedIn, fetchCurrent]
  );

  const nextBatch = () => {
    setVisibleTiles(Math.min(batchSize, Math.max(0, remaining)));
  };

  const handleBatchChange = (
    _: unknown,
    val: (typeof TILE_BATCH_CHOICES)[number] | null
  ) => {
    if (val === null) return;
    setBatchSize(val);
    setVisibleTiles(Math.min(val, Math.max(0, remaining)));
  };

  const syncNow = async () => {
    if (!clientId) return;
    const ok = await flushQueue(clientId);
    if (ok) await fetchCurrent();
  };

  // Tiles show 1..visibleTiles, not exceeding remaining
  const tileCount = Math.min(visibleTiles, remaining);
  const tileNumbers = Array.from({ length: tileCount }, (_, i) => i + 1);

  const updatedAt = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
      hour12: false,
    })
    : null;

  const locationLine = [
    state?.station?.ward,
    state?.station?.constituency,
    state?.station?.county,
  ]
    .filter(Boolean)
    .join(" • ")
    .toUpperCase();

  return (
    <>
      {/* Soft flash overlay when tapping */}
      <AnimatePresence>
        {tapFlash && (
          <motion.div
            key="tap-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(circle at center, rgba(255,255,255,0.6), transparent 55%)",
              mixBlendMode: "screen",
              zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      <Box
        sx={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #ff6b81 0, #ff3b3f 35%, #d4142d 70%, #96081a 100%)",
          px: { xs: 1.5, md: 3 },
          py: { xs: 2, md: 4 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1100,
            mx: "auto",
            position: "relative",
            zIndex: 2, // above flash
          }}
        >
          {/* Header – shorter and more game-like on mobile */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 1.5,
                gap: 1,
              }}
            >
              <Box sx={{ maxWidth: { xs: "70%", md: "100%" } }}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 2,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {isMobile ? "TURNOUT GAME" : "POLLING STATION AGENT VIEW"}
                </Typography>
                <Typography
                  variant={isMobile ? "h5" : "h4"}
                  sx={{
                    fontWeight: 800,
                    color: "white",
                    mt: 0.5,
                    lineHeight: 1.1,
                  }}
                >
                  {stationName}
                </Typography>
                {locationLine && !isMobile && (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "rgba(255,255,255,0.9)",
                      mt: 0.5,
                    }}
                  >
                    {locationLine}
                  </Typography>
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <IconButton
                  sx={{
                    color: "white",
                    bgcolor: "rgba(0,0,0,0.18)",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
                  }}
                  onClick={() => setStealth((s) => !s)}
                  aria-label="Toggle stealth"
                >
                  <SportsEsportsIcon />
                </IconButton>
                <IconButton
                  sx={{
                    color: "white",
                    bgcolor: "rgba(0,0,0,0.18)",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
                  }}
                  onClick={() => nav(-1)}
                  aria-label="Close"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Short mission text for mobile */}
            <Box
              sx={{
                mt: 1,
                display: "flex",
                justifyContent: { xs: "center", md: "center" },
              }}
            >
              <Box
                sx={{
                  px: isMobile ? 2 : 3,
                  py: 1,
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.15), rgba(0,0,0,0.25))",
                  color: "white",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                  textAlign: "center",
                }}
              >
                {isMobile
                  ? "Mission: fill the bar with voters 💥"
                  : "Today: mobilize turnout at this station only."}
              </Box>
            </Box>
          </motion.div>

          {/* Main cream card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <Box
              sx={{
                mt: { xs: 2.5, md: 3.5 },
                mb: { xs: 2, md: 4 },
                bgcolor: "rgba(255,250,246,0.96)",
                borderRadius: 4,
                boxShadow: "0 26px 80px rgba(0,0,0,0.35)",
                px: { xs: 2, md: 4 },
                py: { xs: 2.2, md: 3.5 },
                minHeight: { xs: "auto", md: 420 },
              }}
            >
              {/* Top status chips – simplified on mobile */}
              <Box
                sx={{
                  mb: 2,
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Chip
                  color={isPolling ? "success" : "default"}
                  variant="outlined"
                  label={
                    isMobile
                      ? isPolling
                        ? "LIVE"
                        : "PAUSE"
                      : isPolling
                        ? "Live"
                        : "Paused"
                  }
                  size={isMobile ? "small" : "medium"}
                />

                {updatedAt && !isMobile && (
                  <Chip variant="outlined" label={`Updated ${updatedAt}`} />
                )}

                {typeof registeredRaw === "number" && registeredRaw > 0 ? (
                  <>
                    <Chip
                      label={
                        isMobile
                          ? `Cap ${totalCap.toLocaleString()}`
                          : `Cap (Registered) ${totalCap.toLocaleString()}`
                      }
                      size={isMobile ? "small" : "medium"}
                    />
                    <Chip
                      color="secondary"
                      label={
                        isMobile
                          ? `Left ${remaining.toLocaleString()}`
                          : `Remaining ${remaining.toLocaleString()}`
                      }
                      size={isMobile ? "small" : "medium"}
                    />
                  </>
                ) : (
                  !isMobile && (
                    <>
                      <Chip
                        color="warning"
                        label="Registered unknown (fallback 500)"
                      />
                      <Chip
                        color="secondary"
                        label={`Remaining ${remaining.toLocaleString()}`}
                      />
                    </>
                  )
                )}

                {!stealth && (
                  <Chip
                    color="primary"
                    label={
                      isMobile
                        ? `Score ${countBase.toLocaleString()}`
                        : `Counted ${countBase.toLocaleString()}`
                    }
                    size={isMobile ? "small" : "medium"}
                  />
                )}

                <Chip
                  color="success"
                  variant="outlined"
                  label={`Turnout ${fmtPct(turnoutPct)}`}
                  size={isMobile ? "small" : "medium"}
                />

                {!isMobile && serverTurnout != null && (
                  <Chip
                    label={`Server: ${serverTurnout.toLocaleString()}`}
                    variant="outlined"
                  />
                )}

                {fetchErr && !isMobile && (
                  <Chip color="error" label={`Fetch error: ${fetchErr}`} />
                )}
              </Box>

              {/* Progress bar with pulse on tap */}
              <motion.div
                animate={{ scale: progressPulse ? 1.03 : 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <LinearProgress
                  variant="determinate"
                  value={clamp(pctDone)}
                  sx={{
                    height: 12,
                    borderRadius: 999,
                    mb: 1.5,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                    },
                  }}
                />
              </motion.div>
              {isMobile && (
                <Typography
                  variant="caption"
                  sx={{ display: "block", textAlign: "center", mb: 1.5 }}
                >
                  Tap tiles. Watch this bar grow. 🔋
                </Typography>
              )}

              {/* Small combo / game message */}
              <Box
                sx={{
                  mb: gameMessage ? 2 : 1,
                  minHeight: 24,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <AnimatePresence>
                  {gameMessage && (
                    <motion.div
                      key={messageKey}
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.22 }}
                    >
                      <Box
                        sx={{
                          px: 1.8,
                          py: 0.6,
                          borderRadius: 999,
                          bgcolor: "rgba(255, 111, 97, 0.12)",
                          border: "1px solid rgba(255, 111, 97, 0.5)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#d4142d",
                        }}
                      >
                        {gameMessage}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>

              {/* Controls row – compressed on mobile */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 2,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  Batch:
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size={isMobile ? "small" : "medium"}
                  value={batchSize}
                  onChange={handleBatchChange}
                >
                  {TILE_BATCH_CHOICES.map((n) => (
                    <ToggleButton key={n} value={n}>
                      {n}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                {!isMobile && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!stealth}
                        onChange={(e) => setStealth(!e.target.checked)}
                      />
                    }
                    label="Details"
                  />
                )}

                {isMobile && (
                  <Switch
                    checked={!stealth}
                    onChange={(e) => setStealth(!e.target.checked)}
                    inputProps={{ "aria-label": "Toggle details" }}
                    sx={{ ml: "auto" }}
                  />
                )}

                <Box sx={{ flex: 1 }} />
                <Button
                  variant={isMobile ? "contained" : "outlined"}
                  size={isMobile ? "small" : "medium"}
                  onClick={syncNow}
                >
                  {isMobile ? "Sync" : "Sync now"}
                </Button>
              </Box>

              {/* Tiles grid */}
              <Grid container spacing={1.2} sx={{ mb: 2 }}>
                {tileNumbers.map((n) => (
                  <Grid item xs={3} sm={2} key={n}>
                    <motion.div
                      whileTap={{ scale: 0.9, rotate: -2 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => void tapAmount(n)}
                        sx={{
                          py: { xs: 1.4, md: 2 },
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 800,
                          boxShadow: 2,
                          fontSize: { xs: 16, md: 18 },
                        }}
                        aria-label={`Add ${n}`}
                      >
                        {n}
                      </Button>
                    </motion.div>
                  </Grid>
                ))}

                {tileNumbers.length === 0 && remaining > 0 && (
                  <Grid item xs={12}>
                    <Alert
                      severity="info"
                      sx={{
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: isMobile ? 13 : 14,
                      }}
                      action={
                        <Button onClick={nextBatch} variant="contained">
                          Next {Math.min(batchSize, remaining)}
                        </Button>
                      }
                    >
                      {isMobile
                        ? "Nice! Batch done. Load more?"
                        : `Batch complete. Load next ${Math.min(
                          batchSize,
                          remaining
                        )}?`}
                    </Alert>
                  </Grid>
                )}

                {remaining === 0 && (
                  <Grid item xs={12}>
                    <Alert
                      severity="success"
                      sx={{
                        borderRadius: 2,
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      Cap reached. 🎉 Station maxed out!
                    </Alert>
                  </Grid>
                )}
              </Grid>

              {/* Quick increment buttons – short labels, game vibe */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  onClick={() => void tapAmount(1)}
                  variant="outlined"
                  disabled={!clientId || remaining < 1}
                  size={isMobile ? "small" : "medium"}
                >
                  +1
                </Button>
                <Button
                  onClick={() => void tapAmount(5)}
                  variant="outlined"
                  disabled={!clientId || remaining < 5}
                  size={isMobile ? "small" : "medium"}
                >
                  +5
                </Button>
                <Button
                  onClick={() => void tapAmount(10)}
                  variant="outlined"
                  disabled={!clientId || remaining < 10}
                  size={isMobile ? "small" : "medium"}
                >
                  +10
                </Button>
                {isMobile && (
                  <Typography
                    variant="caption"
                    sx={{ ml: 1, alignSelf: "center", fontWeight: 500 }}
                  >
                    Quick boosts ⚡
                  </Typography>
                )}
              </Box>
            </Box>
          </motion.div>
        </Box>
      </Box>
    </>
  );
};

export default TurnoutGamePage;
