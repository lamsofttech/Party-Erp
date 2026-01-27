// src/components/roles/AddUserModalSections.tsx
import React from "react";
import { FaTimes } from "react-icons/fa";
import type { PoliticalPositionOption } from "./AddUserModal";

/**
 * ✅ Fix for TS2322:
 * This file previously typed handleChange as (field: keyof any, value: any) => void
 * which becomes (field: string | number | symbol, value: any) => void and conflicts
 * with the narrower union type from AddUserModal.tsx.
 *
 * We define a shared union of allowed fields here and use it consistently across
 * all section props in this file.
 */

type UserRegionType = "KENYA" | "DIASPORA" | "";

interface DiasporaCountry {
    id: number;
    name: string;
    iso_code?: string | null;
}

/** Keep this in sync with AddUserModal.tsx form keys */
type AddUserField =
    | "name"
    | "role"
    | "email"
    | "county_id"
    | "constituency_id"
    | "ward_id"
    | "polling_station_id"
    | "country_id"
    | "can_transmit"
    | "positions";

type HandleChange = (field: AddUserField, value: any) => void;

function Stepper({ step }: { step: number }) {
    const items = [
        { n: 1, label: "User & Role" },
        { n: 2, label: "Jurisdiction" },
        { n: 3, label: "Assignments" },
    ];

    return (
        <div className="px-4 pb-3">
            <div className="flex items-center gap-2">
                {items.map((it, idx) => {
                    const active = step === it.n;
                    const done = step > it.n;

                    return (
                        <React.Fragment key={it.n}>
                            <div className="flex items-center gap-2 min-w-[120px]">
                                <div
                                    className={[
                                        "h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-semibold",
                                        done
                                            ? "bg-emerald-600 text-white"
                                            : active
                                                ? "bg-red-600 text-white"
                                                : "bg-slate-100 text-slate-600",
                                    ].join(" ")}
                                >
                                    {it.n}
                                </div>
                                <div
                                    className={[
                                        "text-xs",
                                        active ? "text-slate-900 font-semibold" : "text-slate-500",
                                    ].join(" ")}
                                >
                                    {it.label}
                                </div>
                            </div>

                            {idx < items.length - 1 && (
                                <div
                                    className={[
                                        "flex-1 h-[2px] rounded",
                                        step > it.n ? "bg-emerald-600" : "bg-slate-200",
                                    ].join(" ")}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

/** Header */
export function ModalHeader({
    currentUserRole,
    onClose,
    step,
}: {
    currentUserRole: string;
    onClose: () => void;
    step: number;
}) {
    return (
        <div className="border-b bg-white">
            <div className="flex items-start justify-between px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Add New User</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Logged in as{" "}
                        <strong className="text-slate-700">{currentUserRole}</strong>
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 active:bg-slate-200"
                    aria-label="Close"
                >
                    <FaTimes />
                </button>
            </div>

            <Stepper step={step} />
        </div>
    );
}

/** Step 1: Location + Basic details (improved focus & clarity) */
export function StepUserAndRole({
    userRegionType,
    setUserRegionType,
    isSuperAdmin,
    formData,
    handleChange,
    filteredRoles,
}: {
    userRegionType: UserRegionType;
    setUserRegionType: (v: UserRegionType) => void;
    isSuperAdmin: boolean;

    formData: { email: string; name: string; role: string };
    handleChange: HandleChange;
    filteredRoles: string[];
}) {
    const diasporaDisabled = !isSuperAdmin;

    const regionCard = (active: boolean, disabled: boolean) =>
        [
            "relative w-full rounded-2xl border px-4 py-4 text-left transition-all",
            disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-sm",
            active
                ? "border-red-300 bg-red-50 ring-2 ring-red-200"
                : "border-slate-200 bg-white",
        ].join(" ");

    return (
        <div className="space-y-5">
            {/* Location cards */}
            <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">User location</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Select where the user operates. This controls roles and
                            jurisdiction fields.
                        </p>
                    </div>

                    {!isSuperAdmin && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            Diaspora requires SUPER_ADMIN
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setUserRegionType("KENYA")}
                        className={regionCard(userRegionType === "KENYA", false)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Kenya</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    Use county → constituency → ward → polling station.
                                </p>
                            </div>

                            {userRegionType === "KENYA" && (
                                <span className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-red-600 text-white">
                                    Selected
                                </span>
                            )}
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (!diasporaDisabled) setUserRegionType("DIASPORA");
                        }}
                        disabled={diasporaDisabled}
                        className={regionCard(userRegionType === "DIASPORA", diasporaDisabled)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Diaspora</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    Assign a country of operation.
                                </p>
                            </div>

                            {userRegionType === "DIASPORA" && (
                                <span className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-red-600 text-white">
                                    Selected
                                </span>
                            )}
                        </div>
                    </button>
                </div>

                {userRegionType === "" && (
                    <p className="mt-3 text-xs text-slate-500">
                        Nothing selected yet — choose <strong>Kenya</strong> or{" "}
                        <strong>Diaspora</strong>.
                    </p>
                )}
            </div>

            {/* Basic details */}
            <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900 mb-3">
                    Basic details
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                            placeholder="name@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Full name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                            placeholder="Jane Doe"
                            required
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Role
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => handleChange("role", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                            required
                        >
                            <option value="">Select role</option>
                            {filteredRoles.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>

                        {userRegionType === "DIASPORA" && !isSuperAdmin && (
                            <p className="mt-2 text-xs text-red-600">
                                Only SUPER_ADMIN can assign Diaspora roles.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Step 2: Jurisdiction */
export function StepJurisdiction({
    userRegionType,
    canSpecifyRegion,

    diasporaCountries,
    loadingDiaspora,
    diasporaError,

    roleNeedsCounty,
    roleNeedsConstituency,
    roleNeedsWard,
    roleNeedsPollingStation,

    selectedCountyCode,
    selectedConstituencyCode,
    selectedWardCode,
    selectedPollingStationId,

    onCountySelectChange,
    onConstituencySelectChange,
    onWardSelectChange,
    onPollingStationSelectChange,

    availableCounties,
    availableConstituencies,
    availableWards,
    availablePollingStations,

    loadingCounties,
    loadingConstituencies,
    loadingWards,
    loadingPollingStations,

    errCounties,
    errConstituencies,
    errWards,
    errPollingStations,

    formData,
    handleChange,
}: {
    userRegionType: UserRegionType;
    canSpecifyRegion: boolean;

    diasporaCountries: DiasporaCountry[];
    loadingDiaspora: boolean;
    diasporaError: string | null;

    roleNeedsCounty: boolean;
    roleNeedsConstituency: boolean;
    roleNeedsWard: boolean;
    roleNeedsPollingStation: boolean;

    selectedCountyCode: string;
    selectedConstituencyCode: string;
    selectedWardCode: string;
    selectedPollingStationId: string;

    onCountySelectChange: (code: string) => void;
    onConstituencySelectChange: (id: string) => void;
    onWardSelectChange: (id: string) => void;
    onPollingStationSelectChange: (id: string) => void;

    availableCounties: { id: string; name: string; code: string }[];
    availableConstituencies: { id: string; name: string; county_code: string }[];
    availableWards: { id: string; name: string; const_code: string }[];
    availablePollingStations: { id: string; name: string; ward_code: string }[];

    loadingCounties: boolean;
    loadingConstituencies: boolean;
    loadingWards: boolean;
    loadingPollingStations: boolean;

    errCounties: string | null;
    errConstituencies: string | null;
    errWards: string | null;
    errPollingStations: string | null;

    formData: {
        country_id?: string;
        county_id: string;
        constituency_id: string;
        ward_id: string;
        polling_station_id?: string;
    };
    handleChange: HandleChange;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">Jurisdiction</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Set where this user is allowed to operate.
                    </p>
                </div>

                {(roleNeedsCounty ||
                    roleNeedsConstituency ||
                    roleNeedsWard ||
                    roleNeedsPollingStation ||
                    userRegionType === "DIASPORA") && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            Required for selected role
                        </span>
                    )}
            </div>

            {userRegionType === "" && (
                <p className="text-sm text-slate-600">
                    Please go back and choose <strong>User location</strong> first.
                </p>
            )}

            {userRegionType === "DIASPORA" && (
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        Diaspora Country
                    </label>
                    <select
                        value={formData.country_id || ""}
                        onChange={(e) => handleChange("country_id", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                        required
                    >
                        <option value="">
                            {loadingDiaspora ? "Loading…" : "Select Country"}
                        </option>
                        {diasporaCountries.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    {diasporaError && (
                        <p className="mt-2 text-xs text-red-600">{diasporaError}</p>
                    )}
                </div>
            )}

            {userRegionType === "KENYA" && canSpecifyRegion && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {roleNeedsCounty && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                County
                            </label>
                            <select
                                value={selectedCountyCode}
                                onChange={(e) => {
                                    const code = e.target.value;
                                    onCountySelectChange(code);
                                    const selected = availableCounties.find((c) => c.code === code);
                                    handleChange("county_id", selected?.id || "");
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                                required={roleNeedsCounty}
                            >
                                <option value="">
                                    {loadingCounties ? "Loading counties…" : "Select county"}
                                </option>
                                {availableCounties.map((c) => (
                                    <option key={c.id} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {errCounties && (
                                <p className="mt-2 text-xs text-red-600">{errCounties}</p>
                            )}
                        </div>
                    )}

                    {roleNeedsConstituency && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Constituency
                            </label>
                            <select
                                value={selectedConstituencyCode}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    onConstituencySelectChange(v);
                                    handleChange("constituency_id", v);
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                                required={roleNeedsConstituency}
                            >
                                <option value="">
                                    {loadingConstituencies
                                        ? "Loading constituencies…"
                                        : "Select constituency"}
                                </option>
                                {availableConstituencies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {errConstituencies && (
                                <p className="mt-2 text-xs text-red-600">{errConstituencies}</p>
                            )}
                        </div>
                    )}

                    {roleNeedsWard && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Ward
                            </label>
                            <select
                                value={selectedWardCode}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    onWardSelectChange(v);
                                    handleChange("ward_id", v);
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                                required={roleNeedsWard}
                            >
                                <option value="">
                                    {loadingWards ? "Loading wards…" : "Select ward"}
                                </option>
                                {availableWards.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                            {errWards && (
                                <p className="mt-2 text-xs text-red-600">{errWards}</p>
                            )}
                        </div>
                    )}

                    {roleNeedsPollingStation && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Polling Station
                            </label>
                            <select
                                value={selectedPollingStationId}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    onPollingStationSelectChange(v);
                                    handleChange("polling_station_id", v);
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                                required={roleNeedsPollingStation}
                            >
                                <option value="">
                                    {loadingPollingStations
                                        ? "Loading polling stations…"
                                        : "Select polling station"}
                                </option>
                                {availablePollingStations.map((ps) => (
                                    <option key={ps.id} value={ps.id}>
                                        {ps.name}
                                    </option>
                                ))}
                            </select>
                            {errPollingStations && (
                                <p className="mt-2 text-xs text-red-600">{errPollingStations}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/** Step 3: Assignments */
export function StepAssignments({
    formData,
    handleChange,
    loadingPositions,
    errPositions,
    sortedPositions,
    togglePosition,
    selectAllPositions,
    clearAllPositions,
    positionQuery,
    setPositionQuery,
}: {
    formData: { positions: number[]; can_transmit: boolean };
    handleChange: HandleChange;

    loadingPositions: boolean;
    errPositions: string | null;
    sortedPositions: PoliticalPositionOption[];

    togglePosition: (id: number) => void;
    selectAllPositions: () => void;
    clearAllPositions: () => void;

    positionQuery: string;
    setPositionQuery: (v: string) => void;
}) {
    const filtered = sortedPositions.filter((p) =>
        String(p.position_name || "")
            .toLowerCase()
            .includes(positionQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Transmission</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Allows this user to transmit results where assigned.
                        </p>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={!!formData.can_transmit}
                            onChange={(e) => handleChange("can_transmit", e.target.checked)}
                            className="h-4 w-4"
                        />
                        <span className="text-slate-800">Can transmit</span>
                    </label>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Positions</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Select one or more positions to assign.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={selectAllPositions}
                            className="px-3 py-1.5 text-xs border rounded-xl hover:bg-slate-50"
                            disabled={loadingPositions || sortedPositions.length === 0}
                        >
                            Select all
                        </button>
                        <button
                            type="button"
                            onClick={clearAllPositions}
                            className="px-3 py-1.5 text-xs border rounded-xl hover:bg-slate-50"
                            disabled={(formData.positions || []).length === 0}
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="mt-3">
                    <input
                        value={positionQuery}
                        onChange={(e) => setPositionQuery(e.target.value)}
                        placeholder="Search positions…"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                    />
                </div>

                <div className="mt-3">
                    {loadingPositions && (
                        <p className="text-xs text-slate-500">Loading positions…</p>
                    )}
                    {errPositions && <p className="text-xs text-red-600">{errPositions}</p>}

                    {!loadingPositions && !errPositions && filtered.length === 0 && (
                        <p className="text-xs text-slate-500">No positions match your search.</p>
                    )}

                    {!loadingPositions && !errPositions && filtered.length > 0 && (
                        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                            {filtered.map((p) => {
                                const checked = (formData.positions || []).includes(p.position_id);
                                return (
                                    <label
                                        key={p.position_id}
                                        className="flex items-start gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePosition(p.position_id)}
                                            className="mt-1 h-4 w-4"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">
                                                {p.position_name}
                                            </span>
                                            {p.position_level && (
                                                <span className="text-xs text-slate-500">
                                                    {p.position_level}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Footer */
export function WizardFooter({
    onClose,
    creatingUser,
    canCreateUsers,
    userRegionType,
    isSuperAdmin,
    step,
    setStep,
    canNext,
}: {
    onClose: () => void;
    creatingUser: boolean;
    canCreateUsers: boolean;
    userRegionType: UserRegionType;
    isSuperAdmin: boolean;

    step: number;
    setStep: (n: number) => void;
    canNext: boolean;
}) {
    const isLast = step === 3;

    return (
        <div className="sticky bottom-0 bg-white border-t px-4 py-3">
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 text-sm rounded-xl border hover:bg-slate-50"
                >
                    Cancel
                </button>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setStep(Math.max(1, step - 1))}
                        disabled={step === 1}
                        className="px-3 py-2 text-sm rounded-xl border hover:bg-slate-50 disabled:opacity-50"
                    >
                        Back
                    </button>

                    {!isLast ? (
                        <button
                            type="button"
                            onClick={() => setStep(step + 1)}
                            disabled={!canNext}
                            className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={
                                creatingUser ||
                                !canCreateUsers ||
                                userRegionType === "" ||
                                (userRegionType === "DIASPORA" && !isSuperAdmin)
                            }
                            className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                        >
                            {creatingUser ? "Creating…" : "Create User"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Modal shell (fixed desktop centering + safe viewport height) */
export function ModalShell({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 p-3 sm:p-6 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
        >
            {/* backdrop layer */}
            <div className="absolute inset-0" />

            {/* modal panel */}
            <div
                className="
          relative
          w-full
          sm:max-w-3xl
          bg-white
          rounded-2xl
          shadow-2xl
          border border-black/5
          max-h-[calc(100vh-2rem)]
          sm:max-h-[calc(100vh-4rem)]
          flex flex-col
          overflow-hidden
        "
            >
                {children}
            </div>
        </div>
    );
}
