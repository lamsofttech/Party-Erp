// src/components/RequirePermission.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

interface RequirePermissionProps {
    /** Optional permission key, e.g. "legal.dashboard.view".
     *  If omitted, this just enforces that the user is logged in.
     */
    permission?: string;
    children: ReactNode;
}

export function RequirePermission({
    permission,
    children,
}: RequirePermissionProps) {
    const { user, isAuthenticated, hasPermission } = useUser();
    const location = useLocation();

    // If your context really uses `undefined` as "still loading", this is fine.
    const isAuthUnknown =
        typeof isAuthenticated === "undefined" && typeof user === "undefined";

    if (isAuthUnknown) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <p className="text-sm text-slate-500">Checking your access…</p>
                </div>
            </div>
        );
    }

    // Not logged in → redirect to login & preserve where they were going
    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname + location.search }}
            />
        );
    }

    // Safe permission check
    const lacksRequiredPermission =
        permission && typeof hasPermission === "function"
            ? !hasPermission(permission)
            : permission && !hasPermission; // if hasPermission is missing but we require permission, treat as forbidden

    if (lacksRequiredPermission) {
        return <Navigate to="/not-authorized" replace />;
    }

    return <>{children}</>;
}
