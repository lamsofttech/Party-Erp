import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { useUser } from "../contexts/UserContext";
import { getCreatableRoles, getAssignableRolesForUser } from "../utils/roleRules";

import type { AddUserFormData } from "../types/roles"; // keep only form type from roles
import type { User as AppUser } from "../types/users"; // ✅ use ONE User type across this page

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
    const currentUserRole = (currentUser?.role || "AGENT").toUpperCase();

    const creatableRoles = useMemo(() => getCreatableRoles(currentUserRole), [currentUserRole]);
    const canCreateUsers = creatableRoles.length > 0;

    // ✅ IMPORTANT: don’t call hooks with null token
    // we still call the hook, but we give it a safe string and gate UI with early return below.
    const safeToken = token ?? "";

    // ✅ useUsers expects token string (not null)
    const {
        users,
        loadingUsers,
        deletingId,
        updatingRoleId,
        deleteUser,
        updateUserRole,
        refetchUsers,
    } = useUsers(safeToken);

    // ✅ useRoleModules expects (token, logout)
    const { loadingRoleModules, roleModules, roleModulesError, fetchRoleModules } =
        useRoleModules(safeToken, logout);

    const geo = useGeoHierarchy(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<AddUserFormData>(initialForm);

    // ✅ delete target uses the same User type as users list/components
    const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

    const [viewingRole, setViewingRole] = useState<{ role: string; userName: string } | null>(null);

    // ✅ UI guard: if not logged in, don’t render management page
    if (!token) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-6">
                <p className="text-red-600 text-sm">You must be logged in to manage users.</p>
            </div>
        );
    }

    const openModal = () => {
        if (!canCreateUsers) return;
        setFormData(initialForm);
        geo.resetGeo();
        setIsModalOpen(true);
    };

    const openViewRolesModal = async (user: AppUser) => {
        const role = String(user.role).toUpperCase();
        setViewingRole({ role, userName: user.name || user.username });
        await fetchRoleModules(role);
    };

    // ✅ simple jurisdiction formatter (since geo.formatJurisdiction does not exist)
    const formatJurisdiction = (user: AppUser) => {
        // If your user object has these ids, show the most specific one available.
        // Adjust field names if yours differ.
        const ps = (user as any).polling_station_id || (user as any).pollingStationId;
        const ward = (user as any).ward_id || (user as any).wardId;
        const cons = (user as any).constituency_id || (user as any).constituencyId;
        const county = (user as any).county_id || (user as any).countyId;

        return ps || ward || cons || county || "—";
    };

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
                onSubmit={async () => {
                    await refetchUsers();
                }}
                creatingUser={false}
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
                showToast={() => { }}
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
                onConfirm={deleteTarget ? () => deleteUser(String(deleteTarget.id)) : undefined}
            />
        </div>
    );
};

export default UserRolesManagement;
