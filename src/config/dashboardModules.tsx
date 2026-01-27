// src/components/DashboardModuleCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, IconButton, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

// Assuming you have this interface defined in dashboardModules.ts and imported here
import { DashboardModule } from '../config/dashboardModules';

interface DashboardModuleCardProps {
    module: DashboardModule;
    apiBaseUrl: string; // Keep if you're using it for API calls within the card
}

const DashboardModuleCard: React.FC<DashboardModuleCardProps> = ({ module, apiBaseUrl }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate(); // Initialize the navigate function

    const handleCardClick = () => {
        if (module.path) { // Use module.path for navigation
            navigate(module.path);
        } else {
            console.warn(`Module "${module.title}" does not have a defined path.`);
        }
    };

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: '12px',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
                background: isDark ? '#1a1a1a' : '#ffffff',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: isDark ? '0 6px 16px rgba(0,0,0,0.6)' : '0 6px 16px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                },
            }}
            onClick={handleCardClick} // Attach the click handler to the Card
        >
            <CardContent>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                        color: theme.palette.primary.main,
                    }}
                >
                    {module.icon} {/* Render the icon directly as it's a ReactElement */}
                    <Typography variant="h6" fontWeight={600} color={isDark ? '#e0e0e0' : '#333'}>
                        {module.title}
                    </Typography>
                </Box>
                <Typography variant="body2" color={isDark ? '#b0b0b0' : '#666'}>
                    {module.description}
                </Typography>
            </CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <IconButton color="primary" onClick={handleCardClick}>
                    <ArrowForwardIcon />
                </IconButton>
            </Box>
        </Card>
    );
};

export default DashboardModuleCard;