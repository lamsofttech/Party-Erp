import React, { useState, useEffect } from "react";
import { Box, IconButton, Card, Typography, LinearProgress, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ReportIcon from "@mui/icons-material/Report";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import PeopleIcon from "@mui/icons-material/People";
import CancelIcon from "@mui/icons-material/Cancel";
import DashboardIcon from "@mui/icons-material/Dashboard";

const links = [
    { label: "New Application", icon: <AssignmentTurnedInIcon />, path: "/onboarding/new-applications" },
    { label: "Pending Application", icon: <PendingActionsIcon />, path: "/onboarding/pending-applications" },
    { label: "Approve GPA", icon: <ThumbUpIcon />, path: "/onboarding/approve-gpa" },
    { label: "Credit Report", icon: <ReportIcon />, path: "/onboarding/credit-report-review" },
    { label: "Approve Application", icon: <ThumbUpIcon />, path: "/onboarding/approve-application" },
    { label: "Onboarding", icon: <DashboardIcon />, path: "/onboarding/onboard" },
    { label: "Cosigners", icon: <PeopleIcon />, path: "/onboarding/cosigners" },
    { label: "Rejected Applications", icon: <CancelIcon />, path: "/onboarding/rejected-applications" },
];

const OnboardingDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalApplications: 0,
        totalNewApplications: 0,
        totalPendingApplications: 0,
        totalRejectedApplications: 0,
        totalApprovalReady: 0,
        totalAcceptedCosigners: 0,
        totalApprovedApplications: 0,
    });
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

    useEffect(() => {
        fetch('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/onboarding/APIs/stats.php')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    setStats({
                        totalApplications: data.data.total_applications,
                        totalNewApplications: data.data.total_new_applications,
                        totalPendingApplications: data.data.total_pending_applications,
                        totalRejectedApplications: data.data.total_rejected_applications,
                        totalApprovalReady: data.data.total_approval_ready,
                        totalAcceptedCosigners: data.data.total_accepted_cosigners,
                        totalApprovedApplications: data.data.total_members,
                    });
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching stats:', error);
                setLoading(false);
            });
    }, []);

    const radius = 200;
    const centerX = 250;
    const centerY = 250;

    const approvalRate = ((stats.totalApprovedApplications / stats.totalApplications) * 100).toFixed(1);

    return (
        <main className="px-4">
            <div className="">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
                    <div className="w-1 h-8 bg-gradient-to-b from-[#1a9970] to-[#2164a6] rounded"></div>
                    Onboarding Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage and track applications, review stats, and navigate onboarding tasks
                </p>
            </div>
            <div className="flex items-center gap-10">
                <Box sx={{ width: 500, height: 500, position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            position: "absolute",
                            width: 80,
                            height: 80,
                            backgroundColor: "#1976d2",
                            borderRadius: "50%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            boxShadow: "0px 0px 10px rgba(0,0,0,0.2)",
                        }}
                    >
                        <DashboardIcon sx={{ color: "white", fontSize: 40 }} />
                    </motion.div>
                    {links.map((link, index) => {
                        const angle = (index / links.length) * 2 * Math.PI;
                        const x = centerX + radius * Math.cos(angle) - 40;
                        const y = centerY + radius * Math.sin(angle) - 40;
                        return (
                            <motion.div
                                key={link.label}
                                initial={{ x: "-70%", opacity: 0 }}
                                animate={{ x: 0, y: 0, opacity: 1, transition: { duration: 1, ease: "easeOut", delay: index * 0.1 } }}
                                whileHover={{ scale: 1.2, transition: { duration: 0.1, delay: 0.1, ease: "easeInOut" } }}
                                whileTap={{ scale: 0.9 }}
                                style={{ position: "absolute", left: x, top: y }}
                            >
                                <Link to={link.path} style={{ textDecoration: "none", textAlign: "center" }}>
                                    <IconButton
                                        sx={{
                                            width: 60,
                                            height: 60,
                                            color: theme.palette.mode === "dark" ? "aqua" : "green",
                                            boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
                                            bgcolor: theme.palette.mode === "dark" ? "grey.700" : "white",
                                        }}
                                    >
                                        {link.icon}
                                    </IconButton>
                                    <Typography className="text-blue-500 dark:text-white" variant="caption" sx={{ display: "block", mt: 1, textAlign: "center", fontSize: "0.8rem" }}>
                                        {link.label}
                                    </Typography>
                                </Link>
                            </motion.div>
                        );
                    })}
                </Box>
                <Box sx={{ flex: 1, padding: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Quick Stats
                    </Typography>
                    {loading ? (
                        <Typography>Loading stats...</Typography>
                    ) : (
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2 }}>
                            <Card sx={{ padding: 2 }}>
                                <Typography variant="subtitle1">Total Applications</Typography>
                                <Typography variant="h4">{stats.totalApplications}</Typography>
                            </Card>

                            <Card sx={{ padding: 2 }}>
                                <Typography variant="subtitle1">New Applications</Typography>
                                <Typography variant="h4">{stats.totalNewApplications}</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(stats.totalNewApplications / stats.totalApplications) * 100 || 0}
                                    sx={{ mt: 1 }}
                                />
                            </Card>

                            <Card sx={{ padding: 2 }}>
                                <Typography variant="subtitle1">Pending Applications</Typography>
                                <Typography variant="h4">{stats.totalPendingApplications}</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(stats.totalPendingApplications / stats.totalApplications) * 100 || 0}
                                    sx={{ mt: 1 }}
                                />
                            </Card>

                            <Card sx={{ padding: 2 }}>
                                <Typography variant="subtitle1">Rejected Applications</Typography>
                                <Typography variant="h4">{stats.totalRejectedApplications}</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(stats.totalRejectedApplications / stats.totalApplications) * 100 || 0}
                                    sx={{ mt: 1 }}
                                />
                            </Card>

                            <Card sx={{ padding: 2 }}>
                                <Typography variant="subtitle1">Approval-Ready Applications</Typography>
                                <Typography variant="h4">{stats.totalApprovalReady}</Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(stats.totalApprovalReady / stats.totalApplications) * 100 || 0}
                                    sx={{ mt: 1 }}
                                />
                            </Card>

                            <Card sx={{ padding: 2 }}>
                                <Typography variant="subtitle1">Accepted Cosigners</Typography>
                                <Typography variant="h4">{stats.totalAcceptedCosigners}</Typography>
                            </Card>

                            <Card sx={{ padding: 2, backgroundColor: "#1976d2", color: "white", gridColumn: "span 2", textAlign: "center" }}>
                                <Typography variant="subtitle1">Approval Rate</Typography>
                                <Typography variant="h4">{approvalRate}%</Typography>
                            </Card>
                        </Box>
                    )}
                </Box>
            </div>
        </main>
    );
};

export default OnboardingDashboard;