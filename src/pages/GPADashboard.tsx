import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    useTheme,
    alpha,
    styled
} from '@mui/material';
import { Chart as ChartJS, registerables } from 'chart.js';
import { ChartData, ScriptableContext, ChartArea } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { GradientCard } from '../components/CustomAssets/GradientCard';
import assets from '../assets/assets';
import { Link } from 'react-router-dom';

// Register ChartJS components
ChartJS.register(...registerables);

// Styled components
const GlowCard = styled(Box)(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1px',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.4)}, transparent)`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none'
    }
}));

interface DashboardData {
    status_counts: {
        pending_gpa_calculation: number;
        pending_gpa_approval: number;
        pending_student_action: number;
        transcript_issues: number;
        school_app_pending_gpa: number;
        completed_gpa: number;
        total_applications: number;
        completion_rate: number;
    };
    gpa_distribution: {
        'below_2.0': number;
        '2.0-2.5': number;
        '2.5-3.0': number;
        '3.0-3.5': number;
        'above-4.0': number;
    };
}

const GPADashboard = () => {
    const theme = useTheme();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/school-application/APIs/GPA_statistics.php";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(API_URL);
                console.log('API Response:', response.data); // For debugging
                
                if (response.data.status === "success") {
                    if (response.data.data && 
                        response.data.data.status_counts && 
                        response.data.data.gpa_distribution) {
                        setDashboardData(response.data.data);
                    } else {
                        setError('Invalid data structure from API');
                    }
                } else {
                    setError(response.data.message || 'Failed to fetch data');
                }
            } catch (err) {
                const error = err as Error; // Type assertion
                console.error('API Error:', error);
                if (axios.isAxiosError(error)) {
                    console.error('API Error Response:', error.response?.data);
                    setError(error.response?.data?.message || 'Error connecting to server');
                } else {
                    setError(error.message || 'An unknown error occurred');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography variant="h6">Loading dashboard data...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography variant="h6" color="error">{error}</Typography>
            </Box>
        );
    }

    if (!dashboardData) {
        return null;
    }

    // Card data using real API data
    const cardData = [
        {
            title: "GPA Calculation",
            count: dashboardData.status_counts.pending_gpa_calculation,
            color: theme.palette.primary.main,
            secondaryColor: theme.palette.primary.light,
            illustration: <img src={assets.calculator} alt="GPA Calculation" />,
            path: "/school-admission/GPA-dashboard/GPA-calculation"
        },
        {
            title: "Career Advisory GPA",
            count: dashboardData.status_counts.school_app_pending_gpa,
            color: theme.palette.secondary.main,
            secondaryColor: theme.palette.secondary.light,
            illustration: <img src={assets.calculator2} alt="GPA Calculation" />,
            path: "/school-admission/GPA-dashboard/career-advisory-GPA-calculation"
        },
        {
            title: "Pending GPA",
            count: dashboardData.status_counts.pending_student_action,
            color: theme.palette.warning.main,
            secondaryColor: theme.palette.warning.light,
            illustration: <img src={assets.pendingGPA} alt="GPA Calculation" />,
            path: "/school-admission/GPA-dashboard/pending-gpa-calculation"
        },
        {
            title: "GPA Approval",
            count: dashboardData.status_counts.pending_gpa_approval,
            color: theme.palette.success.main,
            secondaryColor: theme.palette.success.light,
            illustration: <img src={assets.approve} alt="GPA Calculation" />,
            path: "/school-admission/GPA-dashboard/gpa-approval"
        },
        {
            title: "Re-submissions",
            count: dashboardData.status_counts.transcript_issues,
            color: theme.palette.info.main,
            secondaryColor: theme.palette.info.light,
            illustration: <img src={assets.resubmission} alt="GPA Calculation" />,
            path: "/school-admission/GPA-dashboard/transcript-resubmissions"
        }
    ];

    // Calculate total students for percentage distribution
    const totalStudents = Object.values(dashboardData.gpa_distribution).reduce((sum, count) => sum + count, 0);

    // GPA distribution data using real API data
    const gpaData: ChartData<'bar', number[], string> = {
        labels: [
            'Below 2.0 (Probation)',
            '2.0-2.5 (C Range)',
            '2.5-3.0 (B Range)',
            '3.0-3.5 (A- Range)',
            '3.5-4.0 (A Range)'
        ],
        datasets: [
            {
                label: 'Students',
                data: [
                    dashboardData.gpa_distribution['below_2.0'],
                    dashboardData.gpa_distribution['2.0-2.5'],
                    dashboardData.gpa_distribution['2.5-3.0'],
                    dashboardData.gpa_distribution['3.0-3.5'],
                    dashboardData.gpa_distribution['above-4.0']
                ],
                backgroundColor: (context: ScriptableContext<'bar'>) => {
                    const { ctx, chartArea } = context.chart;
                    if (!chartArea) {
                        return theme.palette.primary.main;
                    }
                    return createGradient(ctx, chartArea);
                },
                borderRadius: 6,
                borderSkipped: false,
            }
        ]
    };

    function createGradient(ctx: CanvasRenderingContext2D, area: ChartArea): CanvasGradient {
        const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
        gradient.addColorStop(0, theme.palette.primary.main);
        gradient.addColorStop(1, theme.palette.secondary.main);
        return gradient;
    }

    // Calculate average GPA (mock calculation for now)
    const averageGPA = 3.42; // Replace with real calculation when available

    // Animation variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: '1800px', mx: 'auto' }}>
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        mb: 1,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}
                >
                    GPA Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Performance metrics and management
                </Typography>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
            >
                {cardData.map((card, index) => (
                    <Link to={card.path} key={index}>
                        <motion.div
                            key={index}
                            variants={item}
                            whileHover={{ y: -5 }}
                        >
                            <GradientCard
                                color={card.color}
                                secondaryColor={card.secondaryColor}
                                sx={{ height: '100%' }}
                            >
                                <Box
                                    sx={{
                                        position: 'relative',
                                        height: '100%',
                                        p: 3,
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    {/* Title */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4.5 }}>
                                        {card.title}
                                    </Typography>
                                    {/* Count */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontWeight: 700,
                                                backgroundImage: `linear-gradient(45deg, ${card.color}, ${alpha(card.color, 0.7)})`,
                                                backgroundClip: 'text',
                                                textFillColor: 'transparent',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                            }}
                                        >
                                            {card.count}
                                        </Typography>
                                    </Box>
                                    {/* Illustration */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            width: '100px',
                                            height: '100px',
                                            opacity: 0.5,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                opacity: 0.9,
                                            },
                                        }}
                                    >
                                        {card.illustration}
                                    </Box>
                                </Box>
                            </GradientCard>
                        </motion.div>
                    </Link>
                ))}
            </motion.div>

            {/* Visualization Section */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="mb-8"
            >
                <GlowCard sx={{
                    p: 3,
                    backgroundColor: theme.palette.background.paper,
                    height: '400px'
                }}>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3
                    }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                GPA Distribution
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Current semester performance metrics
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Total Students: {totalStudents}
                        </Typography>
                    </Box>

                    <Box sx={{ height: 'calc(100% - 60px)' }}>
                        <Chart
                            type='bar'
                            data={gpaData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                        backgroundColor: theme.palette.background.paper,
                                        titleColor: theme.palette.text.primary,
                                        bodyColor: theme.palette.text.secondary,
                                        borderColor: theme.palette.divider,
                                        borderWidth: 1,
                                        padding: 12,
                                        usePointStyle: true,
                                        callbacks: {
                                            label: (context) => {
                                                const value = context.raw as number;
                                                const percentage = totalStudents > 0 
                                                    ? Math.round((value / totalStudents) * 100) 
                                                    : 0;
                                                return `${value} students (${percentage}%)`;
                                            }
                                        }
                                    },
                                    title: {
                                        display: true,
                                        text: 'Student GPA Distribution',
                                        color: theme.palette.text.primary,
                                        font: {
                                            size: 16,
                                            weight: 'bold'
                                        },
                                        padding: {
                                            bottom: 20
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        title: {
                                            display: true,
                                            text: 'GPA Ranges',
                                            color: theme.palette.text.secondary,
                                            font: {
                                                weight: 'bold',
                                                size: 14
                                            },
                                            padding: { top: 10 }
                                        },
                                        grid: {
                                            display: false
                                        },
                                        ticks: {
                                            color: theme.palette.text.secondary
                                        }
                                    },
                                    y: {
                                        title: {
                                            display: true,
                                            text: 'Number of Students',
                                            color: theme.palette.text.secondary,
                                            font: {
                                                weight: 'bold',
                                                size: 14
                                            },
                                            padding: { bottom: 10 }
                                        },
                                        grid: {
                                            color: theme.palette.divider
                                        },
                                        ticks: {
                                            color: theme.palette.text.secondary,
                                            precision: 0
                                        }
                                    }
                                }
                            }}
                        />
                    </Box>
                </GlowCard>
            </motion.div>

            {/* Performance Metrics */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
            >
                <GlowCard sx={{
                    p: 3,
                    backgroundColor: theme.palette.background.paper,
                    mb: 3
                }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        Performance Indicators
                    </Typography>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(4, 1fr)' },
                        gap: 3
                    }}>
                        {[
                            { title: "Average GPA", value: averageGPA.toFixed(2) },
                            { 
                                title: "Honor Students", 
                                value: `${Math.round(
                                    (dashboardData.gpa_distribution['3.0-3.5'] + 
                                     dashboardData.gpa_distribution['above-4.0']) / 
                                    totalStudents * 100
                                )}%` 
                            },
                            { 
                                title: "Probation Cases", 
                                value: `${Math.round(
                                    dashboardData.gpa_distribution['below_2.0'] / 
                                    totalStudents * 100
                                )}%` 
                            },
                            { 
                                title: "Completion Rate", 
                                value: `${Math.round(dashboardData.status_counts.completion_rate * 100) / 100}%` 
                            }
                        ].map((metric, i) => (
                            <motion.div
                                key={i}
                                variants={item}
                                whileHover={{ scale: 1.03 }}
                            >
                                <Box sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                                    height: '100%'
                                }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {metric.title}
                                    </Typography>
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        mb: 0.5
                                    }}>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mr: 1 }}>
                                            {metric.value}
                                        </Typography>
                                    </Box>
                                    <Box sx={{
                                        height: '4px',
                                        width: '100%',
                                        backgroundColor: theme.palette.divider,
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        mt: 1
                                    }}>
                                        <Box sx={{
                                            height: '100%',
                                            width: `${Math.random() * 100}%`,
                                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                            borderRadius: 2
                                        }} />
                                    </Box>
                                </Box>
                            </motion.div>
                        ))}
                    </Box>
                </GlowCard>
            </motion.div>
        </Box>
    );
};

export default GPADashboard;