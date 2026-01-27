// src/modules/election/HeatmapView.tsx
import React from "react";
import { Box, Button, Typography } from "@mui/material";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import { Link } from "react-router-dom";

const HeatmapView: React.FC = () => {
    return (
        <Box sx={{ mt: 2 }}>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    mb: 1.5,
                    color: "text.primary",
                    typography: { xs: "subtitle1", sm: "h6" },
                }}
            >
                Spatial Analysis (Heatmap)
            </Typography>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, maxWidth: 520 }}
            >
                View how turnout and candidate performance vary across the country on an
                interactive map. Ideal for newsroom displays and situation rooms.
            </Typography>
            <Button
                component={Link}
                to="/election/heatmap"
                variant="contained"
                color="primary"
                size="large"
                sx={{ borderRadius: 2, px: 3, py: 1.2 }}
                endIcon={<ArrowDownwardRoundedIcon />}
            >
                Open heatmap module
            </Button>
        </Box>
    );
};

export default HeatmapView;
