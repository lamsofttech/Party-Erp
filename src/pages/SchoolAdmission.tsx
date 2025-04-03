import { Box, Grid, Typography, Button, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    CalendarToday as CalendarTodayIcon,
    MeetingRoom as MeetingRoomIcon,
    Description as DescriptionIcon,
    Calculate as CalculateIcon,
    School as SchoolIcon,
    HourglassEmpty as HourglassEmptyIcon,
    Pending as PendingIcon,
    Feedback as FeedbackIcon,
    Link as LinkIcon,
    Assignment as AssignmentIcon,
    ArrowForward as ArrowForwardIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import 'chart.js/auto';
import React from 'react';

// Data for Main Action Cards
const actionCards = [
    { title: "Application Intakes", icon: <CalendarTodayIcon />, path: "/school-admission/intakes", info: "Current Intake: Fall 2023" },
    { title: "Meeting Room", icon: <MeetingRoomIcon />, path: "/school-admission/meeting-requests", count: 5 },
    { title: "GPA Calculation", icon: <CalculateIcon />, path: "/school-admission/GPA-dashboard", count: 8 },
    { title: "School App Documents Review", icon: <DescriptionIcon />, path: "/school-admission/application-documents", count: 10 },
    { title: "School Application", icon: <SchoolIcon />, path: "/school-application/school-application", count: 15 },
    { title: "School Application (On Progress)", icon: <HourglassEmptyIcon />, path: "/school-application/on-progress", count: 7 },
    { title: "School Application (Pending Approval)", icon: <PendingIcon />, path: "/school-application/pending-approval", count: 3 },
    { title: "School Application Feedback", icon: <FeedbackIcon />, path: "/school-application/school-appfeedback", count: 2 },
    { title: "Meeting Links", icon: <LinkIcon />, path: "/school-application/meeting-links", count: 20 },
    { title: "Consent Forms", icon: <AssignmentIcon />, path: "/school-application/consent-forms", count: 12 },
];

// Data for Statistical Cards
const statsCards = [
    { title: "Total Students Relocated", count: 150, color: "#FF9800", path: "/school-application/relocated" },
    { title: "All Universities", count: 50, color: "#03A9F4", path: "/school-application/all-schools" },
    { title: "Total Programs", count: 200, color: "#4CAF50", path: "/school-application/programs" },
    { title: "Total School Application", count: 100, color: "#F44336", path: "/school-application/complete-school-application" },
    { title: "School App (Per Student)", count: 75, color: "#2196F3", path: "/school-application/complete-school-application-student" },
];

// Data for Line Chart
const chartData = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    datasets: [
        {
            label: 'School Applications',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderColor: '#2196F3',
            pointBackgroundColor: '#2196F3',
            pointBorderColor: '#FFF',
            pointHoverBackgroundColor: '#FFF',
            pointHoverBorderColor: '#2196F3',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            data: [4, 4, 100, 110, 120, 1, 5, 1, 100, 110, 120, 70],
        },
    ],
};

const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#333',
            borderColor: '#ddd',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: false,
            callbacks: {
                label: function (context: { parsed: { y: any; }; }) {
                    return `Applications: ${context.parsed.y}`;
                }
            }
        }
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                color: '#9e9e9e',
            }
        },
        y: {
            grid: {
                color: 'rgba(0, 0, 0, 0.04)',
                drawBorder: false,
            },
            ticks: {
                color: '#9e9e9e',
                padding: 8,
            },
            border: {
                dash: [4, 4],
            }
        },
    },
};

