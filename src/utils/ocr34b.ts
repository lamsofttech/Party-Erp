import { Candidate, Form34BResultDraft } from "./storage";
import { normalizeCandidateName } from "./ocr34a";

/* ===================== OCR 34B Types & Helpers ===================== */

export interface Ocr34BResponse {
    status: "success" | "error";
    message?: string;

    const_code?: string | null;
    county_name?: string | null;
    constituency_name?: string | null;

    entries?: Array<{ candidate_name: string; votes: number }>;
    rejected_votes?: number | null;
    total_valid?: number | null;
    total_votes?: number | null;
    stations_expected?: number | null;
    stations_reported?: number | null;
    registered_voters_sum?: number | null;
    returning_officer?: string | null;
    form34b_serial?: string | null;
    notes?: string | null;

    raw_ocr?: string;
}

/** Call the PHP OCR endpoint with an image (JPG/PNG/WEBP) Form 34B file */
export async function upload34BForOCR(
    file: File,
    constCode: string
): Promise<Ocr34BResponse> {
    const fd = new FormData();
    fd.append("file", file);
    if (constCode) fd.append("const_code", constCode);

    const res = await fetch("https://skizagroundsuite.com/OCR/iebc_ocr_34b.php", {
        method: "POST",
        body: fd,
        credentials: "include",
    });

    let data: Ocr34BResponse;
    try {
        data = (await res.json()) as Ocr34BResponse;
    } catch {
        throw new Error(`Unexpected OCR server response (HTTP ${res.status})`);
    }

    if (!res.ok || data.status !== "success") {
        throw new Error(data.message || `OCR failed with HTTP ${res.status}`);
    }

    return data;
}

/** Map OCR {candidate_name, votes} -> Form34BResultDraft entries using known candidates */
export function apply34BOcrToDraft(
    draft: Form34BResultDraft,
    ocr: Ocr34BResponse,
    candidates: Candidate[]
): Form34BResultDraft {
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
        typeof ocr.total_valid === "number" && ocr.total_valid > 0
            ? ocr.total_valid
            : totalValidFromEntries;

    const extraNotes = ocr.notes?.trim() || "";
    const mergedRemarks = [draft.remarks || "", extraNotes]
        .filter(Boolean)
        .join(" | ");

    return {
        ...draft,
        entries: newEntries,
        rejectedVotes: rejected,
        totalValid,
        returningOfficer:
            ocr.returning_officer?.trim() || draft.returningOfficer || undefined,
        form34BRef: ocr.form34b_serial?.trim() || draft.form34BRef || undefined,
        remarks: mergedRemarks || draft.remarks,
    };
}
