import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUsers, FaCog } from "react-icons/fa";
import CountUp from "react-countup";

const USERS_BASE = "https://skizagroundsuite.com/API/api";

interface Stats {
  users: number;
  roles: number;
}

interface ModuleConfig {
  title: string;
  path: string;
  icon: JSX.Element;
  statKey: keyof Stats;
  colorClass: string;
  description: string;
}

const UserRolesDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    roles: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("token")
            : null;

        let usersCount = 0;

        if (token) {
          const res = await fetch(`${USERS_BASE}/users.php`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const text = await res.text();
          let data: any = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (e) {
            console.error("Non-JSON users stats response:", text);
          }

          if (res.ok && data?.status === "success" && Array.isArray(data.data)) {
            usersCount = data.data.length;
          } else {
            console.warn("Could not derive users count from API:", data);
          }
        }

        // For now roles are static; you can hook a real API later
        setStats({
          users: usersCount,
          roles: 5,
        });
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 🔴 Updated to Jubilee-style reds
  const modules: ModuleConfig[] = [
    {
      title: "User Roles",
      path: "/admin/user-roles/manage",
      icon: <FaUsers size={28} />,
      statKey: "users",
      // strong Jubilee red gradient
      colorClass: "from-red-600 via-red-500 to-red-400",
      description: "Manage user accounts, assignments, and access levels.",
    },
    {
      title: "System Roles",
      path: "/admin/system-roles/manage",
      icon: <FaCog size={28} />,
      statKey: "roles",
      // deeper red for contrast
      colorClass: "from-red-700 via-red-600 to-red-500",
      description: "Configure system-level roles and permissions.",
    },
  ];

  return (
    <div className="container mx-auto px-4 pb-10 relative">
      {/* 🔴 Animated header bar now in Jubilee red */}
      <motion.div
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: "100% 50%" }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        className="w-full h-1 rounded-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 mb-6"
      />

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-800 dark:text-white">
          🛡️ User Roles Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
          View, manage, and configure user and system roles within your
          party operations.
        </p>
      </div>

      {/* Stat Cards */}
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
            <Link to={mod.path} className="block h-full group">
              <div
                className={`rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 h-full relative bg-gradient-to-br ${mod.colorClass} text-white`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                    {mod.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{mod.title}</h3>
                </div>
                <p className="text-sm text-white/80 mb-4">
                  {mod.description}
                </p>

                <div className="flex items-end justify-between mt-auto">
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: [0.95, 1, 0.95] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                    className="text-4xl font-extrabold"
                  >
                    {loading ? (
                      <span className="text-white/70 text-base">Loading…</span>
                    ) : (
                      <CountUp
                        end={stats[mod.statKey]}
                        duration={1.5}
                        separator=","
                      />
                    )}
                  </motion.div>
                  <span className="text-xs text-white/70 uppercase tracking-wide">
                    Total {mod.statKey}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default UserRolesDashboard;
