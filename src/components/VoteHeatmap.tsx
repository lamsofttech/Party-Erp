import React, { useEffect, useMemo, useRef, useState } from "react"
import { MapContainer, TileLayer, useMap } from "react-leaflet"
import type { LatLngBoundsExpression } from "leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
// Note: we lazy-load leaflet.heat below for smaller bundles & PWA perf

export interface VoteDataPoint {
  latitude: number
  longitude: number
  vote_count: number
}

interface VoteHeatmapProps {
  voteData: VoteDataPoint[]
  restrictToKenya?: boolean
  /**
   * Optional: override map height (e.g., "70vh" or "60dvh").
   * Defaults to a mobile-friendly 70vh.
   */
  height?: string
}

/* --- Constants --- */
const KENYA_CENTER: [number, number] = [0.0236, 37.9062]
const KENYA_BOUNDS: LatLngBoundsExpression = [
  [-4.67, 33.9],
  [4.62, 41.9],
]

/* --- Utilities --- */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/* --- Map Helpers --- */
const ResizeFix: React.FC<{ observeEl?: HTMLElement | null }> = ({ observeEl }) => {
  const map = useMap()

  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 0)
    map.whenReady(() => map.invalidateSize())

    const onOrientation = () => map.invalidateSize()
    window.addEventListener("orientationchange", onOrientation)

    let ro: ResizeObserver | undefined
    if (observeEl && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => map.invalidateSize())
      ro.observe(observeEl)
    }

    return () => {
      clearTimeout(id)
      window.removeEventListener("orientationchange", onOrientation)
      ro?.disconnect()
    }
  }, [map, observeEl])

  return null
}

const FitController: React.FC<{
  points: [number, number, number][]
  restrictToKenya: boolean
}> = ({ points, restrictToKenya }) => {
  const map = useMap()

  useEffect(() => {
    if (points.length) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng] as [number, number]))
      map.fitBounds(bounds.pad(0.15), { maxZoom: 9 })
    } else {
      map.fitBounds(KENYA_BOUNDS, { padding: [20, 20] })
    }
  }, [map, points])

  useEffect(() => {
    if (restrictToKenya) {
      map.setMaxBounds(KENYA_BOUNDS)
      map.setMinZoom(5)
    } else {
      // Leaflet's runtime accepts null; types are stricter, so we cast.
      map.setMaxBounds(null as unknown as LatLngBoundsExpression)
      map.setMinZoom(2)
    }
  }, [map, restrictToKenya])

  return null
}

/* --- Heat Layer (lazy loads plugin) --- */
type HeatPoint = [number, number, number]

type HeatLayerFactory = (latlngs: HeatPoint[], options?: Record<string, unknown>) => L.Layer & {
  setLatLngs: (latlngs: HeatPoint[]) => void
  setOptions?: (options: Record<string, unknown>) => void
}

const HeatLayer: React.FC<{
  points: HeatPoint[]
  radius?: number
  blur?: number
  maxZoom?: number
}> = ({ points, radius = 28, blur = 15, maxZoom = 17 }) => {
  const map = useMap()
  const layerRef = useRef<ReturnType<HeatLayerFactory> | null>(null)
  const [pluginReady, setPluginReady] = useState(false)

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          await import("leaflet.heat")
          if (mounted) setPluginReady(true)
        } catch {
          setPluginReady(false)
        }
      })()
    return () => {
      mounted = false
    }
  }, [])

  // Normalize heat intensities to [0,1] using log scale for better contrast
  const heatData = useMemo<HeatPoint[]>(() => {
    if (!points.length) return []
    const max = Math.max(1, ...points.map((p) => p[2]))
    return points.map(([lat, lng, v]) => [lat, lng, Math.log1p(v) / Math.log1p(max)])
  }, [points])

  const scaledRadius = useMemo(() => {
    const dpr = typeof window !== "undefined" ? clamp(window.devicePixelRatio || 1, 1, 3) : 1
    const isSmallScreen = typeof window !== "undefined" ? window.innerWidth < 420 : false
    const base = isSmallScreen ? radius * 0.85 : radius
    return Math.round(base * (0.9 + 0.1 * dpr))
  }, [radius])

  useEffect(() => {
    if (!pluginReady) return

    const heatLayerFn = (L as unknown as { heatLayer?: HeatLayerFactory }).heatLayer
    if (!heatLayerFn) return

    if (!layerRef.current) {
      layerRef.current = heatLayerFn(heatData, {
        radius: scaledRadius,
        blur,
        maxZoom,
        gradient: {
          0.0: "rgba(0,0,0,0)",
          0.3: "blue",
          0.6: "yellow",
          0.82: "orange",
          1.0: "red",
        },
      }).addTo(map) as ReturnType<HeatLayerFactory>
    } else {
      layerRef.current.setLatLngs(heatData)
      layerRef.current.setOptions?.({ radius: scaledRadius, blur, maxZoom })
    }
  }, [pluginReady, heatData, scaledRadius, blur, maxZoom, map])

  useEffect(
    () => () => {
      if (layerRef.current) {
        layerRef.current.removeFrom(map)
        layerRef.current = null
      }
    },
    [map]
  )

  return null
}

/* --- Main Component --- */
const VoteHeatmap: React.FC<VoteHeatmapProps> = ({ voteData, restrictToKenya = true, height = "70vh" }) => {
  const points = useMemo(
    () =>
      voteData
        .map((p) => [Number(p.latitude), Number(p.longitude), Number(p.vote_count)] as HeatPoint)
        .filter(([lat, lng, v]) => Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(v)),
    [voteData]
  )

  const containerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: "100%",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={KENYA_CENTER}
        zoom={6}
        minZoom={restrictToKenya ? 5 : 2}
        maxBounds={restrictToKenya ? KENYA_BOUNDS : undefined}
        maxBoundsViscosity={restrictToKenya ? 1.0 : undefined}
        preferCanvas
        style={{ height: "100%", width: "100%" }}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelDebounceTime={200}
        wheelPxPerZoomLevel={180}
        tapTolerance={10}
        touchZoom="center"
      >
        <ResizeFix observeEl={containerRef.current} />
        <FitController points={points} restrictToKenya={restrictToKenya} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <HeatLayer points={points} radius={28} blur={15} maxZoom={17} />
      </MapContainer>
    </div>
  )
}

export default VoteHeatmap
