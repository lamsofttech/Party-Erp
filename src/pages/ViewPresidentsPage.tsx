import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert as MuiAlert,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Autocomplete,
  Divider,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Link as RouterLink } from "react-router-dom";

// ------------ THEME (same as onboarding page) ------------
const brand = {
  primary: "#F5333F", // from screenshot
  primaryDark: "#D02232",
  primarySoft: "#FFF2F4",
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  textMain: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
};

// ------------ BASES & TYPES ------------
// Use relative paths so Vite dev server + proxy handle the domain
const SITE_BASE = "";
const API_BASE = "/API";

const ENDPOINTS = {
  list: `${API_BASE}/get_presidential_candidates.php`,
  update: `${API_BASE}/update_presidential_candidate.php`,
  remove: `${API_BASE}/delete_presidential_candidate.php`,
  parties: `${API_BASE}/fetch_political_parties.php`,
};

const PLACEHOLDER =
  "https://via.placeholder.com/300/006233/FFFFFF?text=No+Photo";

interface Candidate {
  candidate_id: number;
  name: string;
  party_name: string;
  photo_path: string | null;
  photo_url?: string | null;
}

interface Party {
  id?: number;
  name: string;
  abbreviation?: string;
  symbol?: string;
}

// =====================================================================
//  PAGE HEADER (aligned with onboarding header)
// =====================================================================
const PageHeader: React.FC = () => (
  <Box
    sx={{
      mb: { xs: 2, sm: 3 },
      display: "flex",
      alignItems: { xs: "flex-start", sm: "center" },
      flexDirection: { xs: "column", sm: "row" },
      justifyContent: "space-between",
      gap: 1.5,
    }}
  >
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: brand.textMain,
          fontSize: { xs: "1.1rem", sm: "1.35rem" },
        }}
      >
        Presidential Candidates
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: brand.textMuted,
          mt: 0.5,
          maxWidth: { xs: "100%", sm: 520 },
          fontSize: { xs: "0.85rem", sm: "0.9rem" },
        }}
      >
        View and maintain the registry of onboarded presidential candidates for
        the national election.
      </Typography>
    </Box>

    <Box
      sx={{
        display: "flex",
        gap: 1,
        width: { xs: "100%", sm: "auto" },
        flexWrap: "wrap",
      }}
    >
      {/* 🔵 Go to IEBC Presidential Results page (Form 34A/34B + OCR) */}
      <Button
        fullWidth
        variant="outlined"
        size="small"
        component={RouterLink}
        to="/onboarding/president-candidates/presidents/results"
        sx={{
          textTransform: "none",
          borderRadius: 999,
          borderColor: brand.border,
          color: brand.textMain,
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 0.7, sm: 0.8 },
          fontSize: { xs: "0.8rem", sm: "0.85rem" },
          "&:hover": {
            borderColor: brand.primary,
            bgcolor: "#FFFFFF",
          },
        }}
      >
        Presidential tallying center
      </Button>

      <Button
        fullWidth
        variant="contained"
        size="small"
        component={RouterLink}
        to="/onboarding/president-candidates"
        sx={{
          textTransform: "none",
          borderRadius: 999,
          px: { xs: 1.8, sm: 2.5 },
          py: { xs: 0.8, sm: 0.9 },
          bgcolor: brand.primary,
          fontSize: { xs: "0.8rem", sm: "0.85rem" },
          "&:hover": {
            bgcolor: brand.primaryDark,
          },
        }}
      >
        Onboard new candidate
      </Button>
    </Box>
  </Box>
);

