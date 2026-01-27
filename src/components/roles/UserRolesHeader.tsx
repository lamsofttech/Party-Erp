import React, { useMemo, useState } from "react";
import { FaChevronDown, FaPlus } from "react-icons/fa";
import { motion } from "framer-motion";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";

type Props = {
    currentUserRole: string;
    creatableRoles: string[];
    canCreateUsers: boolean;
    creatingUser?: boolean;
    onAddUser: () => void;
    formatRoleLabel?: (role: string) => string; // ✅ optional
};

const defaultFormatRoleLabel = (role: string) =>
    String(role)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const UserRolesHeader: React.FC<Props> = ({
    currentUserRole,
    creatableRoles,
    canCreateUsers,
    creatingUser = false,
    onAddUser,
    formatRoleLabel,
}) => {
    const [showCreatableRoles, setShowCreatableRoles] = useState(false);

    const format = formatRoleLabel ?? defaultFormatRoleLabel;

    const roleBadges = useMemo(
        () =>
            creatableRoles.map((role) => (
                <Badge
                    key={role}
                    variant="secondary"
                    className="bg-slate-100 text-slate-800 text-[11px]"
                >
                    {format(String(role).toUpperCase())}
                </Badge>
            )),
        [creatableRoles, format]
    );

    return (
        <>
            {/* Brand bar */}
            <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6 }}
                className="h-1 rounded-full bg-[#e30613] mb-4 sm:mb-6"
            />

            {/* Header + Add button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
                <div>
                    <h1
                        className="text-xl sm:text-3xl font-bold text-slate-900"
                        style={{ fontFamily: "Century Gothic, sans-serif" }}
                    >
                        User Roles
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-600 mt-1 flex items-center gap-1 flex-wrap">
                        <span className="text-slate-500">Signed in as</span>
                        <Badge
                            variant="outline"
                            className="border-[#e30613] text-[#e30613] text-[11px] font-semibold"
                        >
                            {format(String(currentUserRole).toUpperCase())}
                        </Badge>
                    </p>

                    {canCreateUsers ? (
                        <div className="mt-1 text-xs sm:text-sm text-slate-500">
                            <button
                                type="button"
                                onClick={() => setShowCreatableRoles((p) => !p)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 text-[11px] sm:text-xs hover:bg-slate-50"
                            >
                                <span>
                                    {showCreatableRoles
                                        ? "Hide roles you can create"
                                        : "View roles you can create"}
                                </span>
                                <FaChevronDown
                                    className={`text-[10px] transition-transform duration-200 ${showCreatableRoles ? "rotate-180" : ""
                                        }`}
                                />
                            </button>

                            {showCreatableRoles && (
                                <div className="mt-2 flex flex-wrap gap-1">{roleBadges}</div>
                            )}
                        </div>
                    ) : (
                        <p className="mt-1 text-xs sm:text-sm text-slate-500">
                            You can view users but cannot create new accounts.
                        </p>
                    )}
                </div>

                <Button
                    onClick={onAddUser}
                    className="self-stretch sm:self-auto flex items-center justify-center gap-2 text-sm sm:text-base bg-[#e30613] hover:bg-[#b1050f] text-white rounded-lg"
                    disabled={creatingUser || !canCreateUsers}
                >
                    <FaPlus className="text-xs sm:text-sm" />
                    <span>Add User</span>
                </Button>
            </div>

            <Separator className="my-2 sm:my-3" />
        </>
    );
};

export default UserRolesHeader;
