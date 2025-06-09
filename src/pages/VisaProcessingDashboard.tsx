import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
    Description as DescriptionIcon,
    Search as SearchIcon,
    School as SchoolIcon,
    Videocam as VideocamIcon,
    Feedback as FeedbackIcon,
    History as HistoryIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

// Define the type for stats data
interface VisaStats {
    ds160_requests: number;
    review_ds160: number;
    visa_training: number;
    meeting_room: number;
    feedback: number;
    history: number;
    with_visa: number;
}

// Type for action card to ensure countKey is a key of VisaStats
interface ActionCard {
    title: string;
    icon: JSX.Element;
    path: string;
    countKey: keyof VisaStats; // Restrict countKey to valid VisaStats keys
}

const actionCards: ActionCard[] = [
    {
        title: "DS160 Instruction Requests",
        icon: <DescriptionIcon />,
        path: "/visa/ds160-requests",
        countKey: "ds160_requests"
    },
    {
        title: "Review DS160",
        icon: <SearchIcon />,
        path: "/visa/ds160-review",
        countKey: "review_ds160"
    },
    {
        title: "Visa Interview Training",
        icon: <SchoolIcon />,
        path: "/visa/visa-interview-requests",
        countKey: "visa_training"
    },
    {
        title: "Mock Visa Meeting Room",
        icon: <VideocamIcon />,
        path: "/visa/mock-interview-requests",
        countKey: "meeting_room"
    },
    {
        title: "Interview Feedback",
        icon: <FeedbackIcon />,
        path: "/visa-processing/interview-feedback",
        countKey: "feedback"
    },
    {
        title: "Mock Visa History",
        icon: <HistoryIcon />,
        path: "/visa-processing/mock-history",
        countKey: "history"
    },
    {
        title: "Students With Visa",
        icon: <CheckCircleIcon />,
        path: "/visa-processing/with-visa",
        countKey: "with_visa"
    },
];

const VisaProcessingDashboard = () => {
    const theme = useTheme();
    const [stats, setStats] = useState<VisaStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get<VisaStats>('https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/visa/APIs/stats.php');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        fetchStats();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 100, damping: 15 }
        }
    };

    return (
        <main className="px-4 mb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
                    <div className="w-1 h-8 bg-gradient-to-b from-[#1a9970] to-[#2164a6] rounded"></div>
                    Visa Processing Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Manage visa applications, review documents, and track processing status.
                </p>
            </div>
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
                                        padding: 0,
                                        borderRadius: 4,
                                        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2d' : '#fff',
                                        boxShadow: theme.palette.mode === 'dark'
                                            ? '0 4px 20px rgba(0,0,0,0.2)'
                                            : '0 4px 20px rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s ease',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&:hover': {
                                            transform: 'translateY(-5px)',
                                            boxShadow: theme.palette.mode === 'dark'
                                                ? '0 10px 30px rgba(0,0,0,0.3)'
                                                : '0 10px 30px rgba(0,0,0,0.1)',
                                            '& .icon-container': {
                                                transform: 'scale(1.1)',
                                            }
                                        },
                                        '&:before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '4px',
                                            height: '100%',
                                            background: theme.palette.primary.main,
                                            opacity: 0.8,
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pl: 3, pr: 2.5, pt: 2.5, pb: 2 }}>
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
                                                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.09),
                                                    color: theme.palette.primary.main,
                                                    transition: 'transform 0.3s ease'
                                                }}
                                            >
                                                {React.cloneElement(card.icon, { sx: { fontSize: 24 } })}
                                            </Box>
                                            <Box
                                                sx={{
                                                    backgroundColor: theme.palette.primary.main,
                                                    color: theme.palette.primary.contrastText,
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
                                                {stats ? stats[card.countKey] || 0 : 0}
                                            </Box>
                                        </Box>
                                        <Box sx={{ mt: 2, mb: 'auto' }}>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontSize: '1.05rem',
                                                    fontWeight: 600,
                                                    lineHeight: 1.3,
                                                    mb: 0.75,
                                                    color: theme.palette.mode === 'dark' ? '#fff' : '#222',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}
                                            >
                                                {card.title}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </motion.div>
        </main>
    );
};

export default VisaProcessingDashboard;