// =====================================================================
//  MAIN PAGE
// =====================================================================
const ViewPresidentsPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [formName, setFormName] = useState("");
  const [formParty, setFormParty] = useState("");
  const [formPhoto, setFormPhoto] = useState<File | null>(null);

  // Parties
  const [partyOptions, setPartyOptions] = useState<Party[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);

  // Delete dialog
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  // Nonce to invalidate cached images after update
  const [imgNonce, setImgNonce] = useState(0);

  const showSnack = (
    message: string,
    severity: "success" | "error" | "info" = "success"
  ) => setSnack({ open: true, message, severity });

  // Image URL builder
  const buildImgUrl = (
    photo_path?: string | null,
    photo_url?: string | null,
    nonce?: number
  ) => {
    let base: string | null = null;

    if (photo_url && /^https?:\/\//i.test(photo_url)) {
      base = photo_url;
    } else if (photo_path) {
      if (/^https?:\/\//i.test(photo_path)) {
        base = photo_path;
      } else if (photo_path.startsWith("uploads/")) {
        base = `${API_BASE}/${photo_path}`;
      } else if (photo_path.startsWith("photos/")) {
        base = `${SITE_BASE}/${photo_path}`;
      } else {
        base = `${API_BASE}/${photo_path}`;
      }
    }
    if (!base) return null;
    return `${base}${base.includes("?") ? "&" : "?"}v=${nonce ?? 0}`;
  };

  // Fetch candidates
  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINTS.list);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const result = await response.json();
      if (result.status === "success" && Array.isArray(result.data)) {
        const normalized = result.data.map((row: any) => ({
          candidate_id: Number(row.candidate_id),
          name: row.name ?? "",
          party_name: row.party_name ?? row.party ?? "",
          photo_path: row.photo_path ?? row.photo ?? null,
          photo_url: row.photo_url ?? null,
        }));
        setCandidates(normalized);
      } else {
        throw new Error(result.message || "Invalid response format");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Fetch parties when editing
  const fetchParties = async () => {
    setPartyLoading(true);
    try {
      const res = await fetch(ENDPOINTS.parties);
      if (!res.ok) throw new Error(`Failed to fetch parties: ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];
      const normalized: Party[] = items
        .map((p: any) => ({
          id: p.party_id ?? p.id ?? undefined,
          name: p.party_name ?? p.name ?? "",
          abbreviation: p.abbreviation ?? p.short_name ?? undefined,
          symbol: p.symbol ?? p.logo ?? undefined,
        }))
        .filter((p: Party) => p.name);
      setPartyOptions(normalized);
    } catch (e: any) {
      showSnack(e?.message || "Unable to load political parties", "error");
    } finally {
      setPartyLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (openEdit) fetchParties();
  }, [openEdit]);

  // ----------------------- Edit flow -----------------------
  const handleEditClick = (candidate: Candidate) => {
    setSelected(candidate);
    setFormName(candidate.name);
    setFormParty(candidate.party_name || "");
    setFormPhoto(null);
    setOpenEdit(true);
  };

  const handleEditSave = async () => {
    if (!selected) return;
    setEditing(true);
    try {
      const formData = new FormData();
      formData.append("candidate_id", String(selected.candidate_id));
      formData.append("name", formName.trim());
      formData.append("party_name", formParty.trim());
      if (formPhoto) formData.append("photo", formPhoto);

      const res = await fetch(ENDPOINTS.update, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Failed to update: ${res.status}`);

      const data = await res.json();
      if (data.status !== "success")
        throw new Error(data.message || "Update failed");
      const updated = data.data as Candidate;

      setCandidates(prev =>
        prev.map(c =>
          c.candidate_id === selected.candidate_id
            ? {
              ...c,
              name: updated.name ?? formName.trim(),
              party_name: updated.party_name ?? formParty.trim(),
              photo_path: updated.photo_path ?? c.photo_path,
              photo_url: updated.photo_url ?? c.photo_url,
            }
            : c
        )
      );

      setImgNonce(n => n + 1);
      showSnack("Candidate updated successfully");
      setOpenEdit(false);
    } catch (err: any) {
      showSnack(err?.message || "Unable to update candidate", "error");
    } finally {
      setEditing(false);
    }
  };

  // ----------------------- Delete flow -----------------------
  const requestDelete = (candidate: Candidate) => {
    setSelected(candidate);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch(ENDPOINTS.remove, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: selected.candidate_id }),
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      const data = await res.json();
      if (data.status !== "success")
        throw new Error(data.message || "Delete failed");

      setCandidates(prev =>
        prev.filter(c => c.candidate_id !== selected.candidate_id)
      );
      showSnack("Candidate deleted");
      setOpenDelete(false);
    } catch (err: any) {
      showSnack(err?.message || "Unable to delete candidate", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Live preview URL when a new photo is selected
  const previewUrl = useMemo(
    () => (formPhoto ? URL.createObjectURL(formPhoto) : null),
    [formPhoto]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // =====================================================================
  //  RENDER
  // =====================================================================
  return (
    <Box
      sx={{
        bgcolor: brand.bg,
        minHeight: "100vh",
        py: { xs: 2, sm: 3 },
      }}
    >
      {/* Top brand bar, same as onboarding page */}
      <Box
        sx={{
          height: 4,
          width: "100%",
          bgcolor: brand.primary,
          mb: { xs: 2, sm: 3 },
        }}
      />

      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          px: { xs: 1.5, sm: 3 },
        }}
      >
        <PageHeader />

        {/* Content */}
        {loading ? (
          <Box sx={{ textAlign: "center", mt: 5 }}>
            <CircularProgress sx={{ color: brand.primary }} />
          </Box>
        ) : error ? (
          <MuiAlert severity="error">{error}</MuiAlert>
        ) : candidates.length === 0 ? (
          <Typography
            textAlign="center"
            color="text.secondary"
            sx={{ mt: 5 }}
          >
            No candidates found.
          </Typography>
        ) : (
          <Grid container spacing={2.5}>
            {candidates.map(candidate => {
              const img = buildImgUrl(
                candidate.photo_path,
                candidate.photo_url,
                imgNonce
              );
              return (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  lg={3}
                  key={candidate.candidate_id}
                >
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      bgcolor: brand.surface,
                      borderRadius: 2,
                      border: `1px solid ${brand.border}`,
                      boxShadow: "none",
                      "&:hover": {
                        boxShadow: 3,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pt: 3,
                        px: 3,
                      }}
                    >
                      <Avatar
                        src={img || PLACEHOLDER}
                        alt={candidate.name}
                        sx={{ width: 80, height: 80, mb: 1.5 }}
                        imgProps={{
                          onError: (e: any) => {
                            e.currentTarget.src = PLACEHOLDER;
                          },
                        }}
                      />
                      <CardContent
                        sx={{
                          textAlign: "center",
                          p: 0,
                          pb: 2,
                          width: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            color: brand.textMain,
                            mb: 0.5,
                          }}
                        >
                          {candidate.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: brand.primary,
                            fontWeight: 500,
                            fontSize: "0.85rem",
                          }}
                        >
                          {candidate.party_name}
                        </Typography>
                      </CardContent>
                    </Box>

                    <Box
                      sx={{
                        mt: "auto",
                        px: 2.5,
                        pb: 2.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(candidate)}
                        sx={{
                          flex: 1,
                          borderColor: brand.primary,
                          color: brand.primary,
                          textTransform: "none",
                          fontSize: "0.8rem",
                          "&:hover": {
                            borderColor: brand.primaryDark,
                            bgcolor: brand.primarySoft,
                          },
                        }}
                      >
                        Edit
                      </Button>
                      <Tooltip title="Delete candidate">
                        <span>
                          <IconButton
                            onClick={() => requestDelete(candidate)}
                            aria-label={`Delete ${candidate.name}`}
                            sx={{
                              borderRadius: 1.5,
                              border: `1px solid ${brand.border}`,
                            }}
                          >
                            <DeleteIcon
                              sx={{ fontSize: 20, color: "#DC2626" }}
                            />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Edit Candidate Dialog */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          Edit candidate
          {selected && (
            <Chip
              size="small"
              label={`ID: ${selected.candidate_id}`}
              sx={{ ml: 1, bgcolor: "#F3F4F6" }}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
            <Avatar
              sx={{ width: 72, height: 72 }}
              src={
                previewUrl ||
                buildImgUrl(
                  selected?.photo_path,
                  selected?.photo_url,
                  imgNonce
                ) ||
                PLACEHOLDER
              }
              alt={selected?.name || "Candidate photo"}
              imgProps={{
                onError: (e: any) => {
                  e.currentTarget.src = PLACEHOLDER;
                },
              }}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Profile photo
              </Typography>
              <input
                type="file"
                accept="image/*"
                onChange={e =>
                  setFormPhoto(e.target.files?.[0] || null)
                }
              />
              {formPhoto && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  Selected: {formPhoto.name}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box component="form" sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Full name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              fullWidth
              required
            />

            <Autocomplete
              options={partyOptions}
              loading={partyLoading}
              getOptionLabel={opt =>
                typeof opt === "string" ? opt : opt.name
              }
              isOptionEqualToValue={(opt, val) =>
                opt?.id !== undefined && val?.id !== undefined
                  ? opt.id === val.id
                  : (opt?.name || "").toLowerCase() ===
                  (val?.name || "").toLowerCase()
              }
              value={
                formParty
                  ? partyOptions.find(
                    p =>
                      p.name.toLowerCase() ===
                      formParty.toLowerCase()
                  ) ?? { name: formParty }
                  : undefined
              }
              onChange={(_, val) =>
                setFormParty(
                  typeof val === "string" ? val : val?.name || ""
                )
              }
              renderInput={params => (
                <TextField
                  {...params}
                  label="Party"
                  required
                  helperText={
                    partyLoading ? "Loading parties…" : undefined
                  }
                />
              )}
              freeSolo={false}
              disableClearable
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)} disabled={editing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={
              editing ||
              partyLoading ||
              !formName.trim() ||
              !formParty.trim()
            }
            sx={{
              textTransform: "none",
              bgcolor: brand.primary,
              "&:hover": { bgcolor: brand.primaryDark },
            }}
          >
            {editing ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete candidate</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete
            {selected ? ` “${selected.name}”` : ""}? This action cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnack(s => ({
            ...s,
            open: false,
          }))
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          onClose={() =>
            setSnack(s => ({
              ...s,
              open: false,
            }))
          }
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default ViewPresidentsPage;
