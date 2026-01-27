import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Box,
  Chip,
  Slide,
  TextField,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import type { ChipProps } from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import type { TransitionProps } from "@mui/material/transitions";
import toast from "react-hot-toast";

import { useUser } from "../contexts/UserContext";

// —— Config ——
const API_BASE = "https://skizagroundsuite.com/API";
const PHONE_PREFIX = "+254";

/**
 * Normalize any stored phone into "local part" (digits after +254)
 * Examples:
 *  "+254712345678" -> "712345678"
 *  "254712345678"  -> "712345678"
 *  "0712345678"    -> "712345678"
 *  "712345678"     -> "712345678"
 */
const toLocalPhonePart = (raw: string | undefined | null): string => {
  if (!raw) return "";
  let v = String(raw).trim().replace(/\s+/g, "");
  if (v.startsWith("+254")) v = v.slice(4);
  else if (v.startsWith("254")) v = v.slice(3);
  else if (v.startsWith("0")) v = v.slice(1);
  // keep digits only
  v = v.replace(/\D/g, "");
  return v;
};

// —— Types ——
export interface PollingStation {
  id: string;
  name: string;
}
export interface Agent {
  id: string;
  name: string;
  status:
  | "Recruited"
  | "Vetted"
  | "Trained"
  | "Assigned"
  | "Available"
  | "On Leave"
  | string;
  assignedPollingStationId?: string;
  contact: string;
  county: string;
  constituency: string;
  ward: string;
  email?: string;
}

interface ViewAssignedAgentsModalProps {
  open: boolean;
  onClose: () => void;
  pollingStation: PollingStation | null;
  /** Optional: provide agents to skip fetching */
  agents?: Agent[];
}

// MUI-native transition
const Transition = (
  props: TransitionProps & { children: React.ReactElement }
) => <Slide direction="up" {...props} />;

