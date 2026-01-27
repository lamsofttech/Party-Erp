// src/pages/CampaignsPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Button,
  Fab,
  useMediaQuery,
  useTheme,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Alert,
  Snackbar,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { Add } from "@mui/icons-material";
import { Outlet, useLocation } from "react-router-dom";

import CampaignList from "../components/campaigns/CampaignList";
import CampaignForm from "../components/campaigns/CampaignForm";
import type { CampaignLike } from "../components/campaigns/CampaignForm";
import PageHeader from "../components/common/PageHeader";
import { Campaign } from "../types/campaign";
import { useUser } from "../contexts/UserContext";

/* -------------------- Types for geo filters -------------------- */
interface County {
  id: string;
  name: string;
  code: string;
}
interface Constituency {
  id: string;
  name: string;
  county_code: string;
}
interface Ward {
  id: string;
  name: string;
  const_code: string;
}

/** 🔁 Filters passed down to CampaignList (and to your API later) */
export interface CampaignScopeFilters {
  countyName?: string | null;
  countyCode?: string | null;
  constituencyName?: string | null;
  constituencyCode?: string | null;
  wardName?: string | null;
  wardCode?: string | null;
  /** true if user can see beyond their own county (e.g. national / super admin) */
  isNationalOrSuperAdmin?: boolean;
}

/* -------------------- Small helpers (copied pattern) -------------------- */
const fetchWithTimeout = async (
  url: string,
  timeoutMs = 12000,
  init?: RequestInit
) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      credentials: "include",
    });
    return res;
  } finally {
    clearTimeout(t);
  }
};
const cacheGet = (k: string) => sessionStorage.getItem(k);
const cacheSet = (k: string, v: unknown) =>
  sessionStorage.setItem(k, JSON.stringify(v));
