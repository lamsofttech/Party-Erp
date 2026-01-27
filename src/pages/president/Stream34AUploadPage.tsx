import React, { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { RequirePermission } from "../../components/RequirePermission";
import GeminiLiveSidecar from "../../components/gemini/GeminiLiveSidecar";

interface LocationState {
  stationId?: number;
  streamId?: number;
  stationName?: string;
  streamName?: string;
}

interface OcrCandidate {
  id: number;
  name: string;
  votes: number;
}

interface OcrResult {
  candidates: OcrCandidate[];
  rejected_votes: number;
  registered_voters?: number | null;
  presiding_officer?: string | null;
  notes?: string;
}

interface FileMeta {
  base64: string; // data URL (data:image/jpeg;base64,...)
  name: string;
  mime: string;
}

const Stream34AUploadPage: React.FC = () => {
  const { stationId, streamId } = useParams<{
    stationId: string;
    streamId: string;
  }>();

  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as LocationState;

  const [step, setStep] = useState<"upload" | "confirm">("upload");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [formState, setFormState] = useState<{
    candidates: { id: number; name: string; votes: string }[];
    rejected_votes: string;
    registered_voters: string;
    presiding_officer: string;
  }>({
    candidates: [],
    rejected_votes: "",
    registered_voters: "",
    presiding_officer: "",
  });

  // 🔹 holds the uploaded image for the 2nd API (save_pres_results.php)
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ NEW: toggle AI helper drawer
  const [aiHelpOpen, setAiHelpOpen] = useState(false);

  const stationLabel =
    state.stationName || (stationId ? `Station #${stationId}` : "Station");
  const streamLabel =
    state.streamName || (streamId ? `Stream #${streamId}` : "Stream");

  const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    "";

  const handleChooseFile = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !stationId || !streamId) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError(
        "Unsupported file type. Please upload a Form 34A image (JPG, JPEG, PNG or WEBP)."
      );
      return;
    }

    setError(null);
    setInfo(null);
    setUploading(true);

    // 🔹 1) Read file as base64 for the save API
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setFileMeta({
          base64: result, // data:image/...;base64,xxxx
          name: file.name,
          mime: file.type,
        });
      }
    };
    reader.readAsDataURL(file);

    try {
      // 🔹 2) Send file to OCR endpoint as before
      const formData = new FormData();
      formData.append("file", file);
      formData.append("station_id", stationId);
      formData.append("stream_id", streamId);

      const token = getToken();

      const res = await fetch("/OCR/iebc_ocr_34a.php", {
        method: "POST",
        body: formData,
        headers: token
          ? {
            Authorization: `Bearer ${token}`,
            "X-Token": token,
          }
          : undefined,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.status === "error") {
        throw new Error(data.message || data.error || "OCR failed.");
      }

      const ocr: OcrResult = data.data;

      setFormState({
        candidates: (ocr.candidates || []).map((c) => ({
          id: c.id,
          name: c.name,
          votes: String(c.votes ?? 0),
        })),
        rejected_votes: String(ocr.rejected_votes ?? 0),
        registered_voters: ocr.registered_voters ? String(ocr.registered_voters) : "",
        presiding_officer: ocr.presiding_officer || "",
      });

      setInfo(
        ocr.notes ||
        "OCR completed. Please confirm or correct all numbers before submitting."
      );
      setStep("confirm");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "OCR processing failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const updateCandidateVotes = (idx: number, value: string) => {
    setFormState((prev) => {
      const next = { ...prev, candidates: [...prev.candidates] };
      next.candidates[idx] = {
        ...next.candidates[idx],
        votes: value.replace(/[^\d]/g, ""),
      };
      return next;
    });
  };

  const handleSubmitRawFigures = async () => {
    if (!stationId || !streamId) return;

    setError(null);
    setSubmitting(true);

    try {
      const token = getToken();

      const payload: any = {
        station_id: Number(stationId),
        stream_id: Number(streamId),
        entries: formState.candidates.map((c) => ({
          candidate_name: c.name,
          votes: Math.max(0, Math.floor(Number(c.votes) || 0)),
        })),
        rejected_votes: Math.max(
          0,
          Math.floor(Number(formState.rejected_votes) || 0)
        ),
        registered_voters_snap: formState.registered_voters
          ? Math.max(0, Math.floor(Number(formState.registered_voters) || 0))
          : null,
        presiding_officer: formState.presiding_officer || null,
        source: "ocr_34a",
        status: "submitted",
      };

      // 🔹 Attach file info (base64 + meta) so PHP can save it
      if (fileMeta) {
        payload.form_file_base64 = fileMeta.base64;
        payload.form_file_name = fileMeta.name;
        payload.form_file_mime = fileMeta.mime;
      }

      const res = await fetch("/API/president/save_pres_results.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
              Authorization: `Bearer ${token}`,
              "X-Token": token,
            }
            : {}),
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.status === "error") {
        throw new Error(
          data.message || data.error || "Failed to submit results."
        );
      }

      setInfo("Results submitted successfully.");
      navigate(-1);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to submit results.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequirePermission permission="results34a.view">
      {/* ✅ NEW: AI helper drawer (does not affect workflow) */}
      <GeminiLiveSidecar
        open={aiHelpOpen}
        onClose={() => setAiHelpOpen(false)}
        contextHint={`User is verifying Form 34A for: ${stationLabel} / ${streamLabel}. Current step: ${step}.`}
      />

      <div className="px-3 py-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              Form 34A – {stationLabel}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Stream: <span className="font-semibold">{streamLabel}</span>
            </p>
            <p className="text-[0.7rem] sm:text-xs text-gray-500 mt-1 max-w-md">
              Step 1: Upload the Form 34A image to run OCR.
              <br />
              Step 2: Confirm the extracted figures manually, then submit.
            </p>
          </div>

          <div className="flex gap-2">
            {/* ✅ NEW: open side-by-side AI help */}
            <button
              onClick={() => setAiHelpOpen(true)}
              className="self-start text-[0.7rem] sm:text-xs px-3 py-1 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-50 active:bg-blue-100"
              title="Open AI Help (screen share + voice)"
            >
              🎧 AI Help
            </button>

            <button
              onClick={() => navigate(-1)}
              className="self-start text-[0.7rem] sm:text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              ← Back
            </button>
          </div>
        </header>

        {error && (
          <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
            {error}
          </div>
        )}
        {info && (
          <div className="text-xs sm:text-sm text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded">
            {info}
          </div>
        )}

        {step === "upload" && (
          <section className="bg-white border border-dashed border-gray-300 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="text-4xl mb-1">📄</div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-800">
              Upload Form 34A image
            </h2>
            <p className="text-[0.75rem] sm:text-xs text-gray-500 max-w-sm">
              JPG, JPEG, PNG or WEBP. The system will read candidate votes,
              rejected votes, registered voters and presiding officer details.
              You will confirm all numbers before final submission.
            </p>
            <button
              onClick={handleChooseFile}
              disabled={uploading}
              className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {uploading ? "Running OCR…" : "Choose Form 34A Image"}
            </button>
          </section>
        )}

        {step === "confirm" && (
          <section className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3">
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                Confirm extracted figures
              </h2>

              <div className="space-y-2">
                <p className="text-[0.75rem] sm:text-xs text-gray-500">
                  Confirm the votes for each candidate as per the physical Form
                  34A. Adjust any incorrect values.
                </p>
                <div className="space-y-2">
                  {formState.candidates.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-[0.8rem] sm:text-sm text-gray-800 flex-1">
                        {c.name}
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="w-24 sm:w-28 border border-gray-300 rounded-md px-2 py-1 text-right text-[0.8rem] sm:text-sm"
                        value={c.votes}
                        onChange={(e) =>
                          updateCandidateVotes(idx, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[0.75rem] sm:text-xs text-gray-600">
                    Rejected Votes
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-[0.8rem] sm:text-sm"
                    value={formState.rejected_votes}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        rejected_votes: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[0.75rem] sm:text-xs text-gray-600">
                    Registered Voters (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-[0.8rem] sm:text-sm"
                    value={formState.registered_voters}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        registered_voters: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[0.75rem] sm:text-xs text-gray-600">
                    Presiding Officer
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-[0.8rem] sm:text-sm"
                    value={formState.presiding_officer}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        presiding_officer: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="order-2 sm:order-1 inline-flex items-center justify-center px-4 py-2 rounded-full border border-gray-300 text-[0.8rem] sm:text-sm text-gray-700 hover:bg-gray-50"
                >
                  Back to Upload
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRawFigures}
                  disabled={submitting}
                  className="order-1 sm:order-2 inline-flex items-center justify-center px-4 py-2 rounded-full bg-green-600 text-white text-[0.8rem] sm:text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit Results"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </RequirePermission>
  );
};

export default Stream34AUploadPage;