// Status → Chip color
const statusColor = (status: Agent["status"]): ChipProps["color"] => {
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

const STATUS_OPTIONS: Agent["status"][] = [
  "Recruited",
  "Vetted",
  "Trained",
  "Assigned",
  "Available",
  "On Leave",
];

/**
 * ViewAssignedAgentsModal
 * - Fetches agents by polling station (R)
 * - Allows create, edit, delete (C/U/D) respecting permissions
 * - Uses react-hot-toast for feedback
 */
export default function ViewAssignedAgentsModal({
  open,
  onClose,
  pollingStation,
  agents: agentsProp,
}: ViewAssignedAgentsModalProps) {
  const { hasPermission } = useUser();

  const canCreateAgent = hasPermission("agent.create");
  const canUpdateAgent = hasPermission("agent.update");
  const canDeleteAgent = hasPermission("agent.delete");
  const canViewAgents = hasPermission("agent.view");

  // Local list when parent doesn't supply agents
  const [localAgents, setLocalAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentsToShow = agentsProp ?? localAgents;

  // force re-fetch after create if needed
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit dialog state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editStatus, setEditStatus] = useState<Agent["status"]>("Available");
  const [editSaving, setEditSaving] = useState(false);

  // Create dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createContact, setCreateContact] = useState("");
  const [createStatus, setCreateStatus] = useState<Agent["status"]>("Available");
  const [createCounty, setCreateCounty] = useState("");
  const [createConstituency, setCreateConstituency] = useState("");
  const [createWard, setCreateWard] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  // Delete confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const title = useMemo(
    () => `Agents for ${pollingStation?.name ?? "Selected Polling Station"}`,
    [pollingStation?.name]
  );

  // ---- Fetch agents when modal opens (if parent didn't provide them) ----
  useEffect(() => {
    // If parent provides agents, just use them
    if (agentsProp) {
      setError(null);
      setLoading(false);
      setLocalAgents(agentsProp);
      return;
    }

    // If modal is closed or station not selected, reset
    if (!open || !pollingStation?.id) {
      setLocalAgents([]);
      setError(null);
      setLoading(false);
      return;
    }

    // If user cannot view agents, do not fetch
    if (!canViewAgents) {
      setLocalAgents([]);
      setError("You do not have permission to view agents.");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const fetchAgents = async () => {
      setLoading(true);
      setError(null);
      setLocalAgents([]);

      try {
        const url = `${API_BASE}/get_agents_by_polling_station.php?polling_station_id=${encodeURIComponent(
          pollingStation.id
        )}`;

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        if (cancelled) return;

        const list: Agent[] = Array.isArray(json?.agents)
          ? json.agents.map((a: any) => ({
            id: String(a.id),
            name: a.agent_name,
            contact: a.contact,
            status: a.status,
            assignedPollingStationId:
              a.assigned_polling_station_id != null
                ? String(a.assigned_polling_station_id)
                : undefined,
            county: a.county,
            constituency: a.constituency,
            ward: a.ward,
            email: a.email ?? "",
          }))
          : [];

        setLocalAgents(list);
      } catch (err: any) {
        if (!cancelled && err?.name !== "AbortError") {
          setError(
            `Failed to fetch agents${err?.message ? `: ${err.message}` : ""}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAgents();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, pollingStation?.id, agentsProp, canViewAgents, refreshKey]);

  // ---- Create handlers ----
  const openCreateDialog = () => {
    if (!canCreateAgent) {
      toast.error("You do not have permission to create agents.");
      return;
    }
    if (!pollingStation?.id) {
      toast.error("No polling station selected.");
      return;
    }
    setCreateName("");
    setCreateEmail("");
    setCreateContact("");
    setCreateStatus("Available");
    setCreateCounty("");
    setCreateConstituency("");
    setCreateWard("");
    setOpenCreate(true);
  };

  const closeCreateDialog = () => {
    if (createSaving) return;
    setOpenCreate(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateAgent) {
      toast.error("You do not have permission to create agents.");
      return;
    }

    if (!pollingStation?.id) {
      toast.error("No polling station selected.");
      return;
    }

    const name = createName.trim();
    const email = createEmail.trim();
    const localDigits = createContact.replace(/\D/g, "").trim();
    const county = createCounty.trim();
    const constituency = createConstituency.trim();
    const ward = createWard.trim();

    // Basic validation
    const nameOk = /^[A-Za-zÀ-ÖØ-öø-ÿ'’\-.\s]{2,60}$/.test(name);
    if (!nameOk) {
      toast.error("Enter a valid name (letters, spaces, 2–60 characters).");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (!/^(7|1)\d{8}$/.test(localDigits)) {
      toast.error("Enter a valid Kenyan mobile (e.g. 712345678).");
      return;
    }

    if (!county || !constituency || !ward) {
      toast.error("Please fill county, constituency and ward.");
      return;
    }

    const fullPhone = `${PHONE_PREFIX}${localDigits}`;

    setCreateSaving(true);
    setError(null);

    try {
      const payload = {
        agent_name: name,
        email,
        contact: fullPhone,
        status: createStatus,
        assigned_polling_station_id: pollingStation.id,
        county_name: county,
        constituency_name: constituency,
        ward_name: ward,
      };

      const res = await fetch(`${API_BASE}/create_agent.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.status === "success") {
        // simplest & safest: re-fetch list
        setRefreshKey((k) => k + 1);
        toast.success("Agent created successfully.");
        setOpenCreate(false);
      } else {
        toast.error(json.message || "Failed to create agent.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while creating agent.");
    } finally {
      setCreateSaving(false);
    }
  };

  // ---- Edit handlers ----
  const openEditDialog = (agent: Agent) => {
    if (!canUpdateAgent) {
      toast.error("You do not have permission to edit agents.");
      return;
    }
    setEditingAgent(agent);
    setEditName(agent.name);
    // store ONLY the local digits (after +254) in state
    setEditContact(toLocalPhonePart(agent.contact));
    setEditStatus(agent.status);
  };

  const closeEditDialog = () => {
    if (editSaving) return;
    setEditingAgent(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    if (!canUpdateAgent) {
      toast.error("You do not have permission to edit agents.");
      return;
    }

    const trimmedName = editName.trim();
    const localDigits = editContact.replace(/\D/g, "").trim(); // local part after +254

    // ---- Name sanity check (letters, spaces, 2–60 chars) ----
    const nameOk = /^[A-Za-zÀ-ÖØ-öø-ÿ'’\-.\s]{2,60}$/.test(trimmedName);
    if (!nameOk) {
      toast.error("Enter a valid name (letters, spaces, 2–60 characters).");
      return;
    }

    // ---- Phone sanity check (Kenyan mobile, 7/1 + 8 digits) ----
    if (!/^(7|1)\d{8}$/.test(localDigits)) {
      toast.error("Enter a valid Kenyan mobile (e.g. 712345678).");
      return;
    }

    const fullPhone = `${PHONE_PREFIX}${localDigits}`; // final: +2547XXXXXXXX

    setEditSaving(true);
    setError(null);

    try {
      const payload = {
        agent_id: editingAgent.id,
        agent_name: trimmedName,
        contact: fullPhone,
        // if you also want to edit email later, add email here and in UI
        status: editStatus,
        assigned_polling_station_id: editingAgent.assignedPollingStationId,
        county_name: editingAgent.county,
        constituency_name: editingAgent.constituency,
        ward_name: editingAgent.ward,
      };

      const res = await fetch(`${API_BASE}/update_agent.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.status === "success") {
        const updated: Agent = {
          ...editingAgent,
          name: payload.agent_name,
          contact: payload.contact,
          status: payload.status,
        };

        setLocalAgents((prev) =>
          prev.map((a) => (a.id === editingAgent.id ? updated : a))
        );
        toast.success("Agent updated successfully.");
        setEditingAgent(null);
      } else {
        toast.error(json.message || "Failed to update agent.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while updating agent.");
    } finally {
      setEditSaving(false);
    }
  };

  // ---- Delete handlers ----
  const openDeleteConfirm = (agent: Agent) => {
    if (!canDeleteAgent) {
      toast.error("You do not have permission to delete agents.");
      return;
    }
    setDeleteTarget(agent);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
  };

  const handleDeleteAgent = async () => {
    if (!deleteTarget) return;

    if (!canDeleteAgent) {
      toast.error("You do not have permission to delete agents.");
      return;
    }

    setDeleteLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/delete_agent.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: deleteTarget.id }),
      });

      const json = await res.json();

      if (json.status === "success") {
        setLocalAgents((prev) =>
          prev.filter((a) => a.id !== deleteTarget.id)
        );
        toast.success("Agent deleted successfully.");
        setDeleteTarget(null);
      } else {
        toast.error(json.message || "Failed to delete agent.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while deleting agent.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* MAIN LIST DIALOG */}
      <Dialog
        open={open}
        onClose={onClose}
        TransitionComponent={Transition}
        keepMounted
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3,
            overflow: "hidden",
            bgcolor: "background.paper",
            color: "text.primary",
          },
        }}
        BackdropProps={{ sx: { bgcolor: "rgba(0,0,0,0.5)" } }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          <IconButton aria-label="Close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{ p: 2, maxHeight: { xs: 420, sm: 520 }, overflowY: "auto" }}
        >
          {loading && (
            <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
              <CircularProgress size={40} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && agentsToShow.length === 0 && (
            <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
              <Typography variant="subtitle1" fontWeight={600}>
                No agents assigned here.
              </Typography>
              <Typography variant="body2">Close to return.</Typography>
            </Box>
          )}

          {!loading && !error && agentsToShow.length > 0 && (
            <>
              <Typography
                variant="body2"
                sx={{ mb: 1.5, color: "text.secondary" }}
              >
                Total agents: <strong>{agentsToShow.length}</strong>
              </Typography>
              <List disablePadding>
                {agentsToShow.map((agent) => (
                  <ListItem
                    key={agent.id}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      mb: 1,
                      py: 1.5,
                      px: 2,
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                    secondaryAction={
                      (canUpdateAgent || canDeleteAgent) && (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {canUpdateAgent && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openEditDialog(agent)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          {canDeleteAgent && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteConfirm(agent)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          color="primary.dark"
                        >
                          {agent.name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {agent.email && (
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                display: "block",
                              }}
                            >
                              Email:{" "}
                              <Typography
                                component="span"
                                variant="body2"
                                fontWeight={700}
                              >
                                {agent.email}
                              </Typography>
                            </Typography>
                          )}

                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ color: "text.secondary", display: "block" }}
                          >
                            Contact:{" "}
                            <Typography
                              component="span"
                              variant="body2"
                              fontWeight={700}
                            >
                              {agent.contact}
                            </Typography>
                          </Typography>

                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mt: 0.5,
                              gap: 1,
                            }}
                          >
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{ color: "text.secondary" }}
                            >
                              Status:
                            </Typography>
                            <Chip
                              label={agent.status}
                              color={statusColor(agent.status)}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>

                          {pollingStation?.name && (
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                display: "block",
                                mt: 0.5,
                              }}
                            >
                              Assigned to:{" "}
                              <Typography
                                component="span"
                                variant="body2"
                                fontWeight={600}
                              >
                                {pollingStation.name}
                              </Typography>
                            </Typography>
                          )}

                          <Typography
                            component="span"
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              display: "block",
                              mt: 0.5,
                            }}
                          >
                            Location:{" "}
                            <Typography
                              component="span"
                              variant="body2"
                              fontWeight={600}
                            >
                              {agent.ward}, {agent.constituency},{" "}
                              {agent.county}
                            </Typography>
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: "divider",
            justifyContent: "space-between",
          }}
        >
          {canCreateAgent && (
            <Button onClick={openCreateDialog} variant="outlined">
              Add Agent
            </Button>
          )}
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* CREATE AGENT DIALOG */}
      <Dialog open={openCreate} onClose={closeCreateDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Add Agent</DialogTitle>
        <form onSubmit={handleCreateSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Contact"
              value={createContact}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 9);
                setCreateContact(digitsOnly);
              }}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {PHONE_PREFIX}
                  </InputAdornment>
                ),
              }}
              helperText="Kenyan mobile, enter 9 digits after +254 (e.g. 712345678)"
            />
            <TextField
              select
              label="Status"
              value={createStatus}
              onChange={(e) =>
                setCreateStatus(e.target.value as Agent["status"])
              }
              fullWidth
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="County"
              value={createCounty}
              onChange={(e) => setCreateCounty(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Constituency"
              value={createConstituency}
              onChange={(e) => setCreateConstituency(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Ward"
              value={createWard}
              onChange={(e) => setCreateWard(e.target.value)}
              fullWidth
              required
            />
            {pollingStation?.name && (
              <TextField
                label="Polling Station"
                value={pollingStation.name}
                fullWidth
                disabled
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeCreateDialog} disabled={createSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createSaving}
              startIcon={
                createSaving ? <CircularProgress size={16} /> : undefined
              }
            >
              {createSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT AGENT DIALOG */}
      <Dialog
        open={!!editingAgent}
        onClose={closeEditDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit Agent</DialogTitle>
        <form onSubmit={handleEditSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Contact"
              value={editContact}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 9);
                setEditContact(digitsOnly);
              }}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {PHONE_PREFIX}
                  </InputAdornment>
                ),
              }}
              helperText="Kenyan mobile, enter 9 digits after +254 (e.g. 712345678)"
            />
            <TextField
              select
              label="Status"
              value={editStatus}
              onChange={(e) =>
                setEditStatus(e.target.value as Agent["status"])
              }
              fullWidth
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            {pollingStation?.name && (
              <TextField
                label="Polling Station"
                value={pollingStation.name}
                fullWidth
                disabled
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeEditDialog} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={editSaving}
              startIcon={
                editSaving ? <CircularProgress size={16} /> : undefined
              }
            >
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        open={!!deleteTarget}
        onClose={closeDeleteConfirm}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Agent</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.name}</strong> from{" "}
            <strong>{pollingStation?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDeleteConfirm} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAgent}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            startIcon={
              deleteLoading ? <CircularProgress size={16} /> : undefined
            }
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
