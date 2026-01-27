// src/pages/president/ResultFormsDrilldown.tsx

import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { RequirePermission } from "../../components/RequirePermission";

/* ====================== TYPES ======================= */

type PositionType =
  | "PRESIDENT"
  | "GOVERNOR"
  | "SENATOR"
  | "MP"
  | "WOMEN_REP"
  | "MCA";

type FormType = "34A" | "34B";

interface WardSummary {
  ward_id: number;
  ward_name: string;
  ward_code: string;
}

interface StationSummary {
  station_id: number;
  station_name: string;
  ward_id: number;
}

interface Form34A {
  id: number;
  registered_voters_snap: number | null;
  total_valid: number;
  rejected: number;
  presiding_officer: string | null;
  remarks: string | null;
  scan_file_path: string | null;
  scan_file_name: string | null;
  scan_file_mime: string | null;
  status: "draft" | "submitted" | "reviewed" | "locked" | "rejected" | null;
}

interface StreamSummary {
  stream_id: number;
  stream_name: string;
  station_id: number;
  has_form: boolean;
  status: "draft" | "submitted" | "reviewed" | "locked" | "rejected" | null;
  form?: Form34A | null;
}

type Step = "wards" | "stations" | "streams";

type ReviewAction = "approve" | "reject";

/* ====================== MAIN PAGE ======================= */

