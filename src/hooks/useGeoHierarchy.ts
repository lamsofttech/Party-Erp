import { useCallback, useEffect, useState } from "react";
import { GEO_BASE, fetchWithTimeout } from "../lib/apiClient";
import { cacheSet, fromCache } from "../lib/sessionCache";
import type { County, Constituency, Ward, PollingStation } from "../types/roles";

export function useGeoHierarchy(enabled: boolean) {
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

    // counties
    useEffect(() => {
        if (!enabled) return;

        let alive = true;
        (async () => {
            setLoadingCounties(true);
            setErrCounties(null);

            const cached = fromCache<any>("counties:v1");
            if (cached?.status === "success" && Array.isArray(cached.data)) {
                if (!alive) return;
                setAvailableCounties(
                    cached.data.map((it: any) => ({
                        id: it.county_code,
                        name: it.county_name,
                        code: it.county_code,
                    }))
                );
                setLoadingCounties(false);
                return;
            }

            try {
                const res = await fetchWithTimeout(`${GEO_BASE}/get_counties.php`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet("counties:v1", json);

                if (!alive) return;
                if (json?.status === "success" && Array.isArray(json.data)) {
                    setAvailableCounties(
                        json.data.map((it: any) => ({
                            id: it.county_code,
                            name: it.county_name,
                            code: it.county_code,
                        }))
                    );
                } else {
                    throw new Error("Bad counties format");
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
    }, [enabled]);

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

            const cacheKey = `constituencies:${selectedCountyCode}:v1`;
            const cached = fromCache<any>(cacheKey);
            if (cached?.status === "success" && Array.isArray(cached.data)) {
                if (!alive) return;
                setAvailableConstituencies(
                    cached.data.map((it: any) => ({
                        id: it.const_code,
                        name: it.constituency_name,
                        county_code: selectedCountyCode,
                    }))
                );
                setLoadingConstituencies(false);
                return;
            }

            try {
                const url = `${GEO_BASE}/get_constituencies.php?county_code=${encodeURIComponent(selectedCountyCode)}`;
                const res = await fetchWithTimeout(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);

                if (!alive) return;
                if (json?.status === "success" && Array.isArray(json.data)) {
                    setAvailableConstituencies(
                        json.data.map((it: any) => ({
                            id: it.const_code,
                            name: it.constituency_name,
                            county_code: selectedCountyCode,
                        }))
                    );
                } else {
                    throw new Error("Bad constituencies format");
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

            const cacheKey = `wards:${selectedConstituencyCode}:v1`;
            const cached = fromCache<any>(cacheKey);
            if (cached?.status === "success" && Array.isArray(cached.data)) {
                if (!alive) return;
                setAvailableWards(
                    cached.data.map((it: any) => ({
                        id: it.ward_code,
                        name: it.ward_name,
                        const_code: selectedConstituencyCode,
                    }))
                );
                setLoadingWards(false);
                return;
            }

            try {
                const url = `${GEO_BASE}/get_wards.php?const_code=${encodeURIComponent(selectedConstituencyCode)}`;
                const res = await fetchWithTimeout(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);

                if (!alive) return;
                if (json?.status === "success" && Array.isArray(json.data)) {
                    setAvailableWards(
                        json.data.map((it: any) => ({
                            id: it.ward_code,
                            name: it.ward_name,
                            const_code: selectedConstituencyCode,
                        }))
                    );
                } else {
                    throw new Error("Bad wards format");
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

        const mapToStations = (src: any[], wardCode: string): PollingStation[] =>
            src
                .map((it: any) => {
                    const id = it.polling_station_id ?? it.station_id ?? it.id ?? it.code ?? null;
                    const name = it.polling_station_name ?? it.name ?? it.station_name ?? it.label ?? it.description ?? "";
                    if (!id || !name) return null;
                    return { id: String(id), name: String(name), ward_code: wardCode };
                })
                .filter(Boolean) as PollingStation[];

        let alive = true;
        (async () => {
            setLoadingPollingStations(true);
            setErrPollingStations(null);

            const cacheKey = `pollingStations:${selectedWardCode}:v1`;
            const cached = fromCache<any>(cacheKey);

            if (cached) {
                if (!alive) return;
                const list = Array.isArray(cached) ? cached : Array.isArray(cached?.data) ? cached.data : [];
                setAvailablePollingStations(mapToStations(list, selectedWardCode));
                setLoadingPollingStations(false);
                return;
            }

            try {
                const url = `${GEO_BASE}/get_polling_stations_for_roles.php?ward_code=${encodeURIComponent(selectedWardCode)}`;
                const res = await fetchWithTimeout(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);

                if (!alive) return;
                const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
                setAvailablePollingStations(mapToStations(list, selectedWardCode));
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

    const onCountySelectChange = useCallback((countyCode: string) => {
        setSelectedCountyCode(countyCode);
        setSelectedConstituencyCode("");
        setSelectedWardCode("");
        setSelectedPollingStationId("");
        setAvailableConstituencies([]);
        setAvailableWards([]);
        setAvailablePollingStations([]);
    }, []);

    const onConstituencySelectChange = useCallback((constCode: string) => {
        setSelectedConstituencyCode(constCode);
        setSelectedWardCode("");
        setSelectedPollingStationId("");
        setAvailableWards([]);
        setAvailablePollingStations([]);
    }, []);

    const onWardSelectChange = useCallback((wardCode: string) => {
        setSelectedWardCode(wardCode);
        setSelectedPollingStationId("");
        setAvailablePollingStations([]);
    }, []);

    const onPollingStationSelectChange = useCallback((stationId: string) => {
        setSelectedPollingStationId(stationId);
    }, []);

    const resetGeo = useCallback(() => {
        setSelectedCountyCode("");
        setSelectedConstituencyCode("");
        setSelectedWardCode("");
        setSelectedPollingStationId("");
        setAvailableConstituencies([]);
        setAvailableWards([]);
        setAvailablePollingStations([]);
    }, []);

    return {
        availableCounties,
        availableConstituencies,
        availableWards,
        availablePollingStations,

        selectedCountyCode,
        selectedConstituencyCode,
        selectedWardCode,
        selectedPollingStationId,

        loadingCounties,
        loadingConstituencies,
        loadingWards,
        loadingPollingStations,

        errCounties,
        errConstituencies,
        errWards,
        errPollingStations,

        onCountySelectChange,
        onConstituencySelectChange,
        onWardSelectChange,
        onPollingStationSelectChange,
        resetGeo,
    };
}
