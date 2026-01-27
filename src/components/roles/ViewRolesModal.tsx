// src/components/roles/ViewRolesModal.tsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Permission {
    permission_id: number;
    permission_name: string;
    action: string;
    assigned: boolean;
}

interface RoleModule {
    module: string;
    permissions: Permission[];
}

interface ViewingRole {
    role: string;
    userName: string;
}

interface ViewRolesModalProps {
    viewingRole: ViewingRole | null;
    onClose: () => void;
    loadingRoleModules: boolean;
    roleModulesError: string | null;
    roleModules: RoleModule[] | null;
}

const ViewRolesModal: React.FC<ViewRolesModalProps> = ({
    viewingRole,
    onClose,
    loadingRoleModules,
    roleModulesError,
    roleModules,
}) => {
    // If nothing selected, render nothing
    if (!viewingRole) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="view-roles-backdrop"
                className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    key="view-roles-modal"
                    className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Role permissions
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {viewingRole.userName} &mdash;{" "}
                                <span className="font-semibold text-red-600">
                                    {viewingRole.role}
                                </span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        >
                            Close
                        </button>
                    </div>

                    {/* Body */}
                    <div className="max-h-[65vh] overflow-y-auto px-5 py-4 space-y-3 text-sm">
                        {loadingRoleModules && (
                            <p className="text-slate-500 text-sm">
                                Loading modules &amp; permissions…
                            </p>
                        )}

                        {roleModulesError && !loadingRoleModules && (
                            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-200">
                                {roleModulesError}
                            </p>
                        )}

                        {!loadingRoleModules &&
                            !roleModulesError &&
                            (!roleModules || roleModules.length === 0) && (
                                <p className="text-xs text-slate-500">
                                    No permissions configured for this role yet.
                                </p>
                            )}

                        {!loadingRoleModules &&
                            !roleModulesError &&
                            roleModules &&
                            roleModules.length > 0 && (
                                <div className="space-y-3">
                                    {roleModules.map((mod) => (
                                        <div
                                            key={mod.module}
                                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
                                                {mod.module}
                                            </p>

                                            {mod.permissions.length === 0 ? (
                                                <p className="text-[11px] text-slate-500">
                                                    No permissions in this module.
                                                </p>
                                            ) : (
                                                <ul className="space-y-1.5">
                                                    {mod.permissions.map((perm) => (
                                                        <li
                                                            key={perm.permission_id}
                                                            className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-[11px] border border-slate-200"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="font-medium text-slate-800">
                                                                    {perm.permission_name}
                                                                </p>
                                                                {perm.action && (
                                                                    <p className="text-[10px] text-slate-500">
                                                                        {perm.action}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span
                                                                className={
                                                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                                                                    (perm.assigned
                                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                        : "bg-slate-50 text-slate-500 border border-slate-200")
                                                                }
                                                            >
                                                                {perm.assigned ? "Allowed" : "Not allowed"}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ViewRolesModal;
