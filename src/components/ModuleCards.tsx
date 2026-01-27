// src/components/ModuleCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ModuleCardProps {
  title: string;
  icon: React.ReactNode;
  route: string;
  description?: string;
  color?: string; // Optional accent color for the card
}

const themeColors = { // Define some theme colors for cards
  dashboard: "#1A5F56", // Primary
  partyManagement: "#3498DB", // Blue
  humanResources: "#2ECC71", // Green
  legalRoom: "#E74C3C", // Red
  financialManagement: "#F39C12", // Orange
  electionCenter: "#9B59B6", // Purple
  systemAdmin: "#1ABC9C", // Turquoise
  reports: "#D35400", // Dark Orange
};

const ModuleCard: React.FC<ModuleCardProps> = ({ title, icon, route, description, color }) => {
  const bgColor = color || themeColors.dashboard; // Fallback to a default color

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center p-6 rounded-2xl shadow-lg border border-gray-100 cursor-pointer overflow-hidden group"
      style={{
        backgroundColor: 'white', // Card background is white
        borderColor: `${bgColor}20`, // Subtle border based on color
      }}
      whileHover={{
        scale: 1.05,
        boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.1), 0 8px 15px -5px rgba(0, 0, 0, 0.08)",
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background Gradient Effect on Hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${bgColor}10 0%, transparent 100%)`
        }}
      />

      <Link to={route} className="flex flex-col items-center justify-center text-center w-full h-full relative z-10">
        <div
          className="p-4 rounded-full mb-3 text-white transition-all duration-300 group-hover:scale-110"
          style={{ backgroundColor: bgColor }}
        >
          {React.cloneElement(icon as React.ReactElement, { className: 'w-10 h-10' })}
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1 leading-tight">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        )}
      </Link>
    </motion.div>
  );
};

export default ModuleCard;