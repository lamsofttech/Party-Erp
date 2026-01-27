import React, {
    useEffect,
    useState,
    useCallback,
    useRef,
    ChangeEvent,
} from "react";
import {
    RefreshCw,
    UploadCloud,
    Search as SearchIcon,
    ChevronRight,
    ChevronLeft,
    FileText,
} from "lucide-react";

/* -------------------- randomUUID polyfill -------------------- */
(function ensureRandomUUID() {
    function polyfillUUID() {
        const bytes = new Uint8Array(16);
        const g = (globalThis as any)?.crypto?.getRandomValues;
        if (g) g(bytes);
        else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
            16,
            20
        )}-${hex.slice(20)}`;
    }
    try {
        const anyWin = window as any;
        anyWin.crypto = anyWin.crypto || {};
        if (!anyWin.crypto.randomUUID) anyWin.crypto.randomUUID = polyfillUUID;
    } catch {
        /* noop */
    }
})();

/* ------------------------------ API ------------------------------ */
const API_BASE = "https://skizagroundsuite.com/API";

const API = {
    counties: `${API_BASE}/get_counties.php`,
    constituencies: (countyCode: string) =>
        `${API_BASE}/get_constituencies.php?county_code=${encodeURIComponent(
            countyCode
        )}`,
};

/* ------------------------------ Types ------------------------------ */
type Step = "counties" | "constituencies" | "uploads";

interface County {
    id: string;
    name: string;
    code: string;
}

interface Constituency {
    id: string;
    name: string;
    county_code: string;
}

type UploadStatus = "pending" | "processing" | "done" | "error";

interface UploadRow {
    id: string;
    pollingCenter: string;
    file: File;
    status: UploadStatus;
}

/* ------------------------------ Helpers ------------------------------ */
async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...opts,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

const statusLabel = (s: UploadStatus) => {
    switch (s) {
        case "pending":
            return "Pending OCR";
        case "processing":
            return "Processing";
        case "done":
            return "Completed";
        case "error":
            return "Error";
    }
};

/* ===================================================== */
/*              Result Forms Boardroom Page              */
/* ===================================================== */

const ResultFormsBoardroom: React.FC = () => {
    /* ------------ top filters (like screenshot) ------------ */
    const [office, setOffice] = useState("President");
    const [formType, setFormType] = useState("Form 34B");
    const [electionDate, setElectionDate] = useState("2025-11-27");
    const [search, setSearch] = useState("");

    /* ------------ navigation state ------------ */
    const [step, setStep] = useState<Step>("counties");

    const [counties, setCounties] = useState<County[]>([]);
    const [loadingCounties, setLoadingCounties] = useState(false);

    const [selectedCounty, setSelectedCounty] = useState<County | null>(null);

    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [loadingConstituencies, setLoadingConstituencies] = useState(false);

    const [selectedConstituency, setSelectedConstituency] =
        useState<Constituency | null>(null);

    /* ------------ uploads (OCR workspace) ------------ */
    const [uploads, setUploads] = useState<UploadRow[]>([]);
    const [isSendingToOCR, setIsSendingToOCR] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    /* -------------------- load 47 counties -------------------- */
    useEffect(() => {
        setLoadingCounties(true);
        fetchJSON<any>(API.counties)
            .then((json) => {
                const mapped: County[] = (Array.isArray(json?.data) ? json.data : []).map(
                    (c: any) => ({
                        id: String(c.county_code),
                        code: String(c.county_code),
                        name: c.county_name,
                    })
                );
                setCounties(mapped);
            })
            .catch((e) => {
                console.error("counties", e);
                setCounties([]);
            })
            .finally(() => setLoadingCounties(false));
    }, []);

    /* -------------------- load constituencies -------------------- */
    const loadConstituencies = useCallback((county: County) => {
        setLoadingConstituencies(true);
        fetchJSON<any>(API.constituencies(county.code))
            .then((json) => {
                const mapped: Constituency[] = (Array.isArray(json?.data) ? json.data : []).map(
                    (c: any) => ({
                        id: String(c.const_code),
                        name: c.constituency_name,
                        county_code: county.code,
                    })
                );
                setConstituencies(mapped);
            })
            .catch((e) => {
                console.error("constituencies", e);
                setConstituencies([]);
            })
            .finally(() => setLoadingConstituencies(false));
    }, []);

    /* -------------------- interactions -------------------- */
    const handleCountyClick = (county: County) => {
        setSelectedCounty(county);
        setSelectedConstituency(null);
        setUploads([]);
        setStep("constituencies");
        loadConstituencies(county);
    };

    const handleConstituencyClick = (c: Constituency) => {
        setSelectedConstituency(c);
        setUploads([]);
        setStep("uploads");
    };

    const handleBackToCounties = () => {
        setSelectedCounty(null);
        setSelectedConstituency(null);
        setUploads([]);
        setStep("counties");
    };

    const handleBackToConstituencies = () => {
        setSelectedConstituency(null);
        setUploads([]);
        setStep("constituencies");
    };

    const filteredCounties = counties.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredConstituencies = constituencies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    /* -------------------- upload handlers -------------------- */
    const openFileDialog = () => {
        if (step === "uploads" && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const list = Array.from(files);

        const newRows: UploadRow[] = list.map((file) => ({
            id: (window.crypto as any).randomUUID(),
            pollingCenter: file.name.replace(/\.[^/.]+$/, ""),
            file,
            status: "pending",
        }));

        setUploads((prev) => [...prev, ...newRows]);
        e.target.value = ""; // reset
    };

    const sendToOCR = async () => {
        if (!uploads.some((u) => u.status === "pending")) return;
        setIsSendingToOCR(true);

        // mark as processing
        setUploads((prev) =>
            prev.map((u) => (u.status === "pending" ? { ...u, status: "processing" } : u))
        );

        // TODO: replace this setTimeout with real OCR API call
        // - build FormData
        // - append files + meta (county/constituency/office/formType/electionDate)
        // - POST to your backend

        setTimeout(() => {
            setUploads((prev) =>
                prev.map((u) =>
                    u.status === "processing" ? { ...u, status: "done" } : u
                )
            );
            setIsSendingToOCR(false);
        }, 1500);
    };

    const downloadLocalFile = (row: UploadRow) => {
        const url = URL.createObjectURL(row.file);
        const a = document.createElement("a");
        a.href = url;
        a.download = row.file.name;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* -------------------- render helpers -------------------- */

    const renderFiltersBar = () => (
        <div className="border border-[#d6e9c6] bg-[#e7f6df] rounded-md px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
                <select
                    className="border rounded px-3 py-1.5 text-sm"
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                >
                    <option>President</option>
                    <option>MNA</option>
                    <option>MCA</option>
                    <option>Senate</option>
                    <option>Governor</option>
                </select>

                <select
                    className="border rounded px-3 py-1.5 text-sm"
                    value={formType}
                    onChange={(e) => {
                        setFormType(e.target.value);
                        // whenever we change form, reset drilldown
                        handleBackToCounties();
                    }}
                >
                    <option>Form 34A</option>
                    <option>Form 34B</option>
                    <option>Form 34C</option>
                </select>

                <input
                    type="date"
                    className="border rounded px-3 py-1.5 text-sm"
                    value={electionDate}
                    onChange={(e) => setElectionDate(e.target.value)}
                />
            </div>

            <div className="flex items-center gap-2 min-w-[260px]">
                <div className="flex items-center border rounded px-2 py-1.5 bg-white flex-1">
                    <SearchIcon size={16} className="text-gray-400 mr-2" />
                    <input
                        className="outline-none text-sm w-full"
                        placeholder={
                            step === "counties"
                                ? "Search county..."
                                : step === "constituencies"
                                    ? "Search constituency..."
                                    : "Search polling center..."
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    className="p-2 rounded border bg-white hover:bg-gray-50"
                    onClick={() => setSearch("")}
                >
                    <RefreshCw size={16} />
                </button>

                {/* Upload icon – only active on upload step */}
                <button
                    type="button"
                    className={`p-2 rounded border ${step === "uploads"
                            ? "bg-[#f5f5f5] hover:bg-gray-100 cursor-pointer"
                            : "bg-gray-100 cursor-not-allowed opacity-70"
                        }`}
                    onClick={openFileDialog}
                >
                    <UploadCloud size={18} />
                </button>
            </div>
        </div>
    );

    const renderBreadcrumb = () => (
        <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500 flex items-center gap-1">
                <span>KENYA</span>
                {selectedCounty && (
                    <>
                        <ChevronRight size={14} />
                        <button
                            type="button"
                            className="hover:underline"
                            onClick={handleBackToCounties}
                        >
                            {selectedCounty.name}
                        </button>
                    </>
                )}
                {selectedConstituency && (
                    <>
                        <ChevronRight size={14} />
                        <button
                            type="button"
                            className="hover:underline"
                            onClick={handleBackToConstituencies}
                        >
                            {selectedConstituency.name}
                        </button>
                    </>
                )}
            </div>

            <div className="text-xs text-gray-500">
                Elections, <strong>27TH NOV, 2025</strong>
            </div>
        </div>
    );

    const renderCountiesTable = () => (
        <div className="border rounded-md overflow-hidden bg-white shadow-sm">
            <div className="border-b px-4 py-2 text-sm font-semibold bg-gray-50 flex justify-between">
                <span>County</span>
                <span>Reported</span>
            </div>
            <div>
                {loadingCounties ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Loading counties…
                    </div>
                ) : filteredCounties.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No counties found.
                    </div>
                ) : (
                    filteredCounties.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCountyClick(c)}
                            className="w-full flex items-center justify-between px-4 py-2 border-b last:border-b-0 text-sm hover:bg-gray-50"
                        >
                            <span>{c.name}</span>
                            <span className="text-[#c9302c] font-semibold flex items-center gap-1">
                                0 <ChevronRight size={14} />
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    const renderConstituenciesTable = () => (
        <div className="border rounded-md overflow-hidden bg-white shadow-sm">
            <div className="border-b px-4 py-2 text-sm font-semibold bg-gray-50 flex justify-between">
                <span>Constituency in {selectedCounty?.name}</span>
                <span>Reported</span>
            </div>
            <div>
                {loadingConstituencies ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Loading constituencies…
                    </div>
                ) : filteredConstituencies.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No constituencies found for this county.
                    </div>
                ) : (
                    filteredConstituencies.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => handleConstituencyClick(c)}
                            className="w-full flex items-center justify-between px-4 py-2 border-b last:border-b-0 text-sm hover:bg-gray-50"
                        >
                            <span>{c.name}</span>
                            <span className="text-[#c9302c] font-semibold flex items-center gap-1">
                                0 <ChevronRight size={14} />
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    const renderUploadsWorkspace = () => (
        <div className="border rounded-md overflow-hidden bg-white shadow-sm">
            <div className="border-b px-4 py-2 text-sm font-semibold bg-gray-50 flex justify-between items-center">
                <span>
                    Polling Center –{" "}
                    <span className="font-normal text-gray-500">
                        {selectedConstituency?.name}, {selectedCounty?.name}
                    </span>
                </span>
                <span className="font-semibold text-right text-[#c9302c]">Reported</span>
            </div>

            {/* Upload area */}
            <div className="px-4 py-4 border-b bg-slate-50 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex-1 text-sm text-gray-600">
                    <div className="font-semibold mb-1 flex items-center gap-1">
                        <FileText size={16} /> {formType} • {office}
                    </div>
                    <p className="text-xs text-gray-500">
                        Upload scanned PDFs or clear images of result forms for this
                        constituency. Our OCR engine will extract tallies and compare them
                        against agent Form 34A submissions.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button
                        type="button"
                        onClick={openFileDialog}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-dashed bg-white hover:bg-gray-50 text-sm"
                    >
                        <UploadCloud size={16} /> Choose Files
                    </button>
                    <button
                        type="button"
                        onClick={sendToOCR}
                        disabled={
                            isSendingToOCR || !uploads.some((u) => u.status === "pending")
                        }
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-sm text-white ${isSendingToOCR ||
                                !uploads.some((u) => u.status === "pending")
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-[#d9534f] hover:bg-[#c9302c]"
                            }`}
                    >
                        {isSendingToOCR ? "Sending to OCR…" : "Send Pending to OCR"}
                    </button>
                </div>
            </div>

            {/* Hidden input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFilesSelected}
            />

            {/* Uploads table */}
            <div className="px-4 py-3">
                {uploads.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 text-center">
                        No files uploaded yet. Click <strong>Choose Files</strong> or the
                        cloud icon in the top filters bar to add forms for OCR.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-2 py-2 border-b">Polling Center</th>
                                    <th className="text-left px-2 py-2 border-b">File</th>
                                    <th className="text-left px-2 py-2 border-b">Status</th>
                                    <th className="text-right px-2 py-2 border-b">Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploads.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="px-2 py-2 border-b">
                                            <input
                                                className="border rounded px-2 py-1 text-xs w-full"
                                                value={u.pollingCenter}
                                                onChange={(e) =>
                                                    setUploads((prev) =>
                                                        prev.map((row) =>
                                                            row.id === u.id
                                                                ? {
                                                                    ...row,
                                                                    pollingCenter: e.target.value,
                                                                }
                                                                : row
                                                        )
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 border-b">
                                            <span className="break-all text-xs">{u.file.name}</span>
                                        </td>
                                        <td className="px-2 py-2 border-b">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] ${u.status === "done"
                                                        ? "bg-green-100 text-green-800"
                                                        : u.status === "processing"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : u.status === "error"
                                                                ? "bg-red-100 text-red-800"
                                                                : "bg-gray-100 text-gray-700"
                                                    }`}
                                            >
                                                {statusLabel(u.status)}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 border-b text-right">
                                            <button
                                                type="button"
                                                onClick={() => downloadLocalFile(u)}
                                                className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                                            >
                                                PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );

    /* -------------------- main render -------------------- */
    return (
        <div className="min-h-screen bg-[#f7f7f9] px-4 py-6">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">Result Forms</h1>

                {/* Breadcrumb & elections card style */}
                {renderBreadcrumb()}

                {renderFiltersBar()}

                <div className="mt-4">
                    {step === "counties" && renderCountiesTable()}
                    {step === "constituencies" && renderConstituenciesTable()}
                    {step === "uploads" && renderUploadsWorkspace()}
                </div>

                {/* simple back button for mobile */}
                {step !== "counties" && (
                    <button
                        type="button"
                        className="mt-4 inline-flex items-center gap-1 text-xs text-gray-500 hover:underline"
                        onClick={step === "uploads" ? handleBackToConstituencies : handleBackToCounties}
                    >
                        <ChevronLeft size={14} /> Back
                    </button>
                )}
            </div>
        </div>
    );
};

export default ResultFormsBoardroom;
