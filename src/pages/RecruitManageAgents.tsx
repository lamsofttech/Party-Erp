// src/pages/RecruitManageAgentsPage.tsx
import React, { useState, useEffect } from "react";
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
  CircularProgress,
  LinearProgress,
  Chip,
  Alert,
} from "@mui/material";
import { motion } from "framer-motion";
import { PersonAdd, HomeWork, CheckCircle, GroupAdd } from "@mui/icons-material";

// --- Interfaces for Data ---
interface County {
  id: string; // county_code
  name: string; // county_name
  code: string; // county_code
}

interface Constituency {
  id: string; // const_code
  name: string; // constituency_name
  county_code: string;
}

interface Ward {
  id: string; // ward_code
  name: string; // ward_name
  const_code: string;
}

interface Agent {
  id: string;
  name: string;
  status: "Recruited" | "Vetted" | "Trained" | "Assigned" | "Available" | "On Leave";
  assignedPollingStationId?: string;
  contact: string;
  county: string;
  constituency: string;
  ward: string;
}

interface PollingStation {
  id: string; // API polling station id
  name: string; // polling station name
  county: string;
  constituency: string;
  ward: string;
  agentCount: number;
  requiredAgents: number;
}

interface CountyStats {
  totalStations: number;
  agentsRequired: number;
  agentsRecruited: number;
  agentsVetted: number;
  agentsTrained: number;
  agentsAssigned: number;
  stationsWithAgents: number;
  stationsNeedingAgents: number;
}

// --- Helper Component for Stat Cards ---
interface StatCardProps {
  title: string;
  value: number;
  icon: JSX.Element;
  color: string;
  progress?: number;
  progressLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  progress,
  progressLabel,
}) => (
  <Card
    variant="outlined"
    sx={{ p: 2, display: "flex", alignItems: "center", gap: 2, height: "100%" }}
  >
    <Box sx={{ color, display: "flex", alignItems: "center" }}>{icon}</Box>
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="body2" color="text.secondary" noWrap>
        {title}
      </Typography>
      <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
        {value}
      </Typography>

      {progress !== undefined && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 6, borderRadius: 3 }}
            color="primary"
          />
          {progressLabel && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block" }}
            >
              {progressLabel}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  </Card>
);

// --- Dummy Data ---
const DUMMY_POLLING_STATIONS: PollingStation[] = [
  {
    id: "PS001",
    name: "Kasarani Primary",
    county: "Nairobi",
    constituency: "Kasarani",
    ward: "Mwiki",
    agentCount: 2,
    requiredAgents: 3,
  },
  {
    id: "PS002",
    name: "Ruaraka Secondary",
    county: "Nairobi",
    constituency: "Ruaraka",
    ward: "Baba Dogo",
    agentCount: 3,
    requiredAgents: 3,
  },
  {
    id: "PS005",
    name: "Kibra Community Centre",
    county: "Nairobi",
    constituency: "Kibra",
    ward: "Sarang’ombe",
    agentCount: 1,
    requiredAgents: 3,
  },
  {
    id: "PS003",
    name: "Likoni Social Hall",
    county: "Mombasa",
    constituency: "Likoni",
    ward: "Shika Adabu",
    agentCount: 1,
    requiredAgents: 2,
  },
  {
    id: "PS004",
    name: "Mvita CDF Hall",
    county: "Mombasa",
    constituency: "Mvita",
    ward: "Majengo",
    agentCount: 2,
    requiredAgents: 2,
  },
  {
    id: "PS006",
    name: "Manyatta Sports Ground",
    county: "Kisumu",
    constituency: "Kisumu Central",
    ward: "Manyatta B",
    agentCount: 2,
    requiredAgents: 2,
  },
];

