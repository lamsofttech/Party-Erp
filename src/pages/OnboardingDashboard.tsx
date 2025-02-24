import React from "react";
import { Box, IconButton, Card, Typography, LinearProgress } from "@mui/material";
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
    { label: "Onboarding", icon: <DashboardIcon />, path: "/onboarding" },
    { label: "Cosigners", icon: <PeopleIcon />, path: "/onboarding/cosigners" },
    { label: "Rejected Applications", icon: <CancelIcon />, path: "/onboarding/rejected-applications" },
];

const stats = {
    totalApplications: 120,
    pendingApplications: 8,
    approvedApplications: 90,
    rejectedApplications: 22,
    creditReportsProcessed: 65,
    cosignersAdded: 35,
};

const OnboardingDashboard: React.FC = () => {
    const radius = 200;
    const centerX = 250;
    const centerY = 250;

    const approvalRate = ((stats.approvedApplications / stats.totalApplications) * 100).toFixed(1);

    return (
        <main>
            <div className="font-bold text-[24px] text-[#2164A6] dark:text-white">
                <p>Onboarding Dashboard</p>
            </div>
            <div className="flex items-center gap-10">
                <Box
                    sx={{
                        width: 500,
                        height: 500,
                        position: "relative",
                        // margin: "auto",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
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
                                style={{
                                    position: "absolute",
                                    left: x,
                                    top: y,
                                }}
                            >
                                <Link to={link.path} style={{ textDecoration: "none", textAlign: "center" }}>
                                    <IconButton
                                        sx={{
                                            width: 60,
                                            height: 60,
                                            backgroundColor: "white",
                                            color: "green",
                                            boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
                                        }}
                                    >
                                        {link.icon}
                                    </IconButton>
                                    <Typography
                                        className="text-blue-500 dark:text-white"
                                        variant="caption"
                                        sx={{
                                            display: "block",
                                            mt: 1,
                                            textAlign: "center",
                                            fontSize: "0.8rem",
                                        }}
                                    >
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

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", // Responsive grid
                            gap: 2, // Space between items
                        }}
                    >
                        <Card sx={{ padding: 2 }}>
                            <Typography variant="subtitle1">Total Applications</Typography>
                            <Typography variant="h4">{stats.totalApplications}</Typography>
                        </Card>

                        <Card sx={{ padding: 2 }}>
                            <Typography variant="subtitle1">Pending Applications</Typography>
                            <Typography variant="h4">{stats.pendingApplications}</Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(stats.pendingApplications / stats.totalApplications) * 100}
                                sx={{ mt: 1 }}
                            />
                        </Card>

                        <Card sx={{ padding: 2 }}>
                            <Typography variant="subtitle1">Approved Applications</Typography>
                            <Typography variant="h4">{stats.approvedApplications}</Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(stats.approvedApplications / stats.totalApplications) * 100}
                                sx={{ mt: 1 }}
                            />
                        </Card>

                        <Card sx={{ padding: 2 }}>
                            <Typography variant="subtitle1">Rejected Applications</Typography>
                            <Typography variant="h4">{stats.rejectedApplications}</Typography>
                            <LinearProgress
                                variant="determinate"
                                value={(stats.rejectedApplications / stats.totalApplications) * 100}
                                sx={{ mt: 1 }}
                            />
                        </Card>

                        <Card sx={{ padding: 2 }}>
                            <Typography variant="subtitle1">Credit Reports Processed</Typography>
                            <Typography variant="h4">{stats.creditReportsProcessed}</Typography>
                        </Card>

                        <Card sx={{ padding: 2 }}>
                            <Typography variant="subtitle1">Cosigners Added</Typography>
                            <Typography variant="h4">{stats.cosignersAdded}</Typography>
                        </Card>

                        <Card sx={{ padding: 2, backgroundColor: "#1976d2", color: "white", gridColumn: "span 2", textAlign: "center" }}>
                            <Typography variant="subtitle1">Approval Rate</Typography>
                            <Typography variant="h4">{approvalRate}%</Typography>
                        </Card>
                    </Box>
                </Box>
            </div>
        </main>
    );
};

export default OnboardingDashboard;
