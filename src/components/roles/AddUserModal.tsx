// src/components/roles/AddUserModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ModalShell,
    ModalHeader,
    StepUserAndRole,
    StepJurisdiction,
    StepAssignments,
    WizardFooter,
} from "./AddUserModalSections";

type UserRegionType = "KENYA" | "DIASPORA" | "";

export interface PoliticalPositionOption {
    position_id: number;
    position_name: string;
    position_level?: string | null;
    seniority_rank?: number | null;
}

export type AddUserFormData = {
    email: string;
    name: string;
    role: string;

    county_id: string;
    constituency_id: string;
    ward_id: string;
    polling_station_id?: string;
    country_id?: string;

    positions: number[];
    can_transmit: boolean;
};

/** Must match AddUserModalSections.tsx */
export type AddUserField =
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

export type HandleChange = (field: AddUserField, value: any) => void;

interface Props {
    isOpen: boolean;
    onClose: () => void;

    onSubmit: (form: AddUserFormData, region: UserRegionType) => Promise<void> | void;

    creatingUser: boolean;
    canCreateUsers: boolean;

    currentUserRole: string;

    formData: AddUserFormData;
    setFormData: React.Dispatch<React.SetStateAction<AddUserFormData>>;

    creatableRoles: string[];
    canSpecifyRegion: boolean;
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

    showToast: (opts: {
        title: string;
        description?: string;
        intent?: "success" | "info" | "warning" | "critical";
    }) => void;
}

interface DiasporaCountry {
    id: number;
    name: string;
    iso_code?: string | null;
}

const API_BASE = "https://skizagroundsuite.com/API/api";
const POSITIONS_ENDPOINT = `${API_BASE}/political_positions.php`;

const DIASPORA_ROLES = ["DIASPORA_OFFICER", "DIASPORA_AGENT"] as const;

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

async function readJsonOrText(res: Response): Promise<{ json: any | null; text: string }> {
    const text = await res.text();
    try {
        const json = text ? JSON.parse(text) : null;
        return { json, text };
    } catch {
        return { json: null, text };
    }
}

