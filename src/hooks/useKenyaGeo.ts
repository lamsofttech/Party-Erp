import { useEffect, useState, useCallback } from "react";
import { GEO_BASE, fetchWithTimeout } from "../utils/api";
import { fromCache, cacheSet } from "../utils/storage";
import type {
    County,
    Constituency,
    Ward,
    PollingStation,
} from "../types/users";

interface UseKenyaGeoOptions {
    canSpecifyRegion: boolean;
}

export const useKenyaGeo = ({ canSpecifyRegion }: UseKenyaGeoOptions) => {
    const [availableCounties, setAvailableCounties] = useState<County[]>([]);
    const [availableConstituencies, setAvailableConstituencies] = useState<
        Constituency[]
    >([]);
    const [availableWards, setAvailableWards] = useState<Ward[]>([]);
    const [availablePollingStations, setAvailablePollingStations] = useState<
        PollingStation[]
    >([]);

    const [selectedCountyCode, setSelectedCountyCode] = useState<string>("");
    const [selectedConstituencyCode, setSelectedConstituencyCode] =
        useState<string>("");
    const [selectedWardCode, setSelectedWardCode] = useState<string>("");
    const [selectedPollingStationId, setSelectedPollingStationId] =
        useState<string>("");

    const [loadingCounties, setLoadingCounties] = useState(false);
    const [loadingConstituencies, setLoadingConstituencies] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [loadingPollingStations, setLoadingPollingStations] = useState(false);

    const [errCounties, setErrCounties] = useState<string | null>(null);
    const [errConstituencies, setErrConstituencies] = useState<string | null>(null);
    const [errWards, setErrWards] = useState<string | null>(null);
    const [errPollingStations, setErrPollingStations] = useState<string | null>(null);

    /* ===== Counties ===== */
    useEffect(() => {
        if (!canSpecifyRegion) return;

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
            } catch {
                if (!alive) return;
                setErrCounties("Could not load counties");
                setAvailableCounties([]);
            } finally {
                if (alive) setLoadingCounties(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [canSpecifyRegion]);

    /* ===== Constituencies ===== */
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
                const res = await fetchWithTimeout(
                    `${GEO_BASE}/get_constituencies.php?county_code=${encodeURIComponent(
                        selectedCountyCode
                    )}`
                );
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
            } catch {
                if (!alive) return;
                setErrConstituencies("Could not load constituencies");
                setAvailableConstituencies([]);
            } finally {
                if (alive) setLoadingConstituencies(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedCountyCode]);

    /* ===== Wards & Polling Stations ===== */
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
                const res = await fetchWithTimeout(
                    `${GEO_BASE}/get_wards.php?const_code=${encodeURIComponent(
                        selectedConstituencyCode
                    )}`
                );
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
            } catch {
                if (!alive) return;
                setErrWards("Could not load wards");
                setAvailableWards([]);
            } finally {
                if (alive) setLoadingWards(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedConstituencyCode]);

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

            const cacheKey = `pollingStations:${selectedWardCode}:v1`;
            const cached = fromCache<any>(cacheKey);

            const mapToStations = (
                src: any[],
                wardCode: string
            ): PollingStation[] => {
                return src
                    .map((it: any) => {
                        const id =
                            it.polling_station_id ??
                            it.station_id ??
                            it.id ??
                            it.code ??
                            null;

                        const name =
                            it.polling_station_name ??
                            it.name ??
                            it.station_name ??
                            it.label ??
                            it.description ??
                            "";

                        if (!id || !name) return null;

                        return {
                            id: String(id),
                            name: String(name),
                            ward_code: wardCode,
                        } as PollingStation;
                    })
                    .filter(Boolean) as PollingStation[];
            };

            if (cached) {
                if (!alive) return;
                const list = Array.isArray(cached)
                    ? cached
                    : Array.isArray((cached as any).data)
                        ? (cached as any).data
                        : [];
                setAvailablePollingStations(mapToStations(list, selectedWardCode));
                setLoadingPollingStations(false);
                return;
            }

            try {
                const res = await fetchWithTimeout(
                    `${GEO_BASE}/get_polling_stations_for_roles.php?ward_code=${encodeURIComponent(
                        selectedWardCode
                    )}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                cacheSet(cacheKey, json);
                if (!alive) return;

                const list = Array.isArray(json)
                    ? json
                    : Array.isArray((json as any).data)
                        ? (json as any).data
                        : [];

                setAvailablePollingStations(mapToStations(list, selectedWardCode));
            } catch {
                if (!alive) return;
                setErrPollingStations("Could not load polling stations");
                setAvailablePollingStations([]);
            } finally {
                if (alive) setLoadingPollingStations(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedWardCode]);

    /* ===== Change handlers (used by parent + modal) ===== */

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
    };
};
