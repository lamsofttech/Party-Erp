import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Alert, Snackbar } from "@mui/material";
import type { AlertColor } from "@mui/material";
import DocumentScanner from "@mui/icons-material/DocumentScanner";
import {
  UserPlus,
  GraduationCap,
  FileText,
  CalendarCheck2,
  XCircle,
  ClipboardList,
  Award,
  ClipboardCheck,
  BookOpen,
  ArrowUpRight,
  Clock,
  Users,
} from "lucide-react";
const BRAND_RED = "#F5333F";
void BRAND_RED;


interface LeaderboardEntry {
  full_name: string;
  test_type: string;
  score: number;
}

interface Stats {
  total_applicants: number;
  total_phases: number;
  total_active_mocks: number;
  total_exam_bookings: number;
  total_approved_exams: number;
  total_pending_results: number;
  total_approved_scores: number;
  total_resources: number;
  voter_turnout: number;
  documents_scanned: number;
  total_team_members: number;
  top_gmat_students: LeaderboardEntry[];
  top_gre_students: LeaderboardEntry[];
}

interface Section {
  title: string;
  path: string;
  icon: JSX.Element;
  statKey: keyof Stats;
  colorClass: string;
  description: string;
  requiredPermission: string; // 🔑 permission name from DB/JWT
}

// 👇 One permission per card. Match these names with your DB `permissions.permission_name`
const Sections: Section[] = [
  {
    title: "Presidential Candidates",
    path: "/onboarding/president-candidates",
    icon: <UserPlus size={24} />,
    statKey: "total_applicants",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Total presidential applicants.",
    requiredPermission: "dashboard.president",
  },
  {
    title: "Gubernatorial Candidates",
    path: "/onboarding/Governor-candidates",
    icon: <GraduationCap size={24} />,
    statKey: "total_phases",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Active governor applications.",
    requiredPermission: "dashboard.governor",
  },
  {
    title: "Senatorial Candidates",
    path: "/onboarding/senators-candidates",
    icon: <FileText size={24} />,
    statKey: "total_active_mocks",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Senate candidates in review.",
    requiredPermission: "dashboard.senator",
  },
  {
    title: "Women Rep Candidates",
    path: "/onboarding/women-candidates",
    icon: <CalendarCheck2 size={24} />,
    statKey: "total_approved_exams",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Approved Women Rep candidates.",
    requiredPermission: "dashboard.women_rep",
  },
  {
    title: "Member Parliament",
    path: "/onboarding/parliament-candidates",
    icon: <GraduationCap size={24} />,
    statKey: "total_phases",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Active MP candidatures.",
    requiredPermission: "dashboard.mp",
  },
  {
    title: "MCA Candidates",
    path: "/onboarding/mca-candidates",
    icon: <XCircle size={24} />,
    statKey: "total_approved_exams",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Cleared MCA candidates.",
    requiredPermission: "dashboard.mca",
  },
  {
    title: "Application Status",
    path: "/onboarding/application-status",
    icon: <ClipboardList size={24} />,
    statKey: "total_pending_results",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Applications pending action.",
    requiredPermission: "dashboard.application_status",
  },
  {
    title: "Training Modules",
    path: "/onboarding/training-modules",
    icon: <Award size={24} />,
    statKey: "total_approved_scores",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Completed training modules.",
    requiredPermission: "dashboard.training",
  },
  {
    title: "Resources & Guidelines",
    path: "/onboarding/resources-guidelines",
    icon: <BookOpen size={24} />,
    statKey: "total_resources",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Available onboarding resources.",
    requiredPermission: "dashboard.resources",
  },
  {
    title: "Voter Turnout Module",
    path: "/onboarding/voter_turnout",
    icon: <ClipboardCheck size={24} />,
    statKey: "voter_turnout",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Current voter turnout rate.",
    requiredPermission: "dashboard.turnout_agent", // agents only
  },
  {
    title: "AI Scanner",
    path: "/ai-scanner",
    icon: <DocumentScanner sx={{ fontSize: 24 }} />,
    statKey: "documents_scanned",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Documents screened by AI.",
    requiredPermission: "dashboard.ai_scanner", // agents only
  },
  {
    title: "Our Team",
    path: "/onboarding/team",
    icon: <Users size={24} />,
    statKey: "total_team_members",
    colorClass: "from-[#F5333F] to-[#F5333F]",
    description: "Core onboarding team.",
    requiredPermission: "dashboard.team",
  },
];

