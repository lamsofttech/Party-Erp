// src/pages/ResultFormsBoardroom.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  FileText,
  UploadCloud,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Save,
  Plus,
  X,
} from "lucide-react";
import CountUp from "react-countup";

/** Types */
interface County {
  county_code: string;
  county_name: string;
}

interface Constituency {
  const_code: string;
  constituency_name: string;
}

interface BoardroomKpis {
  forms_ingested: number;
  ocr_processed: number;
  flagged_constituencies: number;
}

interface BoardroomStatsResponse {
  success: boolean;
  status?: string;
  message?: string;
  kpis?: BoardroomKpis;
}

type FormType = "34A" | "34B" | "34C";
type OcrStatus = "idle" | "uploading" | "done" | "error";

/** Wizard steps */
type Step = "county" | "constituency" | "upload" | "success";

/** ------------------------------ Header helpers ------------------------------ */

function normalizeHeaders(input?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};

  if (!input) return out;

  // Headers instance
  if (typeof Headers !== "undefined" && input instanceof Headers) {
    input.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  // Array tuples
  if (Array.isArray(input)) {
    for (const [key, value] of input) {
      out[key] = value;
    }
    return out;
  }

  // Plain object
  return { ...(input as Record<string, string>) };
}

function withAuthHeaders(base: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { ...base };

  if (token) {
    if (!headers.Authorization) headers.Authorization = `Bearer ${token}`;
    if (!headers["X-Token"]) headers["X-Token"] = token;
  }

  return headers;
}

/** Small helper – JSON fetch */
async function fetchJSON<T>(url: string, init: RequestInit = {}): Promise<T> {
  const base = normalizeHeaders(init.headers);
  const headers = withAuthHeaders(base);

  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
  }

  return res.json() as Promise<T>;
}

/** API helpers */
const API = {
  counties: "/API/get_counties.php",
  constituencies: (countyCode: string) =>
    `/API/get_constituencies_new.php?county_code=${encodeURIComponent(countyCode)}`,

  /**
   * ✅ Direct save endpoint:
   * Backend now returns:
   * - status: "success" (saved)
   * - status: "needs_confirmation" (422) with confirm.confirm_token
   * - status: "error"
   */
  ocrSave34b: "/OCR/iebc_ocr_34b.php",

  boardroomStats: "/API/result-forms-boardroom-stats.php",
};

const ELECTION_DATE = "2025-11-27";

type IntegrityNeedsConfirmation = {
  status: "needs_confirmation";
  message: string;
  data?: {
    reason?: string;
    expected?: any;
    detected?: any;
    mismatch?: any;
    checks?: any;
    action?: string;
    confirm?: {
      force_confirm_required?: boolean;
      force_confirm_field?: string; // "force_confirm"
      confirm_token_field?: string; // "confirm_token"
      confirm_token?: string;
      expires_in_minutes?: number;
    };
  };
};

type IntegritySuccess = {
  status: "success";
  message: string;
  data?: any;
};

type IntegrityError = {
  status: "error";
  message: string;
  data?: any;
};

