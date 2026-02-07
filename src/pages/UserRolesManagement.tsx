import React, { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { useUser } from "../contexts/UserContext";
import { getCreatableRoles, getAssignableRolesForUser } from "../utils/roleRules";

import type { AddUserFormData } from "../types/roles";
import type { User as AppUser } from "../types/users";

import { useUsers } from "../hooks/useUsers";
import { useGeoHierarchy } from "../hooks/useGeoHierarchy";
import { useRoleModules } from "../hooks/useRoleModules";

import AddUserModal from "../components/roles/AddUserModal";
import DeleteConfirmationModal from "../components/roles/DeleteConfirmationModal";
import ViewRolesModal from "../components/roles/ViewRolesModal";

import UserRolesHeader from "../components/roles/UserRolesHeader";
import UsersMobileList from "../components/roles/UsersMobileList";
import UsersDesktopTable from "../components/roles/UsersDesktopTable";

const initialForm: AddUserFormData = {
    email: "",
    name: "",
    role: "",
    county_id: "",
    constituency_id: "",
    ward_id: "",
    polling_station_id: "",
    country_id: "",
    positions: [],
    can_transmit: true,
};

const formatRoleLabel = (role: string) =>
    String(role)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const UserRolesManagement: React.FC = () => {
    const { user: currentUser, token, logout } = useUser();
    const currentUserRole = String(currentUser?.role || "AGENT").toUpperCase();

    const creatableRoles = useMemo(() => getCreatableRoles(currentUserRole), [currentUserRole]);
    const canCreateUsers = creatableRoles.length > 0;

    // Keep a safe string token for hooks that want string
    const safeToken = token ?? "";

    /**
     * ✅ FIX: Use the correct useUsers signature (object form)
     * so we can create users (POST) instead of only refetching.
     */
    const {
        users,
        loadingUsers,
        creatingUser,
        createUser,
        deletingId,
        updatingRoleId,
        deleteUser,
        updateUserRole,
        refetchUsers,
    } = useUsers({ token, logout });

    const { loadingRoleModules, roleModules, roleModulesError, fetchRoleModules } = useRoleModules(
        safeToken,
        logout
    );

    const geo = useGeoHierarchy(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<AddUserFormData>(initialForm);

    const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
    const [viewingRole, setViewingRole] = useState<{ role: string; userName: string } | null>(null);

    // If not logged in, don’t render the page
    if (!token) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-6">
                <p className="text-red-600 text-sm">You must be logged in to manage users.</p>
            </div>
        );
    }

    const openModal = useCallback(() => {
        if (!canCreateUsers) return;
        setFormData(initialForm);
        geo.resetGeo();
        setIsModalOpen(true);
    }, [canCreateUsers, geo]);

    /**
     * ✅ IMPORTANT FIX:
     * - Do NOT await fetchRoleModules() inside click handler.
     * - Open modal immediately, then fetch in background.
     * - Add try/catch so failures don’t freeze the UI.
     */
    const openViewRolesModal = useCallback(
        (user: AppUser) => {
            const role = String(user.role || "").toUpperCase();
            const userName = user.name || (user as any).username || "User";

            setViewingRole({ role, userName });

            // Fire-and-forget fetch (no await => no UI hang)
            Promise.resolve(fetchRoleModules(role)).catch((e) => {
                console.error("fetchRoleModules failed:", e);
            });
        },
        [fetchRoleModules]
    );

    // Simple jurisdiction formatter (safe)
    const formatJurisdiction = useCallback((user: AppUser) => {
        const u: any = user;
        return (
            u.polling_station_id ||
            u.pollingStationId ||
            u.ward_id ||
            u.wardId ||
            u.constituency_id ||
            u.constituencyId ||
            u.county_id ||
            u.countyId ||
            "—"
        );
    }, []);

    /**
     * Minimal toast bridge:
     * Replace this with your real toast (swirl-toast, etc.) later if you want.
     * For now it ensures you actually SEE validation errors.
     */
    const showToast = useCallback(
        (opts: { title: string; description?: string; intent?: "success" | "info" | "warning" | "critical" }) => {
            const msg = `${opts.title}${opts.description ? `\n${opts.description}` : ""}`;
            // quick visible feedback:
            alert(msg);
        },
        []
    );

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6 }}
                className="h-1 rounded-full bg-[#e30613] mb-4 sm:mb-6"
            />

            <UserRolesHeader
                currentUserRole={currentUserRole}
                creatableRoles={creatableRoles}
                canCreateUsers={canCreateUsers}
                onAddUser={openModal}
                formatRoleLabel={formatRoleLabel}
            />

            <div className="md:hidden mt-3">
                <UsersMobileList
                    users={users as any}
                    loadingUsers={loadingUsers}
                    currentUserRole={currentUserRole}
                    updatingRoleId={updatingRoleId as any}
                    deletingId={deletingId as any}
                    getAssignableRolesForUser={getAssignableRolesForUser}
                    formatRoleLabel={formatRoleLabel}
                    formatJurisdiction={formatJurisdiction as any}
                    onChangeRole={updateUserRole as any}
                    onViewRoles={openViewRolesModal as any}
                    onAskDelete={(u: any) => setDeleteTarget(u as AppUser)}
                />
            </div>

            <div className="hidden md:block mt-4">
                <UsersDesktopTable
                    users={users as any}
                    loadingUsers={loadingUsers}
                    currentUserRole={currentUserRole}
                    updatingRoleId={updatingRoleId as any}
                    deletingId={deletingId as any}
                    getAssignableRolesForUser={getAssignableRolesForUser}
                    onChangeRole={updateUserRole as any}
                    onViewRoles={openViewRolesModal as any}
                    onAskDelete={(u: any) => setDeleteTarget(u as AppUser)}
                />
            </div>

            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                /**
                 * ✅ FIX: Actually create the user (POST) then refresh list
                 */
                onSubmit={async (form, region) => {
                    // Normalize payload a bit to avoid backend confusion
                    const payload: any = {
                        ...form,
                        positions: form.positions || [],
                        can_transmit: !!form.can_transmit,
                        ...(region === "DIASPORA"
                            ? { county_id: "", constituency_id: "", ward_id: "", polling_station_id: "" }
                            : { country_id: "" }),
                    };

                    const out = await (createUser as any)(payload);

                    if (out) {
                        setIsModalOpen(false);
                        await (refetchUsers as any)();
                    }
                }}
                creatingUser={!!creatingUser}
                canCreateUsers={canCreateUsers}
                currentUserRole={currentUserRole}
                formData={formData}
                setFormData={setFormData}
                creatableRoles={creatableRoles}
                canSpecifyRegion={true}
                roleNeedsCounty={["COUNTY_OFFICER", "CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"].includes(
                    formData.role.toUpperCase()
                )}
                roleNeedsConstituency={["CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"].includes(
                    formData.role.toUpperCase()
                )}
                roleNeedsWard={["WARD_OFFICER", "AGENT"].includes(formData.role.toUpperCase())}
                roleNeedsPollingStation={formData.role.toUpperCase() === "AGENT"}
                selectedCountyCode={geo.selectedCountyCode}
                selectedConstituencyCode={geo.selectedConstituencyCode}
                selectedWardCode={geo.selectedWardCode}
                selectedPollingStationId={geo.selectedPollingStationId}
                onCountySelectChange={(v) => {
                    geo.onCountySelectChange(v);
                    setFormData((p) => ({
                        ...p,
                        county_id: v,
                        constituency_id: "",
                        ward_id: "",
                        polling_station_id: "",
                    }));
                }}
                onConstituencySelectChange={(v) => {
                    geo.onConstituencySelectChange(v);
                    setFormData((p) => ({
                        ...p,
                        constituency_id: v,
                        ward_id: "",
                        polling_station_id: "",
                    }));
                }}
                onWardSelectChange={(v) => {
                    geo.onWardSelectChange(v);
                    setFormData((p) => ({
                        ...p,
                        ward_id: v,
                        polling_station_id: "",
                    }));
                }}
                onPollingStationSelectChange={(v) => {
                    geo.onPollingStationSelectChange(v);
                    setFormData((p) => ({ ...p, polling_station_id: v }));
                }}
                availableCounties={geo.availableCounties}
                availableConstituencies={geo.availableConstituencies}
                availableWards={geo.availableWards}
                availablePollingStations={geo.availablePollingStations}
                loadingCounties={geo.loadingCounties}
                loadingConstituencies={geo.loadingConstituencies}
                loadingWards={geo.loadingWards}
                loadingPollingStations={geo.loadingPollingStations}
                errCounties={geo.errCounties}
                errConstituencies={geo.errConstituencies}
                errWards={geo.errWards}
                errPollingStations={geo.errPollingStations}
                showToast={showToast}
            />

            <ViewRolesModal
                viewingRole={viewingRole}
                onClose={() => setViewingRole(null)}
                loadingRoleModules={loadingRoleModules}
                roleModulesError={roleModulesError}
                roleModules={roleModules}
            />

            <DeleteConfirmationModal
                deleteTarget={deleteTarget as any}
                deletingId={deletingId as any}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={deleteTarget ? () => deleteUser(String((deleteTarget as any).id)) : undefined}
            />
        </div>
    );
};

export default UserRolesManagement;
