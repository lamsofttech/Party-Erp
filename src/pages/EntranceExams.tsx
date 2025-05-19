import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Alert, Snackbar } from "@mui/material";
import type { AlertColor } from "@mui/material";
import { 
  UserPlus, 
  GraduationCap, 
  FileText, 
  Calendar, 
  CalendarCheck2, 
  CheckCircle, 
  Eye, 
  BookOpen,
  Trophy,
  ArrowUpRight, 
  XCircle
} from "lucide-react";

// Define section interface
interface Section {
  title: string;
  path: string;
  icon: JSX.Element;
  statKey: Exclude<keyof Stats, 'top_gmat_students' | 'top_gre_students'>;
  colorClass: string;
  description: string;
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

// Section definitions with a more cohesive color scheme
const Sections: Section[] = [
  { 
    title: "Enrollments", 
    path: "/entrance-exams/enrollments", 
    icon: <UserPlus size={24} />, 
    statKey: "total_applicants", 
    colorClass: "text-[#1a9970] bg-[#1a9970]/10 border-[#1a9970]",
    description: "Student enrollments" 
  },
  { 
    title: "Phases", 
    path: "/entrance-exams/phases", 
    icon: <GraduationCap size={24} />, 
    statKey: "total_phases", 
    colorClass: "text-[#2164a6] bg-[#2164a6]/10 border-[#2164a6]",
    description: "Active test phases" 
  },
  { 
    title: "Mock Results", 
    path: "/entrance-exams/mocks", 
    icon: <FileText size={24} />, 
    statKey: "total_active_mocks", 
    colorClass: "text-[#1a9970] bg-[#1a9970]/10 border-[#1a9970]",
    description: "Active mock exams" 
  },
  { 
    title: "Exam Bookings", 
    path: "/entrance-exams/bookings", 
    icon: <Calendar size={24} />, 
    statKey: "total_exam_bookings", 
    colorClass: "text-[#2164a6] bg-[#2164a6]/10 border-[#2164a6]",
    description: "Pending exam bookings" 
  },
  { 
    title: "Booked Exams", 
    path: "/entrance-exams/booked-exams", 
    icon: <CalendarCheck2 size={24} />, 
    statKey: "total_approved_exams", 
    colorClass: "text-[#1a9970] bg-[#1a9970]/10 border-[#1a9970]",
    description: "Approved exam bookings" 
  },
  { 
    title: "Rejected Bookings", 
    path: "/entrance-exams/rejected-exam-bookings", 
    icon: <XCircle size={24} /> , 
    statKey: "total_approved_exams", 
    colorClass: "text-[#2164a6] bg-[#2164a6]/10 border-[#2164a6]",
    description: "Rejected exam bookings" 
  },
  { 
    title: "Pending Results", 
    path: "/entrance-exams/results", 
    icon: <CheckCircle size={24} />, 
    statKey: "total_pending_results", 
    colorClass: "text-[#1a9970] bg-[#1a9970]/10 border-[#1a9970]",
    description: "Results awaiting approval" 
  },
  { 
    title: "Approved Scores", 
    path: "/entrance-exams/scores", 
    icon: <Eye size={24} />, 
    statKey: "total_approved_scores", 
    colorClass: "text-[#2164a6] bg-[#2164a6]/10 border-[#2164a6]",
    description: "Verified exam scores" 
  },
  { 
    title: "Resources", 
    path: "/entrance-exams/resources", 
    icon: <BookOpen size={24} />, 
    statKey: "total_resources", 
    colorClass: "text-[#1a9970] bg-[#1a9970]/10 border-[#1a9970]",
    description: "Training materials" 
  },
];

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
  
  const [loading, setLoading] = useState<boolean>(true);

  // useEffect(() => {
  //   const fetchStats = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await axios.get(
  //         "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/gmat/APIs/stats.php"
  //       );
        
