// src/components/Header.tsx
import React, { memo, useMemo } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  useMediaQuery,
  useScrollTrigger,
  InputBase,
  Chip,
  Avatar,
  Badge,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import assets from "../assets/assets";
import profileImg from "../assets/profile.png";

interface HeaderProps {
  toggleSidebar: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  title = "SkizaGroundSuite Operations Dashboard",
}) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.down("md"));
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 4 });

  const brand = useMemo(
    () => ({
      red: "#F5333F",
      redDark: "#C4202C",
      ink: "rgba(255,255,255,0.92)",
      muted: "rgba(255,255,255,0.75)",
    }),
    []
  );

  return (
    <AppBar
      component="header"
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        paddingTop: "env(safe-area-inset-top)",
        background: scrolled
          ? `linear-gradient(180deg, ${alpha(brand.red, 0.92)} 0%, ${alpha(
            brand.redDark,
            0.92
          )} 100%)`
          : `linear-gradient(180deg, ${brand.red} 0%, ${brand.redDark} 100%)`,
        borderBottom: `1px solid ${alpha("#FFFFFF", scrolled ? 0.14 : 0.12)}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition:
          "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
        boxShadow: scrolled ? "0 10px 30px rgba(0,0,0,0.18)" : "none",
        overflow: "hidden",
      }}
    >
      {/* Soft glow overlays */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(900px 380px at 18% 25%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.00) 58%), radial-gradient(700px 320px at 92% 20%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.00) 60%)",
          opacity: 1,
        }}
      />

      <Toolbar
        variant={isXs ? "dense" : "regular"}
        sx={{
          position: "relative",
          minHeight: { xs: 56, sm: 64, md: 72 },
          px: { xs: 1, sm: 2, md: 3 },
          gap: { xs: 0.75, sm: 1.25 },
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          minWidth: 0, // ✅ critical for preventing overflow in flex layouts
        }}
      >
        {/* Left: menu */}
        <IconButton
          edge="start"
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
          size={isXs ? "medium" : "large"}
          sx={{
            color: brand.ink,
            borderRadius: 2,
            flexShrink: 0,
            "&:hover": { backgroundColor: alpha("#FFFFFF", 0.10) },
          }}
        >
          <MenuIcon fontSize="inherit" />
        </IconButton>

        {/* Brand */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            gap: { xs: 1, sm: 1.25 },
            pr: { xs: 0.5, sm: 1 },
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: { xs: 36, sm: 42 },
              width: { xs: 36, sm: 42 },
              borderRadius: 3,
              backgroundColor: alpha("#FFFFFF", 0.12),
              border: `1px solid ${alpha("#FFFFFF", 0.18)}`,
              boxShadow: "0 14px 30px rgba(0,0,0,0.20)",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={assets.logo}
              alt="Jubilee PMS Logo"
              loading="lazy"
              decoding="async"
              style={{
                height: isXs ? 30 : 36,
                width: isXs ? 30 : 36,
                objectFit: "contain",
                display: "block",
                borderRadius: 12,
              }}
            />
          </Box>

          {/* Hide long text earlier to protect mobile */}
          {!isSm && (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  color: brand.ink,
                  lineHeight: 1.1,
                  fontSize: 14,
                }}
                title={title}
              >
                SkizaGroundSuite
              </Typography>
              <Typography
                noWrap
                sx={{
                  color: brand.muted,
                  fontSize: 12,
                  lineHeight: 1.2,
                }}
              >
                Operations Dashboard
              </Typography>
            </Box>
          )}
        </Box>

        {/* Center: Search
            - XS: icon button only
            - SM+: full pill search
        */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            minWidth: 0, // ✅ critical
          }}
        >
          {isXs ? (
            <Tooltip title="Search">
              <IconButton
                aria-label="Search"
                size="medium"
                sx={{
                  color: brand.ink,
                  borderRadius: 2,
                  flexShrink: 0,
                  "&:hover": { backgroundColor: alpha("#FFFFFF", 0.10) },
                }}
              >
                <SearchRoundedIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Box
              sx={{
                width: "100%",
                maxWidth: 760,
                position: "relative",
                borderRadius: 999,
                backgroundColor: alpha("#FFFFFF", 0.14),
                border: `1px solid ${alpha("#FFFFFF", 0.20)}`,
                boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: alpha("#FFFFFF", 0.85),
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <SearchRoundedIcon fontSize="small" />
              </Box>

              <InputBase
                placeholder="Search…"
                inputProps={{ "aria-label": "Search" }}
                sx={{
                  width: "100%",
                  color: brand.ink,
                  pl: 5,
                  pr: 2,
                  py: 1.1,
                  fontSize: 13,
                  "& input": { minWidth: 0 },
                  "& input::placeholder": {
                    color: alpha("#FFFFFF", 0.75),
                    opacity: 1,
                  },
                }}
              />
            </Box>
          )}
        </Box>

        {/* Right */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 1 },
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          {!isXs && (
            <Chip
              label="Live"
              size="small"
              sx={{
                height: 34,
                px: 1,
                borderRadius: 999,
                backgroundColor: alpha("#FFFFFF", 0.14),
                border: `1px solid ${alpha("#FFFFFF", 0.20)}`,
                color: brand.ink,
                fontWeight: 700,
                "& .MuiChip-label": { px: 1.2 },
                "&::before": {
                  content: '""',
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  marginRight: 10,
                  backgroundColor: "#43D17A",
                  boxShadow: "0 0 0 4px rgba(67,209,122,0.18)",
                },
              }}
            />
          )}

          <Tooltip title="Notifications">
            <IconButton
              aria-label="Notifications"
              size={isXs ? "medium" : "large"}
              sx={{
                color: brand.ink,
                borderRadius: 2,
                "&:hover": { backgroundColor: alpha("#FFFFFF", 0.10) },
              }}
            >
              <Badge
                color="error"
                variant="dot"
                overlap="circular"
                sx={{
                  "& .MuiBadge-badge": {
                    boxShadow: "0 0 0 3px rgba(245,51,63,0.25)",
                  },
                }}
              >
                <NotificationsNoneRoundedIcon fontSize="inherit" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pl: 0.25 }}>
            {!isXs && (
              <Typography
                noWrap
                sx={{ color: brand.ink, fontWeight: 700, fontSize: 12.5 }}
              >
                Speak:
              </Typography>
            )}

            <Avatar
              alt="Profile"
              src={profileImg}
              sx={{
                width: { xs: 34, sm: 38 },
                height: { xs: 34, sm: 38 },
                border: `2px solid ${alpha("#FFFFFF", 0.55)}`,
                boxShadow: "0 14px 30px rgba(0,0,0,0.20)",
                flexShrink: 0,
              }}
            />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default memo(Header);