const SchoolApplicationDashboard = () => {
    const theme = useTheme();

    // Container animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    // Item animation variants
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 100, damping: 15 }
        }
    };

    return (
        <Box
            sx={{
                padding: { xs: 2, md: 4 },
                minHeight: '100vh',
                borderRadius: 4,
                mb: 2,
                background: 'linear-gradient(to bottom, #f9fafc, #f1f4f9)',
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            color: '#2164A6',
                            fontWeight: 700,
                            position: 'relative',
                            '&:after': {
                                content: '""',
                                position: 'absolute',
                                bottom: -8,
                                left: 0,
                                width: 60,
                                height: 3,
                                borderRadius: 2,
                                backgroundColor: theme.palette.primary.main,
                            }
                        }}
                    >
                        School Admission Dashboard
                    </Typography>
                </motion.div>
            </Box>

            <Grid container spacing={3}>
                {/* Main Content Area */}
                <Grid item xs={12} lg={8}>
                    {/* Action Cards Grid */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <Grid container spacing={2}>
                            {actionCards.map((card, index) => (
                                <Grid item xs={12} sm={6} lg={4} key={index}>
                                    <motion.div variants={itemVariants}>
                                        <Box
                                            component={RouterLink}
                                            to={card.path}
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '150px',
                                                padding: 0, // Remove default padding
                                                borderRadius: 4,
                                                backgroundColor: '#fff',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                                transition: 'all 0.3s ease',
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                '&:hover': {
                                                    transform: 'translateY(-5px)',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                                    '& .icon-container': {
                                                        transform: 'scale(1.1)',
                                                    }
                                                },
                                                // Left accent bar
                                                '&:before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '4px', // Slightly thicker for better visibility
                                                    height: '100%',
                                                    background: theme.palette.primary.main,
                                                    opacity: 0.8,
                                                }
                                            }}
                                        >
                                            {/* Content wrapper with padding */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pl: 3, pr: 2.5, pt: 2.5, pb: 2 }}>
                                                {/* Top section with icon and count */}
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 'auto' }}>
                                                    <Box
                                                        className="icon-container"
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: '14px',
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.09),
                                                            color: theme.palette.primary.main,
                                                            transition: 'transform 0.3s ease'
                                                        }}
                                                    >
                                                        {React.cloneElement(card.icon, { sx: { fontSize: 24 } })}
                                                    </Box>

                                                    {card.count && (
                                                        <Box
                                                            sx={{
                                                                backgroundColor: theme.palette.primary.main,
                                                                color: '#fff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                minWidth: 28,
                                                                height: 28,
                                                                borderRadius: 14,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                paddingX: 1,
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                                                            }}
                                                        >
                                                            {card.count}
                                                        </Box>
                                                    )}
                                                </Box>

                                                {/* Content section with auto spacing */}
                                                <Box sx={{ mt: 2, mb: 'auto' }}>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontSize: '1.05rem',
                                                            fontWeight: 600,
                                                            lineHeight: 1.3,
                                                            mb: 0.75,
                                                            color: '#222',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical'
                                                        }}
                                                    >
                                                        {card.title}
                                                    </Typography>

                                                    {card.info && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: '#666',
                                                                fontSize: '0.85rem',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 1,
                                                                WebkitBoxOrient: 'vertical'
                                                            }}
                                                        >
                                                            {card.info}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                {/* Optional hover indicator at bottom */}
                                                <Box
                                                    sx={{
                                                        height: 4,
                                                        width: '50px',
                                                        backgroundColor: '#eee',
                                                        borderRadius: 2,
                                                        transition: 'all 0.3s ease',
                                                        alignSelf: 'center',
                                                        mt: 'auto',
                                                        mb: 0.75,
                                                        opacity: 0.6,
                                                        '&:hover': {
                                                            width: '80px',
                                                            backgroundColor: theme.palette.primary.light,
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>

                    {/* Line Chart */}
                    <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.4 }}
                    >
                        <Box sx={{ mt: 4 }}>
                            <Box
                                sx={{
                                    backgroundColor: 'white',
                                    borderRadius: 4,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                    p: 3,
                                    overflow: 'hidden',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                    <TrendingUpIcon sx={{ color: theme.palette.primary.main, fontSize: 28, mr: 1.5 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Application Trends
                                    </Typography>
                                </Box>
                                <Box sx={{ height: 320, mt: 2 }}>
                                    <Line data={chartData} options={chartOptions} />
                                </Box>
                            </Box>
                        </Box>
                    </motion.div>
                </Grid>

                {/* Stats Cards Sidebar */}
                <Grid item xs={12} lg={4}>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.3 }}
                    >
                        <Grid container spacing={2}>
                            {statsCards.map((stat, index) => (
                                <Grid item xs={12} sm={6} lg={12} key={index}>
                                    <motion.div variants={itemVariants}>
                                        <Box
                                            sx={{
                                                backgroundColor: 'white',
                                                borderRadius: 4,
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                p: 2.5,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    transform: 'translateY(-5px)',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                                },
                                                display: 'flex',
                                                flexDirection: { xs: 'row', lg: 'column' },
                                                justifyContent: 'space-between',
                                                alignItems: { xs: 'center', lg: 'flex-start' },
                                            }}
                                        >
                                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                                                <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                                                    {stat.title}
                                                </Typography>
                                                <Typography
                                                    variant="h4"
                                                    sx={{
                                                        fontWeight: 700,
                                                        backgroundImage: `linear-gradient(45deg, ${stat.color}, ${alpha(stat.color, 0.7)})`,
                                                        backgroundClip: 'text',
                                                        textFillColor: 'transparent',
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                        mb: { xs: 0, lg: 2 },
                                                    }}
                                                >
                                                    {stat.count.toLocaleString()}
                                                </Typography>
                                            </Box>

                                            <Button
                                                component={RouterLink}
                                                to={stat.path}
                                                endIcon={<ArrowForwardIcon />}
                                                sx={{
                                                    textTransform: 'none',
                                                    color: stat.color,
                                                    borderRadius: 3,
                                                    '&:hover': {
                                                        backgroundColor: alpha(stat.color, 0.1),
                                                    }
                                                }}
                                            >
                                                More info
                                            </Button>

                                            {/* Decorative background element */}
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    right: -20,
                                                    bottom: -20,
                                                    width: 120,
                                                    height: 120,
                                                    borderRadius: '50%',
                                                    backgroundColor: stat.color,
                                                    opacity: 0.07,
                                                    zIndex: 0
                                                }}
                                            />
                                        </Box>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
};

export default SchoolApplicationDashboard;