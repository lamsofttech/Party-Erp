import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUsers, FaCog } from "react-icons/fa";

interface ModuleConfig {
  title: string;
  path: string;
  icon: JSX.Element;
  colorClass: string;
  description: string;
}

const UserRolesDashboard: React.FC = () => {
  const navigate = useNavigate();

  const modules: ModuleConfig[] = [
    {
      title: "User Roles",
      // ✅ navigate to your management page (NO API)
      path: "/admin/user-roles/manage",
      icon: <FaUsers size={28} />,
      colorClass: "from-red-600 via-red-500 to-red-400",
      description: "Manage user accounts, assignments, and access levels.",
    },
    {
      title: "System Roles",
      path: "/admin/system-roles/manage",
      icon: <FaCog size={28} />,
      colorClass: "from-red-700 via-red-600 to-red-500",
      description: "Configure system-level roles and permissions.",
    },
  ];

  return (
    <div className="container mx-auto px-4 pb-10 relative">
      <motion.div
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: "100% 50%" }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        className="w-full h-1 rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 mb-6"
      />

      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-800 dark:text-white">
          🛡️ User Roles Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
          Choose what you want to manage. This page only routes to the management screens.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
        }}
      >
        {modules.map((mod) => (
          <motion.div
            key={mod.title}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <button
              type="button"
              onClick={() => navigate(mod.path)}
              className="block h-full w-full text-left group"
            >
              <div
                className={`rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 h-full relative bg-gradient-to-br ${mod.colorClass} text-white`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                    {mod.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{mod.title}</h3>
                </div>

                <p className="text-sm text-white/80 mb-4">{mod.description}</p>

                <div className="mt-auto">
                  <span className="text-xs text-white/70 uppercase tracking-wide">
                    Open management
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default UserRolesDashboard;