// 🔐 Helper: read role + permissions from localStorage (very defensive)
const getAuthInfo = (): { role: string | null; permissions: string[] } => {
  let role: string | null = null;
  let permissions: string[] = [];

  try {
    // Option 1: everything stored in "user"
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.role) {
        role = String(user.role);
      }
      if (Array.isArray(user?.permissions)) {
        permissions = user.permissions.map((p: unknown) => String(p));
      }
    }
  } catch {
    // ignore
  }

  // Option 2: separate keys
  try {
    const roleRaw = localStorage.getItem("role");
    if (!role && roleRaw) {
      role = roleRaw;
    }

    const permsRaw = localStorage.getItem("permissions");
    if (permsRaw && permissions.length === 0) {
      const parsed = JSON.parse(permsRaw);
      if (Array.isArray(parsed)) {
        permissions = parsed.map((p: unknown) => String(p));
      } else if (Array.isArray(parsed?.permissions)) {
        permissions = parsed.permissions.map((p: unknown) => String(p));
      }
    }
  } catch {
    // ignore
  }

  return { role, permissions };
};

const ElectionDashboard: React.FC = () => {
  const [stats] = useState<Stats>({
    total_applicants: 1240,
    total_phases: 58,
    total_active_mocks: 32,
    total_exam_bookings: 490,
    total_approved_exams: 345,
    total_pending_results: 67,
    total_approved_scores: 190,
    total_resources: 24,
    voter_turnout: 68,
    documents_scanned: 1542,
    total_team_members: 12,
    top_gmat_students: [],
    top_gre_students: [],
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const TOTAL_TIME = 72 * 60 * 60;
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_TIME);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCloseSnackbar = () => {
    setSnackbar((s) => ({ ...s, open: false }));
  };

  // 🔐 Determine current user's role & permissions
  const { role, permissions } = getAuthInfo();
  const normalizedRole = (role || "").toUpperCase();
  const userPermissions = permissions.map((p) => p.toLowerCase());
  const permSet = new Set(userPermissions);

  let visibleSections: Section[];

  if (normalizedRole === "SUPER_ADMIN") {
    // 🔓 Super admin sees everything regardless of permissions
    visibleSections = Sections;
  } else {
    // Everyone else filtered strictly by permission
    visibleSections = Sections.filter((section) =>
      permSet.has(section.requiredPermission.toLowerCase())
    );
  }

  if (visibleSections.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Access denied</h1>
        <p className="text-gray-700">
          You do not have permission to view the Candidate Onboarding Dashboard
          modules.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-10 relative">
      {/* Top bar in brand red */}
      <motion.div
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: "100% 50%" }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="w-full h-1 rounded-full bg-gradient-to-r from-[#F5333F] to-[#F5333F] mb-4"
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="text-[#F5333F] animate-pulse" size={24} />
          <span className="text-lg font-semibold text-[#F5333F]">
            Onboarding deadline:
          </span>
          <span className="text-lg font-mono font-bold text-gray-800 dark:text-white">
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="w-1/3 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#F5333F] to-[#F5333F] h-full rounded-full transition-all"
            style={{
              width: `${((TOTAL_TIME - timeLeft) / TOTAL_TIME) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5333F] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F5333F]"></span>
          </span>
          <span className="text-[#F5333F] font-semibold uppercase tracking-wide">
            Live
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-800 dark:text-white tracking-tight">
          Candidate Onboarding Dashboard
        </h1>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl">
        Monitor candidate onboarding, clearance, and compliance across all
        positions in real time.
      </p>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
        }}
      >
        {visibleSections.map((section) => (
          <motion.div
            key={section.title}
            whileHover={{ scale: 1.03, rotate: -1 }}
            whileTap={{ scale: 0.98 }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Link to={section.path} className="block h-full group">
              <div
                className={`rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 h-full relative bg-gradient-to-br ${section.colorClass} text-white`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 20,
                      ease: "linear",
                    }}
                    className="p-3 rounded-xl bg-white/20 flex items-center justify-center"
                  >
                    {section.icon}
                  </motion.div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                </div>

                <p className="text-sm text-white/80 mb-4">
                  {section.description}
                </p>

                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [0.95, 1, 0.95] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                  }}
                  className="text-4xl font-extrabold"
                >
                  <CountUp
                    end={stats[section.statKey] as number}
                    duration={2}
                    separator=","
                  />
                  {section.statKey === "voter_turnout" && (
                    <span className="ml-1">%</span>
                  )}
                </motion.div>

                <ArrowUpRight
                  size={18}
                  className="absolute bottom-3 right-3 text-white opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ElectionDashboard;