const fromCache = <T,>(k: string): T | null => {
  const raw = cacheGet(k);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/* -------------------- Helper map for form type -------------------- */
const toCampaignLike = (c: Campaign | null): CampaignLike | null => {
  if (!c) return null;
  return {
    id: String((c as any).id ?? c.id),
    name: (c as any).name ?? c.name ?? "",
    status: ((c as any).status ?? "Planned") as CampaignLike["status"],
    startDate: (c as any).startDate ?? "",
    endDate: (c as any).endDate ?? "",
    description: (c as any).description ?? "",
    leadManager: (c as any).leadManager ?? "",
    budgetSpent: Number((c as any).budgetSpent ?? 0),
    budgetAllocated: Number((c as any).budgetAllocated ?? 0),
    volunteersCount: Number((c as any).volunteersCount ?? 0),
  };
};

const CampaignsPage: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  /* -------------------- User + Permissions (same pattern) -------------------- */
  const { user, hasPermission, token } = useUser();

  const userRole = user?.role || null;
  const userCounty = user?.county || null;

  const isSuperAdmin =
    userRole === "SUPER_ADMIN" ||
    userRole === "SuperAdmin" ||
    userRole === "super_admin" ||
    userRole === "super-admin";

  const canViewCampaignsModule = hasPermission("campaign.view");
  const canCreateCampaign = hasPermission("campaign.create");
  const canUpdateCampaign = hasPermission("campaign.update");
  // const canDeleteCampaign = hasPermission("campaign.delete"); // use when wiring delete UI
  const canManageCountyOnly =
    hasPermission("campaign.manage.county") && !isSuperAdmin;

  // Authed fetch wrapper
  const authedFetch = useCallback(
    (url: string, timeoutMs = 12000, init?: RequestInit) => {
      // Normalize headers to a plain object so TS can safely index by string keys
      const baseHeaders: Record<string, string> =
        init?.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : Array.isArray(init?.headers)
            ? Object.fromEntries(init.headers)
            : (init?.headers as Record<string, string> | undefined) ?? {};

      const headers: Record<string, string> = { ...baseHeaders };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetchWithTimeout(url, timeoutMs, {
        ...init,
        headers,
      });
    },
    [token]
  );

  /* -------------------- Geo filter state -------------------- */
  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [availableConstituencies, setAvailableConstituencies] = useState<
    Constituency[]
  >([]);
  const [availableWards, setAvailableWards] = useState<Ward[]>([]);

  const [selectedCounty, setSelectedCounty] = useState("");
  const [selectedCountyCode, setSelectedCountyCode] = useState<string | null>(
    null
  );
  const [selectedConstituency, setSelectedConstituency] = useState("");
  const [selectedConstituencyCode, setSelectedConstituencyCode] = useState<
    string | null
  >(null);
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedWardCode, setSelectedWardCode] = useState<string | null>(null);

  const [errCounties, setErrCounties] = useState<string | null>(null);
  const [errConstituencies, setErrConstituencies] = useState<string | null>(
    null
  );
  const [errWards, setErrWards] = useState<string | null>(null);

  const [loadingCounties, setLoadingCounties] = useState(true);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  /* -------------------- Campaign form state -------------------- */
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const handleAddCampaignClick = () => {
    if (!canCreateCampaign) {
      setSnackbar({
        open: true,
        message: "You don’t have permission to create campaigns.",
      });
      return;
    }
    setEditingCampaign(null);
    setIsFormOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    if (!canUpdateCampaign) {
      setSnackbar({
        open: true,
        message: "You don’t have permission to edit campaigns.",
      });
      return;
    }
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCampaign(null);
  };

  // show list on /party-operations/campaigns and nested routes under it
  const showList = location.pathname.startsWith("/party-operations/campaigns");

  /* -------------------- Fetch: Counties -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCounties(true);
      setErrCounties(null);
      const cached = fromCache<any>("counties:v1");
      if (cached?.status === "success" && Array.isArray(cached.data)) {
        if (!alive) return;
        setAvailableCounties(
          cached.data.map((it: any) => ({
            id: it.county_code,
            name: it.county_name,
            code: it.county_code,
          }))
        );
        setLoadingCounties(false);
        return;
      }
      try {
        const res = await authedFetch(
          "https://skizagroundsuite.com/API/get_counties.php"
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cacheSet("counties:v1", json);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.data)) {
          setAvailableCounties(
            json.data.map((it: any) => ({
              id: it.county_code,
              name: it.county_name,
              code: it.county_code,
            }))
          );
        } else throw new Error("Bad counties format");
      } catch (e: any) {
        if (!alive) return;
        setErrCounties(e?.message || "Failed to load counties");
        setAvailableCounties([]);
      } finally {
        if (alive) setLoadingCounties(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authedFetch]);

  /* 🔐 Auto-lock county for county-level users (NOT super admin) */
  useEffect(() => {
    if (
      canManageCountyOnly &&
      userCounty &&
      availableCounties.length > 0 &&
      !selectedCounty
    ) {
      const c = availableCounties.find((x) => x.name === userCounty);
      if (c) {
        setSelectedCounty(c.name);
        setSelectedCountyCode(c.id);
      }
    }
  }, [canManageCountyOnly, userCounty, availableCounties, selectedCounty]);

  /* -------------------- Fetch: Constituencies -------------------- */
  useEffect(() => {
    if (!selectedCountyCode) {
      setAvailableConstituencies([]);
      setSelectedConstituency("");
      setSelectedConstituencyCode(null);
      setAvailableWards([]);
      setSelectedWard("");
      setSelectedWardCode(null);
      return;
    }
    let alive = true;
    (async () => {
      setLoadingConstituencies(true);
      setErrConstituencies(null);
      const cacheKey = `constituencies:${selectedCountyCode}:v1`;
      const cached = fromCache<any>(cacheKey);
      if (cached?.status === "success" && Array.isArray(cached.data)) {
        if (!alive) return;
        setAvailableConstituencies(
          cached.data.map((it: any) => ({
            id: it.const_code,
            name: it.constituency_name,
            county_code: selectedCountyCode,
          }))
        );
        setLoadingConstituencies(false);
        return;
      }
      try {
        const res = await authedFetch(
          `https://skizagroundsuite.com/API/get_constituencies.php?county_code=${selectedCountyCode}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cacheSet(cacheKey, json);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.data)) {
          setAvailableConstituencies(
            json.data.map((it: any) => ({
              id: it.const_code,
              name: it.constituency_name,
              county_code: selectedCountyCode,
            }))
          );
        } else throw new Error("Bad constituencies format");
      } catch (e: any) {
        if (!alive) return;
        setErrConstituencies(e?.message || "Failed to load constituencies");
        setAvailableConstituencies([]);
      } finally {
        if (alive) setLoadingConstituencies(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedCountyCode, authedFetch]);

  /* -------------------- Fetch: Wards -------------------- */
  useEffect(() => {
    if (!selectedConstituencyCode) {
      setAvailableWards([]);
      setSelectedWard("");
      setSelectedWardCode(null);
      return;
    }
    let alive = true;
    (async () => {
      setLoadingWards(true);
      setErrWards(null);
      const cacheKey = `wards:${selectedConstituencyCode}:v1`;
      const cached = fromCache<any>(cacheKey);
      if (cached?.status === "success" && Array.isArray(cached.data)) {
        if (!alive) return;
        setAvailableWards(
          cached.data.map((it: any) => ({
            id: it.ward_code,
            name: it.ward_name,
            const_code: selectedConstituencyCode,
          }))
        );
        setLoadingWards(false);
        return;
      }
      try {
        const res = await authedFetch(
          `https://skizagroundsuite.com/API/get_wards.php?const_code=${selectedConstituencyCode}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cacheSet(cacheKey, json);
        if (!alive) return;
        if (json?.status === "success" && Array.isArray(json.data)) {
          setAvailableWards(
            json.data.map((it: any) => ({
              id: it.ward_code,
              name: it.ward_name,
              const_code: selectedConstituencyCode,
            }))
          );
        } else throw new Error("Bad wards format");
      } catch (e: any) {
        if (!alive) return;
        setErrWards(e?.message || "Failed to load wards");
        setAvailableWards([]);
      } finally {
        if (alive) setLoadingWards(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedConstituencyCode, authedFetch]);

  /* -------------------- Handlers for selectors -------------------- */
  const handleCountyChange = (name: string) => {
    if (canManageCountyOnly && userCounty && name !== userCounty) {
      setSnackbar({
        open: true,
        message: "You are only allowed to manage your assigned county.",
      });
      return;
    }
    setSelectedCounty(name);
    const c = availableCounties.find((x) => x.name === name);
    setSelectedCountyCode(c ? c.id : null);
    setSelectedConstituency("");
    setSelectedConstituencyCode(null);
    setSelectedWard("");
    setSelectedWardCode(null);
  };

  const handleConstituencyChange = (name: string) => {
    setSelectedConstituency(name);
    const c = availableConstituencies.find((x) => x.name === name);
    setSelectedConstituencyCode(c ? c.id : null);
    setSelectedWard("");
    setSelectedWardCode(null);
  };

  const handleWardChange = (name: string) => {
    setSelectedWard(name);
    const w = availableWards.find((x) => x.name === name);
    setSelectedWardCode(w ? w.id : null);
  };

  /* -------------------- Build filters for CampaignList -------------------- */
  const filters: CampaignScopeFilters = useMemo(
    () => ({
      countyName: selectedCounty || null,
      countyCode: selectedCountyCode,
      constituencyName: selectedConstituency || null,
      constituencyCode: selectedConstituencyCode,
      wardName: selectedWard || null,
      wardCode: selectedWardCode,
      isNationalOrSuperAdmin: !canManageCountyOnly || isSuperAdmin,
    }),
    [
      selectedCounty,
      selectedCountyCode,
      selectedConstituency,
      selectedConstituencyCode,
      selectedWard,
      selectedWardCode,
      canManageCountyOnly,
      isSuperAdmin,
    ]
  );

  /* -------------------- Permission guard -------------------- */
  if (!canViewCampaignsModule) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          You do not have permission to view the Campaign Management module.
          Please contact your system administrator if you believe this is an
          error.
        </Alert>
      </Box>
    );
  }

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{
        px: { xs: 1.5, sm: 2, md: 3 },
        py: { xs: 1, sm: 2, md: 3 },
        pb: {
          xs: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
          sm: 3,
        },
        scrollBehavior: prefersReducedMotion ? "auto" : "smooth",
        minHeight: "100dvh",
        overscrollBehavior: "contain",
      }}
    >
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: "env(safe-area-inset-top, 0px)",
          zIndex: theme.zIndex.appBar,
          backgroundColor: "background.default",
          borderBottom: { xs: "1px solid", sm: "none" },
          borderColor: { xs: "divider", sm: "transparent" },
          py: { xs: 1, sm: 0 },
          mb: { xs: 1, sm: 2 },
        }}
        aria-label="Campaigns header"
      >
        <PageHeader
          title="Campaign Management"
          description="Oversee campaigns within your jurisdiction — from national down to ward level."
          action={
            showList && !isMobile ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleAddCampaignClick}
                sx={{ minWidth: 44 }}
              >
                New Campaign
              </Button>
            ) : null
          }
        />

        {/* --- Geo selectors (same UX pattern as RecruitManageAgents) --- */}
        <Box
          sx={{
            mt: 1.5,
            mb: 1,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <FormControl
            sx={{ minWidth: 200, flex: "1 1 220px" }}
            disabled={canManageCountyOnly && !!userCounty}
          >
            <InputLabel id="county-select-label">County</InputLabel>
            {loadingCounties ? (
              <Skeleton variant="rounded" height={56} />
            ) : errCounties ? (
              <Alert severity="error">{errCounties}</Alert>
            ) : (
              <Select
                labelId="county-select-label"
                value={selectedCounty}
                label="County"
                onChange={(e: SelectChangeEvent<string>) =>
                  handleCountyChange(e.target.value)
                }
              >
                {!canManageCountyOnly && (
                  <MenuItem value="">
                    <em>Select County</em>
                  </MenuItem>
                )}
                {availableCounties.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          {selectedCounty && (
            <FormControl
              sx={{ minWidth: 200, flex: "1 1 220px" }}
              disabled={!selectedCounty}
            >
              <InputLabel id="constituency-select-label">
                Constituency
              </InputLabel>
              {loadingConstituencies ? (
                <Skeleton variant="rounded" height={56} />
              ) : errConstituencies ? (
                <Alert severity="error">{errConstituencies}</Alert>
              ) : (
                <Select
                  labelId="constituency-select-label"
                  value={selectedConstituency}
                  label="Constituency"
                  onChange={(e: SelectChangeEvent<string>) =>
                    handleConstituencyChange(e.target.value)
                  }
                >
                  <MenuItem value="">
                    <em>Select Constituency</em>
                  </MenuItem>
                  {availableConstituencies.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}

          {selectedConstituency && (
            <FormControl
              sx={{ minWidth: 200, flex: "1 1 220px" }}
              disabled={!selectedConstituency}
            >
              <InputLabel id="ward-select-label">Ward</InputLabel>
              {loadingWards ? (
                <Skeleton variant="rounded" height={56} />
              ) : errWards ? (
                <Alert severity="error">{errWards}</Alert>
              ) : (
                <Select
                  labelId="ward-select-label"
                  value={selectedWard}
                  label="Ward"
                  onChange={(e: SelectChangeEvent<string>) =>
                    handleWardChange(e.target.value)
                  }
                >
                  <MenuItem value="">
                    <em>Select Ward</em>
                  </MenuItem>
                  {availableWards.map((w) => (
                    <MenuItem key={w.id} value={w.name}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}
        </Box>

        {!selectedCounty && !filters.isNationalOrSuperAdmin && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Select your county to view campaigns in your jurisdiction.
          </Typography>
        )}
      </Box>

      {/* Add/Edit form */}
      {isFormOpen && (
        <CampaignForm
          open={isFormOpen}
          onClose={handleCloseForm}
          campaign={toCampaignLike(editingCampaign)}
        />
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          "& .MuiCard-root": { mb: { xs: 1, sm: 2 } },
        }}
      >
        {showList ? (
          <CampaignList onEdit={handleEditCampaign} filters={filters} />
        ) : (
          <Outlet />
        )}
      </Box>

      {/* Mobile FAB */}
      {showList && isMobile && (
        <Fab
          color="primary"
          aria-label="Add new campaign"
          onClick={handleAddCampaignClick}
          sx={{
            position: "fixed",
            right: "calc(env(safe-area-inset-right, 0px) + 16px)",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            zIndex: theme.zIndex.fab,
            boxShadow: 6,
          }}
        >
          <Add />
        </Fab>
      )}

      {/* Snackbar for warnings */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Container>
  );
};

export default CampaignsPage;
