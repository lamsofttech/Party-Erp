// BreadcrumbsNav.tsx (optimized for all screens, mobile-first)
import * as React from "react";
import { useMemo } from "react";
import {
  useLocation,
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from "react-router-dom";

import {
  Breadcrumbs,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";

import MuiLinkBase, { type LinkProps as MuiLinkProps } from "@mui/material/Link";
import { Home as HomeIcon, ChevronRight, ChevronLeft, ArrowBackIosNew } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

/**
 * ✅ Typed react-router Link wrapper
 */
const RouterLinkRef = React.forwardRef<HTMLAnchorElement, RouterLinkProps>(
  function RouterLinkRef(props, ref) {
    return <RouterLink ref={ref} {...props} />;
  }
);

/**
 * ✅ Styled crumb link (bigger tap targets on mobile)
 */
const CrumbLink = styled(MuiLinkBase)<MuiLinkProps<typeof RouterLinkRef>>(
  ({ theme }) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: theme.palette.text.secondary,
    fontSize: "0.875rem",
    fontWeight: 600,
    textDecoration: "none",
    padding: "6px 8px", // ✅ better touch target
    borderRadius: 8,
    "&:hover": {
      color: theme.palette.text.primary,
      textDecoration: "underline",
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
    "& .MuiSvgIcon-root": {
      fontSize: "1rem",
      color: theme.palette.action.active,
    },
  })
);

function toTitleCase(s: string) {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function formatSegmentName(raw: string) {
  const decoded = decodeURIComponent(raw);
  const base = toTitleCase(decoded.replace(/-/g, " "));
  if (decoded.length > 8 && /^[0-9a-fA-F-]+$/.test(decoded)) return "Details";
  return base;
}

type BreadcrumbsNavProps = {
  variant?: "neutral" | "outlined";
};

const BreadcrumbsNav: React.FC<BreadcrumbsNavProps> = ({ variant = "neutral" }) => {
  const location = useLocation();
  const theme = useTheme();

  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));

  // Hide on login pages
  if (location.pathname === "/login") return null;

  const pathnames = useMemo(
    () => location.pathname.split("/").filter(Boolean),
    [location.pathname]
  );

  const SeparatorIcon = theme.direction === "rtl" ? ChevronLeft : ChevronRight;

  // Derived labels + paths
  const crumbs = useMemo(() => {
    const items = pathnames.map((seg, idx) => {
      const to = `/${pathnames.slice(0, idx + 1).join("/")}`;
      return { to, label: formatSegmentName(seg) };
    });
    return items;
  }, [pathnames]);

  const lastCrumb = crumbs[crumbs.length - 1];
  const prevCrumb = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;

  return (
    <Box
      component="nav"
      aria-label="Breadcrumb"
      sx={{
        width: "100%",
        px: { xs: 1, sm: 2 },
        py: 1,
        my: 1.5,
        borderRadius: 2,
        bgcolor: variant === "neutral" ? "background.paper" : "grey.50",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* ✅ MOBILE UX: Back + Current page (clean + easy) */}
      {isXs && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Tooltip title={prevCrumb ? `Back to ${prevCrumb.label}` : "Back to Home"}>
            <IconButton
              component={RouterLinkRef as any}
              // if there is a previous breadcrumb go there, else go home
              to={(prevCrumb?.to ?? "/") as any}
              size="small"
              aria-label={prevCrumb ? `Back to ${prevCrumb.label}` : "Back to Home"}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <ArrowBackIosNew sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Tooltip>

          <Typography
            component="span"
            aria-current="page"
            sx={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "text.primary",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={lastCrumb?.label ?? "Home"}
          >
            {lastCrumb?.label ?? "Home"}
          </Typography>
        </Box>
      )}

      {/* ✅ TABLET/DESKTOP: Full breadcrumbs with smart collapse */}
      {isSmUp && (
        <Box
          sx={{
            overflowX: "auto",
            whiteSpace: "nowrap",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { height: 6 },
          }}
        >
          <Breadcrumbs
            separator={<SeparatorIcon sx={{ color: "text.disabled", fontSize: "1rem" }} />}
            maxItems={8}
            itemsBeforeCollapse={2}
            itemsAfterCollapse={2}
            sx={{
              "& ol": {
                alignItems: "center",
                flexWrap: "nowrap",
              },
            }}
          >
            {/* Home */}
            <CrumbLink component={RouterLinkRef} to="/" aria-label="Home">
              <HomeIcon />
              Home
            </CrumbLink>

            {/* Dynamic */}
            {crumbs.map((c, idx) => {
              const isLast = idx === crumbs.length - 1;

              if (isLast) {
                return (
                  <Typography
                    key={c.to}
                    component="span"
                    aria-current="page"
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "text.primary",
                      maxWidth: 360,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={c.label}
                  >
                    {c.label}
                  </Typography>
                );
              }

              return (
                <CrumbLink key={c.to} component={RouterLinkRef} to={c.to}>
                  {c.label}
                </CrumbLink>
              );
            })}
          </Breadcrumbs>
        </Box>
      )}
    </Box>
  );
};

export default BreadcrumbsNav;
