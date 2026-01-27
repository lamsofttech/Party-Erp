import React, { useEffect, useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
  CircularProgress,
  Card,
} from "@mui/material";
import { motion, useAnimation } from "framer-motion";
import { Link } from "react-router-dom";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import PeopleIcon from "@mui/icons-material/People";
import CancelIcon from "@mui/icons-material/Cancel";
import VerifiedIcon from "@mui/icons-material/Verified";
import DashboardIcon from "@mui/icons-material/Dashboard";

// Jubilee Party Color Scheme (approximate brand colours)
const partyColors = {
  primary: "#C00500", // Jubilee red
  secondary: "#FFC000", // Jubilee yellow / gold accent
  accent: "#FFFFFF", // White for icons/text on strong backgrounds
  background: "#FFF5F5", // Soft light red-tinted background
} as const;

// 🔗 Helper: where we check access for this dashboard
const getNominationsAccessUrl = () => {
  const base = "/API/nominations-dashboard-access.php";
  if (import.meta.env.DEV) {
    return `${base}?dev=true`;
  }
  return base;
};

type LinkItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

// Links Configuration (logical names)
const links: LinkItem[] = [
  {
    label: "New Nominees",
    icon: <AssignmentTurnedInIcon />,
    path: "/nominations/new",
  },
  {
    label: "Pending Vetting",
    icon: <PendingActionsIcon />,
    path: "/nominations/pending-vetting",
  },
  {
    label: "Cleared Nominees",
    icon: <ThumbUpIcon />,
    path: "/nominations/cleared-nominees",
  },
  {
    label: "Disputes",
    icon: <ReportProblemIcon />,
    path: "/nominations/disputes",
  },
  {
    label: "Rejected Nominees",
    icon: <CancelIcon />,
    path: "/nominations/rejected-nominees",
  },
  {
    label: "Certificates",
    icon: <VerifiedIcon />,
    path: "/nominations/certificates",
  },
  {
    label: "All Nominees",
    icon: <PeopleIcon />,
    path: "/nominations/all",
  },
];

// Shape of backend access response
type AllowedLinks = {
  new?: boolean;
  pending_vetting?: boolean;
  cleared?: boolean;
  disputes?: boolean;
  rejected?: boolean;
  certificates?: boolean;
  all?: boolean;
  dashboard?: boolean;
};

interface NominationsAccessResponse {
  success: boolean;
  authorized?: boolean | null; // allow true/false/undefined (and null if backend sends it)
  code?: string;
  message?: string;
  allowedLinks?: AllowedLinks;
}

// Map UI labels → backend allowedLinks keys
const linkPermissionKeys: Record<string, keyof AllowedLinks> = {
  "New Nominees": "new",
  "Pending Vetting": "pending_vetting",
  "Cleared Nominees": "cleared",
  Disputes: "disputes",
  "Rejected Nominees": "rejected",
  Certificates: "certificates",
  "All Nominees": "all",
};

