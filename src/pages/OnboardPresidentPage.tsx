import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  SelectChangeEvent,
  Modal,
  IconButton,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import { PersonAdd, AccountBalance, Group, Close } from "@mui/icons-material";

// ------------ THEME (ERP + YOUR RED) ------------
const brand = {
  primary: "#F5333F", // from your screenshot
  primaryDark: "#D02232",
  primarySoft: "#FFF2F4",
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  textMain: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
};

// ------------ TYPES ------------
interface PoliticalPosition {
  position_id: number;
  position_name: string;
  position_level: string;
}

interface PoliticalParty {
  id: number;
  name: string;
}

// =====================================================================
//  PAGE HEADER (mobile-first, collapses nicely)
// =====================================================================
const PageHeader: React.FC<{ onViewCandidates: () => void }> = ({
  onViewCandidates,
}) => (
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
        Presidential Candidate Onboarding
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
        Register presidential candidates and keep official contact details
        updated in one central workspace.
      </Typography>
    </Box>

    <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
      <Button
        fullWidth
        variant="outlined"
        size="small"
        startIcon={<Group />}
        onClick={onViewCandidates}
        sx={{
          textTransform: "none",
          borderRadius: 999,
          borderColor: brand.border,
          color: brand.textMain,
          justifyContent: "center",
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 0.7, sm: 0.8 },
          fontSize: { xs: "0.8rem", sm: "0.85rem" },
          "&:hover": {
            borderColor: brand.primary,
            bgcolor: "#FFFFFF",
          },
        }}
      >
        View onboarded candidates
      </Button>
    </Box>
  </Box>
);

// =====================================================================
//  HERO CARD (primary CTA)
// =====================================================================
const OnboardHeroCard: React.FC<{ onOpenModal: () => void }> = ({
  onOpenModal,
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", md: "row" },
      alignItems: { xs: "flex-start", md: "center" },
      gap: { xs: 2, md: 3 },
      p: { xs: 2, sm: 3 },
      bgcolor: brand.surface,
      borderRadius: 2,
      border: `1px solid ${brand.border}`,
    }}
  >
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        bgcolor: brand.primarySoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <AccountBalance sx={{ fontSize: 26, color: brand.primary }} />
    </Box>

    <Box sx={{ flexGrow: 1 }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          color: brand.textMain,
          mb: 0.5,
          fontSize: { xs: "0.95rem", sm: "1rem" },
        }}
      >
        Onboard a new presidential candidate
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: brand.textMuted,
          mb: 2,
          maxWidth: 540,
          fontSize: { xs: "0.85rem", sm: "0.9rem" },
        }}
      >
        Capture candidate details, party affiliation, and primary contacts for
        the national election register.
      </Typography>

      <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={onOpenModal}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            px: { xs: 2, sm: 3 },
            py: { xs: 0.9, sm: 1 },
            bgcolor: brand.primary,
            fontSize: { xs: "0.9rem", sm: "0.95rem" },
            "&:hover": {
              bgcolor: brand.primaryDark,
            },
          }}
        >
          Start onboarding
        </Button>
      </Box>
    </Box>
  </Box>
);

// =====================================================================
//  MAIN PAGE (mobile-first layout)
// =====================================================================
const OnboardPresidentPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenOnboardModal = () => setIsModalOpen(true);
  const handleCloseOnboardModal = () => setIsModalOpen(false);

  const handleViewCandidatesClick = () => {
    navigate("/onboarding/president-candidates/presidents");
  };

  const handleCandidateOnboardedSuccess = () => {
    setIsModalOpen(false);
  };

  return (
    <Box
      sx={{
        bgcolor: brand.bg,
        minHeight: "100vh",
        py: { xs: 2, sm: 3 },
      }}
    >
      {/* Top brand bar */}
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
        <PageHeader onViewCandidates={handleViewCandidatesClick} />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <OnboardHeroCard onOpenModal={handleOpenOnboardModal} />
        </motion.div>
      </Box>

      <OnboardPresidentModal
        open={isModalOpen}
        onClose={handleCloseOnboardModal}
        onCandidateOnboarded={handleCandidateOnboardedSuccess}
      />
    </Box>
  );
};

