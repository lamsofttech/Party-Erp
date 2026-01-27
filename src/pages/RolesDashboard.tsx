// ✅ COPY + REPLACE your entire file with this (UserRolesPage.tsx / .jsx)
// It keeps your UI, but adds:
// - fetch users from backend (with positions)
// - a "Assign Positions" modal per user
// - add/remove positions via API
//
// Assumptions (edit these 3 endpoints if yours differ):
// 1) GET users:           /API/api/users.php?include_positions=1
// 2) GET positions list:  /API/api/political_positions.php
// 3) Add/remove:          /API/api/user_positions.php?action=add|remove
//
// Also assumes your auth token is stored in cookie or you can inject it; below uses localStorage("token") fallback.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

type Role = "AGENT" | "SUPER_ADMIN" | "ADMIN" | "USER";

type AssignedPosition = {
  position_id: number;
  position_name: string;
  position_level: string;
  polling_station_id: number | null;
  can_transmit: number; // 1/0
  is_active: number; // 1/0
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  positions?: AssignedPosition[];
};

type PoliticalPosition = {
  position_id: number;
  position_name: string;
  position_level: string;
  description?: string | null;
  seniority_rank?: number;
};

const API_USERS = "/API/api/users.php?include_positions=1";
const API_POSITIONS = "/API/api/political_positions.php";
const API_USER_POSITIONS = "/API/api/user_positions.php"; // add ?action=add/remove

function getAuthHeader(): Record<string, string> {
  // If your backend uses cookies only, you can return {}.
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getAuthHeader(),
      Accept: "application/json",
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `GET failed: ${res.status}`);
  return json as T;
}

async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `POST failed: ${res.status}`);
  return json as T;
}

