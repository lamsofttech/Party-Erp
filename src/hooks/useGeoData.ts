// src/hooks/useGeoData.ts

import { useEffect, useState } from "react"
import { GEO_BASE, fetchWithTimeout } from "../lib/api"
import { cacheSet, fromCache } from "../lib/cache"
import type { County, Constituency, Ward, PollingStation } from "../types/users"

interface Args {
    canSpecifyRegion: boolean
    selectedCountyCode: string
    selectedConstituencyCode: string
    selectedWardCode: string
}

export const useGeoData = ({
    canSpecifyRegion,
    selectedCountyCode,
    selectedConstituencyCode,
    selectedWardCode,
}: Args) => {
    const [availableCounties, setAvailableCounties] = useState<County[]>([])
    const [availableConstituencies, setAvailableConstituencies] = useState<Constituency[]>([])
    const [availableWards, setAvailableWards] = useState<Ward[]>([])
    const [availablePollingStations, setAvailablePollingStations] = useState<PollingStation[]>([])

    const [loadingCounties, setLoadingCounties] = useState(false)
    const [loadingConstituencies, setLoadingConstituencies] = useState(false)
    const [loadingWards, setLoadingWards] = useState(false)
    const [loadingPollingStations, setLoadingPollingStations] = useState(false)

    const [errCounties, setErrCounties] = useState<string | null>(null)
    const [errConstituencies, setErrConstituencies] = useState<string | null>(null)
    const [errWards, setErrWards] = useState<string | null>(null)
    const [errPollingStations, setErrPollingStations] = useState<string | null>(null)

    // ---------------- Counties ----------------
    useEffect(() => {
        if (!canSpecifyRegion) {
            setAvailableCounties([])
            setErrCounties(null)
            setLoadingCounties(false)
            return
        }

        let alive = true

            ; (async () => {
                setLoadingCounties(true)
                setErrCounties(null)

                const cached = fromCache<any>("counties:v1")
                if (cached?.status === "success" && Array.isArray(cached.data)) {
                    if (!alive) return
                    setAvailableCounties(
                        cached.data.map((c: any) => ({
                            id: c.county_code ?? c.id ?? c.code,
                            name: c.county_name ?? c.name,
                            code: c.county_code ?? c.code ?? null,
                        }))
                    )
                    if (alive) setLoadingCounties(false)
                    return
                }

                try {
                    const res = await fetchWithTimeout(`${GEO_BASE}/get_counties.php`)
                    const json = await res.json()
                    cacheSet("counties:v1", json)

                    if (!alive) return

                    if (json?.status === "success" && Array.isArray(json.data)) {
                        setAvailableCounties(
                            json.data.map((c: any) => ({
                                id: c.county_code ?? c.id ?? c.code,
                                name: c.county_name ?? c.name,
                                code: c.county_code ?? c.code ?? null,
                            }))
                        )
                    } else {
                        setAvailableCounties([])
                        setErrCounties("Failed to load counties")
                    }
                } catch {
                    if (!alive) return
                    setErrCounties("Failed to load counties")
                } finally {
                    if (alive) setLoadingCounties(false)
                }
            })()

        return () => {
            alive = false
        }
    }, [canSpecifyRegion])

    // ---------------- Constituencies ----------------
    useEffect(() => {
        if (!selectedCountyCode) {
            setAvailableConstituencies([])
            setErrConstituencies(null)
            setLoadingConstituencies(false)
            return
        }

        let alive = true

            ; (async () => {
                setLoadingConstituencies(true)
                setErrConstituencies(null)

                const cacheKey = `const:${selectedCountyCode}`
                const cached = fromCache<any>(cacheKey)

                if (cached?.status === "success" && Array.isArray(cached.data)) {
                    if (!alive) return
                    setAvailableConstituencies(
                        cached.data.map((c: any) => ({
                            id: c.const_code ?? c.id ?? c.code,
                            name: c.constituency_name ?? c.name,
                            code: c.const_code ?? c.code ?? null,
                            county_id: null,
                        }))
                    )
                    if (alive) setLoadingConstituencies(false)
                    return
                }

                try {
                    const res = await fetchWithTimeout(
                        `${GEO_BASE}/get_constituencies.php?county_code=${encodeURIComponent(selectedCountyCode)}`
                    )
                    const json = await res.json()
                    cacheSet(cacheKey, json)

                    if (!alive) return

                    if (json?.status === "success" && Array.isArray(json.data)) {
                        setAvailableConstituencies(
                            json.data.map((c: any) => ({
                                id: c.const_code ?? c.id ?? c.code,
                                name: c.constituency_name ?? c.name,
                                code: c.const_code ?? c.code ?? null,
                                county_id: null,
                            }))
                        )
                    } else {
                        setAvailableConstituencies([])
                        setErrConstituencies("Failed to load constituencies")
                    }
                } catch {
                    if (!alive) return
                    setErrConstituencies("Failed to load constituencies")
                } finally {
                    if (alive) setLoadingConstituencies(false)
                }
            })()

        return () => {
            alive = false
        }
    }, [selectedCountyCode])

    // ---------------- Wards ----------------
    useEffect(() => {
        if (!selectedConstituencyCode) {
            setAvailableWards([])
            setErrWards(null)
            setLoadingWards(false)
            return
        }

        let alive = true

            ; (async () => {
                setLoadingWards(true)
                setErrWards(null)

                const cacheKey = `wards:${selectedConstituencyCode}`
                const cached = fromCache<any>(cacheKey)

                if (cached?.status === "success" && Array.isArray(cached.data)) {
                    if (!alive) return
                    setAvailableWards(
                        cached.data.map((w: any) => ({
                            id: w.ward_code ?? w.id ?? w.code,
                            name: w.ward_name ?? w.name,
                            code: w.ward_code ?? w.code ?? null,
                            constituency_id: null,
                        }))
                    )
                    if (alive) setLoadingWards(false)
                    return
                }

                try {
                    const res = await fetchWithTimeout(
                        `${GEO_BASE}/get_wards.php?const_code=${encodeURIComponent(selectedConstituencyCode)}`
                    )
                    const json = await res.json()
                    cacheSet(cacheKey, json)

                    if (!alive) return

                    if (json?.status === "success" && Array.isArray(json.data)) {
                        setAvailableWards(
                            json.data.map((w: any) => ({
                                id: w.ward_code ?? w.id ?? w.code,
                                name: w.ward_name ?? w.name,
                                code: w.ward_code ?? w.code ?? null,
                                constituency_id: null,
                            }))
                        )
                    } else {
                        setAvailableWards([])
                        setErrWards("Failed to load wards")
                    }
                } catch {
                    if (!alive) return
                    setErrWards("Failed to load wards")
                } finally {
                    if (alive) setLoadingWards(false)
                }
            })()

        return () => {
            alive = false
        }
    }, [selectedConstituencyCode])

    // ---------------- Polling Stations ----------------
    useEffect(() => {
        if (!selectedWardCode) {
            setAvailablePollingStations([])
            setErrPollingStations(null)
            setLoadingPollingStations(false)
            return
        }

        let alive = true

            ; (async () => {
                setLoadingPollingStations(true)
                setErrPollingStations(null)

                const cacheKey = `stations:${selectedWardCode}`
                const cached = fromCache<any>(cacheKey)

                if (cached?.status === "success" && Array.isArray(cached.data)) {
                    if (!alive) return
                    setAvailablePollingStations(
                        cached.data.map((s: any) => ({
                            id: String(s.polling_station_id ?? s.station_id ?? s.id ?? s.code ?? ""),
                            name: s.polling_station_name ?? s.name ?? s.station_name ?? s.label ?? "",
                            ward_id: null,
                        }))
                    )
                    if (alive) setLoadingPollingStations(false)
                    return
                }

                try {
                    const res = await fetchWithTimeout(
                        `${GEO_BASE}/get_polling_stations_for_roles.php?ward_code=${encodeURIComponent(selectedWardCode)}`
                    )
                    const json = await res.json()
                    cacheSet(cacheKey, json)

                    if (!alive) return

                    const list = Array.isArray(json?.data) ? json.data : []

                    setAvailablePollingStations(
                        list.map((s: any) => ({
                            id: String(s.polling_station_id ?? s.station_id ?? s.id ?? s.code ?? ""),
                            name: s.polling_station_name ?? s.name ?? s.station_name ?? s.label ?? "",
                            ward_id: null,
                        }))
                    )
                } catch {
                    if (!alive) return
                    setErrPollingStations("Failed to load polling stations")
                } finally {
                    if (alive) setLoadingPollingStations(false)
                }
            })()

        return () => {
            alive = false
        }
    }, [selectedWardCode])

    return {
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
    }
}
