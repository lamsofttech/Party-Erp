import {
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from "@mui/material";
import type { Option } from "../utils/types";

export function LocationFilters(props: {
    counties: Option[];
    constituencies: Option[];
    wards: Option[];
    pollingStations: Option[];

    countyId: number | "";
    setCountyId: (v: number | "") => void;

    constituencyId: number | "";
    setConstituencyId: (v: number | "") => void;

    wardId: number | "";
    setWardId: (v: number | "") => void;

    pollingStationId: number | "";
    setPollingStationId: (v: number | "") => void;

    loadingAny: boolean;
    loadingConstituencies: boolean;
    loadingWards: boolean;
    loadingPollingStations: boolean;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>County</InputLabel>
                <Select
                    label="County"
                    value={props.countyId}
                    onChange={(e) =>
                        props.setCountyId(e.target.value === "" ? "" : Number(e.target.value))
                    }
                >
                    <MenuItem value="">
                        <em>All Counties</em>
                    </MenuItem>
                    {props.counties.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                            {c.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl
                size="small"
                sx={{ minWidth: 240 }}
                disabled={props.countyId === "" || props.loadingConstituencies}
            >
                <InputLabel>Constituency</InputLabel>
                <Select
                    label="Constituency"
                    value={props.constituencyId}
                    onChange={(e) =>
                        props.setConstituencyId(
                            e.target.value === "" ? "" : Number(e.target.value)
                        )
                    }
                >
                    <MenuItem value="">
                        <em>All Constituencies</em>
                    </MenuItem>
                    {props.constituencies.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                            {c.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl
                size="small"
                sx={{ minWidth: 220 }}
                disabled={props.constituencyId === "" || props.loadingWards}
            >
                <InputLabel>Ward</InputLabel>
                <Select
                    label="Ward"
                    value={props.wardId}
                    onChange={(e) =>
                        props.setWardId(e.target.value === "" ? "" : Number(e.target.value))
                    }
                >
                    <MenuItem value="">
                        <em>All Wards</em>
                    </MenuItem>
                    {props.wards.map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                            {w.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl
                size="small"
                sx={{ minWidth: 260 }}
                disabled={props.wardId === "" || props.loadingPollingStations}
            >
                <InputLabel>Polling Station</InputLabel>
                <Select
                    label="Polling Station"
                    value={props.pollingStationId}
                    onChange={(e) =>
                        props.setPollingStationId(
                            e.target.value === "" ? "" : Number(e.target.value)
                        )
                    }
                >
                    <MenuItem value="">
                        <em>All Polling Stations</em>
                    </MenuItem>
                    {props.pollingStations.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                            {p.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {props.loadingAny && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CircularProgress size={16} /> Loading locations...
                </div>
            )}
        </div>
    );
}
