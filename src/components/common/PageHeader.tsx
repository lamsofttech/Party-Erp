// src/components/Common/PageHeader.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode; // Optional prop for a button or other action component
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 4, // Margin bottom for spacing
        flexWrap: 'wrap', // Allow wrapping on small screens
        gap: 2, // Spacing between title/description and action
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="textSecondary">
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>} {/* flexShrink to prevent action from shrinking */}
    </Box>
  );
};

export default PageHeader;