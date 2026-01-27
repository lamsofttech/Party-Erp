import React from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  LinearProgress,
  Chip,
  Alert,
  Skeleton,
  useMediaQuery,
  Snackbar,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { motion, useReducedMotion } from "framer-motion";
import { PersonAdd, HomeWork, CheckCircle, GroupAdd } from "@mui/icons-material";

import OnboardAgentModal from "../components/OnboardAgentModal";
import ViewAssignedAgentsModal from "../components/ViewAssignedAgentsModal";
import { useRecruitManageAgents } from "../hooks/useRecruitManageAgents";

/* -------------------- Stat Card -------------------- */
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  progressLabel?: string;
}> = ({ title, value, icon, color, progress, progressLabel }) => (
  <Card
    variant="outlined"
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      p: 2,
      borderLeft: `5px solid ${color}`,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
      <Box sx={{ color, mr: 1 }}>{icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
      {value}
    </Typography>

    {typeof progress === "number" && (
      <Box sx={{ width: "100%", mt: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 5, mb: 0.5 }}
          color={progress === 100 ? "success" : "primary"}
        />
        <Typography variant="caption" color="text.secondary">
          {progressLabel}
        </Typography>
      </Box>
    )}
  </Card>
);

const RecruitManageAgentsPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const isXs = useMediaQuery("(max-width:600px)");

  const vm = useRecruitManageAgents();

  if (!vm.canViewAgentsModule) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          You do not have permission to view the Agent Onboarding Room. Please contact your
          system administrator if you believe this is an error.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pt: `calc(env(safe-area-inset-top) + 16px)` }}>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Typography
          variant={isXs ? "h5" : "h4"}
          component="h1"
          gutterBottom
          sx={{ mb: 2, fontWeight: 700 }}
        >
          <GroupAdd sx={{ mr: 1, verticalAlign: "middle" }} /> Agent Onboarding Room
        </Typography>

        {/* Selectors */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl
            sx={{ minWidth: 200, flex: "1 1 220px" }}
            disabled={vm.canManageCountyOnly && !!vm.userCounty}
          >
            <InputLabel id="county-select-label">County</InputLabel>

            {vm.loadingCounties ? (
              <Skeleton variant="rounded" height={56} />
            ) : vm.errCounties ? (
              <Alert severity="error">{vm.errCounties}</Alert>
            ) : (
              <Select
                labelId="county-select-label"
                value={vm.selectedCounty}
                label="County"
                onChange={(e: SelectChangeEvent<string>) => vm.handleCountyChange(e.target.value)}
              >
                {!vm.canManageCountyOnly && (
                  <MenuItem value="">
                    <em>Select County</em>
                  </MenuItem>
                )}
                {vm.availableCounties.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </FormControl>

          {vm.selectedCounty && (
            <FormControl sx={{ minWidth: 200, flex: "1 1 220px" }}>
              <InputLabel id="constituency-select-label">Constituency</InputLabel>

              {vm.loadingConstituencies ? (
                <Skeleton variant="rounded" height={56} />
              ) : vm.errConstituencies ? (
                <Alert severity="error">{vm.errConstituencies}</Alert>
              ) : (
                <Select
                  labelId="constituency-select-label"
                  value={vm.selectedConstituency}
                  label="Constituency"
                  onChange={(e: SelectChangeEvent<string>) =>
                    vm.handleConstituencyChange(e.target.value)
                  }
                >
                  <MenuItem value="">
                    <em>Select Constituency</em>
                  </MenuItem>
                  {vm.availableConstituencies.map((c) => (
                    <MenuItem key={c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}

          {vm.selectedConstituency && (
            <FormControl sx={{ minWidth: 200, flex: "1 1 220px" }}>
              <InputLabel id="ward-select-label">Ward</InputLabel>

              {vm.loadingWards ? (
                <Skeleton variant="rounded" height={56} />
              ) : vm.errWards ? (
                <Alert severity="error">{vm.errWards}</Alert>
              ) : (
                <Select
                  labelId="ward-select-label"
                  value={vm.selectedWard}
                  label="Ward"
                  onChange={(e: SelectChangeEvent<string>) => vm.handleWardChange(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Ward</em>
                  </MenuItem>
                  {vm.availableWards.map((w) => (
                    <MenuItem key={w.id} value={w.name}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}
        </Box>

        {!vm.selectedCounty ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography variant="h6">
              Please select a county to begin managing agents and polling stations.
            </Typography>
          </Box>
        ) : (
          <>
            {vm.loadingStations && (
              <Skeleton
                variant="rectangular"
                height={isXs ? 120 : 140}
                sx={{ mb: 2, borderRadius: 2 }}
              />
            )}

            {vm.errStations && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {vm.errStations}
              </Alert>
            )}

            {vm.countyStats && (
              <Card variant="outlined" sx={{ mb: 3, p: { xs: 2, md: 3 }, boxShadow: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Overview for {vm.selectedCounty} County
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Total Stations"
                      value={vm.countyStats.totalStations}
                      icon={<HomeWork />}
                      color="var(--mui-palette-info-main, #0288d1)"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Agents Recruited"
                      value={vm.countyStats.agentsRecruited}
                      icon={<PersonAdd />}
                      color="var(--mui-palette-primary-main, #1976d2)"
                      progress={vm.progressPct(
                        vm.countyStats.agentsRecruited,
                        vm.countyStats.agentsRequired
                      )}
                      progressLabel={`Needed: ${vm.countyStats.agentsRequired}`}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Agents Assigned"
                      value={vm.countyStats.agentsAssigned}
                      icon={<CheckCircle />}
                      color="var(--mui-palette-success-main, #2e7d32)"
                      progress={vm.progressPct(
                        vm.countyStats.agentsAssigned,
                        vm.countyStats.agentsRequired
                      )}
                      progressLabel={`Assigned: ${vm.countyStats.agentsAssigned}/${vm.countyStats.agentsRequired}`}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Stations Fully Staffed"
                      value={vm.countyStats.stationsWithAgents}
                      icon={<HomeWork />}
                      color="var(--mui-palette-warning-main, #ed6c02)"
                      progress={vm.progressPct(
                        vm.countyStats.stationsWithAgents,
                        vm.countyStats.totalStations
                      )}
                      progressLabel={`Staffed: ${vm.countyStats.stationsWithAgents}/${vm.countyStats.totalStations}`}
                    />
                  </Grid>
                </Grid>
              </Card>
            )}

            {/* Minimal use of remaining imports so TS doesn't complain */}
            <Card variant="outlined">
              <CardContent>
                <TextField
                  label="Search"
                  size="small"
                  value={vm.search}
                  onChange={(e) => vm.setSearch(e.target.value)}
                />
                <Chip sx={{ ml: 1 }} label={`Stations: ${vm.pollingStations.length}`} />
                <Button sx={{ ml: 1 }} variant="contained" onClick={() => vm.setViewMode("stations")}>
                  Stations
                </Button>
                <Button sx={{ ml: 1 }} variant="outlined" onClick={() => vm.setViewMode("agents")}>
                  Agents
                </Button>

                <LinearProgress sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>

      <OnboardAgentModal
        open={vm.isOnboardModalOpen}
        onClose={vm.closeOnboard}
        pollingStation={vm.selectedStationForOnboard}
        onAgentOnboarded={() => { }}
      />

      <ViewAssignedAgentsModal
        open={vm.isViewAgentsModalOpen}
        onClose={vm.closeViewAgents}
        pollingStation={vm.selectedStationForView}
      />

      <Snackbar
        open={vm.snackbar.open}
        autoHideDuration={4000}
        onClose={() => vm.setSnackbar({ open: false, message: "" })}
        message={vm.snackbar.message}
      />
    </Box>
  );
};

export default RecruitManageAgentsPage;
