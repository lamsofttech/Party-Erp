// src/components/roles/AddUserModal.tsx
import React, { useEffect, useMemo, useState } from "react";
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

type AddUserFormData = {
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

/** ✅ Must match AddUserModalSections.tsx */
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

    onSubmit: (e: React.FormEvent) => void;

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

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

async function readJsonOrText(
    res: Response
): Promise<{ json: any | null; text: string }> {
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

    if (!isOpen) return null;

    // Wizard state
    const [step, setStep] = useState(1);
    const [positionQuery, setPositionQuery] = useState("");

    // Diaspora
    const [diasporaCountries, setDiasporaCountries] = useState<DiasporaCountry[]>(
        []
    );
    const [loadingDiaspora, setLoadingDiaspora] = useState(false);
    const [diasporaError, setDiasporaError] = useState<string | null>(null);

    // Region
    const [userRegionType, setUserRegionType] = useState<UserRegionType>("");

    // Positions
    const [availablePositions, setAvailablePositions] = useState<
        PoliticalPositionOption[]
    >([]);
    const [loadingPositions, setLoadingPositions] = useState(false);
    const [errPositions, setErrPositions] = useState<string | null>(null);

    const selectedRoleUpper = (formData.role || "").toUpperCase();
    const diasporaRoleList = ["DIASPORA_OFFICER", "DIASPORA_AGENT"] as const;
    const isDiasporaRole =
        selectedRoleUpper === "DIASPORA_OFFICER" ||
        selectedRoleUpper === "DIASPORA_AGENT";
    const isSuperAdmin = currentUserRole.toUpperCase() === "SUPER_ADMIN";

    /** ✅ Fix: make handleChange match the exact union type expected by sections */
    const handleChange: HandleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

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

    // Infer region from existing formData when modal opens
    useEffect(() => {
        if (!isOpen) return;

        if (formData.country_id && formData.country_id !== "") {
            setUserRegionType("DIASPORA");
        } else if (
            formData.county_id ||
            formData.constituency_id ||
            formData.ward_id ||
            formData.polling_station_id
        ) {
            setUserRegionType("KENYA");
        } else {
            setUserRegionType("");
        }
    }, [
        isOpen,
        formData.country_id,
        formData.county_id,
        formData.constituency_id,
        formData.ward_id,
        formData.polling_station_id,
    ]);

    // Reset wizard when opened
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setPositionQuery("");
    }, [isOpen]);

    // Switch between Kenya vs Diaspora flows (preserves your original logic)
    useEffect(() => {
        if (!userRegionType) return;

        const roleUpper = (formData.role || "").toUpperCase();

        if (userRegionType === "DIASPORA") {
            onCountySelectChange("");
            onConstituencySelectChange("");
            onWardSelectChange("");
            onPollingStationSelectChange("");

            setFormData((prev) => ({
                ...prev,
                county_id: "",
                constituency_id: "",
                ward_id: "",
                polling_station_id: "",
                role: diasporaRoleList.includes(roleUpper as any) ? prev.role : "",
            }));
        }

        if (userRegionType === "KENYA") {
            setFormData((prev) => ({
                ...prev,
                country_id: "",
                role: diasporaRoleList.includes(roleUpper as any) ? "" : prev.role,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userRegionType]);

    useEffect(() => {
        const roleUpper = (formData.role || "").toUpperCase();

        if (userRegionType === "DIASPORA") {
            if (!diasporaRoleList.includes(roleUpper as any))
                setFormData((prev) => ({ ...prev, role: "" }));
        } else if (userRegionType === "KENYA") {
            if (diasporaRoleList.includes(roleUpper as any))
                setFormData((prev) => ({ ...prev, role: "" }));
        }
    }, [userRegionType, formData.role, setFormData]);

    // Diaspora loader
    useEffect(() => {
        if (!isOpen || userRegionType !== "DIASPORA") return;

        setFormData((prev) => ({ ...prev, country_id: prev.country_id || "" }));
        if (diasporaCountries.length > 0) return;

        const loadCountries = async () => {
            try {
                setLoadingDiaspora(true);
                const res = await fetch("/API/get_diaspora_countries.php");
                const data = await res.json();

                if (!res.ok || data.success !== true)
                    throw new Error(data.message || "Failed to load countries");

                setDiasporaCountries(
                    data.data.map((c: any) => ({
                        id: Number(c.id),
                        name: String(c.name),
                        iso_code: c.code ?? null,
                    }))
                );
                setDiasporaError(null);
            } catch (err) {
                console.error("Failed to load diaspora countries", err);
                setDiasporaError("Could not load diaspora countries");
                showToast({
                    title: "Could not load diaspora countries",
                    description: "Please try again.",
                    intent: "warning",
                });
            } finally {
                setLoadingDiaspora(false);
            }
        };

        loadCountries();
    }, [isOpen, userRegionType, diasporaCountries.length, setFormData, showToast]);

    // Load political positions
    useEffect(() => {
        if (!isOpen) return;
        if (availablePositions.length > 0) return;

        const loadPositions = async () => {
            setLoadingPositions(true);
            setErrPositions(null);

            try {
                const token = getToken();
                const res = await fetch(POSITIONS_ENDPOINT, {
                    method: "GET",
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });

                const { json, text } = await readJsonOrText(res);

                if (!json) {
                    console.error("Positions endpoint returned non-JSON response:", text);
                    setErrPositions(
                        "Positions endpoint returned non-JSON response (check server output)."
                    );
                    showToast({
                        title: "Failed to load positions",
                        description:
                            "Server returned non-JSON. Check API response in Network tab.",
                        intent: "warning",
                    });
                    return;
                }

                if (!res.ok || json.status !== "success" || !Array.isArray(json.data)) {
                    console.error("Positions endpoint returned error:", {
                        http: res.status,
                        json,
                    });
                    setErrPositions(json.message || `Failed to load positions (HTTP ${res.status})`);
                    return;
                }

                const mapped: PoliticalPositionOption[] = json.data.map((r: any) => ({
                    position_id: Number(r.position_id),
                    position_name: String(r.position_name),
                    position_level: r.position_level ?? null,
                    seniority_rank:
                        r.seniority_rank !== undefined ? Number(r.seniority_rank) : null,
                }));

                setAvailablePositions(mapped);
            } catch (e) {
                console.error("Failed to load positions", e);
                setErrPositions("Could not load positions. Check API endpoint and token.");
            } finally {
                setLoadingPositions(false);
            }
        };

        loadPositions();
    }, [isOpen, availablePositions.length, showToast]);

    // Role options based on region + permissions (unchanged)
    const filteredRoles = creatableRoles.filter((role) => {
        const rUpper = role.toUpperCase();

        if (userRegionType === "DIASPORA") {
            if (!isSuperAdmin) return false;
            return rUpper === "DIASPORA_OFFICER" || rUpper === "DIASPORA_AGENT";
        }

        if (rUpper === "DIASPORA_OFFICER" || rUpper === "DIASPORA_AGENT") return false;
        return true;
    });

    // Positions selection helpers
    const togglePosition = (positionId: number) => {
        const exists = (formData.positions || []).includes(positionId);
        const next = exists
            ? (formData.positions || []).filter((id) => id !== positionId)
            : [...(formData.positions || []), positionId];

        handleChange("positions", next);
    };

    const selectAllPositions = () => {
        handleChange(
            "positions",
            sortedPositions.map((p) => p.position_id)
        );
    };

    const clearAllPositions = () => handleChange("positions", []);

    // Wizard "Next" validation (simple + industry)
    const canNext =
        step === 1
            ? !!formData.email && !!formData.name && !!formData.role && userRegionType !== ""
            : step === 2
                ? userRegionType === "DIASPORA"
                    ? !!formData.country_id
                    : true
                : true;

    return (
        <ModalShell>
            <ModalHeader currentUserRole={currentUserRole} onClose={onClose} step={step} />

            <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-4 py-4">
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
