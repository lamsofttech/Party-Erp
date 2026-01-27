import { useEffect, useMemo, useState } from "react";

type ApiOk<T> = { status: "success"; data: T };
type ApiErr = { status: "error"; message?: string };
type ApiResp<T> = ApiOk<T> | ApiErr;

export type County = { county_code: string; county_name: string };
export type Constituency = { const_code: string; constituency_name: string };
export type Ward = { ward_code: string; ward_name: string };
export type PollingStation = { ps_code: string; polling_station_name: string };

export type RegionLevel = "county" | "constituency" | "ward" | "pollingStation";

export type RegionSelection = {
    county?: { code: string; name: string };
    constituency?: { code: string; name: string };
    ward?: { code: string; name: string };
    pollingStation?: { code: string; name: string };
};

type RegionOptions = {
    counties: County[];
    constituencies: Constituency[];
    wards: Ward[];
    pollingStations: PollingStation[];
};

type RegionStatus = {
    loading: Partial<Record<RegionLevel, boolean>>;
    error: Partial<Record<RegionLevel, string | null>>;
};

type UseRegionalCascadeArgs = {
    cycle: number;
    apiBase?: string; // defaults to VITE_API_BASE_URL/... like your dashboard
};

const defaultApiBase = () => {
    const base = (import.meta as any).env?.VITE_API_BASE_URL;
    return base ? `${base}/API/voter-register` : "/API/voter-register";
};

async function apiGet<T>(apiBase: string, path: string) {
    const res = await fetch(`${apiBase}${path}`, { credentials: "include" });
    const json = (await res.json()) as ApiResp<T>;

    if (!res.ok || json.status !== "success") {
        const msg = (json as ApiErr)?.message || "API error";
        throw new Error(msg);
    }
    return json.data;
}

/**
 * ✅ The driver: one shared region cascade for the whole module.
 * County → Constituency → Ward → Polling Station
 *
 * Enforces:
 * - load counties once
 * - load next level only when parent selected
 * - reset all levels below the changed selection
 */
