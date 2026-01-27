// src/pages/MainDashboard.tsx
import React from 'react';
import { Box, Typography, Grid, useTheme } from '@mui/material';
import dashboardModules from '../config/dashboardModules'; // ✅ default import
import DashboardModuleCard from '../components/DashboardModuleCard'; // ✅ default import

// Extend the inferred module type with optional link fields some UIs/cards expect.
type DashboardModule = (typeof dashboardModules)[number] & {
  href?: string;
  path?: string;
};

const MainDashboard: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: isDark ? '#0c0c0c' : '#f0f2f5' }}>
      <Typography variant="h4" fontWeight={700} mb={4}>
        ERP Modules Overview
      </Typography>

      <Grid container spacing={3}>
        {dashboardModules.map((mod: DashboardModule, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={mod.id ?? idx}>
            <DashboardModuleCard module={mod} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MainDashboard;
