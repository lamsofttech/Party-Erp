// src/pages/ModulesDashboard.tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ModuleCard from "../components/ModuleCard";

// ✅ Add this type import
import type { SvgIconComponent } from "@mui/icons-material";

// Material-UI Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import GavelIcon from "@mui/icons-material/Gavel";
import PaymentsIcon from "@mui/icons-material/Payments";
import SchoolIcon from "@mui/icons-material/School";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import BarChartIcon from "@mui/icons-material/BarChart";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SearchIcon from "@mui/icons-material/Search";

interface Module {
  label: string;
  description: string;
  icon: SvgIconComponent; // ✅ store component type (NOT ReactNode)
  route: string;
  color?: string;
  category?: string;
}

const allModules: Module[] = [
  {
    label: "Dashboard",
    description: "Access core operational insights.",
    icon: DashboardIcon,
    route: "/",
    color: "#1A5F56",
    category: "Core",
  },
  {
    label: "Party Management",
    description: "Overview of all party-related operations.",
    icon: ManageAccountsIcon,
    route: "/party-management-dashboard",
    color: "#3498DB",
    category: "Party Operations",
  },
  {
    label: "Members Registry",
    description: "Manage and register all party members.",
    icon: PersonAddIcon,
    route: "/members",
    color: "#4A90E2",
    category: "Party Operations",
  },
  {
    label: "Nominations Process",
    description: "Handle candidate nominations and approvals.",
    icon: HowToVoteIcon,
    route: "/nominations",
    color: "#5CADE2",
    category: "Party Operations",
  },
  {
    label: "Electoral Module",
    description: "Manage and analyze electoral data.",
    icon: BarChartIcon,
    route: "/electoral-module",
    color: "#6CB3D8",
    category: "Party Operations",
  },
  {
    label: "Operations Room",
    description: "Coordinate and monitor field operations.",
    icon: WorkspacesIcon,
    route: "/party-operations-room",
    color: "#7DD9E2",
    category: "Party Operations",
  },
  {
    label: "Political Map Analysis",
    description: "Analyze political landscapes and demographics.",
    icon: BarChartIcon,
    route: "/political-map-analysis",
    color: "#8FE0F2",
    category: "Party Operations",
  },
  {
    label: "Human Resources",
    description: "Oversee staff, payroll, and development.",
    icon: SelfImprovementIcon,
    route: "/hr",
    color: "#2ECC71",
    category: "Administration",
  },
  {
    label: "Legal Room",
    description: "Handle legal cases and compliance.",
    icon: GavelIcon,
    route: "/crm",
    color: "#E74C3C",
    category: "Administration",
  },
  {
    label: "Financial Management",
    description: "Track income, expenses, and budgeting.",
    icon: PaymentsIcon,
    route: "/finance/dashboard",
    color: "#F39C12",
    category: "Administration",
  },
  {
    label: "National Tallying Center",
    description: "Monitor and manage national election results.",
    icon: SchoolIcon,
    route: "/election/national",
    color: "#9B59B6",
    category: "Election Operations",
  },
  {
    label: "System Administration",
    description: "Configure system settings and user access.",
    icon: AdminPanelSettingsIcon,
    route: "/admin-dashboard",
    color: "#1ABC9C",
    category: "System",
  },
  {
    label: "User Roles Management",
    description: "Manage permissions and user access levels.",
    icon: SettingsIcon,
    route: "/admin/user-roles",
    color: "#16A085",
    category: "System",
  },
  {
    label: "System Settings",
    description: "Configure global system parameters.",
    icon: SettingsIcon,
    route: "/admin/settings",
    color: "#138D75",
    category: "System",
  },
  {
    label: "Audit Logs",
    description: "Review system activity and security logs.",
    icon: AssignmentTurnedInIcon,
    route: "/admin/audit-logs",
    color: "#117A65",
    category: "System",
  },
  {
    label: "Reporting & Analytics",
    description: "Generate comprehensive reports and insights.",
    icon: ChecklistIcon,
    route: "/reports",
    color: "#D35400",
    category: "Reporting",
  },
  {
    label: "My Profile",
    description: "Manage your personal account details.",
    icon: AccountCircleIcon,
    route: "/profile",
    color: "#7F8C8D",
    category: "Personal",
  },
  {
    label: "User Settings",
    description: "Adjust your personal application settings.",
    icon: SettingsIcon,
    route: "/settings",
    color: "#95A5A6",
    category: "Personal",
  },
];

const CATEGORY_ORDER = [
  "Core",
  "Party Operations",
  "Administration",
  "Election Operations",
  "System",
  "Reporting",
  "Personal",
  "Other",
] as const;

export default function ModulesDashboard() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allModules;
    return allModules.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const groupedModules = useMemo(() => {
    return filteredModules.reduce((acc, module) => {
      const category = module.category || "Other";
      (acc[category] ||= []).push(module);
      return acc;
    }, {} as Record<string, Module[]>);
  }, [filteredModules]);

  const sortedCategories = useMemo(() => {
    const cats = Object.keys(groupedModules);
    return cats.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number]);
      const bi = CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number]);

      // unknown categories go last, sorted alphabetically
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [groupedModules]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  return (
    <motion.div
      className="p-8 h-full overflow-y-auto bg-gray-50 text-gray-800"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6">
        Applications Hub
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Access and manage all modules of the GEN Z POLITICAL PARTY ERP Suite.
      </p>

      {/* Search Bar */}
      <div className="relative mb-8 max-w-lg">
        <input
          type="text"
          placeholder="Search for an application..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A5F56] focus:border-transparent text-base shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6" />
      </div>

      {sortedCategories.length > 0 ? (
        sortedCategories.map((category) => (
          <div key={category} className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-gray-200 pb-2 flex items-center">
              {category}
            </h2>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {groupedModules[category]?.map((module) => (
                <ModuleCard
                  key={module.label}
                  title={module.label}
                  description={module.description}
                  icon={module.icon} // ✅ PASS COMPONENT TYPE (SvgIconComponent)
                  route={module.route}
                  color={module.color}
                />
              ))}

            </motion.div>
          </div>
        ))
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-500 py-12 text-lg"
        >
          No applications found matching your search.
        </motion.p>
      )}
    </motion.div>
  );
}
