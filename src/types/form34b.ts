export type Form34BEntry = { candidate_id: number; votes: number };

export interface SaveForm34BRequest {
  const_code: string;
  entries: Form34BEntry[];
  rejected_votes: number;
  form34b_id?: number;
  stations_expected?: number | null;
  stations_reported?: number | null;
  registered_voters_sum?: number | null;
  source_mode?: string; // default: "manual_from_34B"
  status?: string;      // e.g. "draft" | "submitted"
  compiled_by_agent_id?: number | null;
  reviewer_agent_id?: number | null;
  review_notes?: string | null;
}

export interface SaveForm34BResponse {
  status: "success";
  form34b_id: number;
}