export function useRegionalCascade({ cycle, apiBase }: UseRegionalCascadeArgs) {
    const API_BASE = apiBase ?? defaultApiBase();

    const [selected, setSelected] = useState<RegionSelection>({});
    const [options, setOptions] = useState<RegionOptions>({
        counties: [],
        constituencies: [],
        wards: [],
        pollingStations: [],
    });

    const [status, setStatus] = useState<RegionStatus>({
        loading: {},
        error: {},
    });

    const setLoading = (level: RegionLevel, v: boolean) =>
        setStatus((s) => ({ ...s, loading: { ...s.loading, [level]: v } }));

    const setError = (level: RegionLevel, msg: string | null) =>
        setStatus((s) => ({ ...s, error: { ...s.error, [level]: msg } }));

    const resetBelow = (level: RegionLevel) => {
        if (level === "county") {
            setSelected({});
            setOptions((o) => ({ ...o, constituencies: [], wards: [], pollingStations: [] }));
            setError("constituency", null);
            setError("ward", null);
            setError("pollingStation", null);
            return;
        }

        if (level === "constituency") {
            setSelected((s) => ({ county: s.county }));
            setOptions((o) => ({ ...o, wards: [], pollingStations: [] }));
            setError("ward", null);
            setError("pollingStation", null);
            return;
        }

        if (level === "ward") {
            setSelected((s) => ({ county: s.county, constituency: s.constituency }));
            setOptions((o) => ({ ...o, pollingStations: [] }));
            setError("pollingStation", null);
            return;
        }
    };

    // -------- Load counties once (or when cycle changes) --------
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading("county", true);
                setError("county", null);

                const data = await apiGet<County[]>(
                    API_BASE,
                    `/get__counties.php?cycle=${encodeURIComponent(String(cycle))}`
                );

                if (!alive) return;
                setOptions((o) => ({ ...o, counties: data || [] }));
            } catch (e: any) {
                if (!alive) return;
                setOptions((o) => ({ ...o, counties: [] }));
                setError("county", e?.message || "Failed to load counties");
            } finally {
                if (alive) setLoading("county", false);
            }
        })();

        // reset selection when cycle changes
        resetBelow("county");

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cycle]);

    // -------- Load constituencies when county selected --------
    useEffect(() => {
        const countyCode = selected.county?.code;
        if (!countyCode) {
            setOptions((o) => ({ ...o, constituencies: [], wards: [], pollingStations: [] }));
            return;
        }

        let alive = true;

        (async () => {
            try {
                setLoading("constituency", true);
                setError("constituency", null);

                const data = await apiGet<Constituency[]>(
                    API_BASE,
                    `/get__constituencies.php?cycle=${encodeURIComponent(String(cycle))}&county_code=${encodeURIComponent(
                        countyCode
                    )}`
                );

                if (!alive) return;
                setOptions((o) => ({ ...o, constituencies: data || [] }));
            } catch (e: any) {
                if (!alive) return;
                setOptions((o) => ({ ...o, constituencies: [], wards: [], pollingStations: [] }));
                setError("constituency", e?.message || "Failed to load constituencies");
            } finally {
                if (alive) setLoading("constituency", false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [API_BASE, cycle, selected.county?.code]);

    // -------- Load wards when constituency selected --------
    useEffect(() => {
        const constCode = selected.constituency?.code;
        if (!constCode) {
            setOptions((o) => ({ ...o, wards: [], pollingStations: [] }));
            return;
        }

        let alive = true;

        (async () => {
            try {
                setLoading("ward", true);
                setError("ward", null);

                const data = await apiGet<Ward[]>(
                    API_BASE,
                    `/get__wards.php?cycle=${encodeURIComponent(String(cycle))}&const_code=${encodeURIComponent(constCode)}`
                );

                if (!alive) return;
                setOptions((o) => ({ ...o, wards: data || [] }));
            } catch (e: any) {
                if (!alive) return;
                setOptions((o) => ({ ...o, wards: [], pollingStations: [] }));
                setError("ward", e?.message || "Failed to load wards");
            } finally {
                if (alive) setLoading("ward", false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [API_BASE, cycle, selected.constituency?.code]);

    // -------- Load polling stations when ward selected --------
    useEffect(() => {
        const wardCode = selected.ward?.code;
        if (!wardCode) {
            setOptions((o) => ({ ...o, pollingStations: [] }));
            return;
        }

        let alive = true;

        (async () => {
            try {
                setLoading("pollingStation", true);
                setError("pollingStation", null);

                const data = await apiGet<PollingStation[]>(
                    API_BASE,
                    `/get__polling_stations.php?cycle=${encodeURIComponent(String(cycle))}&ward_code=${encodeURIComponent(
                        wardCode
                    )}`
                );

                if (!alive) return;
                setOptions((o) => ({ ...o, pollingStations: data || [] }));
            } catch (e: any) {
                if (!alive) return;
                setOptions((o) => ({ ...o, pollingStations: [] }));
                setError("pollingStation", e?.message || "Failed to load polling stations");
            } finally {
                if (alive) setLoading("pollingStation", false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [API_BASE, cycle, selected.ward?.code]);

    // -------- Selectors (these enforce downward reset) --------
    const selectCounty = (c: County) => {
        setSelected({ county: { code: c.county_code, name: c.county_name } });
        // below resets happen naturally because selected.* changes,
        // but we clear options below immediately for snappy UI:
        setOptions((o) => ({ ...o, constituencies: [], wards: [], pollingStations: [] }));
        setError("constituency", null);
        setError("ward", null);
        setError("pollingStation", null);
    };

    const selectConstituency = (ct: Constituency) => {
        setSelected((s) => ({
            county: s.county,
            constituency: { code: ct.const_code, name: ct.constituency_name },
        }));
        setOptions((o) => ({ ...o, wards: [], pollingStations: [] }));
        setError("ward", null);
        setError("pollingStation", null);
    };

    const selectWard = (w: Ward) => {
        setSelected((s) => ({
            county: s.county,
            constituency: s.constituency,
            ward: { code: w.ward_code, name: w.ward_name },
        }));
        setOptions((o) => ({ ...o, pollingStations: [] }));
        setError("pollingStation", null);
    };

    const selectPollingStation = (ps: PollingStation) => {
        setSelected((s) => ({
            county: s.county,
            constituency: s.constituency,
            ward: s.ward,
            pollingStation: { code: ps.ps_code, name: ps.polling_station_name },
        }));
    };

    const clear = (level: RegionLevel) => {
        resetBelow(level);
        if (level === "county") setSelected({});
    };

    const isSelectedUpTo = (level: RegionLevel) => {
        if (level === "county") return !!selected.county?.code;
        if (level === "constituency") return !!selected.county?.code && !!selected.constituency?.code;
        if (level === "ward") return !!selected.county?.code && !!selected.constituency?.code && !!selected.ward?.code;
        return (
            !!selected.county?.code &&
            !!selected.constituency?.code &&
            !!selected.ward?.code &&
            !!selected.pollingStation?.code
        );
    };

    const breadcrumb = useMemo(() => {
        const parts = [
            selected.county?.name,
            selected.constituency?.name,
            selected.ward?.name,
            selected.pollingStation?.name,
        ].filter(Boolean);
        return parts.length ? parts.join(" • ") : "—";
    }, [selected]);

    return {
        cycle,
        selected,
        options,
        status,
        actions: {
            selectCounty,
            selectConstituency,
            selectWard,
            selectPollingStation,
            clear,
        },
        helpers: {
            isSelectedUpTo,
            breadcrumb,
        },
    };
}
