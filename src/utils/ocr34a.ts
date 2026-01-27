// src/utils/ocr34a.ts

import { Candidate, StationResultDraft } from "./storage";

/* =========== Name normaliser for OCR candidate matching ========= */

export function normalizeCandidateName(name: string): string {
    return name
        .toLowerCase()
        // drop anything in parentheses e.g. (Democratic Party of Kenya)
        .replace(/\([^)]*\)/g, " ")
        // drop common honorifics/titles
        .replace(/\b(hon\.?|dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\b/g, " ")
        // remove common punctuation
        .replace(/[:;,]/g, " ")
        // strip everything except letters, numbers and spaces
        .replace(/[^a-z0-9\s]/g, "")
        // collapse spaces
        .replace(/\s+/g, " ")
        .trim();
}

/* ===================== OCR 34A Types & Helpers ===================== */

export interface Ocr34AResponse {
    status: "success" | "error";
    message?: string;

    station_id?: string | null;

    entries?: Array<{ candidate_name: string; votes: number }>;
    rejected_votes?: number | null;
    total_valid?: number | null;
    total_votes?: number | null;
    registered_voters?: number | null;
    presiding_officer?: string | null;
    form34a_serial?: string | null;
    notes?: string | null;

    raw_ocr?: string;
}

/** Call the PHP OCR endpoint with an image (JPG/PNG/WEBP) Form 34A file */
export async function upload34AForOCR(
    file: File,
    stationId: string
): Promise<Ocr34AResponse> {
    const fd = new FormData();
    fd.append("file", file);
    if (stationId) fd.append("station_id", stationId);

    const res = await fetch(
        "https://skizagroundsuite.com/OCR/iebc_ocr_34a.php",
        {
            method: "POST",
            body: fd,
            credentials: "include",
        }
    );

    let data: Ocr34AResponse;
    try {
        data = (await res.json()) as Ocr34AResponse;
    } catch {
        throw new Error(`Unexpected OCR server response (HTTP ${res.status})`);
    }

    if (!res.ok || data.status !== "success") {
        throw new Error(data.message || `OCR failed with HTTP ${res.status}`);
    }

    return data;
}

/** Map OCR {candidate_name, votes} -> StationResultDraft entries using known candidates */
export function apply34AOcrToDraft(
    draft: StationResultDraft,
    ocr: Ocr34AResponse,
    candidates: Candidate[]
): StationResultDraft {
    const byName = new Map<string, number>();
    for (const row of ocr.entries || []) {
        const nameKey = normalizeCandidateName(row.candidate_name ?? "");
        if (!nameKey) continue;
        byName.set(nameKey, row.votes ?? 0);
    }

    const newEntries = candidates.map((c) => {
        const key = normalizeCandidateName(c.name);
        const votes = byName.get(key) ?? 0;
        return {
            candidateId: c.id,
            votes: Math.max(0, Math.floor(Number(votes) || 0)),
        };
    });

    const rejected = Math.max(
        0,
        Math.floor(Number(ocr.rejected_votes ?? draft.rejectedVotes) || 0)
    );

    const totalValidFromEntries = newEntries.reduce(
        (s, e) => s + (Number(e.votes) || 0),
        0
    );
    const totalValid =
        ocr.total_valid && ocr.total_valid > 0
            ? ocr.total_valid
            : totalValidFromEntries;

    const totalVotes =
        ocr.total_votes && ocr.total_votes > 0
            ? ocr.total_votes
            : totalValid + rejected;

    const registered =
        ocr.registered_voters != null
            ? Math.max(0, Math.floor(Number(ocr.registered_voters) || 0))
            : draft.registeredVoters ?? undefined;

    const extraNotes = ocr.notes?.trim() || "";
    const mergedRemarks = [draft.remarks || "", extraNotes]
        .filter(Boolean)
        .join(" | ");

    return {
        ...draft,
        entries: newEntries,
        rejectedVotes: rejected,
        totalValid,
        totalVotes,
        registeredVoters: registered,
        presidingOfficer:
            ocr.presiding_officer?.trim() || draft.presidingOfficer || undefined,
        form34ARef: ocr.form34a_serial?.trim() || draft.form34ARef || undefined,
        remarks: mergedRemarks || draft.remarks,
    };
}

/* ================= OCR Frontend File Validation ================= */

const ALLOWED_OCR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_OCR_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function isValidOcrFile(file: File): boolean {
    const mimeOk = ALLOWED_OCR_MIME_TYPES.includes(file.type);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const extOk = ALLOWED_OCR_EXTENSIONS.includes(ext);
    return mimeOk || extOk;
}
