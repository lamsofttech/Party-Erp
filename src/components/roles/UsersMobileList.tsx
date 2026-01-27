import React, { useState } from "react";
import { FaChevronDown, FaEye, FaTrash } from "react-icons/fa";

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

import type { User } from "../../types/users";

type Id = string | number;

// Extend User locally to allow created_by_name without changing your global User type
type UserWithCreatedBy = User & { created_by_name?: string | null };

type Props = {
    users: UserWithCreatedBy[];
    loadingUsers: boolean;
    currentUserRole: string;

    deletingId: Id | null;
    updatingRoleId: Id | null;

    getAssignableRolesForUser: (creatorRole: string, targetCurrentRole: string) => string[];
    formatRoleLabel: (role: string) => string;
    formatJurisdiction: (user: UserWithCreatedBy) => string;

    onChangeRole: (id: Id, newRole: string) => void;
    onViewRoles: (user: UserWithCreatedBy) => void;
    onAskDelete: (user: UserWithCreatedBy) => void;
};

const UsersMobileList: React.FC<Props> = ({
    users,
    loadingUsers,
    currentUserRole,
    deletingId,
    updatingRoleId,
    getAssignableRolesForUser,
    formatRoleLabel,
    formatJurisdiction,
    onChangeRole,
    onViewRoles,
    onAskDelete,
}) => {
    const [expandedUserId, setExpandedUserId] = useState<Id | null>(null);

    const toggleExpanded = (id: Id) => setExpandedUserId((cur) => (cur === id ? null : id));

    return (
        <div className="md:hidden space-y-3 mt-3">
            {loadingUsers && (
                <>
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="rounded-xl shadow-sm p-3 border border-slate-100">
                            <div className="animate-pulse space-y-2">
                                <div className="h-4 w-1/3 bg-slate-200 rounded" />
                                <div className="h-3 w-2/3 bg-slate-200 rounded" />
                                <div className="h-3 w-1/2 bg-slate-100 rounded" />
                            </div>
                        </Card>
                    ))}
                </>
            )}

            {!loadingUsers && users.length === 0 && (
                <Card className="text-center text-xs text-slate-500 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    No users found.
                </Card>
            )}

            {!loadingUsers &&
                users.map((user) => {
                    const assignableRoles = getAssignableRolesForUser(currentUserRole, user.role);
                    const isExpanded = expandedUserId === user.id;

                    return (
                        <Card
                            key={String(user.id)}
                            className="bg-white rounded-xl shadow-sm p-3 border border-slate-100"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">
                                        {user.name || user.username}
                                    </p>
                                    <p className="text-[11px] text-slate-500 break-all">{user.email}</p>
                                    <Badge
                                        className="mt-1 text-[10px] font-semibold bg-[#e30613]/10 text-[#e30613] border border-[#e30613]/30"
                                        variant="outline"
                                    >
                                        {formatRoleLabel(user.role)}
                                    </Badge>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <select
                                        value={String(user.role).toUpperCase()}
                                        onChange={(e) => onChangeRole(user.id, String(e.target.value))}
                                        className="border border-slate-200 rounded-md px-2 py-1 text-[11px] max-w-[130px] bg-white text-slate-800"
                                        disabled={updatingRoleId === user.id || !assignableRoles.length}
                                    >
                                        {assignableRoles.map((role) => (
                                            <option key={role} value={role}>
                                                {role}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => onViewRoles(user)}
                                            variant="outline"
                                            className="h-7 px-2 rounded-full border-slate-200 text-[11px] flex items-center gap-1"
                                        >
                                            <FaEye className="text-[10px]" />
                                            <span className="hidden xs:inline">Roles</span>
                                        </Button>

                                        <Button
                                            onClick={() => onAskDelete(user)}
                                            variant="outline"
                                            className="h-7 px-2 rounded-full border-red-200 text-red-600 text-[11px] flex items-center gap-1 disabled:opacity-60"
                                            disabled={deletingId === user.id}
                                        >
                                            <FaTrash className="text-[10px]" />
                                            <span className="hidden xs:inline">
                                                {deletingId === user.id ? "Deleting..." : "Delete"}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => toggleExpanded(user.id)}
                                className="mt-2 w-full flex items-center justify-between text-[11px] text-slate-500"
                            >
                                <span>{isExpanded ? "Hide details" : "View more"}</span>
                                <FaChevronDown
                                    className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                        }`}
                                />
                            </button>

                            {isExpanded && (
                                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                                    <div className="flex justify-between gap-2">
                                        <span className="font-medium">Username:</span>
                                        <span className="truncate">{user.username || "—"}</span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <span className="font-medium">Jurisdiction:</span>
                                        <span className="text-right">{formatJurisdiction(user)}</span>
                                    </div>

                                    {!!user.created_by_name && (
                                        <div className="flex justify-between gap-2">
                                            <span className="font-medium">Created by:</span>
                                            <span className="truncate">{user.created_by_name}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
        </div>
    );
};

export default UsersMobileList;