export default OnboardPresidentPage;

// =====================================================================
//  MODAL + FORM (mobile-optimized)
// =====================================================================
interface OnboardPresidentModalProps {
  open: boolean;
  onClose: () => void;
  onCandidateOnboarded: () => void;
}

const OnboardPresidentModal: React.FC<OnboardPresidentModalProps> = ({
  open,
  onClose,
  onCandidateOnboarded,
}) => {
  const [candidateName, setCandidateName] = useState("");
  const [partyId, setPartyId] = useState<string>("");
  const [positionId, setPositionId] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [availablePositions, setAvailablePositions] = useState<
    PoliticalPosition[]
  >([]);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(true);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const [availableParties, setAvailableParties] = useState<PoliticalParty[]>(
    []
  );
  const [loadingParties, setLoadingParties] = useState<boolean>(true);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchPositionsAndParties = async () => {
      // Positions
      setLoadingPositions(true);
      setPositionsError(null);
      try {
        const response = await fetch(
          "https://skizagroundsuite.com/API/political_positions_api.php"
        );
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const result = await response.json();
        if (result?.status === "success" && Array.isArray(result.data)) {
          setAvailablePositions(result.data);
          const presidentPosition = result.data.find(
            (pos: PoliticalPosition) => pos.position_name === "President"
          );
          if (presidentPosition) {
            setPositionId(String(presidentPosition.position_id));
          } else {
            setPositionsError('Could not find "President" position.');
          }
        } else {
          setPositionsError("Unexpected format for political positions.");
        }
      } catch (err) {
        setPositionsError(
          `Could not load political positions. ${err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setLoadingPositions(false);
      }

      // Parties
      setLoadingParties(true);
      setPartiesError(null);
      try {
        const response = await fetch(
          "https://skizagroundsuite.com/API/fetch_political_parties.php"
        );
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const result = await response.json();
        if (result?.status === "success" && Array.isArray(result.data)) {
          setAvailableParties(result.data);
        } else {
          setPartiesError("Unexpected format for political parties.");
        }
      } catch (err) {
        setPartiesError(
          `Could not load political parties. ${err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setLoadingParties(false);
      }
    };

    fetchPositionsAndParties();
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!candidateName || !partyId || !positionId) {
      setError("Candidate name, party and position are required.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("name", candidateName);
    formData.append("party_id", partyId);
    formData.append("position_id", positionId);
    formData.append("status", "Pending");
    if (photoFile) formData.append("photo", photoFile);
    if (contactEmail) formData.append("contact_email", contactEmail);
    if (contactPhone) formData.append("contact_phone", contactPhone);

    try {
      const response = await fetch(
        "https://skizagroundsuite.com/API/onboard_presidential_candidates.php",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let message = "Failed to onboard candidate.";
        try {
          const parsed = JSON.parse(errorText);
          message = parsed.message || message;
        } catch {
          message = `Server error: ${errorText}`;
        }
        throw new Error(message);
      }

      const result = await response.json();
      if (result.status === "success") {
        setSuccess("Presidential candidate onboarded successfully.");
        onCandidateOnboarded();
      } else {
        setError(result.message || "Failed to onboard candidate.");
      }
    } catch (err) {
      setError(
        `Error onboarding candidate: ${err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: { xs: 0, sm: "50%" },
          left: { xs: 0, sm: "50%" },
          transform: {
            xs: "none",
            sm: "translate(-50%, -50%)",
          },
          width: { xs: "100%", sm: 600 },
          height: { xs: "100%", sm: "auto" },
          maxHeight: { xs: "100vh", sm: "90vh" },
          bgcolor: brand.surface,
          borderRadius: { xs: 0, sm: 2.5 },
          boxShadow: 24,
          overflowY: "auto",
          outline: "none",
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
              gap: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: brand.textMain,
                fontSize: { xs: "1rem", sm: "1.1rem" },
              }}
            >
              Onboard presidential candidate
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: brand.textMuted,
              mb: 2,
              fontSize: { xs: "0.8rem", sm: "0.85rem" },
            }}
          >
            National level · Required fields are marked with *
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {/* Form */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Candidate full name *"
                fullWidth
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                disabled={loading}
                size="small"
                sx={{ ".MuiOutlinedInput-root": { borderRadius: 1.5 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                size="small"
                sx={{ ".MuiOutlinedInput-root": { borderRadius: 1.5 } }}
              >
                <InputLabel id="party-select-label">
                  Political party *
                </InputLabel>
                {loadingParties ? (
                  <CircularProgress
                    size={20}
                    sx={{ mt: 1.2, ml: 2, color: brand.primary }}
                  />
                ) : partiesError ? (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {partiesError}
                  </Alert>
                ) : (
                  <Select
                    labelId="party-select-label"
                    id="party-select"
                    value={partyId}
                    label="Political party *"
                    onChange={(e: SelectChangeEvent<string>) =>
                      setPartyId(e.target.value)
                    }
                    disabled={loading}
                  >
                    <MenuItem value="">
                      <em>Select party</em>
                    </MenuItem>
                    {availableParties.map((party) => (
                      <MenuItem key={party.id} value={String(party.id)}>
                        {party.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                size="small"
                sx={{ ".MuiOutlinedInput-root": { borderRadius: 1.5 } }}
              >
                <InputLabel id="position-select-label">Position *</InputLabel>
                {loadingPositions ? (
                  <CircularProgress
                    size={20}
                    sx={{ mt: 1.2, ml: 2, color: brand.primary }}
                  />
                ) : positionsError ? (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {positionsError}
                  </Alert>
                ) : (
                  <Select
                    labelId="position-select-label"
                    id="position-select"
                    value={positionId}
                    label="Position *"
                    disabled
                  >
                    {availablePositions
                      .filter((p) => String(p.position_id) === positionId)
                      .map((pos) => (
                        <MenuItem
                          key={pos.position_id}
                          value={String(pos.position_id)}
                        >
                          {pos.position_name}
                        </MenuItem>
                      ))}
                  </Select>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact email"
                fullWidth
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                type="email"
                disabled={loading}
                size="small"
                sx={{ ".MuiOutlinedInput-root": { borderRadius: 1.5 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Contact phone"
                fullWidth
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                type="tel"
                disabled={loading}
                size="small"
                sx={{ ".MuiOutlinedInput-root": { borderRadius: 1.5 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography
                variant="body2"
                sx={{
                  mb: 0.5,
                  fontWeight: 500,
                  fontSize: { xs: "0.8rem", sm: "0.85rem" },
                }}
              >
                Candidate photo
              </Typography>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                disabled={loading}
                sx={{
                  justifyContent: "space-between",
                  borderRadius: 1.5,
                  borderColor: brand.border,
                  textTransform: "none",
                  color: brand.textMain,
                  bgcolor: brand.bg,
                  fontSize: { xs: "0.8rem", sm: "0.85rem" },
                  "&:hover": {
                    borderColor: brand.primary,
                    bgcolor: "#FFFFFF",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    width: "100%",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      flexGrow: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {photoFile ? photoFile.name : "Upload profile photo"}
                  </Typography>
                </Box>
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  accept="image/*"
                />
              </Button>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1.5,
              mt: 3,
            }}
          >
            <Button
              onClick={onClose}
              sx={{
                textTransform: "none",
                color: brand.textMuted,
                fontSize: { xs: "0.8rem", sm: "0.85rem" },
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !candidateName || !partyId || !positionId}
              sx={{
                textTransform: "none",
                borderRadius: 999,
                px: { xs: 2.2, sm: 3 },
                bgcolor: brand.primary,
                fontSize: { xs: "0.85rem", sm: "0.9rem" },
                "&:hover": {
                  bgcolor: brand.primaryDark,
                },
              }}
            >
              {loading ? (
                <CircularProgress size={18} sx={{ color: "#FFFFFF" }} />
              ) : (
                "Save candidate"
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};
