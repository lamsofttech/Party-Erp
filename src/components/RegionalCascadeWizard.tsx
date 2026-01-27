import { useRegionalCascade, RegionLevel } from "../hooks/useRegionalCascade";

export function RegionalCascadeWizard({
    region,
    requiredLevel,
    title = "Geo Mapping",
}: {
    region: ReturnType<typeof useRegionalCascade>;
    requiredLevel: RegionLevel;
    title?: string;
}) {
    const { options, selected, status, actions, helpers } = region;

    const canProceed = helpers.isSelectedUpTo(requiredLevel);

    return (
        <div className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-gray-900">{title}</div>
                    <div className="text-xs text-gray-600 mt-1">County → Constituency → Ward → Polling Station</div>
                    <div className="text-xs text-gray-500 mt-1">{helpers.breadcrumb}</div>
                </div>

                <div className="text-xs">
                    <span
                        className={`px-2 py-1 rounded-full border ${canProceed ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}
                    >
                        {canProceed ? "Ready" : `Select up to ${requiredLevel}`}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                {/* County */}
                <div className="rounded-lg border p-3">
                    <div className="text-[11px] text-gray-500 mb-2">County</div>

                    {status.loading.county ? (
                        <div className="text-xs text-gray-500">Loading…</div>
                    ) : status.error.county ? (
                        <div className="text-xs text-red-600">{status.error.county}</div>
                    ) : (
                        <select
                            className="w-full border rounded-md p-2 text-sm"
                            value={selected.county?.code || ""}
                            onChange={(e) => {
                                const code = e.target.value;
                                const c = options.counties.find((x) => x.county_code === code);
                                if (c) actions.selectCounty(c);
                                else actions.clear("county");
                            }}
                        >
                            <option value="">Select county…</option>
                            {options.counties.map((c) => (
                                <option key={c.county_code} value={c.county_code}>
                                    {c.county_name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Constituency */}
                <div className="rounded-lg border p-3">
                    <div className="text-[11px] text-gray-500 mb-2">Constituency</div>

                    {!selected.county?.code ? (
                        <div className="text-xs text-gray-400">Pick county first</div>
                    ) : status.loading.constituency ? (
                        <div className="text-xs text-gray-500">Loading…</div>
                    ) : status.error.constituency ? (
                        <div className="text-xs text-red-600">{status.error.constituency}</div>
                    ) : (
                        <select
                            className="w-full border rounded-md p-2 text-sm"
                            value={selected.constituency?.code || ""}
                            onChange={(e) => {
                                const code = e.target.value;
                                const ct = options.constituencies.find((x) => x.const_code === code);
                                if (ct) actions.selectConstituency(ct);
                                else actions.clear("constituency");
                            }}
                        >
                            <option value="">Select constituency…</option>
                            {options.constituencies.map((ct) => (
                                <option key={ct.const_code} value={ct.const_code}>
                                    {ct.constituency_name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Ward */}
                <div className="rounded-lg border p-3">
                    <div className="text-[11px] text-gray-500 mb-2">Ward</div>

                    {!selected.constituency?.code ? (
                        <div className="text-xs text-gray-400">Pick constituency first</div>
                    ) : status.loading.ward ? (
                        <div className="text-xs text-gray-500">Loading…</div>
                    ) : status.error.ward ? (
                        <div className="text-xs text-red-600">{status.error.ward}</div>
                    ) : (
                        <select
                            className="w-full border rounded-md p-2 text-sm"
                            value={selected.ward?.code || ""}
                            onChange={(e) => {
                                const code = e.target.value;
                                const w = options.wards.find((x) => x.ward_code === code);
                                if (w) actions.selectWard(w);
                                else actions.clear("ward");
                            }}
                        >
                            <option value="">Select ward…</option>
                            {options.wards.map((w) => (
                                <option key={w.ward_code} value={w.ward_code}>
                                    {w.ward_name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Polling Station */}
                <div className="rounded-lg border p-3">
                    <div className="text-[11px] text-gray-500 mb-2">Polling Station</div>

                    {!selected.ward?.code ? (
                        <div className="text-xs text-gray-400">Pick ward first</div>
                    ) : status.loading.pollingStation ? (
                        <div className="text-xs text-gray-500">Loading…</div>
                    ) : status.error.pollingStation ? (
                        <div className="text-xs text-red-600">{status.error.pollingStation}</div>
                    ) : (
                        <select
                            className="w-full border rounded-md p-2 text-sm"
                            value={selected.pollingStation?.code || ""}
                            onChange={(e) => {
                                const code = e.target.value;
                                const ps = options.pollingStations.find((x) => x.ps_code === code);
                                if (ps) actions.selectPollingStation(ps);
                                else actions.clear("ward"); // clearing PS implies back to ward selection
                            }}
                        >
                            <option value="">Select polling station…</option>
                            {options.pollingStations.map((ps) => (
                                <option key={ps.ps_code} value={ps.ps_code}>
                                    {ps.polling_station_name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>
        </div>
    );
}
