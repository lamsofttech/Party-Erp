// src/components/CandidateEntryCard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PlusCircle, Image as ImageIcon, X } from "lucide-react";

/* =========================
   Types
========================= */
interface CandidateEntryCardProps {
  county: string; // Selected county
  onCandidateAdded: () => void; // Notify parent after success
}

interface PoliticalParty {
  id: number;
  name: string;
  abbreviation: string | null;
}

/* =========================
   Config
========================= */
const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE ??
  "https://skizagroundsuite.com/API";

const PARTIES_ENDPOINT = `${API_BASE}/fetch_political_parties.php`;
const ADD_CANDIDATE_ENDPOINT = `${API_BASE}/add_candidate.php`;

const MAX_IMAGE_MB = 3;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

/* =========================
   Helpers
========================= */
const bytesToMB = (bytes: number) => bytes / (1024 * 1024);

const isValidPhone = (value: string) => {
  // Allow E.164, and common KE formats (+2547XXXXXXXX or 07XXXXXXXX)
  const v = value.trim();
  return (
    /^\+?[1-9]\d{7,14}$/.test(v) || // generic E.164-ish
    /^(\+254|0)7\d{8}$/.test(v) // Kenya mobile
  );
};

const cleanError = (err: unknown) =>
  err instanceof Error ? err.message : String(err ?? "Unknown error");

