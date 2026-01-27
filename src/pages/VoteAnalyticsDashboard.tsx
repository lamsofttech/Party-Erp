// src/pages/VoteAnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, alpha } from '@mui/material';
import { motion, type Variants } from 'framer-motion'; // <-- import Variants from SAME lib
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Description as DescriptionIcon,
  Search as SearchIcon,
  School as SchoolIcon,
  Videocam as VideocamIcon,
  Feedback as FeedbackIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

// Types
interface VisaStats {
  ds160_requests: number;
  review_ds160: number;
  visa_training: number;
  meeting_room: number;
  feedback: number;
  history: number;
  with_visa: number;
}

interface ActionCard {
  title: string;
  icon: JSX.Element;
  path: string; // This will now point to the GIS map page with query params
  countKey: keyof VisaStats;
}

// **MODIFIED ACTION CARDS TO ROUTE TO GIS MAP PAGE**
const actionCards: ActionCard[] = [
  {
    title: 'County View',
    icon: <DescriptionIcon />,
    path: '/gis/map?level=county',
    countKey: 'ds160_requests'
  },
  {
    title: 'Constituency View',
    icon: <SearchIcon />,
    path: '/gis/map?level=constituency',
    countKey: 'review_ds160'
  },
  {
    title: 'Ward View',
    icon: <SchoolIcon />,
    path: '/gis/map?level=ward',
    countKey: 'visa_training'
  },
  {
    title: 'Polling Center View',
    icon: <VideocamIcon />,
    path: '/gis/map?level=polling_center',
    countKey: 'meeting_room'
  },
  {
    title: 'Polling Stations View',
    icon: <FeedbackIcon />,
    path: '/gis/map?level=polling_station',
    countKey: 'feedback'
  },
  {
    title: 'Past Visits History Map',
    icon: <HistoryIcon />,
    path: '/gis/map?layer=visits_history',
    countKey: 'history'
  },
  {
    title: 'Voter Sentiment Map',
    icon: <CheckCircleIcon />,
    path: '/gis/map?layer=voter_sentiment',
    countKey: 'with_visa'
  }
];

const VoteAnalyticsDashboard = () => {
  const [stats, setStats] = useState<VisaStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get<VisaStats>(
          // !! IMPORTANT: Update this API endpoint to a relevant one for actual political stats !!
          'https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/visa/APIs/stats.php'
        );
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching visa stats (should be political stats):', error);
      }
    };
    fetchStats();
  }, []);

  // ---- Variants typed correctly ----
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      // Pin "type" to a literal so TS doesn't widen it to string
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <main
      className="px-4 mb-8 min-h-screen"
      style={{ background: 'linear-gradient(135deg, #f4f8f5, #ffffff)' }}
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-4 text-black">
          <div
            className="w-1 h-10 rounded"
            style={{ background: 'linear-gradient(to bottom, #006400, #8B4513)' }}
          />
          Geospatial & Electoral Insights Dashboard
        </h1>
        <p className="text-gray-700 mt-2 text-lg">
          Visualize electoral data and plan campaign strategies with geographical insights.
        </p>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Grid container spacing={3}>
          {actionCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <motion.div variants={itemVariants}>
                <Box
                  component={RouterLink}
                  to={card.path}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '180px',
                    borderRadius: 4,
                    p: 3,
                    textDecoration: 'none',
                    color: '#000000',
                    background: 'linear-gradient(135deg, #ffffff, #f7fdf7)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background:
                        'radial-gradient(circle at center, rgba(0,100,0,0.1), transparent 70%)',
                      transform: 'rotate(25deg)'
                    },
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: '16px',
                        backgroundColor: alpha('#006400', 0.15),
                        color: '#006400'
                      }}
                    >
                      {React.cloneElement(card.icon, { sx: { fontSize: 30 } })}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#8B4513' }}>
                      {stats ? stats[card.countKey]?.toLocaleString() ?? 0 : 0}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ mt: 2, fontWeight: 700, color: '#006400' }}>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#555' }}>
                    Explore geographical insights
                  </Typography>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>
    </main>
  );
};

export default VoteAnalyticsDashboard;
