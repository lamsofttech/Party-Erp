import { useCallback, useEffect, useRef, useState } from "react";
import { USERS_BASE, safeJson } from "../lib/api";
import { toast } from "../components/swirl-toast";
import type { User } from "../types/users";

interface Args {
    token: string | null;
    logout: () => void;
}

type LoadOptions = {
    silent?: boolean; // don’t toast on failure
};

const isAuthExpired = (res: Response, data: any) =>
    res.status === 401 || data?.message === "Invalid or expired token.";

export const useUsers = ({ token, logout }: Args) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

    // prevents state updates after unmount
    const aliveRef = useRef(true);

    const refetchUsers = useCallback(
        async (opts: LoadOptions = {}) => {
            if (!token) return;

            if (!opts.silent) setLoadingUsers(true);

            try {
                const res = await fetch(`${USERS_BASE}/users.php`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await safeJson(res);
                if (!aliveRef.current) return;

                if (res.ok && data?.status === "success" && Array.isArray(data.data)) {
                    setUsers(data.data);
                    return;
                }

                if (isAuthExpired(res, data)) {
                    if (!opts.silent) toast.error("Session expired. Please log in again.");
                    logout();
                    return;
                }

                if (!opts.silent) toast.error(data?.message || "Failed to load users");
            } catch (e: any) {
                if (!aliveRef.current) return;
                if (!opts.silent && e?.name !== "AbortError") {
                    toast.error("Network error loading users");
                }
            } finally {
                if (aliveRef.current && !opts.silent) setLoadingUsers(false);
            }
        },
        [token, logout]
    );

    useEffect(() => {
        aliveRef.current = true;
        const controller = new AbortController();

        // keep your initial load behavior
        if (token) {
            (async () => {
                setLoadingUsers(true);
                try {
                    const res = await fetch(`${USERS_BASE}/users.php`, {
                        method: "GET",
                        signal: controller.signal,
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    const data = await safeJson(res);
                    if (!aliveRef.current) return;

                    if (res.ok && data?.status === "success" && Array.isArray(data.data)) {
                        setUsers(data.data);
                    } else {
                        if (isAuthExpired(res, data)) {
                            toast.error("Session expired. Please log in again.");
                            logout();
                        } else {
                            toast.error(data?.message || "Failed to load users");
                        }
                    }
                } catch (e: any) {
                    if (!aliveRef.current) return;
                    if (e?.name !== "AbortError") toast.error("Network error loading users");
                } finally {
                    if (aliveRef.current) setLoadingUsers(false);
                }
            })();
        }

        return () => {
            aliveRef.current = false;
            controller.abort();
        };
    }, [token, logout]);

    const deleteUser = useCallback(
        async (id: string) => {
            if (!token) {
                toast.error("Missing auth token. Please log in again.");
                logout();
                return;
            }

            setDeletingId(id);
            try {
                const res = await fetch(`${USERS_BASE}/users.php?id=${encodeURIComponent(id)}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await safeJson(res);
                if (!aliveRef.current) return;

                if (res.ok && data?.status === "success") {
                    setUsers((prev) => prev.filter((u) => u.id !== id));
                    toast.success("User deleted successfully.");
                    return;
                }

                if (isAuthExpired(res, data)) {
                    toast.error("Session expired. Please log in again.");
                    logout();
                    return;
                }

                toast.error(data?.message || "Failed to delete user.");
            } catch (e) {
                if (!aliveRef.current) return;
                toast.error("Failed to delete user.");
            } finally {
                if (aliveRef.current) setDeletingId(null);
            }
        },
        [token, logout]
    );

    const updateUserRole = useCallback(
        async (id: string, newRole: string) => {
            if (!token) {
                toast.error("Missing auth token. Please log in again.");
                logout();
                return;
            }

            const normalized = (newRole || "").toUpperCase().trim();
            if (!normalized) {
                toast.error("Role is required.");
                return;
            }

            setUpdatingRoleId(id);

            // optimistic update
            const prevUsers = users;
            setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: normalized } : u)));

            try {
                const res = await fetch(`${USERS_BASE}/user_roles.php?id=${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ role: normalized }),
                });

                const data = await safeJson(res);
                if (!aliveRef.current) return;

                if (res.ok && data?.status === "success") {
                    toast.success("User role updated.");
                    return;
                }

                // rollback
                setUsers(prevUsers);

                if (isAuthExpired(res, data)) {
                    toast.error("Session expired. Please log in again.");
                    logout();
                    return;
                }

                toast.error(data?.message || "Failed to update role.");
            } catch (e) {
                if (!aliveRef.current) return;
                // rollback
                setUsers(prevUsers);
                toast.error("Failed to update role.");
            } finally {
                if (aliveRef.current) setUpdatingRoleId(null);
            }
        },
        // NOTE: users in deps because of optimistic rollback
        [token, logout, users]
    );

    return {
        // keep existing API
        users,
        setUsers,
        loadingUsers,

        // new capabilities
        refetchUsers,
        deleteUser,
        updateUserRole,
        deletingId,
        updatingRoleId,
    };
};
