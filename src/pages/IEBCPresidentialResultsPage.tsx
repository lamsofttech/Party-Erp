import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Box, Typography, CircularProgress, Alert, Divider } from "@mui/material";
import { HowToVote } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { PollingStationCard } from "./ResultsCards";
import { ViewForm34A } from "../components/forms/form34A/ViewForm34A";

import { readDraft } from "../utils/storage";
import { useUser } from "../contexts/UserContext";

// ✅ use shared draft type from src/types/results.ts
import type { StationResultDraft } from "../types/results";

const API_BASE = "/API";
const BRAND_RED = "#F5333F";
const CARD_CREAM = "#FFF6EC";

export interface PollingStation {
  id: string;
  name: string;
  county: string;
  constituency: string;
  ward: string;
  registeredVoters?: number;
}

export interface Candidate {
  id: string;
  name: string;
  party?: string;
}

const IEBCPresidentialResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const authToken =
    (user as any)?.token ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("token");

  const normalizedRole = (user?.role || "").toString().toUpperCase();
  const isAgent =
    !!user &&
    (user.is_agent === true ||
      normalizedRole === "AGENT" ||
      normalizedRole.includes("AGENT") ||
      user.assigned_polling_station_id);

  const agentStationId = user?.assigned_polling_station_id ?? null;

  const userCountyName = user?.county_name ?? "";
  const userConstituencyName = user?.constituency_name ?? "";
  const userWardName = user?.ward_name ?? "";

  const [rawApiPollingStations, setRawApiPollingStations] = useState<PollingStation[]>([]);
  const [stationDrafts, setStationDrafts] = useState<Map<string, StationResultDraft>>(
    new Map()
  );
  const [loadingPollingStations, setLoadingPollingStations] = useState(false);
  const [pollingStationFetchError, setPollingStationFetchError] = useState<string | null>(
    null
  );

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateFetchError, setCandidateFetchError] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [activeStation, setActiveStation] = useState<PollingStation | null>(null);

  const fetchMyPollingStation = useCallback(async () => {
    setLoadingPollingStations(true);
    setPollingStationFetchError(null);

    try {
      const hasTokenCookie =
        typeof document !== "undefined" &&
        document.cookie.split(";").some((c) => c.trim().startsWith("token="));

      if (!authToken && !hasTokenCookie) {
        setRawApiPollingStations([]);
        setPollingStationFetchError(
          "You are not authenticated. Please log in again to access polling station results."
        );
        return;
      }

      const response = await fetch(`${API_BASE}/get_my_polling_station.php`, {
        method: "GET",
        credentials: "include",
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        const result = await response.json().catch(() => null);
        setRawApiPollingStations([]);
        setPollingStationFetchError(
          result?.message ??
          (response.status === 401
            ? "You are not authenticated as an Agent. Please log in again."
            : response.status === 403
              ? "Your account is not allowed to enter polling station results."
              : "No polling station assigned to your AGENT account.")
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result?.status !== "success" || !result.data) {
        throw new Error("Unexpected polling station payload for AGENT");
      }

      const item = result.data;

      const station: PollingStation = {
        id: String(item.polling_station_id ?? item.id),
        name: item.polling_station_name ?? item.reg_centre_name ?? "",
        county: item.county_name || userCountyName || item.county_code || "",
        constituency: item.constituency_name || userConstituencyName || item.const_code || "",
        ward: item.ward_name || userWardName || item.ward_code || item.caw_code || "",
        registeredVoters: item.registered_voters ? Number(item.registered_voters) : undefined,
      };

      setRawApiPollingStations([station]);

      // ✅ Load + normalize draft to match shared type
      const drafts = new Map<string, StationResultDraft>();
      const draft = readDraft(station.id);

      if (draft) {
        const normalizedDraft: StationResultDraft = {
          stationId: String((draft as any).stationId ?? station.id),
          entries: Array.isArray((draft as any).entries)
            ? (draft as any).entries.map((e: any) => ({
              candidateId: String(e.candidateId),
              votes: Number(e.votes ?? 0),
            }))
            : [],
          submitted: (draft as any).submitted,
        };

        drafts.set(station.id, normalizedDraft);
      }

      setStationDrafts(drafts);
    } catch (e: any) {
      setPollingStationFetchError(e?.message || String(e));
      setRawApiPollingStations([]);
    } finally {
      setLoadingPollingStations(false);
    }
  }, [authToken, userCountyName, userConstituencyName, userWardName]);

  useEffect(() => {
    if (!isAgent) {
      setPollingStationFetchError("This page is now restricted to Polling Station Agents only.");
      setRawApiPollingStations([]);
      return;
    }
    fetchMyPollingStation();
  }, [isAgent, fetchMyPollingStation]);

  const filteredPollingStations = useMemo(() => {
    let list = [...rawApiPollingStations];
    if (agentStationId) {
      list = list.filter((station) => String(station.id) === String(agentStationId));
    }
    return list.slice(0, 1);
  }, [rawApiPollingStations, agentStationId]);

  const isSingleAgentStation = filteredPollingStations.length === 1;

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoadingCandidates(true);
      setCandidateFetchError(null);
      try {
        const response = await fetch(`${API_BASE}/get_presidential_candidates.php`, {
          credentials: "include",
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (result?.status === "success" && Array.isArray(result.data)) {
          setCandidates(
            result.data.map((item: any) => ({
              id: String(item.candidate_id),
              name: item.name,
              party: item.party_name,
            }))
          );
        } else {
          throw new Error("Unexpected candidates payload");
        }
      } catch (e: any) {
        setCandidateFetchError(e?.message || String(e));
      } finally {
        setLoadingCandidates(false);
      }
    };
    fetchCandidates();
  }, [authToken]);

  const agentStation =
    isSingleAgentStation && filteredPollingStations.length > 0
      ? filteredPollingStations[0]
      : rawApiPollingStations[0] || null;

  const displayAgentCounty = agentStation?.county || userCountyName || "";
  const displayAgentConstituency = agentStation?.constituency || userConstituencyName || "";
  const displayAgentWard = agentStation?.ward || userWardName || "";

  const stationName =
    agentStation?.name || (user as any)?.polling_station_name || "Polling station not set";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 3, sm: 4 },
        px: { xs: 1.5, sm: 2 },
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        backgroundColor: BRAND_RED,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 640,
          color: "common.white",
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              opacity: 0.8,
            }}
          >
            Polling station agent view
          </Typography>
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.2,
              mt: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {stationName}
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              opacity: 0.9,
              mt: 0.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayAgentWard || "—"} • {displayAgentConstituency || "—"} •{" "}
            {displayAgentCounty || "—"}
          </Typography>
        </Box>

        {/* Info strip */}
        <Box
          sx={{
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "rgba(0,0,0,0.12)",
            borderRadius: 4,
            px: 2,
            py: 1,
            mb: 2.5,
          }}
        >
          <span>Today: submit presidential Form 34A results for your station here.</span>
        </Box>

        {/* Main Form 34A card */}
        <Box
          sx={{
            borderRadius: 5,
            bgcolor: CARD_CREAM,
            color: "text.primary",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            p: { xs: 2.5, sm: 3 },
            mb: 4,
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              mb: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <HowToVote sx={{ fontSize: 20, color: BRAND_RED }} /> Form 34A – Polling Station
            Results
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: "text.secondary",
              mb: 1.5,
            }}
          >
            Below is the polling station assigned to you. Enter and submit presidential results
            for this station.
          </Typography>

          <Divider sx={{ my: 2.5 }} />

          <Box>
            {loadingPollingStations || loadingCandidates ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 3,
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : pollingStationFetchError ? (
              <Alert severity="error">{pollingStationFetchError}</Alert>
            ) : candidateFetchError ? (
              <Alert severity="error">{candidateFetchError}</Alert>
            ) : isSingleAgentStation ? (
              <Box sx={{ pt: 1 }}>
                <PollingStationCard
                  station={filteredPollingStations[0]}
                  draft={stationDrafts.get(filteredPollingStations[0].id) ?? null}
                  onEnter={() => {
                    const st = filteredPollingStations[0];
                    navigate(`/president/station/${st.id}/streams`, {
                      state: {
                        stationName: st.name,
                        station: st,
                      },
                    });
                  }}
                  onView={() => {
                    setActiveStation(filteredPollingStations[0]);
                    setViewOpen(true);
                  }}
                />
              </Box>
            ) : (
              <Alert severity="info">
                No polling station is currently assigned to your account, or your assigned station
                has already been submitted.
              </Alert>
            )}
          </Box>
        </Box>

        <ViewForm34A
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          station={activeStation}
          candidates={candidates}
        />
      </Box>
    </Box>
  );
};

export default IEBCPresidentialResultsPage;
