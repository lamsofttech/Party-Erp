import React from "react";
import { FaEye, FaTrash } from "react-icons/fa";

import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

import type { User } from "../../types/users";

type Id = string | number;

type Props = {
    users: User[];
    loadingUsers: boolean;
    currentUserRole: string;

    deletingId: Id | null;
    updatingRoleId: Id | null;

    getAssignableRolesForUser: (creatorRole: string, targetCurrentRole: string) => string[];

    onChangeRole: (id: Id, newRole: string) => void;
    onViewRoles: (user: User) => void;
    onAskDelete: (user: User) => void;
};

const UsersDesktopTable: React.FC<Props> = ({
    users,
    loadingUsers,
    currentUserRole,
    deletingId,
    updatingRoleId,
    getAssignableRolesForUser,
    onChangeRole,
    onViewRoles,
    onAskDelete,
}) => {
    return (
        <div className="hidden md:block mt-4">
            <ScrollArea className="w-full rounded-xl border border-slate-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {loadingUsers && (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-slate-500 text-sm">
                                    Loading users…
                                </td>
                            </tr>
                        )}

                        {!loadingUsers &&
                            users.map((user) => {
                                const assignableRoles = getAssignableRolesForUser(currentUserRole, user.role);

                                return (
                                    <tr key={String(user.id)} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-2 text-sm text-slate-800">
                                            {user.name || user.username}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{user.email}</td>
                                        <td className="px-4 py-2 text-sm text-slate-800">
                                            <select
                                                value={String(user.role).toUpperCase()}
                                                onChange={(e) => onChangeRole(user.id, String(e.target.value))}
                                                className="border border-slate-200 rounded px-2 py-1 bg-white text-xs sm:text-sm"
                                                disabled={updatingRoleId === user.id || !assignableRoles.length}
                                            >
                                                {assignableRoles.map((role) => (
                                                    <option key={role} value={role}>
                                                        {role}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    onClick={() => onViewRoles(user)}
                                                    className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-3 py-1 rounded-md text-xs sm:text-sm"
                                                >
                                                    <FaEye className="mr-1" /> View Roles
                                                </Button>

                                                <Button
                                                    onClick={() => onAskDelete(user)}
                                                    variant="outline"
                                                    className="border-red-200 text-red-600 hover:bg-red-50 px-3 py-1 rounded-md text-xs sm:text-sm disabled:opacity-60"
                                                    disabled={deletingId === user.id}
                                                >
                                                    <FaTrash className="mr-1" />
                                                    {deletingId === user.id ? "Deleting..." : "Delete"}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                        {!loadingUsers && users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-slate-500 text-sm">
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </ScrollArea>
        </div>
    );
};

export default UsersDesktopTable;
