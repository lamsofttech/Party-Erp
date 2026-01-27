"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaSave, FaSyncAlt, FaExclamationTriangle, FaShieldAlt } from "react-icons/fa";

/**
 * Small inline RBAC logo: shield + lock badge + RBAC text
 * - Keeps everything in one file (no extra assets)
 * - Accepts size prop
 */
const RBACLogo: React.FC<{ size?: number }> = ({ size = 40 }) => {
  const w = size;
  const h = Math.round((size * 28) / 40); // maintain aspect
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 40 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="RBAC Logo"
    >
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="g2" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Shield */}
      <path
        d="M20 1.5L33 6v6.5c0 6.5-5.5 11.8-13 13-7.5-1.2-13-6.5-13-13V6l13-4.5z"
        fill="url(#g1)"
        stroke="#0ea5e9"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Inner badge (lock) */}
      <rect
        x="14.5"
        y="9.5"
        width="11"
        height="8"
        rx="1.5"
        fill="#ffffff"
        opacity="0.95"
      />
      <path
        d="M18 9.5c0-1 1-2.3 3-2.3s3 1.3 3 2.3"
        stroke="#111827"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="13.5" r="1" fill="#111827" />

      {/* RBAC badge text */}
      <g transform="translate(24, 18)" fontFamily="Inter, Arial, sans-serif" fontWeight={700}>
        <text x="0" y="4" fontSize="6" fill="#ffffff">
          RBAC
        </text>
      </g>

      {/* small colored corner ribbon */}
      <path d="M0 28 L10 28 L0 18 Z" fill="url(#g2)" opacity="0.95" />
    </svg>
  );
};

/**
 * API base - update to your environment if needed
 */
const API_BASE = "https://skizagroundsuite.com/API/api";

/**
 * Types
 */
interface Permission {
  permission_id: number;
  permission_name: string; // "users.view"
  action: string; // "view" | "create" | "delete" | "manage" | ...
  assigned: boolean;
}

interface ModulePermissions {
  module: string; // "users"
  permissions: Permission[];
  enabled?: boolean; // derived flag for master toggle
}

/**
 * Helper: get auth headers with Bearer token
 */
const getAuthHeaders = () => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") || localStorage.getItem("token")
      : null;

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

/**
 * Helper: safe JSON parse to avoid crash on HTML/empty bodies
 */
const safeJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Non-JSON response from", res.url, "=>", text);
    return null;
  }
};

/**
 * Simple inline modal used for confirmations
 */
const ConfirmModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roleName: string;
  message?: string;
}> = ({ open, onClose, onConfirm, roleName, message }) => {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!open) setConfirmText("");
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded shadow-lg w-full max-w-md p-5">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FaExclamationTriangle className="text-yellow-500" />
          Confirm sensitive changes
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          {message ||
            `You're about to enable high-risk permissions for ${roleName}. To confirm, type the role name (${roleName.toUpperCase()}) below.`}
        </p>

        <input
          className="mt-4 w-full border rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
          placeholder={`Type ${roleName.toUpperCase()}`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            disabled={confirmText.toUpperCase() !== roleName.toUpperCase()}
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Determine whether permission is considered "dangerous"
 * You can tune these rules.
 */
const isDangerousPermission = (p: Permission) => {
  const name = p.permission_name.toLowerCase();
  const action = p.action.toLowerCase();
  // mark anything that deletes or manages high-impact objects as dangerous
  return (
    action === "delete" ||
    action === "manage" ||
    name.includes("settings") ||
    name.includes("user_roles") ||
    name.includes("roles") ||
    name.includes("settings.manage")
  );
};

/**
 * Main component
 */
const SystemRolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [modules, setModules] = useState<ModulePermissions[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Enabled" | "Disabled" | "Dangerous">("All");
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState<number[] | null>(null);

  // Load all roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`${API_BASE}/roles.php`, {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
        });
        const data = await safeJson(res);

        if (res.status === 401) {
          setError("You are not authorized. Please log in again.");
          return;
        }

        if (res.ok && data?.status === "success" && Array.isArray(data.roles)) {
          setRoles(data.roles);
          if (data.roles.length > 0) {
            const defaultRole = data.roles[0];
            setSelectedRole(defaultRole);
            fetchRoleModules(defaultRole);
          }
        } else {
          console.error("Failed to load roles", data);
          setError(data?.message || "Failed to load roles.");
        }
      } catch (err) {
        console.error("Error loading roles", err);
        setError("Error loading roles.");
      }
    };
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch modules for a role and derive module enabled flag
  const fetchRoleModules = async (role: string) => {
    if (!role) return;
    const roleUpper = role.toUpperCase();

    setLoadingModules(true);
    setError(null);
    setSuccessMessage(null);
    setWarningMessages([]);

    try {
      const res = await fetch(
        `${API_BASE}/get_role_modules.php?role=${encodeURIComponent(roleUpper)}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await safeJson(res);

      if (res.status === 401) {
        setError("You are not authorized. Please log in again.");
        setModules([]);
        return;
      }

      if (res.ok && data?.status === "success" && Array.isArray(data.modules)) {
        // Ensure each module has enabled flag
        const mods: ModulePermissions[] = data.modules.map((m: any) => {
          const permissions: Permission[] = (m.permissions || []).map((p: any) => ({
            permission_id: p.permission_id,
            permission_name: p.permission_name,
            action: p.action,
            assigned: !!p.assigned,
          }));
          return {
            module: m.module,
            permissions,
            enabled: permissions.some((p) => p.assigned),
          };
        });
        setModules(mods);
      } else {
        console.error("Failed to load role modules", data);
        setError(data?.message || "Failed to load module permissions for this role.");
        setModules([]);
      }
    } catch (err) {
      console.error("Error loading role modules", err);
      setError("Error loading module permissions.");
      setModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  // When user picks a different role
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    fetchRoleModules(role);
  };

  // Bulk: enable all view
  const enableAllView = () => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        enabled: true,
        permissions: m.permissions.map((p) => (p.action === "view" ? { ...p, assigned: true } : p)),
      }))
    );
  };

  // Bulk: disable all
  const disableAll = () => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        enabled: false,
        permissions: m.permissions.map((p) => ({ ...p, assigned: false })),
      }))
    );
  };

  // Copy permissions from another role (fetch then set in local state)
  const copyFromRole = async (roleToCopy: string) => {
    if (!roleToCopy || roleToCopy === selectedRole) return;
    setLoadingModules(true);
    try {
      const res = await fetch(
        `${API_BASE}/get_role_modules.php?role=${encodeURIComponent(roleToCopy.toUpperCase())}`,
        {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );
      const data = await safeJson(res);
      if (res.ok && data?.status === "success" && Array.isArray(data.modules)) {
        const copied: ModulePermissions[] = data.modules.map((m: any) => {
          const permissions: Permission[] = (m.permissions || []).map((p: any) => ({
            permission_id: p.permission_id,
            permission_name: p.permission_name,
            action: p.action,
            assigned: !!p.assigned,
          }));
          return {
            module: m.module,
            permissions,
            enabled: permissions.some((p) => p.assigned),
          };
        });

        // Use copied modules directly
        setModules(copied);

        setSuccessMessage(`Copied permissions from ${roleToCopy}.`);
      } else {
        setError(data?.message || "Failed to copy role permissions.");
      }
    } catch (err) {
      console.error("Error copying role modules", err);
      setError("Error copying role permissions.");
    } finally {
      setLoadingModules(false);
    }
  };

  // Toggle a module master switch (enable/disable entire module)
  const toggleModuleMaster = (moduleKey: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.module !== moduleKey) return m;
        const enable = !(m.enabled ?? false);
        return {
          ...m,
          enabled: enable,
          permissions: m.permissions.map((p) => ({
            ...p,
            // when enabling module, ensure view is true by default (safe)
            assigned: enable ? (p.action === "view" ? true : p.assigned) : false,
          })),
        };
      })
    );
  };

  // Toggle a single permission assignment in local state AND enforce dependencies
  const togglePermission = (moduleKey: string, permissionId: number) => {
    setWarningMessages([]);
    setModules((prev) =>
      prev.map((mod) => {
        if (mod.module !== moduleKey) return mod;

        let newPermissions = mod.permissions.map((p) =>
          p.permission_id === permissionId ? { ...p, assigned: !p.assigned } : p
        );

        // find toggled permission
        const toggled = newPermissions.find((p) => p.permission_id === permissionId);
        if (!toggled) return { ...mod, permissions: newPermissions };

        // If enabling a dangerous permission that depends on 'view', ensure view is enabled
        if (toggled.assigned) {
          if (toggled.action === "delete") {
            // ensure view exists and enable it
            newPermissions = newPermissions.map((p) => (p.action === "view" ? { ...p, assigned: true } : p));
            // add a warning to inform user we auto-enabled view
            setWarningMessages((w) => [...w, `Enabled 'view' for ${moduleKey} because delete requires view.`]);
          }
        } else {
          // If user unchecks 'view', automatically remove dangerous actions that require view (delete/approve)
          const viewStill = newPermissions.find((p) => p.action === "view")?.assigned;
          if (!viewStill) {
            newPermissions = newPermissions.map((p) =>
              ["delete", "approve", "reject"].includes(p.action) ? { ...p, assigned: false } : p
            );
            setWarningMessages((w) => [...w, `Disabled high-risk actions for ${moduleKey} because view was removed.`]);
          }
        }

        // set enabled flag if any assigned
        const enabled = newPermissions.some((p) => p.assigned);
        return { ...mod, permissions: newPermissions, enabled };
      })
    );
  };

  // Filtered modules based on search & filter
  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modules
      .map((m) => {
        // shallow filtering of permissions inside module to show matches
        const permissionsFiltered = m.permissions.filter((p) =>
          q
            ? p.permission_name.toLowerCase().includes(q) ||
            p.action.toLowerCase().includes(q) ||
            m.module.toLowerCase().includes(q)
            : true
        );

        return { ...m, permissions: permissionsFiltered };
      })
      .filter((m) => {
        // filter out modules with no matching permissions
        if (m.permissions.length === 0 && q) return false;
        if (filter === "Enabled") return m.permissions.some((p) => p.assigned);
        if (filter === "Disabled") return m.permissions.every((p) => !p.assigned);
        if (filter === "Dangerous") return m.permissions.some((p) => isDangerousPermission(p));
        return true;
      });
  }, [modules, searchQuery, filter]);

  // Compute role summary
  const roleSummary = useMemo(() => {
    const modulesEnabled = modules.filter((m) => m.permissions.some((p) => p.assigned)).length;
    const permissionsCount = modules.flatMap((m) => m.permissions).filter((p) => p.assigned).length;
    const risky = modules
      .flatMap((m) =>
        m.permissions
          .filter((p) => p.assigned && isDangerousPermission(p))
          .map((p) => ({ module: m.module, permission: p }))
      )
      .map((r) => ({ module: r.module, permission_name: r.permission.permission_name }));

    return { modulesEnabled, permissionsCount, risky };
  }, [modules]);

  // Save flow:
  // if risky permissions are present and not yet confirmed, open modal to confirm
  const handleSave = async () => {
    if (!selectedRole) return;
    setError(null);
    setSuccessMessage(null);

    const selectedPermissionIds = modules
      .flatMap((mod) => mod.permissions.map((p) => ({ ...p, module: mod.module })))
      .filter((p) => p.assigned)
      .map((p) => p.permission_id);

    const riskyAssigned = modules
      .flatMap((mod) => mod.permissions.map((p) => ({ ...p, module: mod.module })))
      .filter((p) => p.assigned && isDangerousPermission(p));

    if (riskyAssigned.length > 0) {
      // open confirm modal, set pending payload
      setPendingSavePayload(selectedPermissionIds);
      setShowConfirmModal(true);
      return;
    }

    // no risky permissions — proceed
    await handleSaveConfirmed(selectedPermissionIds);
  };

  // Called after the user confirms the modal (or no modal required)
  const handleSaveConfirmed = async (permissionIds: number[]) => {
    if (!selectedRole) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE}/save_role_modules.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          role: selectedRole.toUpperCase(),
          permission_ids: permissionIds,
        }),
      });

      const data = await safeJson(res);

      if (res.status === 401) {
        setError("You are not authorized. Please log in again.");
        return;
      }

      if (res.ok && data?.status === "success") {
        setSuccessMessage("Permissions updated successfully.");
        // Refresh to reflect backend truth (optional)
        fetchRoleModules(selectedRole);
      } else {
        console.error("Failed to save permissions", data);
        setError(data?.message || "Failed to save permissions.");
      }
    } catch (err) {
      console.error("Error saving permissions", err);
      setError("Error saving permissions.");
    } finally {
      setSaving(false);
      setPendingSavePayload(null);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: "100% 50%" }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        className="w-full h-1 rounded-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 mb-6"
      />

      {/* Header */}
      <div className="flex justify-between items-start gap-6 mb-6">
        <div className="flex-1">
          <h1
            className="text-2xl sm:text-3xl font-bold flex items-center gap-3"
            style={{ fontFamily: "Century Gothic, sans-serif" }}
          >
            {/* Use our RBAC logo here */}
            <span className="flex items-center justify-center w-10 h-10">
              <RBACLogo size={40} />
            </span>
            System Roles & Module Permissions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Configure which modules and actions each system role is allowed to access.
          </p>
          {selectedRole && (
            <p className="text-xs text-gray-500 mt-1">
              Editing role: <span className="font-semibold">{selectedRole.toUpperCase()}</span>
            </p>
          )}

          {/* Optional header image (put your generated image in public/rbac-mockup.png) */}
          <div className="mt-4">
            <img
              src="/rbac-mockup.png"
              alt="RBAC mockup"
              className="w-full max-w-2xl rounded shadow-sm"
              style={{ display: "block" }}
            />
          </div>
        </div>

        <div className="w-72 flex-shrink-0">
          <div className="mb-2">
            <label className="block text-xs text-gray-500 mb-1">Select role</label>
            <select
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
            >
              <option value="" disabled>
                Select role
              </option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fetchRoleModules(selectedRole)}
              disabled={!selectedRole || loadingModules}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <FaSyncAlt className={loadingModules ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={() => {
                // quick save
                handleSave();
              }}
              disabled={!selectedRole || saving}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-60"
            >
              <FaSave />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Messages & Warnings */}
      {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
      {successMessage && (
        <div className="mb-3 text-sm text-green-600 dark:text-green-400">{successMessage}</div>
      )}
      {warningMessages.length > 0 && (
        <div className="mb-3 space-y-1">
          {warningMessages.map((w, i) => (
            <div key={i} className="text-sm text-yellow-700 bg-yellow-50 rounded px-3 py-2">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Main layout: left roles list, center permissions, right summary */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left column: Roles & index */}
        <aside className="col-span-3 bg-white dark:bg-gray-900 rounded shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Small logo in sidebar */}
              <div className="w-8 h-8">
                <RBACLogo size={28} />
              </div>
              <h3 className="font-semibold">Roles</h3>
            </div>

            <button
              className="text-xs text-gray-500 hover:underline"
              onClick={() => {
                // Optional: open role creation
                alert("Add role flow not implemented in this sample.");
              }}
            >
              + Add Role
            </button>
          </div>
          <ul className="space-y-2">
            {roles.map((r) => (
              <li key={r}>
                <button
                  onClick={() => handleRoleChange(r)}
                  className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${r === selectedRole
                    ? "bg-blue-50 dark:bg-blue-900/40 font-semibold"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                >
                  <span className="flex-1">{r}</span>
                  {r === selectedRole && <span className="text-xs text-blue-600">Editing</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t pt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FaShieldAlt className="text-blue-400" />
              <span>Security-first design</span>
            </div>
            <p className="mt-2 text-xs">
              Use module toggles, grouped permission types and confirmations for dangerous actions.
            </p>
          </div>
        </aside>

        {/* Center: Modules / Cards */}
        <main className="col-span-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search permissions or modules"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={enableAllView}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                + Enable All View
              </button>
              <button onClick={disableAll} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">
                ⦻ Disable All
              </button>

              <div className="relative">
                <select
                  onChange={(e) => copyFromRole(e.target.value)}
                  defaultValue=""
                  className="px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Copy From Role</option>
                  {roles
                    .filter((r) => r !== selectedRole)
                    .map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-2">
              {(["All", "Enabled", "Disabled", "Dangerous"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {loadingModules ? (
              <div className="py-6 text-center text-gray-500">Loading module permissions...</div>
            ) : !selectedRole ? (
              <div className="py-6 text-center text-gray-500">
                Select a role to view and edit its permissions.
              </div>
            ) : modules.length === 0 ? (
              <div className="py-6 text-center text-gray-500">No permissions defined yet.</div>
            ) : (
              filteredModules.map((mod) => (
                <div
                  key={mod.module}
                  className="bg-white dark:bg-gray-900 border rounded p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-green-50 flex items-center justify-center text-green-600">
                        {mod.module.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{mod.module}</div>
                        <div className="text-xs text-gray-500">{mod.permissions.length} permissions</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500 mr-2">ON</div>
                      {/* Master toggle */}
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!mod.enabled}
                          onChange={() => toggleModuleMaster(mod.module)}
                          className="sr-only"
                        />
                        <span
                          className={`w-11 h-6 flex items-center bg-gray-300 rounded-full p-1 transition ${mod.enabled ? "bg-blue-600" : "bg-gray-300"
                            }`}
                        >
                          <span
                            className={`bg-white w-4 h-4 rounded-full shadow transform transition ${mod.enabled ? "translate-x-5" : ""
                              }`}
                          />
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Permission groups */}
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {/* Access group */}
                    <div>
                      <div className="font-semibold text-sm mb-2">Access</div>
                      <div className="space-y-2">
                        {mod.permissions
                          .filter((p) => ["view", "dashboard"].includes(p.action.toLowerCase()))
                          .map((p) => (
                            <label key={p.permission_id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={p.assigned}
                                onChange={() => togglePermission(mod.module, p.permission_id)}
                              />
                              <div>
                                <div>{p.action}</div>
                                <div className="text-xs text-gray-400">({p.permission_name})</div>
                              </div>
                            </label>
                          ))}
                      </div>
                    </div>

                    {/* Actions group */}
                    <div>
                      <div className="font-semibold text-sm mb-2">Actions</div>
                      <div className="space-y-2">
                        {mod.permissions
                          .filter((p) =>
                            ["create", "update", "delete", "manage"].includes(p.action.toLowerCase())
                          )
                          .map((p) => (
                            <label key={p.permission_id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={p.assigned}
                                onChange={() => togglePermission(mod.module, p.permission_id)}
                              />
                              <div>
                                <div
                                  className={`flex items-center gap-2 ${isDangerousPermission(p) ? "text-red-600" : ""
                                    }`}
                                >
                                  <span>{p.action}</span>
                                  {isDangerousPermission(p) && (
                                    <FaExclamationTriangle className="text-xs text-red-500" />
                                  )}
                                </div>
                                <div className="text-xs text-gray-400">({p.permission_name})</div>
                              </div>
                            </label>
                          ))}
                      </div>
                    </div>

                    {/* Workflow / Advanced */}
                    <div>
                      <div className="font-semibold text-sm mb-2">Workflow</div>
                      <div className="space-y-2">
                        {mod.permissions
                          .filter((p) => ["approve", "reject", "clear"].includes(p.action.toLowerCase()))
                          .map((p) => (
                            <label key={p.permission_id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={p.assigned}
                                onChange={() => togglePermission(mod.module, p.permission_id)}
                              />
                              <div>
                                <div>{p.action}</div>
                                <div className="text-xs text-gray-400">({p.permission_name})</div>
                              </div>
                            </label>
                          ))}
                      </div>

                      <div className="mt-3 text-xs text-gray-400">Advanced ▸</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        {/* Right: Role Summary */}
        <aside className="col-span-3 bg-white dark:bg-gray-900 rounded shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Role Summary</h3>
            <div className="text-xs text-gray-500">{roleSummary.modulesEnabled} modules</div>
          </div>

          <div className="mb-3 text-sm">
            <div>
              <strong>{roleSummary.permissionsCount}</strong> permissions assigned
            </div>
            <div className="mt-3">
              <div className="font-semibold text-sm">Risky</div>
              {roleSummary.risky.length === 0 ? (
                <div className="text-xs text-gray-500 mt-2">No high-risk permissions</div>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {roleSummary.risky.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-red-600">
                      <FaExclamationTriangle />
                      <span>{r.permission_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="text-xs text-gray-500">Last Updated</div>
            <div className="text-sm font-medium mt-1">{/* could fill with backend info */}—</div>

            <div className="mt-4">
              <button
                onClick={() => handleSave()}
                disabled={!selectedRole || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                <FaSave />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirm modal for risky permissions */}
      <ConfirmModal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingSavePayload(null);
        }}
        onConfirm={async () => {
          // only called when the user typed the role name correctly
          if (pendingSavePayload) {
            await handleSaveConfirmed(pendingSavePayload);
          } else {
            // fallback - compute payload
            const ids = modules.flatMap((m) =>
              m.permissions.filter((p) => p.assigned).map((p) => p.permission_id)
            );
            await handleSaveConfirmed(ids);
          }
        }}
        roleName={selectedRole || ""}
        message={`You're about to enable high-risk permissions for ${selectedRole.toUpperCase()}. To confirm, type ${selectedRole.toUpperCase()} and press Confirm.`}
      />
    </div>
  );
};

export default SystemRolesManagement;
