import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useAnimation, type Variants, useReducedMotion } from "framer-motion";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";

// Icons
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import GavelIcon from "@mui/icons-material/Gavel";
import PaymentsIcon from "@mui/icons-material/Payments";
import SchoolIcon from "@mui/icons-material/School";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

// Types for apps/sub-items
interface SubItem {
  label: string;
  route: string;
}
interface AppItem {
  label: string;
  icon: React.ReactNode;
  route?: string;
  subItems?: SubItem[];
}

const appLauncherColors = {
  mainBrand: "#007BFF",
  secondaryHighlight: "#FFC107",
  baseBackground: "rgba(18, 25, 38, 0.98)",
  blurLayerTint: "rgba(0, 0, 0, 0.3)",
  iconBackground: "rgba(0, 123, 255, 0.8)",
  subIconBackground: "rgba(0, 123, 255, 0.7)",
  lightText: "#F0F4F8",
  darkText: "#2C3E50",
  ringBorderGlow: "rgba(0, 123, 255, 0.3)",
  iconHoverGlow: "rgba(255, 193, 7, 0.7)",
  shadowHeavy: "rgba(0, 0, 0, 0.45)",
  shadowMedium: "rgba(0, 0, 0, 0.35)",
};

// Consolidated App Data (MATCHING Sidenav.tsx routes)
const apps: AppItem[] = [
  { label: "Dashboard", icon: <DashboardIcon />, route: "/" },
  {
    label: "Party Management",
    icon: <ManageAccountsIcon />,
    subItems: [
      { label: "Members Registry", route: "/members" },
      { label: "Nominations Process", route: "/Nominations" },
      { label: "Electoral Module", route: "/onboarding" },
      { label: "party-operations Room", route: "/party-operations" },
      { label: "Political Map Analysis", route: "/visa" },
    ],
  },
  { label: "Human Resources", icon: <SelfImprovementIcon />, route: "/hr" },
  { label: "Legal Room", icon: <GavelIcon />, route: "/crm" },
  { label: "Financial Management", icon: <PaymentsIcon />, route: "/finance/dashboard" },
  { label: "National Tallying Center", icon: <SchoolIcon />, route: "/election/national" },
  {
    label: "System Administration",
    icon: <AdminPanelSettingsIcon />,
    subItems: [
      { label: "User Roles Management", route: "/admin/user-roles" },
      { label: "System Settings", route: "/admin/settings" },
      { label: "Audit Logs", route: "/admin/audit-logs" },
    ],
  },
  { label: "Reporting & Analytics", icon: <ChecklistIcon />, route: "/reports" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AppLauncherOverlay: React.FC<Props> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const rotateControls = useAnimation();
  const itemControls = useAnimation();
  const centralIconControls = useAnimation();

  const [hoveredAppIndex, setHoveredAppIndex] = useState<number | null>(null);
  const [selectedAppWithSubItems, setSelectedAppWithSubItems] = useState<AppItem | null>(null);

  // ===== Responsive + Motion Preferences =====
  const reduceMotion = useReducedMotion();
  const isSmall = useMediaQuery("(max-width: 420px)");
  const isMedium = useMediaQuery("(max-width: 768px)");
  const isCoarse = useMediaQuery("(pointer: coarse)");

  // Sizes scale with viewport for mobile friendliness
  const mainContainerSize = useMemo(() => {
    const base = isSmall ? 320 : isMedium ? 420 : 480;
    return base;
  }, [isSmall, isMedium]);

  const radius = useMemo(() => (isSmall ? 120 : isMedium ? 160 : 180), [isSmall, isMedium]);
  const subItemRadius = useMemo(() => (isSmall ? 70 : 95), [isSmall]);
  const mainAppIconSize = useMemo(() => (isSmall ? 64 : 80), [isSmall]);
  const subAppIconSize = useMemo(() => (isSmall ? 54 : 65), [isSmall]);
  const centralIconSize = useMemo(() => (isSmall ? 90 : 110), [isSmall]);

  const appsLen = apps.length;
  const angleIncrement = useMemo(() => 360 / appsLen, [appsLen]);

  // ===== Keyboard + Focus Trap =====
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      lastActiveRef.current = document.activeElement as HTMLElement | null;
      // lock body scroll
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // send focus into dialog
      setTimeout(() => dialogRef.current?.focus(), 0);
      return () => {
        document.body.style.overflow = prev;
        lastActiveRef.current?.focus?.();
      };
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (selectedAppWithSubItems) {
          setSelectedAppWithSubItems(null);
          // restart orbit if needed
          if (!reduceMotion) {
            rotateControls.start({
              rotate: [0, 360],
              transition: { repeat: Infinity, ease: "linear", duration: 50 },
            });
          }
          itemControls.start("visible");
        } else {
          onClose();
        }
      }
      // simple focus trap (Tab cycles within)
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !dialogRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [itemControls, onClose, reduceMotion, rotateControls, selectedAppWithSubItems]
  );

  // ===== Variants =====
  const launcherContainerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.92, transition: { duration: 0.25, ease: "easeOut" } },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  };

  const appItemVariants: Variants = {
    hidden: (i: number) => ({
      opacity: 0,
      scale: reduceMotion ? 1 : 0.6,
      x: 0,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut", delay: i * 0.015 },
    }),
    visible: (i: number) => {
      const angleRad = (i * angleIncrement * Math.PI) / 180;
      const x = radius * Math.cos(angleRad);
      const y = radius * Math.sin(angleRad);
      return {
        opacity: 1,
        scale: 1,
        x,
        y,
        transition: reduceMotion
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 120, damping: 16, delay: 0.1 + i * 0.04 },
      };
    },
    hover: reduceMotion
      ? { scale: 1.04 }
      : {
          scale: 1.12,
          boxShadow: `0 0 22px ${appLauncherColors.iconHoverGlow}`,
          transition: { type: "spring", stiffness: 280, damping: 18 },
        },
    tap: { scale: 0.96 },
  };

  const subItemVariants: Variants = {
    hidden: (i: number) => ({
      opacity: 0,
      scale: reduceMotion ? 1 : 0.8,
      transition: { duration: 0.15, delay: i * 0.015 },
    }),
    visible: (i: number) => {
      const subCount = selectedAppWithSubItems?.subItems?.length || 1;
      const subAngleIncrement = 360 / subCount;
      const subAngleRad = (i * subAngleIncrement * Math.PI) / 180;
      const x = subItemRadius * Math.cos(subAngleRad);
      const y = subItemRadius * Math.sin(subAngleRad);
      return {
        opacity: 1,
        scale: 1,
        x,
        y,
        transition: reduceMotion
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 120, damping: 18, delay: 0.08 + i * 0.03 },
      };
    },
    hover: reduceMotion
      ? { scale: 1.04 }
      : {
          scale: 1.08,
          boxShadow: `0 0 16px ${appLauncherColors.secondaryHighlight}`,
          transition: { type: "spring", stiffness: 280, damping: 18 },
        },
    tap: { scale: 0.96 },
  };

  // ===== Open/Close + Orbit Control =====
  useEffect(() => {
    if (isOpen) {
      centralIconControls.start({ opacity: 1, scale: 1 });
      rotateControls.start({ opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } });

      if (!selectedAppWithSubItems && !reduceMotion) {
        rotateControls.start({
          rotate: [0, 360],
          transition: { repeat: Infinity, ease: "linear", duration: 50 },
        });
      }
      itemControls.start("visible");
    } else {
      rotateControls.stop();
      setSelectedAppWithSubItems(null);
      centralIconControls.start({ opacity: 0, scale: 0.92 });
      itemControls.start("hidden");
    }
  }, [centralIconControls, isOpen, itemControls, reduceMotion, rotateControls, selectedAppWithSubItems]);

  // Pause orbit when tab hidden (battery-friendly)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        rotateControls.stop();
      } else if (!selectedAppWithSubItems && !reduceMotion && isOpen) {
        rotateControls.start({
          rotate: [0, 360],
          transition: { repeat: Infinity, ease: "linear", duration: 50 },
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isOpen, reduceMotion, rotateControls, selectedAppWithSubItems]);

  const handleAppClick = useCallback(
    (app: AppItem) => {
      if (app.subItems && app.subItems.length > 0) {
        setSelectedAppWithSubItems(app);
        rotateControls.stop();
        itemControls.start("hidden");
      } else if (app.route) {
        setSelectedAppWithSubItems(null);
        navigate(app.route);
        onClose();
      }
    },
    [itemControls, navigate, onClose, rotateControls]
  );

  const handleSubItemClick = useCallback(
    (subItem: SubItem) => {
      navigate(subItem.route);
      onClose();
    },
    [navigate, onClose]
  );

  const handleBackToMainApps = useCallback(() => {
    setSelectedAppWithSubItems(null);
    if (!reduceMotion) {
      rotateControls.start({
        rotate: [0, 360],
        transition: { repeat: Infinity, ease: "linear", duration: 50 },
      });
    }
    itemControls.start("visible");
  }, [itemControls, reduceMotion, rotateControls]);

  const toggleMainOrbitOnAppHover = useCallback(
    (isHovering: boolean) => {
      if (!selectedAppWithSubItems && !reduceMotion) {
        if (isHovering) rotateControls.stop();
        else
          rotateControls.start({
            rotate: [0, 360],
            transition: { repeat: Infinity, ease: "linear", duration: 50 },
          });
      }
    },
    [reduceMotion, rotateControls, selectedAppWithSubItems]
  );

  // ===== Render =====
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Background Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{
              // use dvh for PWA address-bar safe height
              height: "100dvh",
              backdropFilter: "blur(12px) brightness(0.85)",
              WebkitBackdropFilter: "blur(12px) brightness(0.85)",
              backgroundColor: appLauncherColors.blurLayerTint,
            }}
            onClick={() => {
              if (selectedAppWithSubItems) {
                handleBackToMainApps();
              } else {
                onClose();
              }
            }}
          />

          {/* Dialog Container */}
          <motion.div
            className="fixed inset-0 z-50 p-4 flex items-center justify-center"
            variants={launcherContainerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            role="dialog"
            aria-modal="true"
            aria-label={selectedAppWithSubItems ? `${selectedAppWithSubItems.label} menu` : "Applications launcher"}
            ref={dialogRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            <Box
              sx={{
                position: "relative",
                width: mainContainerSize,
                height: mainContainerSize,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "transparent",
                // ensure GPU accel for smoother transforms
                transform: "translateZ(0)",
                willChange: "transform",
              }}
            >
              {/* Main Orbiting Ring */}
              <motion.div
                aria-hidden={!!selectedAppWithSubItems}
                animate={rotateControls}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  border: `2px solid ${appLauncherColors.mainBrand}`,
                  boxShadow: `0 0 12px ${appLauncherColors.ringBorderGlow}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  filter:
                    hoveredAppIndex === null && !selectedAppWithSubItems
                      ? `drop-shadow(0 0 6px ${appLauncherColors.secondaryHighlight})`
                      : "none",
                  transition: "filter 0.25s ease",
                }}
              >
                {!selectedAppWithSubItems &&
                  apps.map((app, index) => {
                    const angle = (index / appsLen) * 360;
                    // Disable hover effects on coarse (touch) pointers to save GPU & avoid flicker
                    const hoverProps = isCoarse ? {} : { whileHover: "hover" as const };
                    return (
                      <motion.div
                        key={app.label}
                        custom={index}
                        variants={appItemVariants}
                        animate={itemControls}
                        style={{
                          position: "absolute",
                          left: `50%`,
                          top: `50%`,
                          transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
                        }}
                        {...hoverProps}
                        whileTap="tap"
                        onHoverStart={() => {
                          if (!isCoarse) {
                            setHoveredAppIndex(index);
                            toggleMainOrbitOnAppHover(true);
                          }
                        }}
                        onHoverEnd={() => {
                          if (!isCoarse) {
                            setHoveredAppIndex(null);
                            toggleMainOrbitOnAppHover(false);
                          }
                        }}
                        onClick={() => handleAppClick(app)}
                      >
                        <Tooltip title={app.label} arrow placement="top" disableHoverListener={isCoarse}>
                          <IconButton
                            aria-label={app.label}
                            sx={{
                              width: mainAppIconSize,
                              height: mainAppIconSize,
                              bgcolor: appLauncherColors.iconBackground,
                              color: appLauncherColors.lightText,
                              borderRadius: "50%",
                              boxShadow: `0px 6px 18px ${appLauncherColors.shadowHeavy}`,
                              backdropFilter: "blur(5px)",
                              WebkitBackdropFilter: "blur(5px)",
                              transition: "background-color 0.25s ease, box-shadow 0.25s ease, transform 0.1s ease",
                              "&:hover": !isCoarse
                                ? {
                                    bgcolor: appLauncherColors.mainBrand,
                                    boxShadow: `0 0 22px ${appLauncherColors.iconHoverGlow}`,
                                  }
                                : undefined,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignItems: "center",
                              fontSize: mainAppIconSize * 0.45,
                            }}
                          >
                            {app.icon}
                            <Typography
                              variant="caption"
                              sx={{
                                mt: 0.5,
                                color: appLauncherColors.lightText,
                                fontWeight: "bold",
                                fontSize: isSmall ? "0.62rem" : "0.7rem",
                              }}
                            >
                              {app.label.split(" ")[0]}
                            </Typography>
                          </IconButton>
                        </Tooltip>
                      </motion.div>
                    );
                  })}

                {/* Sub-items Orbit */}
                <AnimatePresence>
                  {selectedAppWithSubItems &&
                    selectedAppWithSubItems.subItems?.map((sub: SubItem, index: number) => {
                      const count = selectedAppWithSubItems.subItems!.length;
                      const subAngle = (index / count) * 360;
                      const hoverProps = isCoarse ? {} : { whileHover: "hover" as const };
                      return (
                        <motion.div
                          key={sub.label}
                          custom={index}
                          variants={subItemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          style={{
                            position: "absolute",
                            left: `50%`,
                            top: `50%`,
                            transform: `translate(-50%, -50%) rotate(${-subAngle}deg)`,
                          }}
                          {...hoverProps}
                          whileTap="tap"
                          onClick={() => handleSubItemClick(sub)}
                        >
                          <Tooltip title={sub.label} arrow placement="top" disableHoverListener={isCoarse}>
                            <IconButton
                              aria-label={sub.label}
                              sx={{
                                width: subAppIconSize,
                                height: subAppIconSize,
                                bgcolor: appLauncherColors.subIconBackground,
                                color: appLauncherColors.lightText,
                                borderRadius: "50%",
                                boxShadow: `0px 4px 12px ${appLauncherColors.shadowMedium}`,
                                backdropFilter: "blur(4px)",
                                WebkitBackdropFilter: "blur(4px)",
                                transition: "background-color 0.25s ease, box-shadow 0.25s ease",
                                "&:hover": !isCoarse
                                  ? {
                                      bgcolor: appLauncherColors.mainBrand,
                                      boxShadow: `0 0 16px ${appLauncherColors.secondaryHighlight}`,
                                    }
                                  : undefined,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                fontSize: subAppIconSize * 0.45,
                              }}
                            >
                              <AppsRoundedIcon sx={{ fontSize: subAppIconSize * 0.45 }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  mt: 0.2,
                                  color: appLauncherColors.lightText,
                                  fontSize: isSmall ? "0.52rem" : "0.6rem",
                                }}
                              >
                                {sub.label.split(" ")[0]}
                              </Typography>
                            </IconButton>
                          </Tooltip>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </motion.div>

              {/* Central Icon - Apps or Back/Close */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={centralIconControls}
                transition={{ delay: 0.05, type: "spring", stiffness: 160, damping: 12 }}
                whileHover={
                  reduceMotion
                    ? undefined
                    : { scale: 1.05, boxShadow: `0 0 18px ${appLauncherColors.secondaryHighlight}` }
                }
                whileTap={{ scale: 0.96 }}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  boxShadow: `0 0 18px ${appLauncherColors.mainBrand}`,
                }}
              >
                <IconButton
                  onClick={selectedAppWithSubItems ? handleBackToMainApps : onClose}
                  aria-label={selectedAppWithSubItems ? "Back to apps" : "Close app launcher"}
                  sx={{
                    width: centralIconSize,
                    height: centralIconSize,
                    bgcolor: appLauncherColors.secondaryHighlight,
                    color: appLauncherColors.darkText,
                    borderRadius: "50%",
                    boxShadow: `0px 10px 26px ${appLauncherColors.shadowHeavy}`,
                    "&:hover": {
                      bgcolor: appLauncherColors.mainBrand,
                      color: appLauncherColors.lightText,
                      boxShadow: `0px 10px 26px ${appLauncherColors.secondaryHighlight}`,
                    },
                    transition: "all 0.25s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: centralIconSize * 0.45,
                  }}
                >
                  {selectedAppWithSubItems ? (
                    <motion.div
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: -90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: centralIconSize * 0.45 }} />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, rotate: 90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                      transition={{ duration: 0.15 }}
                    >
                      <AppsRoundedIcon sx={{ fontSize: centralIconSize * 0.45 }} />
                    </motion.div>
                  )}
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, color: "inherit", fontWeight: "bold", fontSize: isSmall ? "0.62rem" : "0.7rem" }}
                  >
                    {selectedAppWithSubItems ? "Back" : "Apps"}
                  </Typography>
                </IconButton>
              </motion.div>
            </Box>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AppLauncherOverlay;
