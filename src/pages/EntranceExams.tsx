import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import CountUp from "react-countup";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SchoolIcon from "@mui/icons-material/School";
import ReceiptIcon from "@mui/icons-material/Receipt";
import EventIcon from "@mui/icons-material/Event";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SettingsIcon from "@mui/icons-material/Settings";
import { FaMedal } from "react-icons/fa";
import axios from "axios";
import Alert, { AlertColor } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

// Define section interface
interface Section {
    title: string;
    path: string;
    icon: JSX.Element;
    statKey: Exclude<keyof Stats, 'top_gmat_students' | 'top_gre_students'>;
    color: string;
}

// Mock data
interface Stats {
    total_applicants: number;
    total_phases: number;
    total_active_mocks: number;
    total_exam_bookings: number;
    total_approved_exams: number;
    total_pending_results: number;
    total_approved_scores: number;
    total_resources: number;
    top_gmat_students: LeaderboardEntry[];
    top_gre_students: LeaderboardEntry[];
}

interface LeaderboardEntry {
    full_name: string;
    test_type: string;
    score: number;
}

// Section definitions with unique colors
const Sections: Section[] = [
    { title: "Applications", path: "/entrance-exams/applications", icon: <PersonAddIcon />, statKey: "total_applicants", color: "#4CAF50" },
    { title: "Trainings", path: "/entrance-exams/trainings", icon: <SchoolIcon />, statKey: "total_phases", color: "#2196F3" },
    { title: "Mocks", path: "/entrance-exams/mocks", icon: <ReceiptIcon />, statKey: "total_active_mocks", color: "#FF9800" },
    { title: "Exam Bookings", path: "/entrance-exams/bookings", icon: <EventIcon />, statKey: "total_exam_bookings", color: "#9C27B0" },
    { title: "Booked Exams", path: "/entrance-exams/booked-exams", icon: <CalendarTodayIcon />, statKey: "total_approved_exams", color: "#F44336" },
    { title: "Approve Results", path: "/entrance-exams/results", icon: <CheckCircleIcon />, statKey: "total_pending_results", color: "#00BCD4" },
    { title: "Approved Scores", path: "/entrance-exams/scores", icon: <VisibilityIcon />, statKey: "total_approved_scores", color: "#673AB7" },
    { title: "Training Resources", path: "/entrance-exams/resources", icon: <SettingsIcon />, statKey: "total_resources", color: "#E91E63" },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const tileVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Medal Colors
const medalColors: Record<number, string> = {
    1: "from-yellow-400 to-yellow-600",
    2: "from-gray-400 to-gray-600",
    3: "from-orange-400 to-orange-600",
};

// Variants for animations
const listVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const EntranceExamsDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats>({
        total_applicants: 0,
        total_phases: 0,
        total_active_mocks: 0,
        total_exam_bookings: 0,
        total_approved_exams: 0,
        total_pending_results: 0,
        total_approved_scores: 0,
        total_resources: 0,
        top_gmat_students: [],
        top_gre_students: [],
    });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: AlertColor }>({
        open: false,
        message: "",
        severity: "info",
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get("https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/stats.php"); // Replace with your actual API URL
                if (response.data.success) {
                    setStats(response.data.stats);
                    // setSnackbar({
                    //     open: true,
                    //     message: "Statistics retrieved successfully",
                    //     severity: "success",
                    // });
                } else {
                    setSnackbar({
                        open: true,
                        message: response.data.message || "Failed to load statistics",
                        severity: "error",
                    });
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
                setSnackbar({
                    open: true,
                    message: "Error loading statistics",
                    severity: "error",
                });
            }
        };

        fetchStats();
    }, []);

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <div className="min-h-screen p-8 relative overflow-hidden">
            {/* Subtle Background Watermark */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                }}
            />

            <div className="font-bold text-[24px] text-[#2164A6] dark:text-white mb-4">
                <p>Entrance Exams Dashboard</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                {/* Section Tiles */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-1"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {Sections.map((section) => (
                        <motion.div key={section.title} variants={tileVariants}>
                            <Link to={section.path}>
                                <div className="bg-white shadow-lg rounded-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 h-[210px]">
                                    <div className="h-2" style={{ backgroundColor: section.color }} />
                                    <div className="p-6 flex flex-col items-center text-center">
                                        <div className="text-5xl mb-4" style={{ color: section.color }}>
                                            {section.icon}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
                                        <p className="text-3xl font-bold mt-2" style={{ color: section.color }}>
                                            <CountUp end={stats[section.statKey]} duration={2} />
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
                <motion.div
                    className="bg-white shadow-xl rounded-xl w-full max-w-md mx-auto overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="h-2" style={{ backgroundColor: "black" }} />
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">🏆 Leaderboard</h2>
                        <div className="font-bold text-[20px] text-[#2164A6] dark:text-white mb-4">
                            <p>GMAT</p>
                        </div>
                        {stats.top_gmat_students.length === 0 ? (
                            <p className="text-center text-gray-600 italic">No GMAT scores available!</p>
                        ) : (
                            <motion.ul
                                className="space-y-4"
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
                            >
                                {stats.top_gmat_students.map((student, index) => (
                                    <motion.li
                                        key={student.full_name}
                                        className={`flex items-center justify-between p-4 rounded-lg shadow-md ${index < 3 ? `bg-gradient-to-r ${medalColors[index + 1]}` : "bg-gray-100"}`}
                                        variants={listVariants}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                className="w-10 h-10 flex items-center justify-center text-white text-lg font-bold rounded-full"
                                                style={{
                                                    backgroundColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#A0AEC0",
                                                }}
                                                whileHover={{ rotate: [0, 10, -10, 0], transition: { duration: 0.4 } }}
                                            >
                                                <FaMedal />
                                            </motion.div>
                                            <p className={`text-lg font-semibold ${index < 3 ? "text-white" : "text-gray-800"}`}>{student.full_name}</p>
                                        </div>
                                        <motion.p
                                            className={`text-xl font-bold ${index < 3 ? "text-white" : "text-gray-800"}`}
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                        >
                                            {student.score}
                                        </motion.p>
                                    </motion.li>
                                ))}
                            </motion.ul>
                        )}
                        <div className="font-bold text-[20px] text-[#2164A6] dark:text-white mb-4 mt-4">
                            <p>GRE</p>
                        </div>
                        {stats.top_gre_students.length === 0 ? (
                            <p className="text-center text-gray-600 italic">No GRE scores available!</p>
                        ) : (
                            <motion.ul
                                className="space-y-4"
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
                            >
                                {stats.top_gre_students.map((student, index) => (
                                    <motion.li
                                        key={student.full_name}
                                        className={`flex items-center justify-between p-4 rounded-lg shadow-md ${index < 3 ? `bg-gradient-to-r ${medalColors[index + 1]}` : "bg-gray-100"}`}
                                        variants={listVariants}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                className="w-10 h-10 flex items-center justify-center text-white text-lg font-bold rounded-full"
                                                style={{
                                                    backgroundColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#A0AEC0",
                                                }}
                                                whileHover={{ rotate: [0, 10, -10, 0], transition: { duration: 0.4 } }}
                                            >
                                                <FaMedal />
                                            </motion.div>
                                            <p className={`text-lg font-semibold ${index < 3 ? "text-white" : "text-gray-800"}`}>{student.full_name}</p>
                                        </div>
                                        <motion.p
                                            className={`text-xl font-bold ${index < 3 ? "text-white" : "text-gray-800"}`}
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                        >
                                            {student.score}
                                        </motion.p>
                                    </motion.li>
                                ))}
                            </motion.ul>
                        )}
                    </div>
                </motion.div>
            </div>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default EntranceExamsDashboard;