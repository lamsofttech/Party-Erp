// src/types/campaign.ts (Example - adjust to match your exact DB columns)
export interface Event {
  eventId: number;
  name: string;
  description?: string | null;
  startTime: string; // From DB: "YYYY-MM-DD HH:MM:SS"
  endTime?: string | null; // From DB: "YYYY-MM-DD HH:MM:SS"
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  associatedCampaignId?: number | null;
  status: string; // From DB: "0" for your current records, or "scheduled", "completed" etc.
  organizer?: string | null;
  attendeeCount?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Add any other fields you have in your database 'events' table
}

export type CampaignStatus = 'Active' | 'Planning' | 'Completed' | 'Archived';
export interface Campaign {
  id: number; // Assuming campaign_id is a number
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  goal: string;
}
