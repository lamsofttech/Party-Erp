import { useCallback, useEffect, useRef, useState } from "react";
import { USERS_BASE, safeJson } from "../lib/api";
import { toast } from "../components/swirl-toast";
import type { User } from "../types/users";
import type { AddUserFormData } from "../types/roles";

interface Args {
    token: string | null;
    logout: () => void;
}

type LoadOptions = {
    silent?: boolean;
};

const isAuthExpired = (res: Response, json: any) =>
    res.status === 401 || json?.message === "Invalid or expired token.";

const debug = (...args: any[]) => {
    // turn off easily if you want:
    // return;
    console.log("[useUsers]", ...args);
};

export const useUsers = ({ token, logout }: Args) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [creatingUser, setCreatingUser] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

    const aliveRef = useRef(true);

    const fetchUsers = useCallback(
        async (signal?: AbortSignal) => {
            if (!token) {
                debug("No token => not calling API");
                return { ok: false, users: [] as User[], res: null as Response | null, json: null as any, raw: "" };
            }

            // Send token in BOTH places for PHP compatibility
            const url = `${USERS_BASE}/users.php?token=${encodeURIComponent(token)}`;

            debug("GET", url);

            const res = await fetch(url, {
                method: "GET",
                signal,
                credentials: "include",
                cache: "no-store",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            const { json, raw } = await safeJson<any>(res);

            debug("Response", {
                url: res.url,
                http: res.status,
                ok: res.ok,
                jsonStatus: json?.status,
                hasUsersArray: Array.isArray(json?.data?.users),
                rawPreview: raw?.slice(0, 200),
            });

            const list = json?.data?.users;

            return {
                ok: res.ok && json?.status === "success" && Array.isArray(list),
                users: Array.isArray(list) ? (list as User[]) : ([] as User[]),
                res,
                json,
                raw,
            };
        },
        [token]
    );

    const refetchUsers = useCallback(
        async (opts: LoadOptions = {}) => {
            if (!token) return;

            if (!opts.silent) setLoadingUsers(true);

            try {
                const out = await fetchUsers();

                if (!aliveRef.current) return;

                if (out.ok) {
                    setUsers(out.users);
                    return;
                }

                if (out.res && isAuthExpired(out.res, out.json)) {
                    if (!opts.silent) toast.error("Session expired. Please log in again.");
                    logout();
                    return;
                }

                if (!opts.silent) {
                    const msg =
                        out.json?.message ||
                        (out.res ? `Failed to load users (HTTP ${out.res.status})` : "Failed to load users");
                    toast.error(msg);
                }
            } catch (e: any) {
                if (!aliveRef.current) return;
                if (!opts.silent && e?.name !== "AbortError") toast.error("Network error loading users");
            } finally {
                if (aliveRef.current && !opts.silent) setLoadingUsers(false);
            }
        },
        [token, logout, fetchUsers]
    );

    useEffect(() => {
        aliveRef.current = true;
        const controller = new AbortController();

        if (!token) {
            debug("Mount: token missing => skipping initial load");
            return () => {
                aliveRef.current = false;
                controller.abort();
            };
        }

        (async () => {
            setLoadingUsers(true);
            try {
                const out = await fetchUsers(controller.signal);
                if (!aliveRef.current) return;

                if (out.ok) {
                    setUsers(out.users);
                    return;
                }

                if (out.res && isAuthExpired(out.res, out.json)) {
                    toast.error("Session expired. Please log in again.");
                    logout();
                    return;
                }

                toast.error(out.json?.message || `Failed to load users (HTTP ${out.res?.status ?? "?"})`);
            } catch (e: any) {
                if (!aliveRef.current) return;
                if (e?.name !== "AbortError") toast.error("Network error loading users");
            } finally {
                if (aliveRef.current) setLoadingUsers(false);
            }
        })();

        return () => {
            aliveRef.current = false;
            controller.abort();
        };
    }, [token, logout, fetchUsers]);

    const createUser = useCallback(
        async (payload: AddUserFormData) => {
            if (!token) {
                toast.error("Missing auth token. Please log in again.");
                logout();
                return null;
            }

            if (!payload?.email || !payload?.name || !payload?.role) {
                toast.error("Email, Name and Role are required.");
                return null;
            }

            setCreatingUser(true);
            try {
                const url = `${USERS_BASE}/users.php?token=${encodeURIComponent(token)}`;
                debug("POST", url, payload);

                const res = await fetch(url, {
                    method: "POST",
                    credentials: "include",
                    cache: "no-store",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ ...payload, token }),
                });

                const { json } = await safeJson<any>(res);
                if (!aliveRef.current) return null;

                if (res.ok && json?.status === "success") {
                    toast.success("User created successfully.");

                    const created = json?.data ?? json?.user;
                    if (created) {
                        setUsers((prev) => [created, ...prev]);
                    } else {
                        await refetchUsers({ silent: true });
                    }

                    return json;
                }

                if (isAuthExpired(res, json)) {
                    toast.error("Session expired. Please log in again.");
                    logout();
                    return null;
                }

                toast.error(json?.message || `Failed to create user (HTTP ${res.status})`);
                return null;
            } catch {
                if (!aliveRef.current) return null;
                toast.error("Failed to create user.");
                return null;
            } finally {
                if (aliveRef.current) setCreatingUser(false);
            }
        },
        [token, logout, refetchUsers]
    );

    const deleteUser = useCallback(
        async (id: string) => {
            if (!token) {
                toast.error("Missing auth token. Please log in again.");
                logout();
                return;
            }

            setDeletingId(id);
            try {
                const url = `${USERS_BASE}/users.php?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
                debug("DELETE", url);

                const res = await fetch(url, {
                    method: "DELETE",
                    credentials: "include",
                    cache: "no-store",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                const { json } = await safeJson<any>(res);
                if (!aliveRef.current) return;

                if (res.ok && json?.status === "success") {
                    setUsers((prev) => prev.filter((u) => String(u.id) !== String(id)));
                    toast.success("User deleted successfully.");
                    return;
                }

                if (isAuthExpired(res, json)) {
                    toast.error("Session expired. Please log in again.");
                    logout();
                    return;
                }

                toast.error(json?.message || `Failed to delete user (HTTP ${res.status})`);
            } catch {
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

            const prevUsers = users;
            setUsers((prev) =>
                prev.map((u) => (String(u.id) === String(id) ? { ...u, role: normalized } : u))
            );

            try {
                const url = `${USERS_BASE}/user_roles.php?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
                debug("PUT", url, { role: normalized });

                const res = await fetch(url, {
                    method: "PUT",
                    credentials: "include",
                    cache: "no-store",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ role: normalized, token }),
                });

                const { json } = await safeJson<any>(res);
                if (!aliveRef.current) return;

                if (res.ok && json?.status === "success") {
                    toast.success("User role updated.");
                    return;
                }

                setUsers(prevUsers);

                if (isAuthExpired(res, json)) {
                    toast.error("Session expired. Please log in again.");
                    logout();
                    return;
                }

                toast.error(json?.message || `Failed to update role (HTTP ${res.status})`);
            } catch {
                if (!aliveRef.current) return;
                setUsers(prevUsers);
                toast.error("Failed to update role.");
            } finally {
                if (aliveRef.current) setUpdatingRoleId(null);
            }
        },
        [token, logout, users]
    );

    return {
        users,
        setUsers,
        loadingUsers,

        creatingUser,
        createUser,

        refetchUsers,
        deleteUser,
        updateUserRole,
        deletingId,
        updatingRoleId,
    };
};