const DUMMY_AGENTS: Agent[] = [
  {
    id: "AGT001",
    name: "John Doe",
    status: "Assigned",
    assignedPollingStationId: "PS001",
    contact: "0712345678",
    county: "Nairobi",
    constituency: "Kasarani",
    ward: "Mwiki",
  },
  {
    id: "AGT002",
    name: "Jane Smith",
    status: "Assigned",
    assignedPollingStationId: "PS002",
    contact: "0723456789",
    county: "Nairobi",
    constituency: "Ruaraka",
    ward: "Baba Dogo",
  },
  {
    id: "AGT003",
    name: "Peter Jones",
    status: "Available",
    contact: "0734567890",
    county: "Nairobi",
    constituency: "Kasarani",
    ward: "Mwiki",
  },
  {
    id: "AGT007",
    name: "Alice Blue",
    status: "Available",
    contact: "0778901234",
    county: "Nairobi",
    constituency: "Kibra",
    ward: "Sarang’ombe",
  },
  {
    id: "AGT004",
    name: "Mary Brown",
    status: "Trained",
    contact: "0745678901",
    county: "Mombasa",
    constituency: "Likoni",
    ward: "Shika Adabu",
  },
  {
    id: "AGT005",
    name: "David Green",
    status: "Recruited",
    contact: "0756789012",
    county: "Mombasa",
    constituency: "Mvita",
    ward: "Majengo",
  },
  {
    id: "AGT006",
    name: "Sarah White",
    status: "Assigned",
    assignedPollingStationId: "PS003",
    contact: "0767890123",
    county: "Mombasa",
    constituency: "Likoni",
    ward: "Shika Adabu",
  },
  {
    id: "AGT008",
    name: "Robert Red",
    status: "Vetted",
    contact: "0789012345",
    county: "Kisumu",
    constituency: "Kisumu Central",
    ward: "Manyatta B",
  },
];

