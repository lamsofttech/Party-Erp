// src/pages/president/ConstituencyResultsDashboard.tsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { useUser } from "../../contexts/UserContext";
import {
    BarChart3,
    CheckCircle2,
    XCircle,
    Lock,
    Flag,
    Image as ImageIcon,
    FileSearch,
} from "lucide-react";

interface Stats {
    total_forms: number;
    reviewed_forms: number;
    rejected_forms: number;
    locked_constituency: number;
    flagged_forms: number;
    images_replaced: number;
    audit_events: number;
}

interface Section {
    title: string;
    path: string;
    icon: JSX.Element;
    statKey: keyof Stats;
    description: string;
    requiredPermission: string;
}

// 👇 One permission per card – MUST match DB permission_name exactly
const Sections: Section[] = [
    {
        title: "All Form 34A Results",
        // 🔴 CHANGED: land on the simple drilldown page first (wards → stations → streams)
        path: "/president/constituency/results",
        icon: <BarChart3 size={24} />,
        statKey: "total_forms",
        description:
            "Browse results by ward, polling station and stream, then open Form 34A details.",
        requiredPermission: "results34a.view",
    },
    {
        title: "Review & Approve",
        path: "/president/constituency/results-34a?mode=review",
        icon: <CheckCircle2 size={24} />,
        statKey: "reviewed_forms",
        description: "Review and confirm results submitted by agents.",
        requiredPermission: "results34a.review",
    },
    {
        title: "Reject / Send Back",
        path: "/president/constituency/results-34a?mode=reject",
        icon: <XCircle size={24} />,
        statKey: "rejected_forms",
        description: "Reject inconsistent forms and send back for correction.",
        requiredPermission: "results34a.reject",
    },
    {
        title: "Lock Constituency Tally",
        path: "/president/constituency/results-34a?mode=lock",
        icon: <Lock size={24} />,
        statKey: "locked_constituency",
        description: "Lock presidential results once tallying is complete.",
        requiredPermission: "results34a.lock",
    },
    {
        title: "Flags & Anomalies",
        path: "/president/constituency/results-34a?mode=flags",
        icon: <Flag size={24} />,
        statKey: "flagged_forms",
        description: "Review forms with red flags or anomalies.",
        requiredPermission: "results34a.flags.view",
    },
    {
        title: "Image Replacement",
        path: "/president/constituency/results-34a?mode=image-replace",
        icon: <ImageIcon size={24} />,
        statKey: "images_replaced",
        description: "Approve or manage replacement Form 34A images.",
        requiredPermission: "results34a.image.replace",
    },
    {
        title: "Audit Trail",
        path: "/president/constituency/results-34a?mode=audit",
        icon: <FileSearch size={24} />,
        statKey: "audit_events",
        description: "See detailed audit logs of actions done on Form 34A.",
        requiredPermission: "results34a.audit.view",
    },
];

const ConstituencyResultsDashboard: React.FC = () => {
    const { user } = useUser();

    const userRole = (user?.role || "").toUpperCase();
    const isConstituencyOfficer =
        userRole === "CONSTITUENCY_OFFICER" || userRole === "SUPER_ADMIN";

    const userPermissions = (user?.permissions || []).map((p) =>
        String(p).toLowerCase()
    );
    const permSet = useMemo(() => new Set(userPermissions), [userPermissions]);

    // Dummy stats for now – you’ll later wire to real API
    const stats: Stats = {
        total_forms: 0,
        reviewed_forms: 0,
        rejected_forms: 0,
        locked_constituency: 0,
        flagged_forms: 0,
        images_replaced: 0,
        audit_events: 0,
    };

    // 🔐 Filtering of visible modules
    const visibleSections = useMemo(() => {
        // Constituency officer (and super admin) always sees ALL cards;
        // detailed action permissions will still be enforced on inner pages.
        if (isConstituencyOfficer) {
            return Sections;
        }

        // Any other role must explicitly have the permission
        return Sections.filter((section) =>
            permSet.has(section.requiredPermission.toLowerCase())
        );
    }, [isConstituencyOfficer, permSet]);

    // Extra safety: if user is not a constituency officer, show a clean denial
    if (!isConstituencyOfficer) {
        return (
            <div className="container mx-auto px-4 py-10">
                <h1 className="text-2xl font-bold text-red-600 mb-2">
                    No access to Constituency Tallying Center
                </h1>
                <p className="text-gray-700">
                    You are authenticated, but this section is reserved for Constituency
                    Officers. Please contact your system administrator if you believe this
                    is an error.
                </p>
            </div>
        );
    }

    if (visibleSections.length === 0) {
        // With the override, this should now effectively never happen for a proper Constituency Officer
        return (
            <div className="container mx-auto px-4 py-10">
                <h1 className="text-2xl font-bold text-red-600 mb-2">
                    No modules available
                </h1>
                <p className="text-gray-700">
                    You are authenticated, but you do not have any Result Transmission
                    Dashboard permissions assigned for this constituency. Please ask the
                    system admin to assign the <code>results34a.*</code> permissions to
                    your role.
                </p>
            </div>
        );
    }

    const constituencyName =
        user?.constituency_name || user?.county_name || "Your Constituency";

    return (
        <div className="container mx-auto px-4 pb-10 pt-6">
            <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-black text-gray-800 tracking-tight mb-2">
                    Constituency Tallying Center
                </h1>
                <p className="text-sm uppercase tracking-widest text-[#F5333F] font-semibold mb-2">
                    {constituencyName}
                </p>
                <p className="text-gray-600 max-w-2xl">
                    Monitor, review, and lock presidential Form 34A results for your
                    constituency – all from a single control room.
                </p>
            </div>

            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.08 },
                    },
                }}
            >
                {visibleSections.map((section) => (
                    <motion.div
                        key={section.title}
                        whileHover={{ scale: 1.03, rotate: -1 }}
                        whileTap={{ scale: 0.98 }}
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 },
                        }}
                    >
                        <Link to={section.path} className="block h-full group">
                            <div className="rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 h-full relative bg-gradient-to-br from-[#F5333F] to-[#F5333F] text-white">
                                <div className="flex items-center gap-4 mb-3">
                                    <motion.div
                                        initial={{ scale: 0.9, rotate: 0 }}
                                        animate={{ scale: 1, rotate: 360 }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 20,
                                            ease: "linear",
                                        }}
                                        className="p-3 rounded-xl bg-white/20 flex items-center justify-center"
                                    >
                                        {section.icon}
                                    </motion.div>
                                    <h3 className="text-lg font-semibold">{section.title}</h3>
                                </div>

                                <p className="text-sm text-white/80 mb-4">
                                    {section.description}
                                </p>

                                <div className="text-4xl font-extrabold">
                                    <CountUp
                                        end={stats[section.statKey] as number}
                                        duration={2}
                                        separator=","
                                    />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

export default ConstituencyResultsDashboard;