  //       if (response.data.success) {
  //         setStats(response.data.stats);
  //       } else {
  //         setSnackbar({
  //           open: true,
  //           message: response.data.message || "Failed to load statistics",
  //           severity: "error",
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Error fetching stats:", error);
  //       setSnackbar({
  //         open: true,
  //         message: "Error loading statistics",
  //         severity: "error",
  //       });
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchStats();
  // }, []);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="flex flex-col items-center">
  //         <div className="w-12 h-12 border-4 border-t-4 border-gray-200 border-t-[#1a9970] rounded-full animate-spin"></div>
  //         <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="container mx-auto px-4 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
          <div className="w-1 h-8 bg-gradient-to-b from-[#1a9970] to-[#2164a6] rounded"></div>
          Entrance Exams Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Monitor exam applications, training progress, and student performance
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content Area (Stats Cards) */}
        <div className="xl:col-span-2">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {Sections.map((section, _index) => (
              <motion.div key={section.title} variants={itemVariants}>
                <Link to={section.path} className="block h-full">
                  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 h-full group relative overflow-hidden border-l-4 ${section.colorClass.split(' ')[2]}`}>
                    <div className="flex items-center gap-4 mb-1">
                      <div className={`p-2 rounded-lg ${section.colorClass.split(' ').slice(0, 2).join(' ')}`}>
                        {section.icon}
                      </div>
                      <h3 className="font-medium text-gray-800 dark:text-white">{section.title}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {section.description}
                    </p>
                    
                    <div className="mt-2">
                      <div className={`text-3xl font-bold ${section.colorClass.split(' ')[0]}`}>
                        <CountUp end={stats[section.statKey]} duration={1.5} />
                      </div>
                    </div>
                    
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight size={16} className="text-gray-400" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Leaderboard */}
        <div className="xl:col-span-1">
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-gradient-to-r from-[#1a9970] to-[#2164a6] p-4">
              <div className="flex items-center gap-2 text-white">
                <Trophy size={20} />
                <h2 className="text-xl font-bold">Top Performers</h2>
              </div>
            </div>
            
            <div className="p-4">
              {/* GMAT Leaderboard */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">GMAT</h3>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    Top Scores
                  </span>
                </div>
                
                {stats.top_gmat_students.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No GMAT scores available</p>
                  </div>
                ) : (
                  <motion.div 
                    className="space-y-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {stats.top_gmat_students.map((student, index) => (
                      <motion.div 
                        key={`gmat-${student.full_name}`}
                        variants={itemVariants}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-medium
                            ${index === 0 ? 'bg-[#1a9970]' : index === 1 ? 'bg-[#2164a6]' : index === 2 ? 'bg-[#1a9970]/80' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-800 dark:text-white text-sm">{student.full_name}</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-[#2164a6]/10 dark:bg-[#2164a6]/20 text-[#2164a6] dark:text-blue-300 font-semibold text-sm">
                          {student.score}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
              
              {/* GRE Leaderboard */}
              <div className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">GRE</h3>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    Top Scores
                  </span>
                </div>
                
                {stats.top_gre_students.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No GRE scores available</p>
                  </div>
                ) : (
                  <motion.div 
                    className="space-y-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {stats.top_gre_students.map((student, index) => (
                      <motion.div 
                        key={`gre-${student.full_name}`}
                        variants={itemVariants}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-medium
                            ${index === 0 ? 'bg-[#1a9970]' : index === 1 ? 'bg-[#2164a6]' : index === 2 ? 'bg-[#1a9970]/80' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-800 dark:text-white text-sm">{student.full_name}</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-[#1a9970]/10 dark:bg-[#1a9970]/20 text-[#1a9970] dark:text-green-300 font-semibold text-sm">
                          {student.score}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Duolingo Leaderboard */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Duolingo</h3>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    Top Scores
                  </span>
                </div>
                
                {stats.top_gre_students.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">No Duolingo scores available</p>
                  </div>
                ) : (
                  <motion.div 
                    className="space-y-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {stats.top_gre_students.map((student, index) => (
                      <motion.div 
                        key={`gre-${student.full_name}`}
                        variants={itemVariants}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-xs font-medium
                            ${index === 0 ? 'bg-[#1a9970]' : index === 1 ? 'bg-[#2164a6]' : index === 2 ? 'bg-[#1a9970]/80' : 'bg-gray-300 dark:bg-gray-600'}`}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-800 dark:text-white text-sm">{student.full_name}</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-[#1a9970]/10 dark:bg-[#1a9970]/20 text-[#1a9970] dark:text-green-300 font-semibold text-sm">
                          {student.score}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Snackbar for notifications */}
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