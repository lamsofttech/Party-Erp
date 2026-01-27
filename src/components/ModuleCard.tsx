// src/components/ModuleCard.tsx
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { SvgIconComponent } from "@mui/icons-material";

interface ModuleCardProps {
  title: string;
  icon: SvgIconComponent; // ✅ MUI icon component type
  route: string;
  description?: string;
  color?: string;
  ariaLabel?: string;
}

const themeColors = {
  dashboard: "#1A5F56",
  partyManagement: "#3498DB",
  humanResources: "#2ECC71",
  legalRoom: "#E74C3C",
  financialManagement: "#F39C12",
  electionCenter: "#9B59B6",
  systemAdmin: "#1ABC9C",
  reports: "#D35400",
} as const;

export default function ModuleCard({
  title,
  icon: Icon,
  route,
  description,
  color,
  ariaLabel,
}: ModuleCardProps) {
  const bgColor = color || themeColors.dashboard;
  const reduceMotion = useReducedMotion();

  // hover support for desktop only
  const canHover =
    typeof window !== "undefined"
      ? window.matchMedia?.("(hover: hover)").matches ?? false
      : false;

  return (
    <motion.div
      className="
        relative flex flex-col rounded-2xl border cursor-pointer overflow-hidden
        shadow-sm border-gray-100 bg-white
        focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-300
      "
      style={{ borderColor: `${bgColor}20` }}
      whileHover={
        canHover && !reduceMotion
          ? { scale: 1.03, boxShadow: "0 12px 24px -6px rgba(0,0,0,.15)" }
          : undefined
      }
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {/* Background hint */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${bgColor}10 0%, transparent 100%)`,
        }}
      />

      <Link
        to={route}
        aria-label={ariaLabel || title}
        title={title}
        className="
          relative z-10 grid w-full
          gap-2 sm:gap-3
          p-4 sm:p-5 md:p-6
          text-center place-items-center
          min-h-[110px] sm:min-h-[130px] md:min-h-[150px]
          touch-manipulation
          outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300
        "
      >
        <div
          className="
            grid place-items-center rounded-full
            w-12 h-12 sm:w-14 sm:h-14
            text-white
            transition-transform duration-200
          "
          style={{ backgroundColor: bgColor }}
        >
          {/* ✅ MUI icon supports className */}
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>

        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 leading-tight line-clamp-2">
          {title}
        </h3>

        {description ? (
          <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">
            {description}
          </p>
        ) : null}
      </Link>
    </motion.div>
  );
}
