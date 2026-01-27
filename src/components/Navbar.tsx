// src/components/Navbar.tsx
import DarkModeIcon from "@mui/icons-material/DarkMode";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MenuIcon from "@mui/icons-material/Menu";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton, Menu, MenuItem, Avatar, Badge, useMediaQuery } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps, Transition } from "framer-motion";
import assets from "../assets/assets";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import { useUser } from "../contexts/UserContext";
import axios from "axios";
import { config } from "../config";

interface NavbarProps {
  toggleSidebar?: () => void;
}

function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => { });
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const inStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  return { canInstall: canInstall && !inStandalone, promptInstall };
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  const themeContext = useContext(ThemeContext);
  const { user, setUser } = useUser();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const reduceMotion = useReducedMotion();
  const canHover = useMediaQuery("(hover: hover)");
  const isCoarse = useMediaQuery("(pointer: coarse)");
  const { canInstall, promptInstall } = usePWAInstall();

  if (!themeContext) return null;

  const u = (user ?? {}) as Record<string, any>;
  const displayName: string =
    u.name ??
    u.username ??
    u.fullName ??
    u.displayName ??
    (typeof u.email === "string" ? u.email.split("@")[0] : undefined) ??
    "User";

  const avatarSrc: string = u.avatarUrl ?? u.image ?? assets.profile ?? "";

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const navMotion = useMemo<HTMLMotionProps<"nav">>(() => {
    if (reduceMotion) return { initial: false, animate: {} };

    const spring: Transition = {
      type: "spring",
      stiffness: 180,
      damping: 22,
      mass: 0.7,
    };

    return {
      initial: { y: -64, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      transition: spring,
    };
  }, [reduceMotion]);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    try {
      await axios.post(
        "https://finkapinternational.qhtestingserver.com/login/logout_api.php",
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      setUser(null);
      window.location.href = config.loginUrl;
    }
  };

  const bgDark = themeContext.theme === "dark" ? "dark:bg-[#2C3E50]" : "";
  const borderDark = themeContext.theme === "dark" ? "dark:border-gray-700" : "";

  return (
    <motion.nav
      role="navigation"
      aria-label="Main"
      className={`
        fixed top-0 left-0 right-0
        w-full
        bg-white ${bgDark}
        shadow-md flex items-center
        px-3 sm:px-4 md:px-6 lg:px-8
        z-30
        transition-colors duration-200 ease-in-out
        border-b border-gray-100 ${borderDark}
        overflow-x-hidden
      `}
      style={{
        // ✅ keep full-width + prevent overflow issues
        maxWidth: "100%",
        // ✅ safe-area without breaking height calculations
        paddingTop: "env(safe-area-inset-top)",
        // ✅ use minHeight instead of fixed h-16 so safe-area doesn't increase overlap weirdly
        minHeight: `calc(64px + env(safe-area-inset-top))`,
        boxSizing: "border-box",
        willChange: canHover ? "transform" : undefined,
        WebkitOverflowScrolling: "touch",
      }}
      {...navMotion}
    >
      {/* Hamburger */}
      <IconButton
        onClick={() => toggleSidebar?.()}
        disabled={!toggleSidebar}
        sx={{
          color: "#1A5F56",
          fontSize: "2rem",
          mr: { xs: 1.5, md: 3 },
          p: isCoarse ? 1.25 : 0.75,
          flexShrink: 0,
          "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" },
        }}
        aria-label="Open sidebar"
        edge="start"
      >
        <MenuIcon fontSize="inherit" />
      </IconButton>

      {/* Logo + Title */}
      <div className="flex items-center flex-grow min-w-0 overflow-hidden">
        {assets.logo && (
          <img
            src={assets.logo}
            alt="Party Logo"
            className="h-8 w-auto object-contain mr-2 sm:mr-3 flex-shrink-0"
            loading="eager"
            decoding="async"
          />
        )}
        <span className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">
          GEN Z POLITICAL PARTY ERP Suite
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-gray-700 dark:text-gray-200 flex-shrink-0">
        {canInstall && (
          <IconButton
            onClick={promptInstall}
            size="small"
            aria-label="Install app"
            sx={{ "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" } }}
            title="Install app"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </IconButton>
        )}

        <IconButton
          onClick={themeContext.toggleTheme}
          color="inherit"
          aria-label="Toggle dark mode"
          sx={{
            p: isCoarse ? 1.25 : 0.75,
            "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" },
          }}
          title={themeContext.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {themeContext.theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>

        <IconButton
          color="inherit"
          aria-label="Show notifications"
          sx={{ p: isCoarse ? 1.25 : 0.75, "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" } }}
          title="Notifications"
        >
          <Badge
            variant={isOnline ? "standard" : "dot"}
            color={isOnline ? "default" : "warning"}
            overlap="circular"
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>

        <IconButton
          id="profile-button"
          className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={handleProfileClick}
          aria-controls={anchorEl ? "profile-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={anchorEl ? "true" : undefined}
          sx={{
            p: isCoarse ? 0.5 : 0.25,
            borderRadius: 9999,
          }}
          title="Account"
        >
          <div className="flex items-center gap-2 pr-1 pl-0.5 min-w-0">
            <Avatar
              src={avatarSrc}
              alt={displayName}
              sx={{ width: 32, height: 32, border: "1px solid #1A5F56" }}
              imgProps={{ referrerPolicy: "no-referrer" }}
            />
            {displayName && (
              <span className="hidden md:block text-sm font-medium whitespace-nowrap max-w-[12rem] truncate">
                {displayName}
              </span>
            )}
          </div>
        </IconButton>

        <Menu
          id="profile-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          MenuListProps={{ "aria-labelledby": "profile-button" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          PaperProps={{
            className: themeContext.theme === "dark" ? "bg-[#375472] text-white" : "bg-white text-black",
            sx: {
              boxShadow: { xs: "0 8px 18px rgba(0,0,0,0.12)", sm: "0 10px 24px rgba(0,0,0,0.14)" },
              minWidth: 160,
            },
          }}
        >
          <MenuItem onClick={handleClose}>Profile</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </div>
    </motion.nav>
  );
}