const UserRolesPage: React.FC = () => {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Modal state
  const [openAssign, setOpenAssign] = useState(false);
  const [activeUser, setActiveUser] = useState<UserRow | null>(null);

  const [allPositions, setAllPositions] = useState<PoliticalPosition[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const [selectedPositionIds, setSelectedPositionIds] = useState<number[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const resp = await apiGet<{ status: string; data: any[] }>(API_USERS);
      const mapped: UserRow[] = (resp.data || []).map((u) => ({
        id: String(u.id),
        name: u.name || u.username || "",
        email: u.email || "",
        role: (String(u.role || "AGENT").toUpperCase() as Role) || "AGENT",
        positions: Array.isArray(u.positions) ? u.positions : [],
      }));
      setRows(mapped);
    } catch (e: any) {
      setUsersError(e?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPositions = async () => {
    setLoadingPositions(true);
    setPositionsError(null);
    try {
      const resp = await apiGet<{ status: string; data: PoliticalPosition[] }>(API_POSITIONS);
      setAllPositions(resp.data || []);
    } catch (e: any) {
      setPositionsError(e?.message || "Failed to load political positions");
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchText =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        (r.positions || []).some((p) => p.position_name.toLowerCase().includes(q));

      const matchRole = roleFilter === "ALL" ? true : r.role === roleFilter;
      return matchText && matchRole;
    });
  }, [rows, query, roleFilter]);

  const handleRoleChange = (id: string, newRole: Role) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role: newRole } : r)));
    // TODO: call API to persist role change (if you have an endpoint)
  };

  const handleDelete = (id: string) => {
    // TODO: confirm dialog before delete + call backend
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleFilterChange = (e: SelectChangeEvent) => {
    setRoleFilter(e.target.value as Role | "ALL");
  };

  const openAssignModal = (u: UserRow) => {
    setActiveUser(u);
    setSelectedPositionIds([]);
    setAssignError(null);
    setOpenAssign(true);
  };

  const closeAssignModal = () => {
    if (savingAssign) return;
    setOpenAssign(false);
    setActiveUser(null);
    setSelectedPositionIds([]);
    setAssignError(null);
  };

  const assignedIds = useMemo(() => {
    const set = new Set<number>();
    (activeUser?.positions || []).forEach((p) => {
      if (p.is_active === 1) set.add(p.position_id);
    });
    return set;
  }, [activeUser]);

  const assignAdd = async () => {
    if (!activeUser) return;
    const toAdd = selectedPositionIds.filter((id) => !assignedIds.has(id));
    if (toAdd.length === 0) return;

    setSavingAssign(true);
    setAssignError(null);
    try {
      await apiPost(`${API_USER_POSITIONS}?action=add`, {
        user_id: Number(activeUser.id),
        positions: toAdd,
        polling_station_id: null, // 👈 change if you want to bind to a polling station
      });
      await loadUsers(); // refresh list
      // refresh activeUser from updated rows
      setActiveUser((prev) => {
        const updated = rows.find((r) => r.id === prev?.id);
        return updated || prev;
      });
      setSelectedPositionIds([]);
    } catch (e: any) {
      setAssignError(e?.message || "Failed to add positions");
    } finally {
      setSavingAssign(false);
    }
  };

  const assignRemove = async () => {
    if (!activeUser) return;
    const toRemove = selectedPositionIds.filter((id) => assignedIds.has(id));
    if (toRemove.length === 0) return;

    setSavingAssign(true);
    setAssignError(null);
    try {
      await apiPost(`${API_USER_POSITIONS}?action=remove`, {
        user_id: Number(activeUser.id),
        positions: toRemove,
        polling_station_id: null,
      });
      await loadUsers();
      setActiveUser((prev) => {
        const updated = rows.find((r) => r.id === prev?.id);
        return updated || prev;
      });
      setSelectedPositionIds([]);
    } catch (e: any) {
      setAssignError(e?.message || "Failed to remove positions");
    } finally {
      setSavingAssign(false);
    }
  };

  return (
    <Container disableGutters maxWidth="lg">
      {/* Breadcrumbs */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "white",
        }}
      >
        <Breadcrumbs aria-label="breadcrumb" sx={{ color: "text.secondary" }}>
          <Link underline="none" color="inherit" href="#" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HomeRoundedIcon fontSize="small" />
            Home
          </Link>
          <Typography color="text.secondary">Admin</Typography>
          <Typography color="text.secondary">Users</Typography>
          <Typography color="text.primary" fontWeight={700}>
            Manage
          </Typography>
        </Breadcrumbs>
      </Card>

      {/* Header */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
            Users
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
            <Typography color="text.secondary">Signed in as</Typography>
            <Chip
              label="Super Admin"
              variant="outlined"
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                px: 0.5,
                borderColor: "error.main",
                color: "error.main",
              }}
            />
          </Stack>

          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 1.5, borderRadius: 999, textTransform: "none", fontWeight: 600 }}
            endIcon={<TuneRoundedIcon />}
          >
            View roles you can create
          </Button>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 800,
            px: 3,
            py: 1.2,
            bgcolor: "error.main",
            "&:hover": { bgcolor: "error.dark" },
            boxShadow: "0 10px 25px rgba(220, 38, 38, 0.25)",
          }}
          onClick={() => {
            // TODO: open Add User dialog/drawer
          }}
        >
          Add User
        </Button>
      </Stack>

      {/* Controls + Table Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "white",
          overflow: "hidden",
        }}
      >
        {/* Controls row */}
        <Box sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
            <TextField
              placeholder="Search users / positions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 3 },
              }}
            />

            <FormControl sx={{ minWidth: 180 }}>
              <Select value={roleFilter} onChange={handleFilterChange} displayEmpty sx={{ borderRadius: 3, fontWeight: 700 }}>
                <MenuItem value="ALL">All Roles</MenuItem>
                <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
                <MenuItem value="AGENT">AGENT</MenuItem>
                <MenuItem value="USER">USER</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-end", md: "flex-start" }}>
              <Tooltip title="Settings">
                <IconButton sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                  <SettingsRoundedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="More filters">
                <IconButton sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                  <TuneRoundedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {usersError && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="error">{usersError}</Alert>
            </Box>
          )}
          {positionsError && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning">{positionsError}</Alert>
            </Box>
          )}
        </Box>

        <Divider />

        {/* Table */}
        <Box sx={{ p: 2.5 }}>
          {loadingUsers ? (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 0.6 }}>NAME</TableCell>
                  <TableCell sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 0.6 }}>EMAIL</TableCell>
                  <TableCell sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 0.6, width: 220 }}>ROLE</TableCell>
                  <TableCell sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 0.6 }}>POSITIONS</TableCell>
                  <TableCell sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 0.6, width: 320 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.map((r) => {
                  const activePositions = (r.positions || []).filter((p) => p.is_active === 1);
                  return (
                    <TableRow key={r.id} hover sx={{ "& td": { borderBottom: "1px solid", borderColor: "divider" } }}>
                      <TableCell sx={{ fontWeight: 900 }}>{r.name}</TableCell>
                      <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>{r.email}</TableCell>

                      <TableCell>
                        <Select
                          value={r.role}
                          onChange={(e) => handleRoleChange(r.id, e.target.value as Role)}
                          size="small"
                          sx={{
                            borderRadius: 2,
                            fontWeight: 800,
                            minWidth: 170,
                            "& .MuiSelect-select": { py: 1 },
                          }}
                        >
                          <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
                          <MenuItem value="ADMIN">ADMIN</MenuItem>
                          <MenuItem value="AGENT">AGENT</MenuItem>
                          <MenuItem value="USER">USER</MenuItem>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {activePositions.length === 0 ? (
                            <Chip size="small" label="No positions" variant="outlined" />
                          ) : (
                            activePositions.slice(0, 4).map((p) => (
                              <Chip key={`${p.position_id}-${p.polling_station_id ?? "x"}`} size="small" label={p.position_name} />
                            ))
                          )}
                          {activePositions.length > 4 && <Chip size="small" label={`+${activePositions.length - 4} more`} variant="outlined" />}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1.5}>
                          <Button
                            variant="contained"
                            startIcon={<VisibilityRoundedIcon />}
                            sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2, px: 2 }}
                            onClick={() => openAssignModal(r)}
                          >
                            Assign Positions
                          </Button>

                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteRoundedIcon />}
                            sx={{ textTransform: "none", fontWeight: 900, borderRadius: 2, px: 2 }}
                            onClick={() => handleDelete(r.id)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ py: 6, textAlign: "center" }}>
                        <Typography variant="h6" fontWeight={900}>
                          No users found
                        </Typography>
                        <Typography color="text.secondary">Try changing the search text or role filter.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Box>
      </Card>

      {/* Assign Positions Modal */}
      <Dialog open={openAssign} onClose={closeAssignModal} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          Assign Positions{activeUser ? ` — ${activeUser.name}` : ""}
        </DialogTitle>

        <DialogContent dividers>
          {assignError && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error">{assignError}</Alert>
            </Box>
          )}

          {loadingPositions ? (
            <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>Currently Assigned</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {(activeUser?.positions || []).filter((p) => p.is_active === 1).length === 0 ? (
                  <Chip size="small" label="No positions assigned" variant="outlined" />
                ) : (
                  (activeUser?.positions || [])
                    .filter((p) => p.is_active === 1)
                    .map((p) => (
                      <Chip key={`${p.position_id}-${p.polling_station_id ?? "x"}`} size="small" label={p.position_name} />
                    ))
                )}
              </Stack>

              <Typography sx={{ fontWeight: 800, mb: 1 }}>Select Positions</Typography>
              <FormControl fullWidth>
                <Select
                  multiple
                  value={selectedPositionIds}
                  onChange={(e) => {
                    const v = e.target.value as number[] | string[];
                    setSelectedPositionIds(v.map((x) => Number(x)));
                  }}
                  renderValue={(selected) => {
                    const ids = selected as number[];
                    const names = ids
                      .map((id) => allPositions.find((p) => p.position_id === id)?.position_name)
                      .filter(Boolean) as string[];
                    return names.join(", ");
                  }}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  {allPositions
                    .slice()
                    .sort((a, b) => (a.seniority_rank ?? 999) - (b.seniority_rank ?? 999))
                    .map((p) => (
                      <MenuItem key={p.position_id} value={p.position_id}>
                        {p.position_name} — {p.position_level}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <Typography sx={{ mt: 2, color: "text.secondary" }}>
                Tip: Select positions, then click <b>Add Selected</b> or <b>Remove Selected</b>.
              </Typography>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeAssignModal} disabled={savingAssign} sx={{ fontWeight: 800, textTransform: "none" }}>
            Close
          </Button>

          <Button
            variant="outlined"
            color="error"
            onClick={assignRemove}
            disabled={savingAssign || selectedPositionIds.length === 0}
            sx={{ fontWeight: 900, textTransform: "none", borderRadius: 2 }}
          >
            {savingAssign ? "Working..." : "Remove Selected"}
          </Button>

          <Button
            variant="contained"
            onClick={assignAdd}
            disabled={savingAssign || selectedPositionIds.length === 0}
            sx={{ fontWeight: 900, textTransform: "none", borderRadius: 2, bgcolor: "error.main", "&:hover": { bgcolor: "error.dark" } }}
          >
            {savingAssign ? "Working..." : "Add Selected"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserRolesPage;
