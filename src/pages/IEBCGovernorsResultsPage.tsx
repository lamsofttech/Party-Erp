import React from "react";
import { Box, Typography, Alert } from "@mui/material";

/**
 * IEBCGovernorsResultsPage (placeholder)
 * Coming up soon.
 *
 * TODO (when you return):
 * - Re-add 34A polling station results flow
 * - Re-add 34B constituency totals flow
 * - Restore candidate fetching + localStorage drafts + submit endpoints
 */

const IEBCGovernorsResultsPage: React.FC = () => {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Gubernatorial Election Results Entry
      </Typography>

      <Alert severity="info" sx={{ mt: 2 }}>
        Coming up soon.
      </Alert>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        This page is temporarily hidden so you can revisit and finish it later.
      </Typography>
    </Box>
  );
};

export default IEBCGovernorsResultsPage;