const NominationsDashboard: React.FC = () => {
  const [currentStatus, setCurrentStatus] = useState("Loading system...");
  const rotateControls = useAnimation();

  // 🔐 access control state
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [allowedLinks, setAllowedLinks] = useState<AllowedLinks | undefined>();

  // 🔐 Check with backend if user may view this dashboard (database-driven)
  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoadingAccess(true);
        setAccessDenied(false);
        setAccessMessage(null);

        const token = localStorage.getItem("token");
        const url = getNominationsAccessUrl();

        const res = await fetch(url, {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });

        let data: NominationsAccessResponse = { success: false };
        try {
          data = await res.json();
        } catch {
          // if no JSON, keep defaults
        }

        // Treat 401/403, explicit FORBIDDEN, or authorized === false as denied
        if (
          res.status === 401 ||
          res.status === 403 ||
          data.code === "FORBIDDEN" ||
          data.authorized === false
        ) {
          setAccessDenied(true);
          setAccessMessage(
            data.message ||
            "You do not have permission to view the Nominations Dashboard. Contact the system administrator for access."
          );
          setLoadingAccess(false);
          return;
        }

        // If backend uses success + authorized flags
        if (!res.ok || !data.success) {
          setAccessDenied(true);
          setAccessMessage(
            data.message ||
            "Access to the Nominations Dashboard is restricted or could not be verified."
          );
          setLoadingAccess(false);
          return;
        }

        // ✅ Access granted
        setAllowedLinks(data.allowedLinks);
        setLoadingAccess(false);
      } catch (err) {
        console.error("Failed to verify nominations access:", err);
        // In case of network/unknown error, be safe and deny
        setAccessDenied(true);
        setAccessMessage(
          "Unable to verify access to the Nominations Dashboard. Please try again or contact support."
        );
        setLoadingAccess(false);
      }
    };

    checkAccess();
  }, []);

  // 🎡 Existing animation + status rotator
  useEffect(() => {
    let isMounted = true;

    // Slow, smooth rotation of the ring
    rotateControls.start({
      rotate: [0, 360],
      transition: { repeat: Infinity, ease: "linear", duration: 80 },
    });

    const statuses = [
      "Syncing with Party Headquarters...",
      "Validating latest submissions...",
      "Monitoring nomination disputes...",
      "Verifying candidate credentials...",
      "Loading performance reports...",
      "Scanning pending vetting tasks...",
      "Reviewing field agent feedback...",
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (!isMounted) return;
      setCurrentStatus(statuses[index]);
      index = (index + 1) % statuses.length;
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [rotateControls]);

  // ⏳ While verifying access
  if (loadingAccess) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: partyColors.background,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // 🔒 Access denied view
  if (accessDenied) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: partyColors.background,
          p: 2,
        }}
      >
        <Card
          sx={{
            maxWidth: 480,
            width: "100%",
            p: 3,
            borderRadius: 3,
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.15)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 1.5,
              gap: 1,
            }}
          >
            <ReportProblemIcon sx={{ color: partyColors.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Access denied
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {accessMessage}
          </Typography>
        </Card>
      </Box>
    );
  }

  // ✅ Normal dashboard view if access is allowed
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: partyColors.background,
        color: "#111827",
        textAlign: "center",
        p: 2,
      }}
    >
      {/* Title + subtitle in Jubilee colours */}
      <Typography
        variant="h4"
        fontWeight="bold"
        sx={{
          color: partyColors.primary,
          mb: 0.5,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        Jubilee Nominations Dashboard
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mb: 3,
          color: "#4B5563",
        }}
      >
        Central command for party nominations and vetting workflows.
      </Typography>

      {/* Rotating status line */}
      <Typography
        variant="body1"
        sx={{
          mb: 4,
          px: 2,
          maxWidth: 600,
          color: "#374151",
          fontStyle: "italic",
        }}
      >
        {currentStatus}
      </Typography>

      {/* Circular navigation hub */}
      <Box
        sx={{
          position: "relative",
          width: "min(90vw, 420px)",
          height: "min(90vw, 420px)",
        }}
      >
        {/* Outer rotating ring */}
        <motion.div
          animate={rotateControls}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: `3px solid ${partyColors.primary}`,
            boxShadow:
              "0 0 0 4px rgba(192,5,0,0.08), 0 18px 45px rgba(15,23,42,0.18)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.85), rgba(255,245,245,0.95))",
          }}
        >
          {links
            .filter((link) => {
              // If backend didn't send allowedLinks, show all
              if (!allowedLinks) return true;

              const key = linkPermissionKeys[link.label];
              if (!key) return true; // no mapping, show by default

              // If backend explicitly set it, obey it
              if (key in allowedLinks) {
                return !!allowedLinks[key];
              }

              return true;
            })
            .map((link, i, filteredLinks) => {
              const angle = (i / filteredLinks.length) * 2 * Math.PI;
              const radius = 140;
              const x = radius * Math.cos(angle);
              const y = radius * Math.sin(angle);

              return (
                <motion.div
                  key={link.label}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${x}px - 40px)`,
                    top: `calc(50% + ${y}px - 40px)`,
                  }}
                  whileTap={{ scale: 1.12 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Link to={link.path} style={{ textDecoration: "none" }}>
                    <Tooltip title={link.label}>
                      <IconButton
                        aria-label={link.label}
                        sx={{
                          width: 80,
                          height: 80,
                          bgcolor: partyColors.primary,
                          color: partyColors.accent,
                          boxShadow:
                            "0 10px 25px rgba(192,5,0,0.35), 0 0 0 1px rgba(0,0,0,0.03)",
                          "&:hover": {
                            bgcolor: partyColors.secondary,
                            color: "#7C2D12", // darker text on yellow
                          },
                          transition:
                            "background-color 150ms ease, transform 150ms ease, box-shadow 150ms ease",
                        }}
                      >
                        {link.icon}
                      </IconButton>
                    </Tooltip>
                  </Link>
                </motion.div>
              );
            })}
        </motion.div>

        {/* Center "Dashboard" hub */}
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Link to="/nominations/dashboard" style={{ textDecoration: "none" }}>
            <IconButton
              aria-label="Dashboard"
              sx={{
                width: 110,
                height: 110,
                bgcolor: partyColors.secondary,
                color: "#7C2D12",
                boxShadow:
                  "0 16px 40px rgba(15,23,42,0.35), 0 0 0 2px rgba(255,255,255,0.85)",
                "&:hover": {
                  bgcolor: partyColors.primary,
                  color: partyColors.accent,
                },
                transition:
                  "background-color 150ms ease, transform 150ms ease, box-shadow 150ms ease",
              }}
            >
              <DashboardIcon sx={{ fontSize: 50 }} />
            </IconButton>
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default NominationsDashboard;
