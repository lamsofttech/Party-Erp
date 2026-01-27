import { memo, useMemo } from "react";
import {
  Card,
  CardActionArea,
  CardContent,
  Box,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import dashboardModules from "../config/dashboardModules";

// Module type — auto-inferring from your config
export type DashboardModule = (typeof dashboardModules)[number];

export type DashboardModuleCardProps = {
  module: DashboardModule;
  /** Compact mode reduces padding (for dense dashboard layouts) */
  compact?: boolean;
  /** When true → visual card only, no navigation */
  disabled?: boolean;
  /** Optional override for module.path */
  to?: string;
};

/**
 * DashboardModuleCard
 * --------------------
 * Mobile-first responsive module card used on dashboards.
 * - Clean typography
 * - Large tap target for PWAs
 * - Handles icons (components or elements)
 * - Uses RouterLink only when navigation is allowed
 */
const DashboardModuleCard = memo(function DashboardModuleCard({
  module,
  compact = false,
  disabled = false,
  to,
}: DashboardModuleCardProps) {
  const { title, description, path, icon } = module;

  /** Determine usable icon node */
  const IconNode = useMemo(() => {
    if (!icon) return null;

    // If icon is a React component (MUI SvgIcon or similar)
    if (typeof icon === "function") {
      const Comp = icon as React.ElementType;
      return <Comp fontSize="medium" />;
    }

    // If icon is already a ReactNode (emoji, JSX element, etc.)
    return icon as React.ReactNode;
  }, [icon]);

  const linkTo = to ?? path ?? "#";
  const isLink = !disabled && !!(to ?? path);

  return (
    <Card
      elevation={3}
      aria-label={title}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: { xs: 1, sm: 2, md: 3 },
      }}
    >
      <CardActionArea
        component={isLink ? RouterLink : "div"}
        to={isLink ? linkTo : undefined}
        disabled={disabled}
        focusRipple
        sx={{
          px: { xs: 1.5, sm: compact ? 1.5 : 2 },
          py: { xs: compact ? 1.25 : 1.75, sm: compact ? 1.25 : 2 },
          minHeight: { xs: 96, sm: compact ? 92 : 110 },
          WebkitTapHighlightColor: "transparent",

          "&.Mui-focusVisible": {
            outline: "2px solid",
            outlineColor: (t) => t.palette.primary.main,
            outlineOffset: 2,
          },
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box display="flex" alignItems="center" gap={1.25} mb={0.5}>
            {IconNode}

            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{
                lineHeight: 1.25,
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </Typography>
          </Box>

          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
});

export default DashboardModuleCard;
