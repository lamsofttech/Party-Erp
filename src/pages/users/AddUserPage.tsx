// src/pages/users/AddUserPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddUserModal from "../../components/roles/AddUserModal";
import { useUser } from "../../contexts/UserContext";
import { toast } from "../../components/swirl-toast";

type County = { id: string; name: string; code: string };
type Constituency = { id: string; name: string; county_code: string };
type Ward = { id: string; name: string; const_code: string };
type PollingStation = { id: string; name: string; ward_code: string };

const API_BASE = "/API";
const GEO_BASE = API_BASE;

const safeJson = async (res: Response) => {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const deriveUsernameFromEmail = (email: string) => {
    const left = (email || "").split("@")[0] || "";
    const cleaned = left.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 50);
    return cleaned || `user_${Date.now()}`;
};

const getCreatableRoles = (creatorRole: string): string[] => {
    const role = creatorRole.toUpperCase();
    switch (role) {
        case "SUPER_ADMIN":
            return [
                "NATIONAL_OFFICER",
                "COUNTY_OFFICER",
                "CONSTITUENCY_OFFICER",
                "WARD_OFFICER",
                "AGENT",
                "DIASPORA_OFFICER",
                "DIASPORA_AGENT",
            ];
        case "NATIONAL_OFFICER":
            return ["COUNTY_OFFICER", "CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"];
        case "COUNTY_OFFICER":
            return ["CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"];
        case "CONSTITUENCY_OFFICER":
            return ["WARD_OFFICER", "AGENT"];
        case "WARD_OFFICER":
            return ["AGENT"];
        default:
            return [];
    }
};