// --- Page Component ---
const RecruitManageAgentsPage: React.FC = () => {
  const [availableCounties, setAvailableCounties] = useState<County[]>([]);
  const [countyFetchError, setCountyFetchError] = useState<string | null>(null);
  const [loadingCounties, setLoadingCounties] = useState<boolean>(true);

  const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([]);
  const [constituencyFetchError, setConstituencyFetchError] = useState<string | null>(null);
  const [loadingConstituencies, setLoadingConstituencies] = useState<boolean>(false);

  const [availableWards, setAvailableWards] = useState<Ward[]>([]);
  const [wardFetchError, setWardFetchError] = useState<string | null>(null);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

  const [availablePollingStations, setAvailablePollingStations] = useState<PollingStation[]>([]);
  const [pollingStationFetchError, setPollingStationFetchError] = useState<string | null>(null);
  const [loadingPollingStations, setLoadingPollingStations] = useState<boolean>(false);

  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [selectedCountyCode, setSelectedCountyCode] = useState<string | null>(null);

  const [selectedConstituency, setSelectedConstituency] = useState<string>("");
  const [selectedConstituencyCode, setSelectedConstituencyCode] = useState<string | null>(null);

  const [selectedWard, setSelectedWard] = useState<string>("");
  const [selectedWardCode, setSelectedWardCode] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [countyStats, setCountyStats] = useState<CountyStats | null>(null);
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [viewMode, setViewMode] = useState<"stations" | "agents">("stations");

  // Fetch counties
  useEffect(() => {
    const fetchCounties = async () => {
      setLoadingCounties(true);
      setCountyFetchError(null);
      try {
        const response = await fetch("https://skizagroundsuite.com/API/get_counties.php");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === "success" && Array.isArray(result.data)) {
          const fetchedCounties: County[] = result.data.map((item: any) => ({
            id: item.county_code,
            name: item.county_name,
            code: item.county_code,
          }));
          setAvailableCounties(fetchedCounties);
        } else {
          setCountyFetchError("County data is not in the expected format.");
          setAvailableCounties([]);
        }
      } catch (error: any) {
        setCountyFetchError(
          `Could not load counties. Error: ${error?.message ?? String(error)}`
        );
      } finally {
        setLoadingCounties(false);
      }
    };

    fetchCounties();
  }, []);

  // Fetch constituencies
  useEffect(() => {
    if (!selectedCountyCode) {
      setAvailableConstituencies([]);
      setSelectedConstituency("");
      setSelectedConstituencyCode(null);
      setAvailableWards([]);
      setSelectedWard("");
      setSelectedWardCode(null);
      setAvailablePollingStations([]);
      return;
    }

    const fetchConstituencies = async (countyCode: string) => {
      setLoadingConstituencies(true);
      setConstituencyFetchError(null);
      try {
        const response = await fetch(
          `https://skizagroundsuite.com/API/get_constituencies.php?county_code=${encodeURIComponent(
            countyCode
          )}`
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === "success" && Array.isArray(result.data)) {
          const fetched: Constituency[] = result.data.map((item: any) => ({
            id: item.const_code,
            name: item.constituency_name,
            county_code: countyCode,
          }));
          setAvailableConstituencies(fetched);
        } else {
          setConstituencyFetchError("Constituency data is not in the expected format.");
          setAvailableConstituencies([]);
        }
      } catch (error: any) {
        setConstituencyFetchError(`Could not load constituencies. Error: ${error?.message ?? String(error)}`);
        setAvailableConstituencies([]);
      } finally {
        setLoadingConstituencies(false);
      }
    };

    fetchConstituencies(selectedCountyCode);
  }, [selectedCountyCode]);

  // Fetch wards
  useEffect(() => {
    if (!selectedConstituencyCode) {
      setAvailableWards([]);
      setSelectedWard("");
      setSelectedWardCode(null);
      setAvailablePollingStations([]);
      return;
    }

    const fetchWards = async (constCode: string) => {
      setLoadingWards(true);
      setWardFetchError(null);
      try {
        const response = await fetch(
          `https://skizagroundsuite.com/API/get_wards.php?const_code=${encodeURIComponent(
            constCode
          )}`
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        if (result && result.status === "success" && Array.isArray(result.data)) {
          const fetched: Ward[] = result.data.map((item: any) => ({
            id: item.ward_code,
            name: item.ward_name,
            const_code: constCode,
          }));
          setAvailableWards(fetched);
        } else {
          setWardFetchError("Ward data is not in the expected format.");
          setAvailableWards([]);
        }
      } catch (error: any) {
        setWardFetchError(`Could not load wards. Error: ${error?.message ?? String(error)}`);
        setAvailableWards([]);
      } finally {
        setLoadingWards(false);
      }
    };

    fetchWards(selectedConstituencyCode);
  }, [selectedConstituencyCode]);

  // Fetch polling stations for ward
  useEffect(() => {
    if (!selectedWardCode) {
      setAvailablePollingStations([]);
      return;
    }

    const fetchPollingStations = async (wardCode: string) => {
      setLoadingPollingStations(true);
      setPollingStationFetchError(null);
      try {
        const response = await fetch(
          `https://skizagroundsuite.com/API/get_polling_stations.php?ward_code=${encodeURIComponent(
            wardCode
          )}`
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();

        // NOTE: You used result.polling_centers; keep it as-is
        if (result && result.status === "success" && Array.isArray(result.polling_centers)) {
          const fetched: PollingStation[] = result.polling_centers.map((item: any) => ({
            id: String(item.id),
            name: item.polling_station_name,
            county: selectedCounty,
            constituency: selectedConstituency,
            ward: selectedWard,
            agentCount: 0,
            requiredAgents: 0,
          }));
          setAvailablePollingStations(fetched);
        } else {
          setPollingStationFetchError("Polling station data is not in the expected format.");
          setAvailablePollingStations([]);
        }
      } catch (error: any) {
        setPollingStationFetchError(`Could not load polling stations. Error: ${error?.message ?? String(error)}`);
        setAvailablePollingStations([]);
      } finally {
        setLoadingPollingStations(false);
      }
    };

    fetchPollingStations(selectedWardCode);
  }, [selectedWardCode, selectedCounty, selectedConstituency, selectedWard]);

  const handleCountyChange = (countyName: string) => {
    setSelectedCounty(countyName);
    const county = availableCounties.find((c) => c.name === countyName);
    setSelectedCountyCode(county ? county.id : null);

    setSelectedConstituency("");
    setSelectedConstituencyCode(null);
    setSelectedWard("");
    setSelectedWardCode(null);

    setAvailableConstituencies([]);
    setAvailableWards([]);
    setAvailablePollingStations([]);
  };

  const handleConstituencyChange = (constituencyName: string) => {
    setSelectedConstituency(constituencyName);
    const constituency = availableConstituencies.find((c) => c.name === constituencyName);
    setSelectedConstituencyCode(constituency ? constituency.id : null);

    setSelectedWard("");
    setSelectedWardCode(null);
    setAvailableWards([]);
    setAvailablePollingStations([]);
  };

  const handleWardChange = (wardName: string) => {
    setSelectedWard(wardName);
    const ward = availableWards.find((w) => w.name === wardName);
    setSelectedWardCode(ward ? ward.id : null);

    setAvailablePollingStations([]);
  };

  // Compute stations + agents + stats (dummy merge)
  useEffect(() => {
    if (!selectedCounty) {
      setPollingStations([]);
      setAgents([]);
      setCountyStats(null);
      return;
    }

    setLoadingData(true);

    const t = setTimeout(() => {
      let currentPollingStations: PollingStation[] = [];
      let filteredAgents: Agent[] = [];

      if (selectedWardCode && availablePollingStations.length > 0) {
        currentPollingStations = availablePollingStations.map((apiStation) => {
          const dummyStation = DUMMY_POLLING_STATIONS.find(
            (dps) =>
              dps.id === apiStation.id ||
              (dps.name === apiStation.name && dps.ward === apiStation.ward)
          );

          return {
            ...apiStation,
            agentCount: dummyStation ? dummyStation.agentCount : 0,
            requiredAgents: dummyStation ? dummyStation.requiredAgents : 3,
          };
        });

        filteredAgents = DUMMY_AGENTS.filter(
          (agent) =>
            agent.county === selectedCounty &&
            agent.constituency === selectedConstituency &&
            agent.ward === selectedWard
        );
      } else if (selectedConstituencyCode && availableConstituencies.length > 0) {
        currentPollingStations = DUMMY_POLLING_STATIONS.filter(
          (ps) => ps.county === selectedCounty && ps.constituency === selectedConstituency
        );
        filteredAgents = DUMMY_AGENTS.filter(
          (agent) => agent.county === selectedCounty && agent.constituency === selectedConstituency
        );
      } else {
        currentPollingStations = DUMMY_POLLING_STATIONS.filter((ps) => ps.county === selectedCounty);
        filteredAgents = DUMMY_AGENTS.filter((agent) => agent.county === selectedCounty);
      }

      const currentStats: CountyStats = {
        totalStations: currentPollingStations.length,
        agentsRequired: currentPollingStations.reduce((sum, ps) => sum + ps.requiredAgents, 0),
        agentsRecruited: filteredAgents.filter((a) => a.status !== "On Leave").length,
        agentsVetted: filteredAgents.filter((a) =>
          ["Vetted", "Trained", "Assigned", "Available"].includes(a.status)
        ).length,
        agentsTrained: filteredAgents.filter((a) =>
          ["Trained", "Assigned", "Available"].includes(a.status)
        ).length,
        agentsAssigned: filteredAgents.filter((a) => a.status === "Assigned").length,
        stationsWithAgents: new Set(
          filteredAgents.filter((a) => a.assignedPollingStationId).map((a) => a.assignedPollingStationId)
        ).size,
        stationsNeedingAgents: currentPollingStations.filter((ps) => ps.agentCount < ps.requiredAgents).length,
      };

      setPollingStations(currentPollingStations);
      setAgents(filteredAgents);
      setCountyStats(currentStats);
      setLoadingData(false);
    }, 800);

    return () => clearTimeout(t);
  }, [
    selectedCounty,
    selectedConstituency,
    selectedWard,
    selectedWardCode,
    selectedConstituencyCode,
    availablePollingStations,
    availableConstituencies.length,
  ]);

  const getAgentStatusChipColor = (status: Agent["status"]) => {
    switch (status) {
      case "Assigned":
        return "success";
      case "Available":
        return "info";
      case "Recruited":
        return "primary";
      case "Vetted":
        return "warning";
      case "Trained":
        return "secondary";
      case "On Leave":
        return "error";
      default:
        return "default";
    }
  };

  const calculateProgress = (current: number, total: number) => (total > 0 ? (current / total) * 100 : 0);

  return (
    <Box sx={{ p: 4 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: "bold" }}>
          <GroupAdd sx={{ mr: 1 }} /> Agent & Polling Station Management
        </Typography>

        {/* Hierarchical County > Constituency > Ward Selectors */}
        <Box sx={{ mb: 4, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="county-select-label">County</InputLabel>

            {loadingCounties ? (
              <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
            ) : countyFetchError ? (
              <Alert severity="error" sx={{ mt: 1 }}>
                {countyFetchError}
              </Alert>
            ) : (
              <Select
                labelId="county-select-label"
                id="county-select"
                value={selectedCounty}
                label="County"
                onChange={(e) => handleCountyChange(e.target.value as string)}
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

          {selectedCounty && (
            <FormControl sx={{ minWidth: 200 }} disabled={!selectedCounty}>
              <InputLabel id="constituency-select-label">Constituency</InputLabel>

              {loadingConstituencies ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : constituencyFetchError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {constituencyFetchError}
                </Alert>
              ) : (
                <Select
                  labelId="constituency-select-label"
                  id="constituency-select"
                  value={selectedConstituency}
                  label="Constituency"
                  onChange={(e) => handleConstituencyChange(e.target.value as string)}
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
            <FormControl sx={{ minWidth: 200 }} disabled={!selectedConstituency}>
              <InputLabel id="ward-select-label">Ward</InputLabel>

              {loadingWards ? (
                <CircularProgress size={24} sx={{ mt: 1, ml: 2 }} />
              ) : wardFetchError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {wardFetchError}
                </Alert>
              ) : (
                <Select
                  labelId="ward-select-label"
                  id="ward-select"
                  value={selectedWard}
                  label="Ward"
                  onChange={(e) => handleWardChange(e.target.value as string)}
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

        {!selectedCounty ? (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography variant="h6">
              Please select a county to begin managing agents and polling stations.
            </Typography>
          </Box>
        ) : (
          <>
            {loadingData || loadingPollingStations ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {pollingStationFetchError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {pollingStationFetchError}
                  </Alert>
                )}

                {countyStats && (
                  <Card variant="outlined" sx={{ mb: 4, p: 3, boxShadow: 2 }}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: "medium" }}>
                      Overview for {selectedCounty} County
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Total Stations"
                          value={countyStats.totalStations}
                          icon={<HomeWork fontSize="large" />}
                          color="info.main"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Agents Recruited"
                          value={countyStats.agentsRecruited}
                          icon={<PersonAdd fontSize="large" />}
                          color="primary.main"
                          progress={calculateProgress(countyStats.agentsRecruited, countyStats.agentsRequired)}
                          progressLabel={`Needed: ${countyStats.agentsRequired}`}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Agents Assigned"
                          value={countyStats.agentsAssigned}
                          icon={<CheckCircle fontSize="large" />}
                          color="success.main"
                          progress={calculateProgress(countyStats.agentsAssigned, countyStats.agentsRequired)}
                          progressLabel={`Assigned: ${countyStats.agentsAssigned}/${countyStats.agentsRequired}`}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                          title="Stations Fully Staffed"
                          value={countyStats.stationsWithAgents}
                          icon={<HomeWork fontSize="large" />}
                          color="warning.main"
                          progress={calculateProgress(countyStats.stationsWithAgents, countyStats.totalStations)}
                          progressLabel={`Staffed: ${countyStats.stationsWithAgents}/${countyStats.totalStations}`}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                )}

                <Box
                  sx={{
                    mb: 3,
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <TextField
                    label="Search Agents/Stations"
                    variant="outlined"
                    size="small"
                    sx={{ flexGrow: 1, maxWidth: 300 }}
                  />
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel id="agent-status-label" size="small">
                      Agent Status
                    </InputLabel>
                    <Select labelId="agent-status-label" label="Agent Status" size="small" value="">
                      <MenuItem value="">
                        <em>All</em>
                      </MenuItem>
                      <MenuItem value="Assigned">Assigned</MenuItem>
                      <MenuItem value="Available">Available</MenuItem>
                      <MenuItem value="Trained">Trained</MenuItem>
                      <MenuItem value="Vetted">Vetted</MenuItem>
                      <MenuItem value="Recruited">Recruited</MenuItem>
                      <MenuItem value="On Leave">On Leave</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="contained" startIcon={<PersonAdd />}>
                    Recruit New Agent
                  </Button>
                  <Button variant="outlined">Bulk Actions</Button>
                </Box>

                <Box sx={{ mb: 3, display: "flex", justifyContent: "center", gap: 1 }}>
                  <Button
                    variant={viewMode === "stations" ? "contained" : "outlined"}
                    onClick={() => setViewMode("stations")}
                  >
                    Polling Stations View ({pollingStations.length})
                  </Button>
                  <Button
                    variant={viewMode === "agents" ? "contained" : "outlined"}
                    onClick={() => setViewMode("agents")}
                  >
                    Agents View ({agents.length})
                  </Button>
                </Box>

                {viewMode === "stations" ? (
                  <Grid container spacing={3}>
                    {pollingStations.length > 0 ? (
                      pollingStations.map((station) => (
                        <Grid item xs={12} sm={6} md={4} key={station.id}>
                          <Card variant="outlined" sx={{ height: "100%" }}>
                            <CardContent>
                              <Typography variant="subtitle2" color="text.secondary">
                                PS ID: {station.id}
                              </Typography>
                              <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                                {station.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {station.constituency}, {station.ward}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Agents: {station.agentCount} / {station.requiredAgents}
                                <LinearProgress
                                  variant="determinate"
                                  value={calculateProgress(station.agentCount, station.requiredAgents)}
                                  sx={{ height: 8, borderRadius: 5, mt: 0.5 }}
                                  color={station.agentCount === station.requiredAgents ? "success" : "warning"}
                                />
                              </Typography>
                              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                                <Button size="small" variant="outlined">
                                  View Details
                                </Button>
                                <Button size="small" variant="contained" color="primary">
                                  Assign Agent
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12} sx={{ textAlign: "center", py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No polling stations found for the selected criteria in {selectedCounty}.
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                ) : (
                  <Grid container spacing={3}>
                    {agents.length > 0 ? (
                      agents.map((agent) => (
                        <Grid item xs={12} sm={6} md={4} key={agent.id}>
                          <Card variant="outlined" sx={{ height: "100%" }}>
                            <CardContent>
                              <Typography variant="subtitle2" color="text.secondary">
                                Agent ID: {agent.id}
                              </Typography>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="h6" component="div">
                                  {agent.name}
                                </Typography>
                                <Chip
                                  label={agent.status}
                                  color={getAgentStatusChipColor(agent.status)}
                                  size="small"
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                Contact: {agent.contact}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Constituency: {agent.constituency}, Ward: {agent.ward}
                              </Typography>
                              {agent.assignedPollingStationId && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  Assigned to:{" "}
                                  <strong>
                                    {DUMMY_POLLING_STATIONS.find(
                                      (ps) => ps.id === agent.assignedPollingStationId
                                    )?.name || "N/A"}
                                  </strong>
                                </Typography>
                              )}
                              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                                <Button size="small" variant="outlined">
                                  View Profile
                                </Button>
                                <Button size="small" variant="contained" color="primary">
                                  Update Status
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12} sx={{ textAlign: "center", py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No agents found for the selected criteria in {selectedCounty}.
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </>
            )}
          </>
        )}
      </motion.div>
    </Box>
  );
};

export default RecruitManageAgentsPage;
