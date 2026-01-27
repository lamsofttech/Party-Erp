// src/components/PrivateRoute.tsx
import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

interface PrivateRouteProps {
  children: ReactNode;

  /** Where to send unauthenticated users */
  redirectTo?: string; // default: "/login"

  /**
   * Optional permission gate:
   * Example: requiredPermission="manage_results"
   */
  requiredPermission?: string;

  /**
   * Optional role gate:
   * Example: allowedRoles={["SUPER_ADMIN", "ADMIN"]}
   */
  allowedRoles?: string[];

  /** Preserve return path for after login */
  preserveReturnPath?: boolean; // default: true
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  redirectTo = "/login",
  requiredPermission,
  allowedRoles,
  preserveReturnPath = true,
}) => {
  const location = useLocation();

  // ✅ uses your hook from UserContext.tsx
  const { user, token, isAuthenticated, hasPermission } = useUser();

  // Avoid redirect loop if already on login page
  const isOnLogin = location.pathname === redirectTo;

  // Not authenticated → go login
  if (!isAuthenticated || !user || !token) {
    if (isOnLogin) return <>{children}</>;

    return (
      <Navigate
        to={redirectTo}
        replace
        state={preserveReturnPath ? { from: location } : undefined}
      />
    );
  }

  // ✅ Role check (uses your user.role field)
  if (allowedRoles && allowedRoles.length > 0) {
    const role = (user.role || "").toUpperCase();
    const ok = allowedRoles.map((r) => r.toUpperCase()).includes(role);

    if (!ok) {
      return <Navigate to="/403" replace />;
    }
  }

  // ✅ Permission check (uses your permissions array via hasPermission)
  if (requiredPermission) {
    const ok = hasPermission(requiredPermission);
    if (!ok) {
      return <Navigate to="/403" replace />;
    }
  }

  // Authorized ✅
  return <>{children}</>;
};

export default PrivateRoute;