const AddUserPage: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser, token, logout } = useUser();

    // open modal immediately because this is a page route
    const [open, setOpen] = useState(true);

    const currentUserRole = (currentUser?.role || "AGENT").toUpperCase();
    const creatableRoles = useMemo(() => getCreatableRoles(currentUserRole), [currentUserRole]);
    const canCreateUsers = creatableRoles.length > 0;

    const [creatingUser, setCreatingUser] = useState(false);

    const [formData, setFormData] = useState<{
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
    }>({
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
    });

    const canSpecifyRegion = true;

    const selectedRoleUpper = (formData.role || "").toUpperCase();
    const roleNeedsCounty = ["COUNTY_OFFICER", "CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"].includes(selectedRoleUpper);
    const roleNeedsConstituency = ["CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"].includes(selectedRoleUpper);
    const roleNeedsWard = ["WARD_OFFICER", "AGENT"].includes(selectedRoleUpper);
    const roleNeedsPollingStation = selectedRoleUpper === "AGENT";

    // geo data
    const [availableCounties, setAvailableCounties] = useState<County[]>([]);
    const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([]);
    const [availableWards, setAvailableWards] = useState<Ward[]>([]);
    const [availablePollingStations, setAvailablePollingStations] = useState<PollingStation[]>([]);

    const [selectedCountyCode, setSelectedCountyCode] = useState("");
    const [selectedConstituencyCode, setSelectedConstituencyCode] = useState("");
    const [selectedWardCode, setSelectedWardCode] = useState("");
    const [selectedPollingStationId, setSelectedPollingStationId] = useState("");

    const [loadingCounties, setLoadingCounties] = useState(false);
    const [loadingConstituencies, setLoadingConstituencies] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [loadingPollingStations, setLoadingPollingStations] = useState(false);

    const [errCounties, setErrCounties] = useState<string | null>(null);
    const [errConstituencies, setErrConstituencies] = useState<string | null>(null);
    const [errWards, setErrWards] = useState<string | null>(null);
    const [errPollingStations, setErrPollingStations] = useState<string | null>(null);

    // ============================
    // LOAD COUNTIES
    // ============================
    useEffect(() => {
        if (!token || !canSpecifyRegion) return;

        let alive = true;
        (async () => {
            setLoadingCounties(true);
            setErrCounties(null);
            try {
                const res = await fetch(`${GEO_BASE}/get_counties.php`, { credentials: "include" });
                const json = await safeJson(res);
                if (!alive) return;

                if (res.ok && json?.status === "success" && Array.isArray(json.data)) {
                    setAvailableCounties(
                        json.data.map((it: any) => ({
                            id: it.county_code,
                            name: it.county_name,
                            code: it.county_code,
                        }))
                    );
                } else {
                    throw new Error(json?.message || "Failed to load counties");
                }
            } catch (e: any) {
                if (!alive) return;
                setErrCounties(e?.message || "Failed to load counties");
                setAvailableCounties([]);
            } finally {
                if (alive) setLoadingCounties(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [token, canSpecifyRegion]);

    // constituencies
    useEffect(() => {
        if (!selectedCountyCode) {
            setAvailableConstituencies([]);
            setSelectedConstituencyCode("");
            setAvailableWards([]);
            setSelectedWardCode("");
            setAvailablePollingStations([]);
            setSelectedPollingStationId("");
            return;
        }

        let alive = true;
        (async () => {
            setLoadingConstituencies(true);
            setErrConstituencies(null);
            try {
                const url = `${GEO_BASE}/get_constituencies.php?county_code=${encodeURIComponent(selectedCountyCode)}`;
                const res = await fetch(url, { credentials: "include" });
                const json = await safeJson(res);
                if (!alive) return;

                if (res.ok && json?.status === "success" && Array.isArray(json.data)) {
                    setAvailableConstituencies(
                        json.data.map((it: any) => ({
                            id: it.const_code,
                            name: it.constituency_name,
                            county_code: selectedCountyCode,
                        }))
                    );
                } else {
                    throw new Error(json?.message || "Failed to load constituencies");
                }
            } catch (e: any) {
                if (!alive) return;
                setErrConstituencies(e?.message || "Failed to load constituencies");
                setAvailableConstituencies([]);
            } finally {
                if (alive) setLoadingConstituencies(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedCountyCode]);

    // wards
    useEffect(() => {
        if (!selectedConstituencyCode) {
            setAvailableWards([]);
            setSelectedWardCode("");
            setAvailablePollingStations([]);
            setSelectedPollingStationId("");
            return;
        }

        let alive = true;
        (async () => {
            setLoadingWards(true);
            setErrWards(null);
            try {
                const url = `${GEO_BASE}/get_wards.php?const_code=${encodeURIComponent(selectedConstituencyCode)}`;
                const res = await fetch(url, { credentials: "include" });
                const json = await safeJson(res);
                if (!alive) return;

                if (res.ok && json?.status === "success" && Array.isArray(json.data)) {
                    setAvailableWards(
                        json.data.map((it: any) => ({
                            id: it.ward_code,
                            name: it.ward_name,
                            const_code: selectedConstituencyCode,
                        }))
                    );
                } else {
                    throw new Error(json?.message || "Failed to load wards");
                }
            } catch (e: any) {
                if (!alive) return;
                setErrWards(e?.message || "Failed to load wards");
                setAvailableWards([]);
            } finally {
                if (alive) setLoadingWards(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedConstituencyCode]);

    // polling stations
    useEffect(() => {
        if (!selectedWardCode) {
            setAvailablePollingStations([]);
            setSelectedPollingStationId("");
            return;
        }

        let alive = true;
        (async () => {
            setLoadingPollingStations(true);
            setErrPollingStations(null);
            try {
                const url = `${GEO_BASE}/get_polling_stations_for_roles.php?ward_code=${encodeURIComponent(selectedWardCode)}`;
                const res = await fetch(url, { credentials: "include" });
                const json = await safeJson(res);
                if (!alive) return;

                const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
                const mapped: PollingStation[] = list
                    .map((it: any) => {
                        const id = it.polling_station_id ?? it.station_id ?? it.id ?? null;
                        const name = it.polling_station_name ?? it.name ?? it.station_name ?? "";
                        if (!id || !name) return null;
                        return { id: String(id), name: String(name), ward_code: selectedWardCode };
                    })
                    .filter(Boolean) as PollingStation[];

                setAvailablePollingStations(mapped);
            } catch (e: any) {
                if (!alive) return;
                setErrPollingStations(e?.message || "Failed to load polling stations");
                setAvailablePollingStations([]);
            } finally {
                if (alive) setLoadingPollingStations(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedWardCode]);

    // select handlers
    const onCountySelectChange = useCallback((code: string) => {
        setSelectedCountyCode(code);
        setSelectedConstituencyCode("");
        setSelectedWardCode("");
        setSelectedPollingStationId("");
        setAvailableConstituencies([]);
        setAvailableWards([]);
        setAvailablePollingStations([]);
        setFormData((prev) => ({
            ...prev,
            county_id: code,
            constituency_id: "",
            ward_id: "",
            polling_station_id: "",
        }));
    }, []);

    const onConstituencySelectChange = useCallback((id: string) => {
        setSelectedConstituencyCode(id);
        setSelectedWardCode("");
        setSelectedPollingStationId("");
        setAvailableWards([]);
        setAvailablePollingStations([]);
        setFormData((prev) => ({
            ...prev,
            constituency_id: id,
            ward_id: "",
            polling_station_id: "",
        }));
    }, []);

    const onWardSelectChange = useCallback((id: string) => {
        setSelectedWardCode(id);
        setSelectedPollingStationId("");
        setAvailablePollingStations([]);
        setFormData((prev) => ({
            ...prev,
            ward_id: id,
            polling_station_id: "",
        }));
    }, []);

    const onPollingStationSelectChange = useCallback((id: string) => {
        setSelectedPollingStationId(id);
        setFormData((prev) => ({
            ...prev,
            polling_station_id: id,
        }));
    }, []);

    // submit (same as your UserRolesManagement logic)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error("Missing auth token. Please log in again.");
            logout();
            return;
        }

        const email = formData.email.trim();
        const name = formData.name.trim();
        const role = formData.role.trim().toUpperCase();

        const diasporaRoles = ["DIASPORA_OFFICER", "DIASPORA_AGENT"];
        const isDiasporaRole = diasporaRoles.includes(role);

        const username = deriveUsernameFromEmail(email);

        const body: any = { username, email, name, role };
        body.positions = Array.isArray(formData.positions) ? formData.positions : [];
        body.can_transmit = !!formData.can_transmit;

        if (isDiasporaRole) {
            body.country_id = formData.country_id;
        } else {
            if (selectedCountyCode) body.county_id = selectedCountyCode;
            if (selectedConstituencyCode) body.constituency_id = selectedConstituencyCode;
            if (selectedWardCode) body.ward_id = selectedWardCode;
            if (selectedPollingStationId) body.polling_station_id = selectedPollingStationId;
        }

        setCreatingUser(true);
        try {
            const res = await fetch(`${API_BASE}/users.php`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const result = await safeJson(res);

            if (res.ok && result?.status === "success") {
                toast.success("User created successfully.");
                navigate(-1);
            } else {
                toast.error(result?.message || "Failed to add user.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to add user.");
        } finally {
            setCreatingUser(false);
        }
    };

    if (!token) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-6">
                <p className="text-red-600 text-sm">You must be logged in to add users.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* This is still a ROUTE PAGE - but uses modal UI */}
            <AddUserModal
                isOpen={open}
                onClose={() => {
                    setOpen(false);
                    navigate(-1);
                }}
                onSubmit={handleSubmit}
                creatingUser={creatingUser}
                canCreateUsers={canCreateUsers}
                currentUserRole={currentUserRole}
                formData={formData}
                setFormData={setFormData}
                creatableRoles={creatableRoles}
                canSpecifyRegion={canSpecifyRegion}
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
                showToast={({ title, description, intent }) => {
                    const msg = title + (description ? ` - ${description}` : "");
                    if (intent === "success") toast.success(msg);
                    else if (intent === "critical" || intent === "warning") toast.error(msg);
                    else toast.info(msg);
                }}
            />
        </div>
    );
};

export default AddUserPage;
