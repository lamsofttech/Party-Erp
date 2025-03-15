import React from "react";
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

// Define section interface
interface Section {
    title: string;
    path: string;
    icon: JSX.Element;
    statKey: keyof typeof mockStats;
    color: string;
}

// Mock data
const mockStats = {
    gmatApplications: 5,
    viewTrainings: 10,
    gmatMocks: 3,
    gmatExamsBooking: 7,
    bookedGmatExams: 4,
    approveGmatResults: 2,
    viewGmatScores: 8,
    trainingResources: 12,
    totalBookings: 10,
};

// Section definitions with unique colors
const Sections: Section[] = [
    { title: "Applications", path: "/entrance-exams/applications", icon: <PersonAddIcon />, statKey: "gmatApplications", color: "#4CAF50" },
    { title: "View Trainings", path: "/entrance-exams/trainings", icon: <SchoolIcon />, statKey: "viewTrainings", color: "#2196F3" },
    { title: "Mocks", path: "/entrance-exams/mocks", icon: <ReceiptIcon />, statKey: "gmatMocks", color: "#FF9800" },
    { title: "Exams Booking", path: "/entrance-exams/bookings", icon: <EventIcon />, statKey: "gmatExamsBooking", color: "#9C27B0" },
    { title: "Booked Exams", path: "/entrance-exams/booked-exams", icon: <CalendarTodayIcon />, statKey: "bookedGmatExams", color: "#F44336" },
    { title: "Approve Results", path: "/entrance-exams/results", icon: <CheckCircleIcon />, statKey: "approveGmatResults", color: "#00BCD4" },
    { title: "View Scores", path: "/entrance-exams/scores", icon: <VisibilityIcon />, statKey: "viewGmatScores", color: "#673AB7" },
    { title: "Training Resources", path: "/entrance-exams/resources", icon: <SettingsIcon />, statKey: "trainingResources", color: "#E91E63" },
];

// const greSections: Section[] = [
//     { title: "Applications", path: "/entrance-exams/gre-applications", icon: <PersonAddIcon />, statKey: "gmatApplications", color: "#4CAF50" },
//     { title: "View Trainings", path: "/entrance-exams/gre-trainings", icon: <SchoolIcon />, statKey: "viewTrainings", color: "#2196F3" },
//     { title: "Mocks", path: "/entrance-exams/gre-mocks", icon: <ReceiptIcon />, statKey: "gmatMocks", color: "#FF9800" },
//     { title: "Exams Booking", path: "/entrance-exams/gre-bookings", icon: <EventIcon />, statKey: "gmatExamsBooking", color: "#9C27B0" },
//     { title: "Booked Exams", path: "/entrance-exams/gre-booked-exams", icon: <CalendarTodayIcon />, statKey: "bookedGmatExams", color: "#F44336" },
//     { title: "Approve Results", path: "/entrance-exams/gre-results", icon: <CheckCircleIcon />, statKey: "approveGmatResults", color: "#00BCD4" },
//     { title: "View Scores", path: "/entrance-exams/gre-scores", icon: <VisibilityIcon />, statKey: "viewGmatScores", color: "#673AB7" },
//     { title: "Training Resources", path: "/entrance-exams/gre-resources", icon: <SettingsIcon />, statKey: "trainingResources", color: "#E91E63" },
// ];

// Animation variants for tiles
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

// Mock leaderboard data
const gmatLeaderboard = [
    { name: "John Doe", score: 770, rank: 1 },
    { name: "Alice Smith", score: 720, rank: 2 },
    { name: "David Johnson", score: 710, rank: 3 },
];