/* =========================
   Component
========================= */
const CandidateEntryCard: React.FC<CandidateEntryCardProps> = ({
  county,
  onCandidateAdded,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Form state
  const [candidateName, setCandidateName] = useState("");
  const [candidatePartyId, setCandidatePartyId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Derived/UI state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [politicalParties, setPoliticalParties] = useState<PoliticalParty[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fetchPartiesError, setFetchPartiesError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  /* -------- Fetch parties (with cache + abort + timeout) -------- */
  useEffect(() => {
    let cancelled = false;
    const cacheKey = "political_parties_cache_v1";

    const load = async () => {
      try {
        setFetchPartiesError(null);

        // Try sessionStorage cache first
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as PoliticalParty[];
          if (!cancelled) setPoliticalParties(parsed);
        }

        // Always attempt refresh in background
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout
        const res = await fetch(PARTIES_ENDPOINT, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (!res.ok) {
          // Attempt to parse message
          let msg = `Failed to load parties (HTTP ${res.status})`;
          try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch {}
          throw new Error(msg);
        }

        const data = await res.json();
        if (data?.status === "success" && Array.isArray(data?.data)) {
          if (!cancelled) {
            setPoliticalParties(data.data);
            sessionStorage.setItem(cacheKey, JSON.stringify(data.data));
          }
        } else {
          throw new Error(data?.message || "Invalid parties response.");
        }
      } catch (err) {
        if (cancelled) return;
        if ((err as any)?.name === "AbortError") return;
        setFetchPartiesError(
          `Could not load political parties. ${cleanError(err)}`
        );
      }
    };

    load();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  /* -------- Image preview cleanup -------- */
  useEffect(() => {
    if (!photoFile) {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
      }
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoFile]);

  /* -------- File change handler (type + size checks) -------- */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormError(
        "Invalid image type. Please upload a JPG, PNG, or WEBP photo."
      );
      event.currentTarget.value = ""; // reset file input
      return;
    }
    if (bytesToMB(file.size) > MAX_IMAGE_MB) {
      setFormError(`Image is too large. Max size is ${MAX_IMAGE_MB} MB.`);
      event.currentTarget.value = "";
      return;
    }
    setFormError(null);
    setPhotoFile(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setFormError(null);
  };

  /* -------- Client-side validation -------- */
  const validationError = useMemo(() => {
    if (!candidateName.trim()) return "Candidate name is required.";
    if (!candidatePartyId) return "Please select a political party.";
    if (!contactEmail.trim()) return "Contact email is required.";
    // browser will also validate email format due to type="email"
    if (!contactPhone.trim()) return "Contact phone is required.";
    if (!isValidPhone(contactPhone)) return "Please enter a valid phone number.";
    if (!bio.trim()) return "Biography is required.";
    if (bio.trim().length < 30)
      return "Biography is too short (min 30 characters).";
    if (!photoFile) return "Please upload a candidate photo.";
    return null;
  }, [bio, candidateName, candidatePartyId, contactEmail, contactPhone, photoFile]);

  const canSubmit = !loading && !validationError && !fetchPartiesError;

  /* -------- Submit handler -------- */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    // guard double-submit + validation
    if (!canSubmit) {
      setFormError(validationError || fetchPartiesError || "Form not ready.");
      return;
    }

    const formData = new FormData();
    formData.append("name", candidateName.trim());
    formData.append("party_id", candidatePartyId);
    formData.append("county", county);
    formData.append("contact_email", contactEmail.trim());
    formData.append("contact_phone", contactPhone.trim());
    formData.append("bio", bio.trim());
    if (photoFile) formData.append("photo", photoFile);

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const res = await fetch(ADD_CANDIDATE_ENDPOINT, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        // ignore parse error; will fall back to status text
      }

      if (!res.ok || payload?.status !== "success") {
        const msg =
          payload?.message ||
          (!res.ok
            ? `Failed to add candidate (HTTP ${res.status})`
            : "Failed to add candidate.");
        throw new Error(msg);
      }

      // Success → reset form + notify parent
      setCandidateName("");
      setCandidatePartyId("");
      setContactEmail("");
      setContactPhone("");
      setBio("");
      setPhotoFile(null);
      onCandidateAdded();
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        setFormError("Request timed out. Please try again.");
      } else {
        setFormError(`Failed to add candidate: ${cleanError(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { scale: 0.98, opacity: 0 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-l-4 border-blue-500"
      role="region"
      aria-labelledby="candidate-entry-title"
    >
      <h2
        id="candidate-entry-title"
        className="text-2xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"
      >
        <PlusCircle size={24} className="text-blue-500" />
        Add Governor Candidate for {county} County
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Candidate Name */}
        <div>
          <label
            htmlFor="candidate-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Candidate Name
          </label>
          <input
            type="text"
            id="candidate-name"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Jane Doe"
            required
            autoComplete="name"
          />
        </div>

        {/* Party */}
        <div>
          <label
            htmlFor="candidate-party"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Political Party
          </label>
          {fetchPartiesError ? (
            <div className="text-red-500 text-sm">{fetchPartiesError}</div>
          ) : (
            <select
              id="candidate-party"
              value={candidatePartyId}
              onChange={(e) => setCandidatePartyId(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={politicalParties.length === 0}
            >
              <option value="">-- Select Party --</option>
              {politicalParties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                  {party.abbreviation ? ` (${party.abbreviation})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Contact Email */}
        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Contact Email
          </label>
          <input
            type="email"
            id="contact-email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., jane.doe@example.com"
            required
            autoComplete="email"
            inputMode="email"
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label
            htmlFor="contact-phone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Contact Phone
          </label>
          <input
            type="tel"
            id="contact-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., +254712345678"
            required
            autoComplete="tel"
            inputMode="tel"
            pattern="^(\+?[1-9]\d{7,14}|(\+254|0)7\d{8})$"
            title="Use +2547XXXXXXXX, 07XXXXXXXX, or international E.164 format"
          />
        </div>

        {/* Biography */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Biography
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter candidate's biography (min 30 characters)…"
            required
            minLength={30}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {bio.length < 30
              ? `${30 - bio.length} more characters required`
              : "Looks good"}
          </p>
        </div>

        {/* Photo */}
        <div>
          <label
            htmlFor="candidate-photo"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Candidate Photo
          </label>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="file"
              id="candidate-photo"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleFileChange}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
            {photoFile && (
              <button
                type="button"
                onClick={removePhoto}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
                aria-label="Remove selected photo"
              >
                <X size={16} />
                Remove
              </button>
            )}
          </div>

          {/* Preview */}
          {photoPreview ? (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={photoPreview}
                alt="Candidate preview"
                className="h-16 w-16 rounded-md object-cover ring-2 ring-blue-500/50"
              />
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium truncate max-w-[18rem]">
                  {photoFile?.name}
                </p>
                <p className="text-xs">
                  {(bytesToMB(photoFile!.size)).toFixed(2)} MB •{" "}
                  {photoFile?.type || "image"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <ImageIcon size={16} /> JPG/PNG/WEBP • up to {MAX_IMAGE_MB} MB
            </p>
          )}
        </div>

        {/* Errors */}
        <div
          role="alert"
          aria-live="polite"
          className="min-h-[1rem] text-sm"
        >
          {(formError || validationError) && (
            <div className="text-red-500">{formError || validationError}</div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <>
              <PlusCircle size={20} />
              Add Candidate
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default CandidateEntryCard;
