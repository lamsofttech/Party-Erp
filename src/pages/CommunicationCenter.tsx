// src/pages/CommunicationCenter.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  useTheme,
  Tooltip,
  alpha,
  Card,
  CardActionArea,
  CardContent,
} from "@mui/material";
import { motion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import CountUp from "react-countup";
import {
  Sms as SmsIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Facebook as FacebookIcon,
  Poll as PollIcon,
  // Group as GroupIcon, // (unused) remove to fix TS6133; add back when you use it
  Article as ArticleIcon,
  Insights as InsightsIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";
import "chart.js/auto";

type CommCard = {
  title: string;
  icon: React.ReactNode;
  path: string;
  description?: string;
  count?: number;
};

const COMMUNICATION_CARDS: readonly CommCard[] = [
  { title: "SMS Campaigns", icon: <SmsIcon />, path: "/communications/sms", count: 14 },
  {
    title: "Email Blasts",
    icon: <EmailIcon />,
    path: "/party-operations/communication-center/email-blasts",
    count: 9,
  },
  { title: "WhatsApp Outreach", icon: <WhatsAppIcon />, path: "/communications/whatsapp", count: 6 },
  {
    title: "Social Media Posts",
    icon: <FacebookIcon />,
    path: "/communication/social-media-posts",
    description: "Monitor and manage social media engagements.",
    count: 0,
  },
  { title: "Feedback & Surveys", icon: <PollIcon />, path: "/party-operations/communication-center/feedback", count: 3 },
  { title: "County Whatsaap Links", icon: <PollIcon />, path: "/party-operations/communication-center/whatsapp", count: 3 },
  { title: "Meeting  Room", icon: <ArticleIcon />, path: "/party-operations/communication-center/templates", count: 22 },
  { title: "Engagement Analytics", icon: <InsightsIcon />, path: "/communications/analytics", count: 1 },
] as const;

const aiSuggestions = [
  "📢 Launch SMS to youth voters in Delta region.",
  "📈 Email open rates increased 12% — replicate successful subject lines.",
  "🧠 AI suggests WhatsApp push to undecided group B3.",
] as const;

type Suggestion = (typeof aiSuggestions)[number];

const MotionBox = motion(Box);

export default function CommunicationDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const surface = theme.palette.background.paper;
  const subtle = alpha(theme.palette.common.black, isDark ? 0.2 : 0.06);
  const iconColor = theme.palette.text.secondary;

  // Explicit union type so setState can rotate through all suggestions
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion>(aiSuggestions[0]);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentSuggestion((prev) => {
        const i = aiSuggestions.indexOf(prev);
        return aiSuggestions[(i + 1) % aiSuggestions.length];
      });
    }, 7000);
    return () => clearInterval(id);
  }, []);

  // Chart data/options (no fixed height; use aspect ratio)
  const chartData = useMemo(
    () => ({
      labels: ["SMS", "Email", "WhatsApp", "Social"],
      datasets: [
        {
          label: "Engagement Rate (%)",
          backgroundColor: [
            theme.palette.primary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.secondary.main,
          ],
          borderRadius: 6,
          data: [78, 61, 45, 82],
        },
      ],
    }),
    [theme.palette]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 16 / 9, // scales with width
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: alpha(iconColor, 0.12) } },
        x: { grid: { display: false }, ticks: { maxRotation: 0 } },
      },
    }),
    [iconColor]
  );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        minHeight: "100vh",
        bgcolor: theme.palette.background.default,
        width: "100%",
        // Important: allow children to shrink
        "& *": { minWidth: 0 },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        gap={2}
        justifyContent="space-between"
        alignItems="center"
        mb={{ xs: 2, sm: 3 }}
        flexWrap="wrap"
      >
        <Typography fontWeight={700} sx={{ fontSize: "clamp(20px, 2.2vw, 32px)" }}>
          Communication Dashboard
        </Typography>

        <Tooltip title={currentSuggestion}>
          <Chip
            icon={<NotificationsActiveIcon sx={{ color: iconColor }} />}
            label={
              <Typography
                noWrap
                aria-label="AI suggestion"
                sx={{
                  fontSize: "clamp(12px, 1.3vw, 14px)",
                  maxWidth: { xs: 220, sm: 360, md: 420 },
                }}
              >
                {currentSuggestion}
              </Typography>
            }
            sx={{
              bgcolor: surface,
              borderColor: subtle,
              borderWidth: 1,
              borderStyle: "solid",
            }}
          />
        </Tooltip>
      </Box>

      {/* CARD GRID — auto-fit columns */}
      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.25, sm: 1.75, md: 2.5 },
          // Magic line: create as many columns as fit, each min 240px (shrinks on tiny screens)
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          alignItems: "stretch",
        }}
      >
        {COMMUNICATION_CARDS.map((card) => (
          <MotionBox key={card.path} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                bgcolor: surface,
                borderColor: subtle,
                borderRadius: 2,
                display: "flex",
                "&:focus-within": {
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.28)}`,
                },
              }}
            >
              <CardActionArea
                component={RouterLink}
                to={card.path}
                sx={{ flex: 1 }}
                aria-label={card.title}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    p: { xs: 1.5, sm: 2 },
                    height: "100%",
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ "& svg": { fontSize: "clamp(22px, 2.2vw, 30px)", color: iconColor } }}>
                      {card.icon}
                    </Box>
                    <Typography fontWeight={800} sx={{ fontSize: "clamp(16px, 2vw, 22px)" }}>
                      <CountUp end={card.count ?? 0} duration={0.8} />
                    </Typography>
                  </Box>

                  <Box mt="auto">
                    <Typography fontWeight={700} sx={{ lineHeight: 1.25, fontSize: "clamp(14px, 1.6vw, 16px)" }}>
                      {card.title}
                    </Typography>
                    {card.description && (
                      <Typography
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5, fontSize: "clamp(11px, 1.2vw, 12px)" }}
                        noWrap
                        title={card.description}
                      >
                        {card.description}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </MotionBox>
        ))}
      </Box>

      {/* CHART — width-driven, aspect-ratio scales height */}
      <Box
        mt={{ xs: 3, md: 4 }}
        p={{ xs: 2, md: 3 }}
        borderRadius={2}
        sx={{
          bgcolor: surface,
          border: "1px solid",
          borderColor: subtle,
        }}
      >
        <Typography fontWeight={700} mb={2} sx={{ fontSize: "clamp(14px, 1.6vw, 18px)" }}>
          📊 Engagement Overview
        </Typography>

        {/* The canvas height scales with width because of aspectRatio */}
        <Box sx={{ width: "100%" }}>
          <Bar data={chartData} options={chartOptions} />
        </Box>
      </Box>
    </Box>
  );
}
