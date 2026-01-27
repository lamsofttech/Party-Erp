import { useCallback, useState } from "react";
import { API_BASE, safeJson } from "../lib/apiClient";
import type { RoleModule } from "../types/roles";
import { toast } from "../components/swirl-toast";

export function useRoleModules(token: string | null, logout: () => void) {
    const [loadingRoleModules, setLoadingRoleModules] = useState(false);
    const [roleModules, setRoleModules] = useState<RoleModule[] | null>(null);
    const [roleModulesError, setRoleModulesError] = useState<string | null>(null);

    const fetchRoleModules = useCallback(
        async (role: string) => {
            if (!token) return { ok: false };

            setLoadingRoleModules(true);
            setRoleModules(null);
            setRoleModulesError(null);

            try {
                const res = await fetch(`${API_BASE}/get_role_modules.php?role=${encodeURIComponent(role)}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await safeJson(res);

                if (res.ok && data?.status === "success" && Array.isArray(data.modules)) {
                    setRoleModules(data.modules);
                    return { ok: true };
                }

                if (res.status === 401 || data?.message === "Invalid or expired token.") {
                    toast.error("Your session has expired. Please log in again.");
                    logout();
                    return { ok: false };
                }

                const msg = data?.message || "Failed to load role permissions.";
                setRoleModulesError(msg);
                toast.error(msg);
                return { ok: false };
            } catch {
                setRoleModulesError("Error loading role permissions.");
                toast.error("Error loading role permissions.");
                return { ok: false };
            } finally {
                setLoadingRoleModules(false);
            }
        },
        [token, logout]
    );

    return { loadingRoleModules, roleModules, roleModulesError, fetchRoleModules };
}