const ResultFormsBoardroom: React.FC = () => {
  const [formType, setFormType] = useState<FormType>("34B");
  const [step, setStep] = useState<Step>("county");

  const [counties, setCounties] = useState<County[]>([]);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [countyError, setCountyError] = useState<string | null>(null);

  const [selectedCountyCode, setSelectedCountyCode] = useState<string | null>(null);
  const [selectedCountyName, setSelectedCountyName] = useState<string | null>(null);

  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  const [constituencyError, setConstituencyError] = useState<string | null>(null);

  const [selectedConstituencyCode, setSelectedConstituencyCode] = useState<string | null>(null);
  const [selectedConstituencyName, setSelectedConstituencyName] = useState<string | null>(null);

  // ✅ Only ONE file allowed per constituency
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);

  // ✅ Local image confirmation
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  // ✅ Modal preview (plus to maximize)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // saving state
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "error">("idle");
  const [savingMessage, setSavingMessage] = useState<string | null>(null);

  // ✅ Dequeue / disable constituencies after successful submission
  const [submittedConstituencies, setSubmittedConstituencies] = useState<Set<string>>(() => new Set());

  // ✅ Server integrity confirmation flow state
  const [serverNeedsConfirm, setServerNeedsConfirm] = useState<IntegrityNeedsConfirmation | null>(null);
  const [serverConfirmChecked, setServerConfirmChecked] = useState(false);
  const [serverConfirmToken, setServerConfirmToken] = useState<string | null>(null);

  // KPIs + auth
  const [kpis, setKpis] = useState<BoardroomKpis>({
    forms_ingested: 0,
    ocr_processed: 0,
    flagged_constituencies: 0,
  });
  const [kpiLoading, setKpiLoading] = useState<boolean>(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const wizardTitle = useMemo(() => {
    if (step === "county") return "Select County";
    if (step === "constituency") return "Select Constituency";
    if (step === "upload") return "Upload & Confirm";
    return "Saved Successfully";
  }, [step]);

  /* ---------------- Cleanup object URL when replaced/unmounted ---------------- */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Escape closes modal ---------------- */
  useEffect(() => {
    if (!isPreviewOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPreviewOpen]);

  /* ---------------- Load KPIs + permission check once ---------------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setKpiLoading(true);
        setKpiError(null);
        setAuthError(null);

        const headers = withAuthHeaders({});
        const res = await fetch(API.boardroomStats, { credentials: "include", headers });

        if (res.status === 401) {
          if (!alive) return;
          let msg = "Sign in to open the Result Forms Boardroom.";
          try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch { }
          setAuthError(msg);
          return;
        }

        if (res.status === 403) {
          const json = await res.json().catch(() => null);
          if (!alive) return;
          setAuthError(json?.message || "You are not authorised to access the Result Forms Boardroom.");
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
        }

        const json = (await res.json()) as BoardroomStatsResponse;
        if (!alive) return;

        if (!json.success) throw new Error(json.message || "Failed to load boardroom stats.");
        if (json.kpis) setKpis(json.kpis);
      } catch (e: any) {
        if (!alive) return;
        setKpiError(e?.message || "Failed to load Result Forms Boardroom statistics.");
      } finally {
        if (alive) setKpiLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ---------------- Load counties once ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCounties(true);
        setCountyError(null);
        const json = await fetchJSON<any>(API.counties);
        if (!alive) return;

        if (json?.status === "success" && Array.isArray(json.data)) {
          setCounties(json.data as County[]);
        } else {
          throw new Error("Unexpected counties response");
        }
      } catch (e: any) {
        if (!alive) return;
        setCountyError(e?.message || "Failed to load counties");
      } finally {
        if (alive) setLoadingCounties(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------------- Load constituencies when county is picked ---------------- */
  useEffect(() => {
    if (!selectedCountyCode) {
      setConstituencies([]);
      setSelectedConstituencyCode(null);
      setSelectedConstituencyName(null);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoadingConstituencies(true);
        setConstituencyError(null);

        const url = API.constituencies(selectedCountyCode);
        const json = await fetchJSON<any>(url);
        if (!alive) return;

        if (json?.status === "success" && Array.isArray(json.data)) {
          setConstituencies(json.data as Constituency[]);
        } else {
          throw new Error("Unexpected constituencies response");
        }
      } catch (e: any) {
        if (!alive) return;
        setConstituencyError(e?.message || "Failed to load constituencies");
        setConstituencies([]);
      } finally {
        if (alive) setLoadingConstituencies(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedCountyCode]);

  /* ---------------- Reset upload state helper ---------------- */
  const resetUploadState = () => {
    setOcrFile(null);
    setUploadNote(null);
    setOcrStatus("idle");
    setOcrMessage(null);
    setSavingStatus("idle");
    setSavingMessage(null);
    setConfirmChecked(false);
    setIsPreviewOpen(false);

    setServerNeedsConfirm(null);
    setServerConfirmChecked(false);
    setServerConfirmToken(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  /* ---------------- FULL reset (county + constituency + upload) ---------------- */
  const resetAll = () => {
    setSelectedCountyCode(null);
    setSelectedCountyName(null);
    setSelectedConstituencyCode(null);
    setSelectedConstituencyName(null);
    setConstituencies([]);
    resetUploadState();
    setStep("county");
  };

  /* ---------------- Reset wizard when switching form type ---------------- */
  const handleFormTypeChange = (t: FormType) => {
    setFormType(t);
    // keep county/constituency selection, but reset upload
    resetUploadState();
    if (selectedConstituencyCode) setStep("upload");
  };

  /* ---------------- Wizard navigation ---------------- */
  const goBack = () => {
    setOcrMessage(null);
    setSavingMessage(null);
    setServerNeedsConfirm(null);
    setServerConfirmChecked(false);
    setServerConfirmToken(null);

    if (step === "constituency") setStep("county");
    else if (step === "upload") setStep("constituency");
    else if (step === "success") setStep("county");
  };

  /* ---------------- Step handlers ---------------- */
  const handleCountyClick = (county: County) => {
    setSelectedCountyCode(county.county_code);
    setSelectedCountyName(county.county_name);

    setSelectedConstituencyCode(null);
    setSelectedConstituencyName(null);
    setConstituencies([]);

    resetUploadState();
    setStep("constituency");
  };

  const handleConstituencyClick = (ct: Constituency) => {
    // ✅ If already submitted, ignore click (also visually disabled in UI)
    if (submittedConstituencies.has(ct.const_code)) return;

    setSelectedConstituencyCode(ct.const_code);
    setSelectedConstituencyName(ct.constituency_name);

    resetUploadState();
    setStep("upload");
  };

  const setFileAndPreview = (file: File | null) => {
    setOcrFile(file);
    setUploadNote(file ? `1 file selected: ${file.name}` : null);
    setOcrStatus("idle");
    setOcrMessage(null);
    setSavingStatus("idle");
    setSavingMessage(null);
    setConfirmChecked(false);

    setServerNeedsConfirm(null);
    setServerConfirmChecked(false);
    setServerConfirmToken(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] || null;
    setFileAndPreview(file);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (!file) return;
    setFileAndPreview(file);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => e.preventDefault();

  const tokenHeaders = () => withAuthHeaders({});

  /**
   * ✅ Direct OCR + Save (supports server integrity confirmation workflow)
   * - First attempt: normal (no force_confirm)
   * - If backend returns 422 needs_confirmation: show server confirmation card + token
   * - Second attempt: send force_confirm=1 + confirm_token from server
   */
  const saveDirect = async (opts?: { forceConfirm?: boolean }) => {
    if (!ocrFile) return;

    if (!selectedCountyCode) {
      setOcrStatus("error");
      setOcrMessage("Select a county first.");
      return;
    }
    if (!selectedConstituencyCode) {
      setOcrStatus("error");
      setOcrMessage("Select a constituency first.");
      return;
    }

    // Local (human) confirmation must be checked always.
    if (confirmChecked !== true) {
      setOcrStatus("error");
      setOcrMessage("Please confirm the uploaded image is the correct form before saving.");
      return;
    }

    // If server asked for confirmation, require server checkbox too before forcing.
    if (opts?.forceConfirm) {
      if (!serverConfirmChecked) {
        setSavingStatus("error");
        setSavingMessage("Please confirm the server integrity warning to continue.");
        return;
      }
      if (!serverConfirmToken) {
        setSavingStatus("error");
        setSavingMessage("Missing confirmation token. Please retry upload.");
        return;
      }
    }

    setSavingStatus("saving");
    setSavingMessage(null);
    setOcrStatus("uploading");
    setOcrMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", ocrFile);
      formData.append("county_code", selectedCountyCode);
      formData.append("const_code", selectedConstituencyCode);
      formData.append("election_date", ELECTION_DATE);
      formData.append("form_type", formType);

      if (opts?.forceConfirm) {
        formData.append("force_confirm", "1");
        // TS-safe: only append if non-null (we already guard above)
        if (serverConfirmToken) formData.append("confirm_token", serverConfirmToken);
      }

      const res = await fetch(API.ocrSave34b, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: tokenHeaders(),
      });

      if (res.status === 401) throw new Error("Sign in before uploading.");
      if (res.status === 403) {
        const json403 = await res.json().catch(() => null);
        throw new Error(json403?.message || "You are not authorised to upload result forms.");
      }

      // ✅ Server integrity gate (422)
      if (res.status === 422) {
        const j = (await res.json().catch(() => null)) as IntegrityNeedsConfirmation | null;
        if (j?.status === "needs_confirmation") {
          setServerNeedsConfirm(j);
          setServerConfirmChecked(false);
          setServerConfirmToken(j.data?.confirm?.confirm_token || null);

          setSavingStatus("error");
          setOcrStatus("error");
          setSavingMessage(j.message || "Integrity check failed. Please confirm to proceed.");
          setOcrMessage(j.message || "Integrity check failed. Please confirm to proceed.");
          return;
        }

        // fallback
        const text = await res.text().catch(() => "");
        throw new Error(text || "Integrity check failed (422).");
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` - ${text}` : ""}`);
      }

      const json = (await res.json().catch(() => ({} as any))) as IntegritySuccess | IntegrityError | any;
      if (json?.status !== "success") {
        throw new Error(json?.message || "OCR save returned an error.");
      }

      // ✅ Mark constituency as submitted → dequeue/disable
      setSubmittedConstituencies((prev) => {
        const next = new Set(prev);
        next.add(selectedConstituencyCode);
        return next;
      });

      // clear server confirm state after success
      setServerNeedsConfirm(null);
      setServerConfirmChecked(false);
      setServerConfirmToken(null);

      setSavingStatus("idle");
      setOcrStatus("done");
      setOcrMessage("Saved successfully.");
      setStep("success");
    } catch (e: any) {
      setSavingStatus("error");
      setOcrStatus("error");
      setSavingMessage(e?.message || "Failed to save.");
      setOcrMessage(e?.message || "Failed to save.");
    }
  };

  /* ---------------- Auth gate ---------------- */
  if (authError) {
    return (
      <div className="min-h-screen bg-[#FF3A3A] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/95 rounded-3xl shadow-2xl border border-[#FFE0DB] p-6 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-[#FFF1ED] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#FF3A3A]" />
          </div>
          <h1 className="text-lg font-bold text-[#111827] mb-2">Result Forms Boardroom</h1>
          <p className="text-sm text-slate-600 mb-3">{authError}</p>
          <p className="text-xs text-slate-500">For access changes, contact your system administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FF3A3A]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full h-1 bg-white/40"
      />

      <div className="max-w-6xl mx-auto px-4 pb-16 pt-8">
        {/* Hero */}
        <header className="pb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/15 border border-white/40 text-xs font-semibold mb-4 text-white">
            <ShieldCheck className="w-4 h-4" />
            IEBC Result Forms Boardroom
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight text-white">
            Result Forms Boardroom
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/90 max-w-xl">
            County → Constituency → Upload 1 file → Confirm image → Save (OCR + DB).
          </p>
        </header>

        {/* KPIs */}
        <section className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="IEBC Forms Captured"
              value={kpis.forms_ingested}
              loading={kpiLoading}
              icon={<FileText className="w-5 h-5 text-[#FF3A3A]" />}
              description="Official IEBC result forms in the system."
            />
            <KpiCard
              title="OCR Completed"
              value={kpis.ocr_processed}
              loading={kpiLoading}
              icon={<UploadCloud className="w-5 h-5 text-[#FF3A3A]" />}
              description="Forms processed through OCR."
            />
            <KpiCard
              title="Flagged Constituencies"
              value={kpis.flagged_constituencies}
              loading={kpiLoading}
              icon={<AlertTriangle className="w-5 h-5 text-[#FF3A3A]" />}
              description="Constituencies requiring follow-up."
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-white/90">Data is within your access scope.</p>
            {kpiError && <p className="text-[11px] text-yellow-100">{kpiError} – showing 0s.</p>}
          </div>
        </section>

        {/* Main Wizard */}
        <section className="mt-8 bg-[#FFF5F1] rounded-[32px] px-6 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#FF3A3A]">Wizard</p>
              <h2 className="text-lg font-black text-[#111827]">{wizardTitle}</h2>
              <p className="text-[11px] text-slate-600 mt-1">
                {selectedCountyName ? `${selectedCountyName}` : "—"}{" "}
                {selectedConstituencyName ? `• ${selectedConstituencyName}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {step !== "county" && (
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#FFE0DB] text-xs font-semibold text-[#FF3A3A] hover:bg-[#FFF0EA]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
            </div>
          </div>

          {/* Form type selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide text-[#FF3A3A]">Form Type</h3>
              <div className="inline-flex rounded-full bg-white p-1">
                {(["34A", "34B", "34C"] as FormType[]).map((ft) => {
                  const active = formType === ft;
                  return (
                    <button
                      key={ft}
                      onClick={() => handleFormTypeChange(ft)}
                      className={`px-4 py-1.5 text-xs sm:text-sm rounded-full font-semibold transition ${active
                          ? "bg-[#FF3A3A] text-white shadow-sm"
                          : "text-[#FF3A3A] hover:bg-[#FFE0DB]"
                        }`}
                    >
                      Form {ft}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* One panel at a time */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {step === "county" && (
              <Panel title="Counties" subtitle="Click a county to continue.">
                <div className="rounded-[28px] bg-white border border-[#FFE0DB] max-h-[420px] overflow-y-auto">
                  {countyError && (
                    <div className="p-3 text-xs text-red-600 bg-red-50 rounded-[28px]">{countyError}</div>
                  )}
                  {!countyError && loadingCounties && (
                    <div className="p-3 text-xs text-slate-500">Loading counties…</div>
                  )}
                  {!countyError &&
                    !loadingCounties &&
                    counties.map((c) => (
                      <button
                        key={c.county_code}
                        onClick={() => handleCountyClick(c)}
                        className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-b border-[#FFF2EC] last:border-b-0 hover:bg-[#FFF6F2] transition"
                      >
                        <MapPin className="w-4 h-4 text-[#FF9B80]" />
                        <span className="text-slate-800 font-semibold">{c.county_name}</span>
                        <span className="ml-auto text-[11px] text-slate-400">{c.county_code}</span>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </button>
                    ))}
                </div>
              </Panel>
            )}

            {step === "constituency" && (
              <Panel
                title="Constituencies"
                subtitle={selectedCountyName ? `Showing constituencies for ${selectedCountyName}` : "Pick a county first."}
              >
                <div className="rounded-[28px] bg-white border border-[#FFE0DB] max-h-[420px] overflow-y-auto">
                  {loadingConstituencies && (
                    <div className="p-3 text-xs text-slate-500">Loading constituencies…</div>
                  )}
                  {constituencyError && (
                    <div className="p-3 text-xs text-red-600 bg-red-50 rounded-[28px]">
                      {constituencyError}
                    </div>
                  )}

                  {!loadingConstituencies &&
                    !constituencyError &&
                    constituencies.map((ct) => {
                      const isSubmitted = submittedConstituencies.has(ct.const_code);
                      return (
                        <button
                          key={ct.const_code}
                          onClick={() => handleConstituencyClick(ct)}
                          disabled={isSubmitted}
                          className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-b border-[#FFF2EC] last:border-b-0 transition ${isSubmitted ? "bg-slate-50 cursor-not-allowed opacity-60" : "hover:bg-[#FFF6F2]"
                            }`}
                          title={isSubmitted ? "Already submitted (dequeued)" : "Click to upload"}
                        >
                          <MapPin className="w-4 h-4 text-[#FF9B80]" />
                          <span className="text-slate-800 font-semibold">{ct.constituency_name}</span>
                          <span className="ml-auto text-[11px] text-slate-400">{ct.const_code}</span>
                          {isSubmitted ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Submitted
                            </span>
                          ) : (
                            <ArrowRight className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      );
                    })}

                  {!loadingConstituencies && !constituencyError && !constituencies.length && (
                    <div className="p-3 text-xs text-slate-500">No constituencies found for this county.</div>
                  )}
                </div>

                {submittedConstituencies.size > 0 && (
                  <p className="mt-2 text-[11px] text-slate-600">
                    Submitted constituencies are disabled to prevent duplicate uploads.
                  </p>
                )}
              </Panel>
            )}

            {step === "upload" && (
              <Panel
                title="Upload & Confirm"
                subtitle={`Upload ONE Form ${formType} for ${selectedConstituencyName || selectedConstituencyCode || "—"
                  }.`}
              >
                <div
                  className="rounded-[28px] bg-white border border-dashed border-[#FF9B80] px-4 py-8 flex flex-col items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md transition"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <UploadCloud className="w-10 h-10 text-[#FF3A3A]" />
                  <p className="text-sm font-semibold text-center text-slate-900">Drag & drop IEBC result form image</p>
                  <p className="text-xs text-slate-500 text-center max-w-md">
                    Only one upload per constituency. Confirm the image via the + preview, then save. Server integrity
                    checks will reject wrong forms.
                  </p>

                  <label className="mt-2 inline-flex items-center justify-center px-3 py-2 rounded-full bg-[#FF3A3A] text-white text-xs font-semibold hover:bg-[#E12727] transition cursor-pointer">
                    <span>Browse file</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
                  </label>

                  {ocrFile && (
                    <div className="mt-2 w-full text-xs text-left text-slate-600">
                      <p className="font-semibold mb-1">
                        Selected: <span className="text-slate-800">{ocrFile.name}</span>
                      </p>
                    </div>
                  )}

                  {previewUrl && (
                    <div className="mt-4 w-full">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-slate-800">Uploaded image preview</p>

                        <button
                          type="button"
                          onClick={() => setIsPreviewOpen(true)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#FFE0DB] text-xs font-semibold text-[#FF3A3A] hover:bg-[#FFF0EA]"
                        >
                          <Plus className="w-4 h-4" />
                          View
                        </button>
                      </div>

                      <div className="mt-2 rounded-2xl border border-[#FFE0DB] overflow-hidden bg-[#FFF6F2]">
                        <img src={previewUrl} alt="Uploaded form preview" className="w-full max-h-56 object-contain" />
                      </div>

                      <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={confirmChecked}
                          onChange={(e) => setConfirmChecked(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          I confirm this is a valid IEBC Form {formType} for{" "}
                          <span className="font-semibold">{selectedConstituencyName || "this constituency"}</span> and I
                          want to save it.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* ✅ Server integrity confirmation card (only appears if backend returns needs_confirmation) */}
                  {serverNeedsConfirm && (
                    <div className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-900">Integrity check requires confirmation</p>
                      <p className="mt-1 text-[11px] text-amber-900">{serverNeedsConfirm.message}</p>

                      <div className="mt-2 grid gap-2 text-[11px] text-amber-900">
                        {serverNeedsConfirm.data?.reason && (
                          <p>
                            <span className="font-semibold">Reason:</span> {serverNeedsConfirm.data.reason}
                          </p>
                        )}

                        {serverNeedsConfirm.data?.expected && (
                          <div className="rounded-xl bg-white/70 p-2 border border-amber-200">
                            <p className="font-semibold mb-1">Expected</p>
                            <pre className="whitespace-pre-wrap break-words">
                              {JSON.stringify(serverNeedsConfirm.data.expected, null, 2)}
                            </pre>
                          </div>
                        )}

                        {serverNeedsConfirm.data?.detected && (
                          <div className="rounded-xl bg-white/70 p-2 border border-amber-200">
                            <p className="font-semibold mb-1">Detected</p>
                            <pre className="whitespace-pre-wrap break-words">
                              {JSON.stringify(serverNeedsConfirm.data.detected, null, 2)}
                            </pre>
                          </div>
                        )}

                        {serverNeedsConfirm.data?.checks && (
                          <div className="rounded-xl bg-white/70 p-2 border border-amber-200">
                            <p className="font-semibold mb-1">Checks</p>
                            <pre className="whitespace-pre-wrap break-words">
                              {JSON.stringify(serverNeedsConfirm.data.checks, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>

                      <label className="mt-3 flex items-start gap-2 text-xs text-amber-900">
                        <input
                          type="checkbox"
                          checked={serverConfirmChecked}
                          onChange={(e) => setServerConfirmChecked(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          I understand the warning and I still want to save this upload for{" "}
                          <span className="font-semibold">{selectedConstituencyName || selectedConstituencyCode}</span>.
                        </span>
                      </label>

                      <p className="mt-2 text-[10px] text-amber-800">
                        Note: If the image is wrong, click Back and upload the correct form instead.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      disabled={!ocrFile || savingStatus === "saving" || !confirmChecked}
                      onClick={() => saveDirect()}
                      className={`inline-flex items-center gap-2 justify-center px-4 py-2 rounded-full text-xs font-semibold border ${!ocrFile || savingStatus === "saving" || !confirmChecked
                          ? "border-slate-300 text-slate-400 cursor-not-allowed bg-slate-100"
                          : "border-[#FF3A3A] bg-[#FF3A3A] text-white hover:bg-[#E12727]"
                        }`}
                    >
                      <Save className="w-4 h-4" />
                      {savingStatus === "saving" ? "Saving…" : "Save (OCR + DB)"}
                    </button>

                    {/* ✅ Only shown when server asks for confirmation */}
                    {serverNeedsConfirm && (
                      <button
                        disabled={!ocrFile || savingStatus === "saving" || !confirmChecked || !serverConfirmChecked}
                        onClick={() => saveDirect({ forceConfirm: true })}
                        className={`inline-flex items-center gap-2 justify-center px-4 py-2 rounded-full text-xs font-semibold border ${!ocrFile || savingStatus === "saving" || !confirmChecked || !serverConfirmChecked
                            ? "border-slate-300 text-slate-400 cursor-not-allowed bg-slate-100"
                            : "border-amber-600 bg-amber-600 text-white hover:bg-amber-700"
                          }`}
                        title="Force save after server integrity warning"
                      >
                        <Save className="w-4 h-4" />
                        Force Save (Confirmed)
                      </button>
                    )}
                  </div>

                  {uploadNote && <p className="mt-2 text-[11px] text-emerald-600 text-center">{uploadNote}</p>}
                  {savingMessage && (
                    <p
                      className={`mt-2 text-[11px] text-center ${savingStatus === "error" ? "text-red-600" : "text-slate-600"
                        }`}
                    >
                      {savingMessage}
                    </p>
                  )}
                  {ocrMessage && (
                    <p
                      className={`mt-1 text-[11px] text-center ${ocrStatus === "error" ? "text-red-600" : "text-emerald-600"
                        }`}
                    >
                      {ocrMessage}
                    </p>
                  )}
                </div>

                {/* Fullscreen modal preview */}
                <AnimatePresence>
                  {isPreviewOpen && previewUrl && (
                    <motion.div
                      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsPreviewOpen(false)}
                    >
                      <motion.div
                        className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20"
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100">
                          <div className="text-xs sm:text-sm font-semibold text-slate-800">
                            Form {formType} • {selectedCountyName || "—"} • {selectedConstituencyName || "—"}
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPreviewOpen(false)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200"
                            aria-label="Close preview"
                          >
                            <X className="w-5 h-5 text-slate-700" />
                          </button>
                        </div>

                        <div className="bg-black">
                          <img
                            src={previewUrl}
                            alt="Maximized form preview"
                            className="w-full max-h-[80vh] object-contain"
                          />
                        </div>

                        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between gap-3">
                          <span>Press Esc or click outside to close.</span>
                          <button
                            type="button"
                            onClick={() => setIsPreviewOpen(false)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#FFE0DB] text-[11px] font-semibold text-[#FF3A3A] hover:bg-[#FFF0EA]"
                          >
                            <X className="w-4 h-4" />
                            Close
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Panel>
            )}

            {step === "success" && (
              <Panel title="Saved Successfully" subtitle="Results were stored in the database.">
                <div className="rounded-[28px] bg-white border border-[#FFE0DB] p-6 text-center">
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Upload saved</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedCountyName} • {selectedConstituencyName} • Form {formType}
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {/* ✅ Submit another form goes back to COUNTY selection */}
                    <button
                      onClick={() => {
                        resetAll(); // county -> constituency -> upload again
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF3A3A] text-white text-xs font-semibold hover:bg-[#E12727]"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Submit another form
                    </button>

                    <button
                      onClick={() => {
                        resetAll();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#FFE0DB] text-xs font-semibold text-[#FF3A3A] hover:bg-[#FFF0EA]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Start over
                    </button>
                  </div>
                </div>
              </Panel>
            )}
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default ResultFormsBoardroom;

/* ------------------------------ UI Pieces ------------------------------ */

const Panel: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div>
    <div className="mb-3">
      <h3 className="text-sm font-black text-[#111827]">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-600 mt-1">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const KpiCard: React.FC<{
  title: string;
  value: number;
  loading?: boolean;
  icon: React.ReactNode;
  description: string;
}> = ({ title, value, loading, icon, description }) => (
  <div className="rounded-[32px] bg-[#FFFDFB] text-[#111827] px-6 py-5 shadow-[0_14px_35px_rgba(0,0,0,0.08)] flex flex-col justify-between">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm font-semibold text-[#FF3A3A]">{title}</h3>
        <div className="text-3xl font-extrabold mt-1 text-[#101827]">
          {loading ? (
            <span className="inline-block h-7 w-16 rounded-md bg-slate-200 animate-pulse" />
          ) : (
            <CountUp end={value} duration={1.4} separator="," />
          )}
        </div>
      </div>
      <div className="w-14 h-14 rounded-full bg-[#FFF1ED] flex items-center justify-center shadow-inner">
        {icon}
      </div>
    </div>
    <p className="text-xs text-slate-500">{description}</p>
  </div>
);
