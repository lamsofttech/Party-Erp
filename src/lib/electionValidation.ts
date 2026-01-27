// ================================
// File: src/lib/electionValidation.ts
// Small helpers to call the remote PHP POST endpoints via Vite proxy
// ================================

// IMPORTANT: use the Vite proxy base so we avoid CORS issues.
// In dev, /API is proxied to https://skizagroundsuite.com.
// In prod, /API should map to the backend directory on the same origin.
const API_BASE = "/API";

// ---------------- Shared Types ----------------

export type FetchFlaggedParams = {
  county_code?: string;
  severity?: "Low" | "Medium" | "High";
  status?: "Open" | "In Review" | "Resolved";
  includeResolved?: boolean;
  // tolerances (strict by default)
  abs_candidate_diff?: number;
  pct_candidate_diff?: number;
  abs_registered_diff?: number;
  abs_totalcast_diff?: number;
};

// Generic candidate diff (used by both 34A & 34B details)
export type ApiCandidateDiff = {
  candidate_id: string;
  a_votes: number;
  b_votes: number;
  diff: number;
  pct: number; // percentage already (0–100) or fraction (0–1 depending on backend)
};

// Generic API envelope
type ApiEnvelope<TExtra = {}> = {
  status: "ok" | "error";
  message?: string;
} & TExtra;

// Small helper to POST JSON and safely parse envelope
async function postApi<TExtra = {}>(
  path: string,
  payload: any
): Promise<ApiEnvelope<TExtra>> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`[${path}] HTTP error`, res.status, text);
    throw new Error(`HTTP ${res.status} from ${path}`);
  }

  let data: ApiEnvelope<TExtra>;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error(`[${path}] Failed to parse JSON:`, text);
    throw new Error(`Invalid JSON from ${path}`);
  }

  return data;
}

// ======================= 34B HELPERS =======================

// A single row returned by get_flagged_34b.php
export type ApiFlaggedRow = {
  id: number;
  county: string; // mapped from county_code
  constituency: string; // mapped from const_code
  issue: string;
  severity: "Low" | "Medium" | "High";
  status: "Open" | "In Review" | "Resolved";
  detail_json: {
    a_registered_sum: number;
    a_valid_sum: number;
    a_rejected_sum: number;
    a_total_cast: number;
    b_registered_sum: number | null;
    b_valid_sum: number;
    b_rejected_sum: number;
    b_total_cast: number;
    sum_lines_valid: number | null;
    candidate_breaches: Array<{
      candidate_id: string;
      a_votes: number;
      b_votes: number;
      diff: number;
      pct: number; // server already returns percentage
    }>;
  };
};

// Fetch all flagged Form 34B rows (server compares 34A vs 34B)
export async function fetchFlagged34B(
  params: FetchFlaggedParams = {}
): Promise<ApiFlaggedRow[]> {
  const envelope = await postApi<{ rows?: ApiFlaggedRow[] }>(
    "get_flagged_34b.php",
    {
      includeResolved: false,
      abs_candidate_diff: 0,
      pct_candidate_diff: 0,
      abs_registered_diff: 0,
      abs_totalcast_diff: 0,
      ...params,
    }
  );

  if (envelope.status !== "ok") {
    throw new Error(envelope.message || "API error (get_flagged_34b.php)");
  }

  return envelope.rows ?? [];
}

// Fetch details (candidate diffs) for one Form 34B
export async function fetch34BDetails(
  id: number
): Promise<ApiCandidateDiff[]> {
  const envelope = await postApi<{ candidates?: ApiCandidateDiff[] }>(
    "get_flagged_34b_details.php",
    { id }
  );

  if (envelope.status !== "ok") {
    throw new Error(
      envelope.message || "API error (get_flagged_34b_details.php)"
    );
  }

  return envelope.candidates ?? [];
}

// ======================= 34A HELPERS =======================

// 34A flagged rows – same core structure as ApiFlaggedRow but may
// include more location / evidence fields from the backend.
export type ApiFlagged34ARow = {
  id: number;
  county?: string | null;
  constituency?: string | null;
  ward?: string | null;
  pollingStation?: string | null;
  issue?: string | null;
  severity?: "Low" | "Medium" | "High";
  status?: "Open" | "In Review" | "Resolved" | "rejected" | string;
  evidenceUrl?: string | null;
  detail_json?: any;
  // plus any extra fields returned by results_form34a
  [key: string]: any;
};

/**
 * Fetch flagged / rejected Form 34A rows.
 *
 * Currently wired to get_rejected_form34a.php, which returns all
 * rows in results_form34a where status = 'rejected'.
 *
 * If you later implement a dedicated get_flagged_34a.php, you can just
 * change the PHP filename here.
 */
export async function fetchFlagged34A(
  params: FetchFlaggedParams = {}
): Promise<ApiFlagged34ARow[]> {
  const envelope = await postApi<{ rows?: ApiFlagged34ARow[] }>(
    "get_rejected_form34a.php",
    params
  );

  if (envelope.status !== "ok") {
    throw new Error(
      envelope.message || "API error (get_rejected_form34a.php)"
    );
  }

  return envelope.rows ?? [];
}

/**
 * Fetch candidate-by-candidate diffs for one Form 34A.
 * This assumes you have get_flagged_34a_details.php wired similarly
 * to the 34B details endpoint.
 */
export async function fetch34ADetails(
  id: number
): Promise<ApiCandidateDiff[]> {
  const envelope = await postApi<{ candidates?: ApiCandidateDiff[] }>(
    "get_flagged_34a_details.php",
    { id }
  );

  if (envelope.status !== "ok") {
    throw new Error(
      envelope.message || "API error (get_flagged_34a_details.php)"
    );
  }

  return envelope.candidates ?? [];
}
