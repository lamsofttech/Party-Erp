import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { useUser } from "../contexts/UserContext";

// MUI Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import PaymentsIcon from "@mui/icons-material/Payments";
import SchoolIcon from "@mui/icons-material/School";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import HowToVoteIcon from "@mui/icons-material/HowToVote";

// ---- Theme & Assets ----
const assets = {
  logo: "https://placehold.co/40x40/F5333F/FFFFFF?text=Logo",
};

const theme = {
  primary: "#F5333F",
  primaryDark: "#C4202C",
  secondary: "#FF6B6B",

  sidebarGradTop: "#F5333F",
  sidebarGradMid: "#E62C38",
  sidebarGradBottom: "#B81826",
  sidebarInk: "rgba(255,255,255,0.92)",
  sidebarMuted: "rgba(255,255,255,0.68)",
  sidebarBorder: "rgba(255,255,255,0.12)",
};

interface SidenavProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
}

interface MenuSubItem {
  label: string;
  route: string;
  requiredPermission?: string;
}

interface MenuItem {
  label: string;
  icon: JSX.Element;
  route?: string;
  requiredPermission?: string;
  subItems?: MenuSubItem[];
  section?: string;
}

export default function Sidenav({ isExpanded, toggleSidebar }: SidenavProps) {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, hasPermission, user } = useUser();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  const userRole = (user?.role || "").toUpperCase();

  const isGlobalAdmin =
    userRole === "SUPER_ADMIN" ||
    userRole === "NATIONAL_ADMIN" ||
    userRole === "NATIONAL_OFFICER" ||
    userRole === "SYSTEM_ADMIN";

  const rawMenuItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: <DashboardIcon />,
      route: "/",
      section: "COMMON",
    },
    {
      label: "Party Management",
      icon: <ManageAccountsIcon />,
      requiredPermission: "party_management.view",
      section: "PARTY MENU",
      subItems: [
        {
          label: "Members Registry",
          route: "/members",
          requiredPermission: "party_management.members_registry.view",
        },
        {
          label: "Nominations Process",
          route: "/Nominations",
          requiredPermission: "nominations.dashboard.view",
        },
        {
          label: "Electoral Module",
          route: "/onboarding",
          requiredPermission: "party_management.electoral_module.view",
        },
        {
          label: "Operations Room",
          route: "/party-operations",
          requiredPermission: "party_operations.view",
        },
        {
          label: "Political Map Analysis",
          route: "/GisMapPage",
          requiredPermission: "party_management.political_map.view",
        },
      ],
    },
    {
      label: "Party Secretariat",
      icon: <SelfImprovementIcon />,
      route: "/operations/party-assignments",
      requiredPermission: "party_secretariat.view",
      section: "PARTY MENU",
    },
    {
      label: "Legal Room",
      icon: <SupervisorAccountIcon />,
      route: "/legal",
      requiredPermission: "legal.dashboard.view",
      section: "PARTY MENU",
    },
    {
      label: "Financial Management",
      icon: <PaymentsIcon />,
      route: "/finance",
      requiredPermission: "finance.dashboard.view",
      section: "PARTY MENU",
    },

    {
      label: "National Tallying Center",
      icon: <SchoolIcon />,
      requiredPermission: "national_tallying_center.view",
      section: "TALLYING CENTERS",
      subItems: [
        {
          label: "Elections Dashboard",
          route: "/election",
          requiredPermission: "analytics.dashboard.view",
        },
        {
          label: "Result Forms Boardroom",
          route: "/result-forms-boardroom",
          requiredPermission: "result_forms_boardroom.view",
        },
        {
          label: "National Turnout Monitoring",
          route: "/election/national-turnout",
          requiredPermission: "turnout.view",
        },
      ],
    },

    {
      label: "Constituency Tallying Center",
      icon: <SchoolIcon />,
      requiredPermission: "results34a.view",
      section: "TALLYING CENTERS",
      subItems: [
        {
          label: "Constituency Results Dashboard",
          route: "/president/constituency-results-dashboard",
          requiredPermission: "results34a.view",
        },
        {
          label: "Form 34A Review",
          route: "/president/constituency/results-34a",
          requiredPermission: "results34a.view",
        },
        {
          label: "Turnout Monitoring",
          route: "/president/constituency/turnout",
          requiredPermission: "results34a.view",
        },
      ],
    },

    {
      label: "Voter Register Room",
      icon: <HowToVoteIcon />,
      requiredPermission: "voter_register_room.view",
      section: "VOTER REGISTER ROOM",
      subItems: [
        {
          label: "Register Dashboard",
          route: "/voter-register",
          requiredPermission: "voter_register.dashboard.view",
        },
        {
          label: "Import & Releases",
          route: "/voter-register/import",
          requiredPermission: "voter_register.import.manage",
        },
        {
          label: "Register Search",
          route: "/voter-register/search",
          requiredPermission: "voter_register.search.view",
        },
        {
          label: "Register Compare",
          route: "/voter-register/compare",
          requiredPermission: "voter_register.compare.view",
        },
        {
          label: "Ward/PS Rollups",
          route: "/voter-register/rollups",
          requiredPermission: "voter_register.rollups.view",
        },
        {
          label: "Duplicates & Cleanup",
          route: "/voter-register/cleanup",
          requiredPermission: "voter_register.cleanup.manage",
        },
        {
          label: "Geo Mapping",
          route: "/voter-register/geo-mapping",
          requiredPermission: "voter_register.geo.manage",
        },
        {
          label: "Export Center",
          route: "/voter-register/exports",
          requiredPermission: "voter_register.export.manage",
        },
        {
          label: "AI Insights (Beta)",
          route: "/voter-register/ai-insights",
          requiredPermission: "voter_register.ai.view",
        },
      ],
    },

    {
      label: "System Administration",
      icon: <AdminPanelSettingsIcon />,
      section: "ADMINISTRATION",
      subItems: [
        {
          label: "User Roles Management",
          route: "/admin/user-roles",
          requiredPermission: "admin.user_roles.manage",
        },
        {
          label: "System Settings",
          route: "/admin/settings",
          requiredPermission: "admin.settings.manage",
        },
        {
          label: "Audit Logs",
          route: "/admin/audit-logs",
          requiredPermission: "admin.audit_logs.view",
        },
      ],
    },
    {
      label: "Reporting & Analytics",
      icon: <ChecklistIcon />,
      route: "/reports",
      requiredPermission: "reports.view",
      section: "ADMINISTRATION",
    },
  ];

  const menuItems: MenuItem[] = useMemo(() => {
    const safeHasPermission = (perm?: string) => {
      if (!perm) return true;
      if (isGlobalAdmin) return true;
      if (!hasPermission) return false;
      return hasPermission(perm);
    };

    return rawMenuItems
      .map((item) => {
        if (item.label === "Constituency Tallying Center") {
          if (userRole !== "CONSTITUENCY_OFFICER" && !isGlobalAdmin) return null;
        }

        if (item.subItems && item.subItems.length > 0) {
          const allowedSubItems = item.subItems.filter((sub) => {
            if (!sub.requiredPermission) return true;
            return safeHasPermission(sub.requiredPermission);
          });

          if (allowedSubItems.length === 0) return null;
          if (item.requiredPermission && !safeHasPermission(item.requiredPermission)) return null;

          return { ...item, subItems: allowedSubItems };
        }

        if (item.requiredPermission && !safeHasPermission(item.requiredPermission)) return null;
        return item;
      })
      .filter((x): x is MenuItem => x !== null);
  }, [hasPermission, userRole, user, isGlobalAdmin]);

  const filteredMenu: MenuItem[] = useMemo(() => {
    if (!search.trim()) return menuItems;
    const q = search.toLowerCase();
    const matches = (txt: string) => txt.toLowerCase().includes(q);

    return menuItems
      .map((item) => {
        if (item.subItems && item.subItems.length) {
          const subItems = item.subItems.filter((s) => matches(s.label));
          if (matches(item.label) || subItems.length) return { ...item, subItems };
          return null;
        }
        return matches(item.label) ? item : null;
      })
      .filter((x): x is MenuItem => x !== null);
  }, [menuItems, search]);

  const groupedMenu = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredMenu.forEach((item) => {
      const key = item.section ?? "MAIN";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredMenu]);

  // ✅ Close drawer on route change (mobile overlay style)
  useEffect(() => {
    setActiveSubMenu(null);
    if (isExpanded) toggleSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ✅ Lock body scroll + ESC + focus trap
  useEffect(() => {
    if (!isExpanded) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleSidebar();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isExpanded, toggleSidebar]);

  const handleSubMenuToggle = (label: string) => {
    setActiveSubMenu((prev) => (prev === label ? null : label));
  };

  // ✅ This is the KEY: always slide drawer from left, NEVER push content
  const sidebarVariants: Variants = {
    open: { x: 0 },
    closed: { x: "-100%" },
  };

  const submenuWrapperVariants: Variants = {
    hidden: { opacity: 0, scaleY: 0 },
    visible: {
      opacity: 1,
      scaleY: 1,
      transition: {
        type: prefersReduced ? "tween" : "spring",
        stiffness: 100,
        damping: 16,
        duration: prefersReduced ? 0 : undefined,
        staggerChildren: prefersReduced ? 0 : 0.05,
      },
    },
    exit: {
      opacity: 0,
      scaleY: 0,
      transition: { duration: prefersReduced ? 0 : 0.18 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  };

  const subItemVariants: Variants = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <>
      {/* ✅ Backdrop overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* ✅ Drawer panel (overlay fixed, never pushes main page) */}
      <motion.aside
        role="dialog"
        aria-modal={isExpanded ? "true" : "false"}
        aria-label="Main navigation"
        initial={false}
        ref={containerRef}
        animate={isExpanded ? "open" : "closed"}
        variants={sidebarVariants}
        transition={{
          type: prefersReduced ? "tween" : "spring",
          stiffness: 90,
          damping: 14,
          duration: prefersReduced ? 0 : undefined,
        }}
        className={[
          "fixed top-0 left-0 z-50 h-[100dvh] w-[82vw] max-w-[320px] md:w-72",
          "flex flex-col text-white overflow-hidden",
          "shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
          "will-change-transform",
        ].join(" ")}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: `linear-gradient(180deg, ${theme.sidebarGradTop} 0%, ${theme.sidebarGradMid} 45%, ${theme.sidebarGradBottom} 100%)`,
        }}
      >
        {/* Header */}
        <div
          className="relative px-6 h-20 flex items-center gap-3 border-b"
          style={{ borderColor: theme.sidebarBorder }}
        >
          <Link
            to="/"
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-white/70 rounded-md"
          >
            <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/15 grid place-items-center shadow-[0_10px_25px_rgba(0,0,0,0.20)]">
              <img src={assets.logo} className="h-8 w-8 rounded-lg" alt="Logo" />
            </div>

            <div className="leading-tight">
              <div className="text-[13px] font-semibold" style={{ color: theme.sidebarInk }}>
                GEN Z POLITICAL PARTY
              </div>
              <div className="text-[11px] tracking-wide" style={{ color: theme.sidebarMuted }}>
                ERP Suite • Admin
              </div>
            </div>
          </Link>

          <button
            ref={closeBtnRef}
            onClick={toggleSidebar}
            className="ml-auto p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            <CloseRoundedIcon fontSize="small" />
          </button>
        </div>

        {/* Search */}
        <div className="relative px-6 pt-4">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className={[
                "w-full pl-10 pr-3 py-2.5 text-xs rounded-full",
                "bg-white/10 border border-white/15 placeholder:text-white/60 text-white",
                "focus:outline-none focus:ring-2 focus:ring-white/60",
                "shadow-[0_12px_30px_rgba(0,0,0,0.18)]",
              ].join(" ")}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Nav items */}
        <nav className="relative flex flex-col flex-grow mt-3 overflow-y-auto pb-4" aria-label="Primary">
          {Object.entries(groupedMenu).map(([section, items]) => (
            <div key={section} className="mt-6 first:mt-3">
              <p className="px-6 text-[11px] font-semibold tracking-[0.25em] text-white/65 mb-2">
                {section.toUpperCase()}
              </p>

              <ul className="space-y-1 px-3">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: { staggerChildren: prefersReduced ? 0 : 0.04 },
                    },
                  }}
                >
                  {items.map((item) => (
                    <motion.li key={item.label} variants={itemVariants}>
                      {item.subItems ? (
                        <>
                          <button
                            onClick={() => handleSubMenuToggle(item.label)}
                            aria-expanded={activeSubMenu === item.label}
                            className={[
                              "flex items-center justify-between w-full gap-3 px-3 py-2.5 text-xs",
                              "rounded-xl transition-colors",
                              "text-white/85 hover:bg-white/10",
                            ].join(" ")}
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-lg opacity-95">{item.icon}</span>
                              {item.label}
                            </span>
                            <motion.span
                              initial={false}
                              animate={{ rotate: activeSubMenu === item.label ? 90 : 0 }}
                              transition={{ duration: prefersReduced ? 0 : 0.18 }}
                            >
                              <KeyboardArrowRightIcon fontSize="small" />
                            </motion.span>
                          </button>

                          <AnimatePresence initial={false}>
                            {activeSubMenu === item.label && (
                              <motion.ul
                                variants={submenuWrapperVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="ml-8 mt-1 flex flex-col gap-1"
                                style={{ originY: 0, overflow: "hidden" }}
                              >
                                {item.subItems.map((sub) => (
                                  <motion.li key={sub.route} variants={subItemVariants}>
                                    <NavLink
                                      to={sub.route}
                                      className={({ isActive }) =>
                                        [
                                          "block px-3 py-2 rounded-xl text-[11px] transition-colors",
                                          isActive
                                            ? "bg-white/18 text-white font-semibold shadow-[0_10px_25px_rgba(0,0,0,0.18)]"
                                            : "text-white/70 hover:bg-white/10 hover:text-white",
                                        ].join(" ")
                                      }
                                    >
                                      {sub.label}
                                    </NavLink>
                                  </motion.li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <NavLink
                          to={item.route!}
                          className={({ isActive }) =>
                            [
                              "flex items-center gap-3 px-3 py-2.5 text-xs rounded-xl transition-all",
                              isActive
                                ? "bg-white/18 text-white font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
                                : "text-white/85 hover:bg-white/10 hover:text-white",
                            ].join(" ")
                          }
                        >
                          <span className="text-lg opacity-95">{item.icon}</span>
                          <span className="flex-grow">{item.label}</span>
                        </NavLink>
                      )}
                    </motion.li>
                  ))}
                </motion.div>
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer actions */}
        <div
          className="relative p-4 border-t mt-auto flex flex-col gap-1 text-xs"
          style={{ borderColor: theme.sidebarBorder }}
        >
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-colors",
                isActive ? "bg-white/18 text-white" : "text-white/85 hover:bg-white/10 hover:text-white",
              ].join(" ")
            }
          >
            <AccountCircleIcon fontSize="small" />
            <span className="flex-grow">My Profile</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-colors",
                isActive ? "bg-white/18 text-white" : "text-white/85 hover:bg-white/10 hover:text-white",
              ].join(" ")
            }
          >
            <SettingsIcon fontSize="small" />
            <span className="flex-grow">Settings</span>
          </NavLink>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-50 font-medium w-full transition-colors hover:bg-black/15 hover:text-white"
          >
            <LogoutIcon fontSize="small" />
            <span className="flex-grow">Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
