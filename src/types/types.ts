// src/types/results.ts

export type StationResultEntry = {
  candidateId: string;   // keep as string to match your “unify as string”
  votes: number;
};

export type StationResultDraft = {
  lastSavedAt: number;
  stationId: string;
  entries: StationResultEntry[];
  submitted?: boolean;

  // draft-only UI/meta fields (optional)
  stationName?: string;
  county?: string;
  constituency?: string;
  ward?: string;

  rejectedVotes?: number;
  registeredVoters?: number;

  presidingOfficer?: string;
  form34ARef?: string;
  remarks?: string;

  // if you store these instead of deriving:
  totalValid?: number;
  totalVotes?: number;
};

export type Form34BEntry = {
  candidateId: string;
  votes: number;
};

export type Form34BResultDraft = {
  lastSavedAt: number;
  constituencyId: string;
  entries: Form34BEntry[];
  submitted?: boolean;

  // draft-only
  form34bId?: number;
  constituencyName?: string;

  rejectedVotes?: number;
  returningOfficer?: string;
  form34BRef?: string;
  remarks?: string;

  // (only if you truly need it stored)
  countyCode?: string;
};