const ResultFormsDrilldown: React.FC = () => {
  const { user, token } = useUser();

  const [position, setPosition] = useState<PositionType>("PRESIDENT");
  const [formType, setFormType] = useState<FormType>("34A");

  const [step, setStep] = useState<Step>("wards");

  const [wards, setWards] = useState<WardSummary[]>([]);
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [streams, setStreams] = useState<StreamSummary[]>([]);

  const [selectedWard, setSelectedWard] = useState<WardSummary | null>(null);
  const [selectedStation, setSelectedStation] =
    useState<StationSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedStreamForm, setSelectedStreamForm] =
    useState<StreamSummary | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Full-screen preview state
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  const constituencyName =
    user?.constituency_name ||
    user?.county_name ||
    `Constituency ${user?.scope_constituency_id ?? ""}`;

  /* ============ Helper to build headers + query token ============ */

  const buildAuth = () => {
    const localToken =
      localStorage.getItem("token") || localStorage.getItem("authToken");
    const effectiveToken = token || localToken || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (effectiveToken) {
      headers["Authorization"] = `Bearer ${effectiveToken}`;
      headers["X-Token"] = effectiveToken;
    }

    return { headers, effectiveToken };
  };

  /* ============ Helper to build image URL safely ============ */

  // IMPORTANT: files live on this host
  const BASE_URL = "https://skizagroundsuite.com";

  const getFormImageUrl = (form: Form34A): string | null => {
    const rawPath = (form.scan_file_path || "").trim();

    if (!rawPath) return null;

    // Already a full URL in DB
    if (/^https?:\/\//i.test(rawPath)) {
      return rawPath;
    }

    // Ensure it starts with a slash
    const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

    return `${BASE_URL}${normalized}`;
  };

  /* ============ Helper to build download API URL ============ */

  const getFormDownloadUrl = (form: Form34A): string | null => {
    let rawPath = (form.scan_file_path || "").trim();
    if (!rawPath) return null;

    // If DB stored a full URL, strip down to the path
    if (/^https?:\/\//i.test(rawPath)) {
      try {
        const url = new URL(rawPath);
        rawPath = url.pathname + url.search;
      } catch {
        // if parsing fails, keep original
      }
    }

    // Ensure it starts with a slash
    if (!rawPath.startsWith("/")) {
      rawPath = "/" + rawPath;
    }

    const encodedPath = encodeURIComponent(rawPath);
    // Hit your backend download API (same origin as other /API calls)
    return `/API/download_form.php?path=${encodedPath}`;
  };

  /* ============ 1. Fetch WARDS (first screen) ============ */

  useEffect(() => {
    const fetchWards = async () => {
      try {
        setError(null);
        setLoading(true);
        setWards([]);
        setStations([]);
        setStreams([]);
        setSelectedWard(null);
        setSelectedStation(null);
        setSelectedStreamForm(null);
        setFullPreviewOpen(false);
        setStep("wards");

        const { headers, effectiveToken } = buildAuth();
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "500");
        if (effectiveToken) {
          params.set("token", effectiveToken);
        }

        const res = await fetch(
          "/API/president/get_wards.php?" + params.toString(),
          {
            method: "GET",
            headers,
            credentials: "include",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
          throw new Error(
            data.message ||
            "Unauthorized: invalid or missing token. Please log in again."
          );
        }
        if (res.status === 403) {
          throw new Error(
            data.message ||
            "Forbidden: you are not allowed to view result forms for this constituency."
          );
        }
        if (!res.ok || data.status === "error") {
          throw new Error(
            data.message || data.error || "Failed to fetch wards."
          );
        }

        const rows: WardSummary[] = (data.data || []).map((w: any) => ({
          ward_id: Number(w.id ?? w.ward_id),
          ward_name: String(w.ward_name ?? w.caw_name ?? "Unnamed ward"),
          ward_code: String(w.ward_code ?? w.caw_code ?? ""),
        }));

        setWards(rows);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to fetch wards.");
      } finally {
        setLoading(false);
      }
    };

    fetchWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ============ 2. Fetch STATIONS when a ward is selected ============ */

  const handleSelectWard = (ward: WardSummary) => {
    setSelectedWard(ward);
    setSelectedStation(null);
    setStations([]);
    setStreams([]);
    setSelectedStreamForm(null);
    setFullPreviewOpen(false);
    setStep("stations");
  };

  useEffect(() => {
    if (!selectedWard || step !== "stations") return;

    const fetchStations = async () => {
      try {
        setError(null);
        setLoading(true);
        setStations([]);
        setStreams([]);
        setSelectedStation(null);
        setSelectedStreamForm(null);
        setFullPreviewOpen(false);

        const { headers, effectiveToken } = buildAuth();
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "500");

        params.set("ward_id", String(selectedWard.ward_id));
        if (selectedWard.ward_code) {
          params.set("caw_code", selectedWard.ward_code);
        }
        if (effectiveToken) {
          params.set("token", effectiveToken);
        }

        const res = await fetch(
          "/API/president/get_polling_station.php?" + params.toString(),
          {
            method: "GET",
            headers,
            credentials: "include",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
          throw new Error(
            data.message ||
            "Unauthorized: invalid or missing token. Please log in again."
          );
        }
        if (res.status === 403) {
          throw new Error(
            data.message ||
            "Forbidden: you are not allowed to view polling stations for this ward."
          );
        }
        if (!res.ok || data.status === "error") {
          throw new Error(
            data.message || data.error || "Failed to fetch polling stations."
          );
        }

        const rawCenters = data.polling_centers || data.data || [];

        const rows: StationSummary[] = rawCenters.map((s: any) => ({
          station_id: Number(s.id ?? s.station_id),
          station_name: String(
            s.polling_station_name ??
            s.reg_centre_name ??
            s.station_name ??
            ""
          ),
          ward_id: selectedWard.ward_id,
        }));

        setStations(rows);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to fetch polling stations.");
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard, step, token]);

  /* ============ 3. Fetch STREAMS when a station is selected ============ */

  const handleSelectStation = (station: StationSummary) => {
    setSelectedStation(station);
    setStreams([]);
    setSelectedStreamForm(null);
    setFullPreviewOpen(false);
    setStep("streams");
  };

  useEffect(() => {
    if (!selectedStation || step !== "streams") return;

    const fetchStreams = async () => {
      try {
        setError(null);
        setLoading(true);
        setStreams([]);
        setSelectedStreamForm(null);
        setFullPreviewOpen(false);

        const { headers, effectiveToken } = buildAuth();
        const params = new URLSearchParams();
        params.set("position", position);
        params.set("form_type", formType);
        params.set("station_id", String(selectedStation.station_id));
        if (effectiveToken) params.set("token", effectiveToken);

        const res = await fetch(
          "/API/results-summary-streams-full.php?" + params.toString(),
          {
            method: "GET",
            headers,
            credentials: "include",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
          throw new Error(
            data.message ||
            "Unauthorized: invalid or missing token. Please log in again."
          );
        }
        if (res.status === 403) {
          throw new Error(
            data.message ||
            "Forbidden: you are not allowed to view streams for this polling station."
          );
        }
        if (!res.ok || data.status === "error") {
          throw new Error(
            data.message || data.error || "Failed to fetch streams."
          );
        }

        const rows: StreamSummary[] = (data.data || []).map((st: any) => {
          const form = st.form || null;
          const parsedForm: Form34A | null = form
            ? {
              id: Number(form.id),
              registered_voters_snap:
                form.registered_voters_snap !== null &&
                  form.registered_voters_snap !== undefined
                  ? Number(form.registered_voters_snap)
                  : null,
              total_valid: Number(form.total_valid ?? 0),
              rejected: Number(form.rejected ?? 0),
              presiding_officer: form.presiding_officer ?? null,
              remarks: form.remarks ?? null,
              scan_file_path: form.scan_file_path ?? null,
              scan_file_name: form.scan_file_name ?? null,
              scan_file_mime: form.scan_file_mime ?? null,
              status: (form.status ?? null) as Form34A["status"],
            }
            : null;

          return {
            stream_id: Number(st.stream_id ?? st.id),
            stream_name: String(st.stream_name ?? st.name ?? ""),
            station_id: Number(st.station_id ?? selectedStation.station_id),
            has_form: Boolean(st.has_form ?? st.has_results ?? false),
            status: (st.status ?? null) as StreamSummary["status"],
            form: parsedForm,
          };
        });

        setStreams(rows);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to fetch streams.");
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation, step, position, formType, token]);

  /* ============ 4. Approve / Reject handlers ============ */

  const handleReviewForm = async (action: ReviewAction) => {
    if (!selectedStreamForm || !selectedStreamForm.form) return;

    try {
      setModalLoading(true);
      setReviewError(null);

      const { headers } = buildAuth();

      const res = await fetch("/API/form34a_review.php", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          form_id: selectedStreamForm.form.id,
          action,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to review form.");
      }

      const newStatus =
        (data.new_status as StreamSummary["status"]) ||
        (action === "approve" ? "reviewed" : "rejected");

      setStreams((prev) =>
        prev.map((s) =>
          s.stream_id === selectedStreamForm.stream_id
            ? {
              ...s,
              status: newStatus,
              form: s.form
                ? {
                  ...s.form,
                  status: newStatus as Form34A["status"],
                }
                : s.form,
            }
            : s
        )
      );

      setSelectedStreamForm(null);
      setFullPreviewOpen(false);
    } catch (e: any) {
      console.error(e);
      setReviewError(e.message || "Failed to review form.");
    } finally {
      setModalLoading(false);
    }
  };

  /* ====================== RENDER ======================= */

  const renderHeader = () => (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Result Forms</h1>
        <p className="text-sm text-gray-600">
          Scope: <span className="font-semibold">{constituencyName}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Step{" "}
          {step === "wards" ? "1" : step === "stations" ? "2" : "3"} of 3 –{" "}
          {step === "wards"
            ? "Choose a Ward"
            : step === "stations"
              ? "Choose a Polling Station"
              : "View Streams"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={position}
          onChange={(e) => {
            setPosition(e.target.value as PositionType);
          }}
        >
          <option value="PRESIDENT">President</option>
          <option value="GOVERNOR">Governor</option>
          <option value="SENATOR">Senator</option>
          <option value="MP">MP</option>
          <option value="WOMEN_REP">Women Rep</option>
          <option value="MCA">MCA</option>
        </select>

        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={formType}
          onChange={(e) => {
            setFormType(e.target.value as FormType);
          }}
        >
          <option value="34A">Form 34A</option>
          <option value="34B">Form 34B</option>
        </select>
      </div>
    </header>
  );

  const renderBreadcrumb = () => (
    <nav className="text-xs text-gray-600 mb-3 flex flex-wrap items-center gap-1">
      <button
        className={`underline ${step === "wards" ? "font-semibold text-gray-900" : ""
          }`}
        onClick={() => {
          setStep("wards");
          setSelectedWard(null);
          setSelectedStation(null);
          setStations([]);
          setStreams([]);
          setSelectedStreamForm(null);
          setFullPreviewOpen(false);
        }}
      >
        Wards
      </button>
      {selectedWard && <span>&gt;</span>}
      {selectedWard && (
        <button
          className={`underline ${step === "stations" ? "font-semibold text-gray-900" : ""
            }`}
          onClick={() => {
            setStep("stations");
            setSelectedStation(null);
            setStreams([]);
            setSelectedStreamForm(null);
            setFullPreviewOpen(false);
          }}
        >
          {selectedWard.ward_name}
        </button>
      )}
      {selectedStation && <span>&gt;</span>}
      {selectedStation && (
        <span
          className={
            step === "streams"
              ? "font-semibold text-gray-900"
              : "text-gray-600"
          }
        >
          {selectedStation.station_name ||
            `Station #${selectedStation.station_id}`}
        </span>
      )}
    </nav>
  );

  const renderWardsStep = () => (
    <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">
          Step 1: Choose a Ward
        </h2>
        {loading && (
          <span className="text-[0.7rem] text-gray-500">Loading…</span>
        )}
      </div>
      <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
        {wards.length === 0 && !loading && (
          <div className="px-4 py-4 text-sm text-gray-500">
            No wards found for this constituency.
          </div>
        )}

        {wards.map((w) => (
          <button
            key={w.ward_id}
            onClick={() => handleSelectWard(w)}
            className="w-full text-left px-4 py-3 hover:bg-green-50 focus:bg-green-50 focus:outline-none"
          >
            <div className="font-medium text-gray-900">{w.ward_name}</div>
          </button>
        ))}
      </div>
    </section>
  );

  const renderStationsStep = () => (
    <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">
            Step 2: Choose a Polling Station
          </h2>
          {selectedWard && (
            <p className="text-xs text-gray-500 mt-1">
              Ward:{" "}
              <span className="font-semibold">{selectedWard.ward_name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs text-gray-600 underline"
            onClick={() => {
              setStep("wards");
              setSelectedWard(null);
              setSelectedStation(null);
              setStations([]);
              setStreams([]);
              setSelectedStreamForm(null);
              setFullPreviewOpen(false);
            }}
          >
            &larr; Back to wards
          </button>
          {loading && (
            <span className="text-[0.7rem] text-gray-500">Loading…</span>
          )}
        </div>
      </div>

      <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
        {stations.length === 0 && !loading && (
          <div className="px-4 py-4 text-sm text-gray-500">
            No polling stations found for this ward.
          </div>
        )}

        {stations.map((s) => (
          <button
            key={s.station_id}
            onClick={() => handleSelectStation(s)}
            className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
          >
            <div className="font-medium text-gray-900">
              {s.station_name || `Station #${s.station_id}`}
            </div>
          </button>
        ))}
      </div>
    </section>
  );

  // STREAMS STEP – table UI
  const renderStreamsStep = () => (
    <section className="border border-gray-200 bg-white rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">
            Streams – Forms
          </h2>
          {selectedStation && (
            <p className="text-xs text-gray-500 mt-1">
              Polling Station:{" "}
              <span className="font-semibold">
                {selectedStation.station_name ||
                  `Station #${selectedStation.station_id}`}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs text-gray-600 underline"
            onClick={() => {
              setStep("stations");
              setSelectedStation(null);
              setStreams([]);
              setSelectedStreamForm(null);
              setFullPreviewOpen(false);
            }}
          >
            &larr; Back to stations
          </button>
          {loading && (
            <span className="text-[0.7rem] text-gray-500">Loading…</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                Polling Station
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                Status
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                Download
              </th>
            </tr>
          </thead>
          <tbody>
            {streams.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-4 text-center text-xs text-gray-500"
                >
                  No streams found for this station.
                </td>
              </tr>
            )}

            {streams.map((st) => {
              const form = st.form || undefined;
              const imageUrl = form ? getFormImageUrl(form) : null;

              const reported = st.has_form;
              const effectiveStatus =
                (form?.status ?? st.status) ||
                (reported ? ("submitted" as StreamSummary["status"]) : null);

              let statusLabel = "Not reported";
              let statusClasses =
                "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-gray-200 text-gray-700";

              if (effectiveStatus) {
                switch (effectiveStatus) {
                  case "reviewed":
                    statusLabel = "Reviewed";
                    statusClasses =
                      "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-green-600 text-white";
                    break;
                  case "submitted":
                    statusLabel = "Submitted";
                    statusClasses =
                      "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-blue-600 text-white";
                    break;
                  case "rejected":
                    statusLabel = "Rejected";
                    statusClasses =
                      "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-red-600 text-white";
                    break;
                  case "locked":
                    statusLabel = "Locked";
                    statusClasses =
                      "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-purple-600 text-white";
                    break;
                  case "draft":
                    statusLabel = "Draft";
                    statusClasses =
                      "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-yellow-200 text-yellow-800";
                    break;
                  default:
                    statusLabel = "Reported";
                    statusClasses =
                      "inline-flex items-center px-3 py-0.5 rounded-full text-[0.7rem] font-semibold bg-green-600 text-white";
                }
              }

              const downloadUrl =
                form && getFormDownloadUrl(form) ? getFormDownloadUrl(form) : null;

              return (
                <tr key={st.stream_id} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-800">
                    {st.stream_name || `Stream #${st.stream_id}`}
                  </td>
                  <td className="px-4 py-2">
                    <span className={statusClasses}>{statusLabel}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-3">
                      {/* View (eye) */}
                      {reported && form && (
                        <button
                          type="button"
                          className="p-1 rounded-full hover:bg-blue-50 text-blue-600"
                          title="View form"
                          onClick={() => {
                            setReviewError(null);
                            setSelectedStreamForm(st);
                            setFullPreviewOpen(false);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Download (cloud) – via backend download API */}
                      {reported && form && (downloadUrl || imageUrl) && (
                        <a
                          href={downloadUrl || imageUrl!}
                          className="p-1 rounded-full hover:bg-green-50 text-green-600"
                          title="Download form image"
                          download={
                            form.scan_file_name || `form-${form.id}.png`
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <RequirePermission permission="results34a.view">
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {renderHeader()}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
            Error: {error}
          </div>
        )}

        {renderBreadcrumb()}

        {step === "wards" && renderWardsStep()}
        {step === "stations" && selectedWard && renderStationsStep()}
        {step === "streams" && selectedStation && renderStreamsStep()}
      </div>

      {/* ============ MODAL 1: Small preview + approve/reject ============ */}
      {selectedStreamForm && selectedStreamForm.form && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Forms #{selectedStreamForm.form.id}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedStreamForm.stream_name}
                </p>
              </div>
              <button
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setSelectedStreamForm(null);
                  setFullPreviewOpen(false);
                }}
                disabled={modalLoading}
              >
                ✕ Close
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-4 max-h-[78vh] overflow-y-auto">
              {/* Title like F36A-... */}
              <div className="text-xs font-semibold text-gray-700">
                {selectedStreamForm.form.scan_file_name ||
                  `Form 34A - ${selectedStreamForm.stream_name}`}
              </div>

              <div className="grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6">
                {/* Left: small scrollable preview with zoom icon */}
                <div className="border border-gray-200 rounded-md bg-gray-50 flex flex-col items-center justify-center p-3">
                  <div className="w-full h-[340px] bg-white border border-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                    {(() => {
                      const imageUrl = getFormImageUrl(
                        selectedStreamForm.form!
                      );
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={
                            selectedStreamForm.form.scan_file_name || "Form"
                          }
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-gray-500 p-4 text-center">
                          No scan image available for this form.
                        </div>
                      );
                    })()}
                  </div>

                  {/* Zoom + drag row */}
                  <div className="mt-3 flex items-center justify-between w-full px-2">
                    <div className="flex items-center gap-1 text-[0.7rem] text-gray-400">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-gray-200">
                        ⤧
                      </span>
                      <span>Drag</span>
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                      title="Open detailed preview"
                      onClick={() => setFullPreviewOpen(true)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.7}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 9V4.75M15.75 4.75H11.5M15.75 4.75L9 11.5M8.25 15v4.25M8.25 19.25H12.5M8.25 19.25L15 12.5"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Right: summary + approve/reject */}
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">
                      Summary
                    </h4>
                    <dl className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <dt>Registered voters (snapshot)</dt>
                        <dd className="font-medium">
                          {selectedStreamForm.form.registered_voters_snap ??
                            "N/A"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Total valid votes</dt>
                        <dd className="font-medium">
                          {selectedStreamForm.form.total_valid}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Rejected ballots</dt>
                        <dd className="font-medium">
                          {selectedStreamForm.form.rejected}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Presiding Officer</dt>
                        <dd className="font-medium">
                          {selectedStreamForm.form.presiding_officer || "N/A"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Status</dt>
                        <dd className="font-medium capitalize">
                          {selectedStreamForm.form.status ||
                            selectedStreamForm.status ||
                            "N/A"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {selectedStreamForm.form.remarks && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1">
                        Remarks
                      </h4>
                      <p className="text-xs text-gray-700">
                        {selectedStreamForm.form.remarks}
                      </p>
                    </div>
                  )}

                  {reviewError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded">
                      {reviewError}
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleReviewForm("approve")}
                      disabled={modalLoading}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {modalLoading ? "Submitting..." : "Approve form"}
                    </button>
                    <button
                      onClick={() => handleReviewForm("reject")}
                      disabled={modalLoading}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {modalLoading ? "Submitting..." : "Reject form"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStreamForm(null);
                        setFullPreviewOpen(false);
                      }}
                      disabled={modalLoading}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL 2: Full detailed preview (zoomed) ============ */}
      {fullPreviewOpen && selectedStreamForm && selectedStreamForm.form && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white">
            <div className="text-xs">
              Detailed Preview –{" "}
              {selectedStreamForm.form.scan_file_name ||
                selectedStreamForm.stream_name}
            </div>
            <button
              className="text-xs hover:text-gray-300"
              onClick={() => setFullPreviewOpen(false)}
            >
              ✕ Close
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Thumbnail rail (left) – single page for now */}
            <aside className="hidden md:flex flex-col items-center bg-gray-900/90 w-32 py-4 overflow-y-auto">
              <div className="text-[0.65rem] text-gray-400 mb-2">1 / 1</div>
              <div className="border-2 border-blue-500 bg-black/60 p-1">
                {(() => {
                  const imageUrl = getFormImageUrl(selectedStreamForm.form!);
                  return imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="thumb"
                      className="w-20 h-28 object-contain"
                    />
                  ) : null;
                })()}
              </div>
              <div className="mt-2 text-[0.65rem] text-gray-300">1</div>
            </aside>

            {/* Main viewer */}
            <main className="flex-1 bg-gray-800 flex items-center justify-center overflow-auto">
              {(() => {
                const imageUrl = getFormImageUrl(selectedStreamForm.form!);
                return imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={selectedStreamForm.form.scan_file_name || "Form 34A"}
                    className="max-h-[95vh] max-w-full object-contain"
                  />
                ) : (
                  <div className="text-sm text-gray-200">
                    No scan image available.
                  </div>
                );
              })()}
            </main>
          </div>
        </div>
      )}
    </RequirePermission>
  );
};

export default ResultFormsDrilldown;
