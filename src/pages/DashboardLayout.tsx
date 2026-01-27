import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Box, Tabs, Tab } from "@mui/material";

const DashboardLayout: React.FC = () => {
  const currentPath = window.location.pathname;

  return (
    <Box sx={{ p: 4 }}>
      <Tabs value={currentPath.startsWith("/dashboard/system-roles") ? 1 : 0}>
        <Tab
          label="User Roles"
          component={NavLink}
          to="/dashboard/user-roles"
          value={0}
        />
        <Tab
          label="System Roles"
          component={NavLink}
          to="/dashboard/system-roles"
          value={1}
        />
      </Tabs>
      <Box mt={4}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;