const greLeaderboard = [
    { name: "Johnie Doey", score: 770, rank: 1 },
    { name: "Ann Mary", score: 720, rank: 2 },
    { name: "Dawin Jerry", score: 710, rank: 3 },
];

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

    return (
        <div className="min-h-screen bg-white p-8 relative overflow-hidden">
            {/* Subtle Background Watermark */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                }}
            />

            <div className="font-bold text-[24px] text-[#2164A6] dark:text-white mb-4 text-center">
                <p>Entrance Exams Dashboard</p>
            </div>

            {/* <div className="font-bold text-[24px] text-[#2164A6] dark:text-white mb-4">
                <p>GMAT</p>
            </div> */}
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
                                            <CountUp end={mockStats[section.statKey]} duration={2} />
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
                        <motion.ul
                            className="space-y-4"
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
                        >
                            {gmatLeaderboard.map(({ name, score, rank }) => (
                                <motion.li
                                    key={name}
                                    className={`flex items-center justify-between p-4 rounded-lg shadow-md ${rank <= 3 ? `bg-gradient-to-r ${medalColors[rank]}` : "bg-gray-100"
                                        }`}
                                    variants={listVariants}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            className="w-10 h-10 flex items-center justify-center text-white text-lg font-bold rounded-full"
                                            style={{
                                                backgroundColor: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#A0AEC0",
                                            }}
                                            whileHover={{ rotate: [0, 10, -10, 0], transition: { duration: 0.4 } }}
                                        >
                                            <FaMedal />
                                        </motion.div>
                                        <p className={`text-lg font-semibold ${rank <= 3 ? "text-white" : "text-gray-800"}`}>{name}</p>
                                    </div>
                                    <motion.p
                                        className={`text-xl font-bold ${rank <= 3 ? "text-white" : "text-gray-800"}`}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                    >
                                        {score}
                                    </motion.p>
                                </motion.li>
                            ))}
                        </motion.ul>
                        <div className="font-bold text-[20px] text-[#2164A6] dark:text-white mb-4 mt-4">
                            <p>GRE</p>
                        </div>
                        <motion.ul
                            className="space-y-4"
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
                        >
                            {greLeaderboard.map(({ name, score, rank }) => (
                                <motion.li
                                    key={name}
                                    className={`flex items-center justify-between p-4 rounded-lg shadow-md ${rank <= 3 ? `bg-gradient-to-r ${medalColors[rank]}` : "bg-gray-100"
                                        }`}
                                    variants={listVariants}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            className="w-10 h-10 flex items-center justify-center text-white text-lg font-bold rounded-full"
                                            style={{
                                                backgroundColor: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#A0AEC0",
                                            }}
                                            whileHover={{ rotate: [0, 10, -10, 0], transition: { duration: 0.4 } }}
                                        >
                                            <FaMedal />
                                        </motion.div>
                                        <p className={`text-lg font-semibold ${rank <= 3 ? "text-white" : "text-gray-800"}`}>{name}</p>
                                    </div>
                                    <motion.p
                                        className={`text-xl font-bold ${rank <= 3 ? "text-white" : "text-gray-800"}`}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                    >
                                        {score}
                                    </motion.p>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </div>
                </motion.div>
            </div>

            {/* <div className="font-bold text-[24px] text-[#2164A6] dark:text-white mb-4 mt-6">
                <p>GRE</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-1"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {greSections.map((section) => (
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
                                            <CountUp end={mockStats[section.statKey]} duration={2} />
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
                        <motion.ul
                            className="space-y-4"
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
                        >
                            {leaderboard.map(({ name, score, rank }) => (
                                <motion.li
                                    key={name}
                                    className={`flex items-center justify-between p-4 rounded-lg shadow-md ${rank <= 3 ? `bg-gradient-to-r ${medalColors[rank]}` : "bg-gray-100"
                                        }`}
                                    variants={listVariants}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            className="w-10 h-10 flex items-center justify-center text-white text-lg font-bold rounded-full"
                                            style={{
                                                backgroundColor: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#A0AEC0",
                                            }}
                                            whileHover={{ rotate: [0, 10, -10, 0], transition: { duration: 0.4 } }}
                                        >
                                            <FaMedal />
                                        </motion.div>
                                        <p className={`text-lg font-semibold ${rank <= 3 ? "text-white" : "text-gray-800"}`}>{name}</p>
                                    </div>
                                    <motion.p
                                        className={`text-xl font-bold ${rank <= 3 ? "text-white" : "text-gray-800"}`}
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                    >
                                        {score}
                                    </motion.p>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </div>
                </motion.div>
            </div> */}
        </div>
    );
};

export default EntranceExamsDashboard;