const AddUserModal: React.FC<Props> = (props) => {
    const {
        isOpen,
        onClose,
        onSubmit,
        creatingUser,
        canCreateUsers,
        currentUserRole,
        formData,
        setFormData,
        creatableRoles,
        canSpecifyRegion,
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
        showToast,
    } = props;

    // Hooks must run on every render (no early return before hooks)
    const [step, setStep] = useState(1);
    const [positionQuery, setPositionQuery] = useState("");

    const [diasporaCountries, setDiasporaCountries] = useState<DiasporaCountry[]>([]);
    const [loadingDiaspora, setLoadingDiaspora] = useState(false);
    const [diasporaError, setDiasporaError] = useState<string | null>(null);

    const [userRegionType, setUserRegionType] = useState<UserRegionType>("");

    const [availablePositions, setAvailablePositions] = useState<PoliticalPositionOption[]>([]);
    const [loadingPositions, setLoadingPositions] = useState(false);
    const [errPositions, setErrPositions] = useState<string | null>(null);

    const isSuperAdmin = (currentUserRole || "").toUpperCase() === "SUPER_ADMIN";
    const roleUpper = (formData.role || "").toUpperCase();

    // Avoid re-creating handlers (stability helps with Suspense + strict mode)
    const handleChange: HandleChange = useCallback(
        (field, value) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
        },
        [setFormData]
    );

    const sortedPositions = useMemo(() => {
        const copy = [...(availablePositions || [])];
        copy.sort((a, b) => {
            const ar = a.seniority_rank ?? 999999;
            const br = b.seniority_rank ?? 999999;
            if (ar !== br) return ar - br;
            return String(a.position_name).localeCompare(String(b.position_name));
        });
        return copy;
    }, [availablePositions]);

    // Reset wizard state on open
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setPositionQuery("");
    }, [isOpen]);

    // Infer region on open (or when relevant form fields change while open)
    useEffect(() => {
        if (!isOpen) return;

        const next: UserRegionType =
            formData.country_id && formData.country_id !== ""
                ? "DIASPORA"
                : formData.county_id || formData.constituency_id || formData.ward_id || formData.polling_station_id
                    ? "KENYA"
                    : "";

        setUserRegionType(next);
    }, [
        isOpen,
        formData.country_id,
        formData.county_id,
        formData.constituency_id,
        formData.ward_id,
        formData.polling_station_id,
    ]);

    // Kenya <-> Diaspora switch cleanup (idempotent; no thrash)
    useEffect(() => {
        if (!isOpen) return;
        if (!userRegionType) return;

        if (userRegionType === "DIASPORA") {
            // clear kenya selections
            onCountySelectChange("");
            onConstituencySelectChange("");
            onWardSelectChange("");
            onPollingStationSelectChange("");

            setFormData((prev) => {
                const prevRoleUpper = (prev.role || "").toUpperCase();
                const keepRole = DIASPORA_ROLES.includes(prevRoleUpper as any);

                // if already clean, return prev (prevents unnecessary rerenders)
                const next = {
                    ...prev,
                    county_id: "",
                    constituency_id: "",
                    ward_id: "",
                    polling_station_id: "",
                    role: keepRole ? prev.role : "",
                };

                const unchanged =
                    next.county_id === prev.county_id &&
                    next.constituency_id === prev.constituency_id &&
                    next.ward_id === prev.ward_id &&
                    next.polling_station_id === prev.polling_station_id &&
                    next.role === prev.role;

                return unchanged ? prev : next;
            });
        }

        if (userRegionType === "KENYA") {
            setFormData((prev) => {
                const prevRoleUpper = (prev.role || "").toUpperCase();
                const isDiasporaRole = DIASPORA_ROLES.includes(prevRoleUpper as any);

                const next = {
                    ...prev,
                    country_id: "",
                    role: isDiasporaRole ? "" : prev.role,
                };

                const unchanged = next.country_id === prev.country_id && next.role === prev.role;
                return unchanged ? prev : next;
            });
        }
    }, [
        isOpen,
        userRegionType,
        onCountySelectChange,
        onConstituencySelectChange,
        onWardSelectChange,
        onPollingStationSelectChange,
        setFormData,
    ]);

    // Diaspora loader (cancellable)
    useEffect(() => {
        if (!isOpen || userRegionType !== "DIASPORA") return;

        let cancelled = false;

        // ensure controlled field
        setFormData((prev) => ({ ...prev, country_id: prev.country_id || "" }));

        if (diasporaCountries.length > 0) return;

        const loadCountries = async () => {
            try {
                setLoadingDiaspora(true);
                setDiasporaError(null);

                const res = await fetch("/API/get_diaspora_countries.php");
                const data = await res.json();

                if (!res.ok || data.success !== true) {
                    throw new Error(data.message || "Failed to load countries");
                }

                if (cancelled) return;

                setDiasporaCountries(
                    (data.data || []).map((c: any) => ({
                        id: Number(c.id),
                        name: String(c.name),
                        iso_code: c.code ?? null,
                    }))
                );
            } catch (err) {
                console.error("Failed to load diaspora countries", err);
                if (cancelled) return;

                setDiasporaError("Could not load diaspora countries");
                showToast({
                    title: "Could not load diaspora countries",
                    description: "Please try again.",
                    intent: "warning",
                });
            } finally {
                if (!cancelled) setLoadingDiaspora(false);
            }
        };

        loadCountries();

        return () => {
            cancelled = true;
        };
    }, [isOpen, userRegionType, diasporaCountries.length, setFormData, showToast]);

    // Load positions (cancellable, and only once per open session)
    const positionsLoadedRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            positionsLoadedRef.current = false;
            return;
        }
        if (positionsLoadedRef.current) return;
        if (availablePositions.length > 0) {
            positionsLoadedRef.current = true;
            return;
        }

        let cancelled = false;

        const loadPositions = async () => {
            setLoadingPositions(true);
            setErrPositions(null);

            try {
                const token = getToken();
                const res = await fetch(POSITIONS_ENDPOINT, {
                    method: "GET",
                    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                });

                const { json, text } = await readJsonOrText(res);

                if (!json) {
                    console.error("Positions endpoint returned non-JSON response:", text);
                    if (!cancelled) setErrPositions("Positions endpoint returned non-JSON response.");
                    return;
                }

                if (!res.ok || json.status !== "success" || !Array.isArray(json.data)) {
                    console.error("Positions endpoint returned error:", { http: res.status, json });
                    if (!cancelled) setErrPositions(json.message || `Failed to load positions (HTTP ${res.status})`);
                    return;
                }

                const mapped: PoliticalPositionOption[] = json.data.map((r: any) => ({
                    position_id: Number(r.position_id),
                    position_name: String(r.position_name),
                    position_level: r.position_level ?? null,
                    seniority_rank: r.seniority_rank !== undefined ? Number(r.seniority_rank) : null,
                }));

                if (cancelled) return;

                setAvailablePositions(mapped);
                positionsLoadedRef.current = true;
            } catch (e) {
                console.error("Failed to load positions", e);
                if (!cancelled) setErrPositions("Could not load positions. Check API endpoint and token.");
            } finally {
                if (!cancelled) setLoadingPositions(false);
            }
        };

        loadPositions();

        return () => {
            cancelled = true;
        };
    }, [isOpen, availablePositions.length]);

    // Role options
    const filteredRoles = useMemo(() => {
        return creatableRoles.filter((role) => {
            const rUpper = role.toUpperCase();

            if (userRegionType === "DIASPORA") {
                if (!isSuperAdmin) return false;
                return rUpper === "DIASPORA_OFFICER" || rUpper === "DIASPORA_AGENT";
            }

            if (rUpper === "DIASPORA_OFFICER" || rUpper === "DIASPORA_AGENT") return false;
            return true;
        });
    }, [creatableRoles, userRegionType, isSuperAdmin]);

    // Position helpers
    const togglePosition = useCallback(
        (positionId: number) => {
            const exists = (formData.positions || []).includes(positionId);
            const next = exists
                ? (formData.positions || []).filter((id) => id !== positionId)
                : [...(formData.positions || []), positionId];

            handleChange("positions", next);
        },
        [formData.positions, handleChange]
    );

    const selectAllPositions = useCallback(() => {
        handleChange(
            "positions",
            sortedPositions.map((p) => p.position_id)
        );
    }, [handleChange, sortedPositions]);

    const clearAllPositions = useCallback(() => handleChange("positions", []), [handleChange]);

    const kenyaStep2Ok =
        (!roleNeedsCounty || !!formData.county_id) &&
        (!roleNeedsConstituency || !!formData.constituency_id) &&
        (!roleNeedsWard || !!formData.ward_id) &&
        (!roleNeedsPollingStation || !!formData.polling_station_id);

    const canNext =
        step === 1
            ? !!formData.email && !!formData.name && !!formData.role && userRegionType !== ""
            : step === 2
                ? userRegionType === "DIASPORA"
                    ? !!formData.country_id
                    : kenyaStep2Ok
                : true;

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            if (!canCreateUsers) {
                showToast({ title: "You do not have permission to create users.", intent: "warning" });
                return;
            }

            if (!userRegionType) {
                showToast({ title: "Select user location (Kenya or Diaspora).", intent: "warning" });
                return;
            }

            if (userRegionType === "DIASPORA" && !isSuperAdmin) {
                showToast({ title: "Only SUPER_ADMIN can create diaspora users.", intent: "warning" });
                return;
            }

            if (step !== 3) {
                setStep(3);
                return;
            }

            if (!formData.email || !formData.name || !formData.role) {
                showToast({ title: "Fill Email, Name and Role.", intent: "warning" });
                return;
            }

            if (userRegionType === "DIASPORA" && !formData.country_id) {
                showToast({ title: "Select diaspora country.", intent: "warning" });
                return;
            }

            if (userRegionType === "KENYA" && !kenyaStep2Ok) {
                showToast({ title: "Complete the required jurisdiction fields.", intent: "warning" });
                return;
            }

            try {
                await Promise.resolve(onSubmit(formData, userRegionType));
            } catch (err: any) {
                console.error("Add user submit failed:", err);
                showToast({
                    title: "Failed to create user",
                    description: err?.message ? String(err.message) : "Please try again.",
                    intent: "critical",
                });
            }
        },
        [canCreateUsers, formData, isSuperAdmin, kenyaStep2Ok, onSubmit, showToast, step, userRegionType]
    );

    // Return null only AFTER hooks
    if (!isOpen) return null;

    return (
        <ModalShell>
            <ModalHeader currentUserRole={currentUserRole} onClose={onClose} step={step} />

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4">
                {step === 1 && (
                    <StepUserAndRole
                        userRegionType={userRegionType}
                        setUserRegionType={setUserRegionType}
                        isSuperAdmin={isSuperAdmin}
                        formData={formData}
                        handleChange={handleChange}
                        filteredRoles={filteredRoles}
                    />
                )}

                {step === 2 && (
                    <StepJurisdiction
                        userRegionType={userRegionType}
                        canSpecifyRegion={canSpecifyRegion}
                        diasporaCountries={diasporaCountries}
                        loadingDiaspora={loadingDiaspora}
                        diasporaError={diasporaError}
                        roleNeedsCounty={roleNeedsCounty}
                        roleNeedsConstituency={roleNeedsConstituency}
                        roleNeedsWard={roleNeedsWard}
                        roleNeedsPollingStation={roleNeedsPollingStation}
                        selectedCountyCode={selectedCountyCode}
                        selectedConstituencyCode={selectedConstituencyCode}
                        selectedWardCode={selectedWardCode}
                        selectedPollingStationId={selectedPollingStationId}
                        onCountySelectChange={onCountySelectChange}
                        onConstituencySelectChange={onConstituencySelectChange}
                        onWardSelectChange={onWardSelectChange}
                        onPollingStationSelectChange={onPollingStationSelectChange}
                        availableCounties={availableCounties}
                        availableConstituencies={availableConstituencies}
                        availableWards={availableWards}
                        availablePollingStations={availablePollingStations}
                        loadingCounties={loadingCounties}
                        loadingConstituencies={loadingConstituencies}
                        loadingWards={loadingWards}
                        loadingPollingStations={loadingPollingStations}
                        errCounties={errCounties}
                        errConstituencies={errConstituencies}
                        errWards={errWards}
                        errPollingStations={errPollingStations}
                        formData={formData}
                        handleChange={handleChange}
                    />
                )}

                {step === 3 && (
                    <StepAssignments
                        formData={formData}
                        handleChange={handleChange}
                        loadingPositions={loadingPositions}
                        errPositions={errPositions}
                        sortedPositions={sortedPositions}
                        togglePosition={togglePosition}
                        selectAllPositions={selectAllPositions}
                        clearAllPositions={clearAllPositions}
                        positionQuery={positionQuery}
                        setPositionQuery={setPositionQuery}
                    />
                )}

                <WizardFooter
                    onClose={onClose}
                    creatingUser={creatingUser}
                    canCreateUsers={canCreateUsers}
                    userRegionType={userRegionType}
                    isSuperAdmin={isSuperAdmin}
                    step={step}
                    setStep={setStep}
                    canNext={canNext}
                />
            </form>
        </ModalShell>
    );
};

export default AddUserModal;
