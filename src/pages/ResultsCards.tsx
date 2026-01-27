// src/pages/ResultsCards.tsx
import React from "react";
import { Box, Typography, Grid, Card, CardContent, Button, Chip } from "@mui/material";
import { motion } from "framer-motion";
import { HowToVote, Summarize, Visibility, Edit } from "@mui/icons-material";

// ✅ Shared draft types (single source of truth)
import type { StationResultDraft, Form34BResultDraft } from "../types/results";

// ✅ PollingStation should come from storage (NOT from a page)
import type { PollingStation } from "../utils/storage";

const MotionCard = motion(Card);

interface PollingStationCardProps {
  station: PollingStation;
  draft: StationResultDraft | null;
  onEnter: () => void;
  onView: () => void;
}

export const PollingStationCard: React.FC<PollingStationCardProps> = ({
  station,
  draft,
  onEnter,
  onView,
}) => {
  const isSubmitted = !!draft?.submitted;
  const hasDraft = !!draft;

  return (
    <Grid item xs={12} sm={6} md={4} lg={3}>
      <MotionCard
        whileHover={{ scale: 1.03, boxShadow: "0px 8px 16px rgba(0,0,0,0.1)" }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        onClick={onEnter}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <HowToVote color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {station.name}
            </Typography>

            {isSubmitted ? (
              <Chip label="Submitted" color="success" size="small" />
            ) : hasDraft ? (
              <Chip label="Draft" color="warning" size="small" />
            ) : (
              <Chip label="Pending" size="small" />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">
            {station.ward}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Registered Voters: {(station as any).registeredVoters ?? "N/A"}
          </Typography>
        </CardContent>

        <Box sx={{ p: 2, borderTop: "1px solid #eee", display: "flex", gap: 1 }}>
          {hasDraft && (
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              View
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit />}
            onClick={(e) => {
              e.stopPropagation();
              onEnter();
            }}
          >
            {isSubmitted ? "Edit" : "Enter"}
          </Button>
        </Box>
      </MotionCard>
    </Grid>
  );
};

interface ConstituencyCardProps {
  // If your "constituency" object is PollingStation-like, keep this.
  // If you have a dedicated Constituency type, swap it in here.
  constituency: PollingStation;
  draft: Form34BResultDraft | null;
  onEnter: () => void;
}

export const ConstituencyCard: React.FC<ConstituencyCardProps> = ({
  constituency,
  draft,
  onEnter,
}) => {
  const isSubmitted = !!draft?.submitted;
  const hasDraft = !!draft;

  return (
    <Grid item xs={12} sm={6} md={4} lg={3}>
      <MotionCard
        whileHover={{ scale: 1.03, boxShadow: "0px 8px 16px rgba(0,0,0,0.1)" }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        onClick={onEnter}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Summarize color="secondary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {(constituency as any).constituency ?? constituency.name}
            </Typography>

            {isSubmitted ? (
              <Chip label="Submitted" color="success" size="small" />
            ) : hasDraft ? (
              <Chip label="Draft" color="warning" size="small" />
            ) : (
              <Chip label="Pending" size="small" />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">
            {constituency.county}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Total Valid: {draft?.totalValid != null ? draft.totalValid.toLocaleString() : "N/A"}
          </Typography>
        </CardContent>

        <Box sx={{ p: 2, borderTop: "1px solid #eee", display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit />}
            onClick={(e) => {
              e.stopPropagation();
              onEnter();
            }}
          >
            {isSubmitted ? "Edit 34B" : "Enter 34B"}
          </Button>
        </Box>
      </MotionCard>
    </Grid>
  );
};
