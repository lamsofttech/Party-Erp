// src/data/mockData.ts

// You can import Event and Campaign types from your types file if they are defined there.
// For example:
// import { Event, Campaign, EventStatus, CampaignStatus } from '../types/campaign';

// If you haven't created src/types/campaign.ts yet, or for a quick fix,
// you can define the basic types directly in this file:
export type EventStatus = 'Confirmed' | 'Planned' | 'Cancelled' | 'Completed';
export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  status: EventStatus;
  leadOrganizer: string;
  expectedAttendance: number;
  actualAttendance?: number;
  budget: number;
  expensesIncurred?: number;
  associatedCampaignId?: string;
  logistics?: string;
  volunteersAssigned?: number;
}

export type CampaignStatus = 'Active' | 'Planning' | 'Completed' | 'Archived';
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  goal: string;
}


export const mockEvents: Event[] = [
  {
    id: 'event-1',
    name: 'Town Hall Meeting - North District',
    description: 'A critical meeting with community leaders to discuss local infrastructure projects.',
    date: '2025-07-20',
    time: '10:00 AM',
    location: 'North Community Center',
    status: 'Confirmed',
    leadOrganizer: 'John Doe',
    expectedAttendance: 150,
    actualAttendance: 135,
    budget: 50000,
    expensesIncurred: 45000,
    associatedCampaignId: 'campaign-1',
    logistics: 'Projector and sound system checked. Refreshments to be served.',
    volunteersAssigned: 5,
  },
  {
    id: 'event-2',
    name: 'Youth Engagement Workshop',
    description: 'Interactive workshop aimed at engaging young voters and discussing policy ideas.',
    date: '2025-08-05',
    time: '02:00 PM',
    location: 'Youth Community Hub',
    status: 'Planned',
    leadOrganizer: 'Jane Smith',
    expectedAttendance: 80,
    budget: 30000,
    associatedCampaignId: 'campaign-2',
    logistics: 'Workshop materials prepared, guest speaker confirmed.',
    volunteersAssigned: 3,
  },
  {
    id: 'event-3',
    name: 'Fundraising Gala',
    description: 'An evening gala to raise funds for the upcoming campaign activities.',
    date: '2025-09-10',
    time: '07:00 PM',
    location: 'Grand Regency Hotel',
    status: 'Planned',
    leadOrganizer: 'Emily White',
    expectedAttendance: 200,
    budget: 250000,
    associatedCampaignId: 'campaign-1',
    volunteersAssigned: 10,
  },
  {
    id: 'event-4',
    name: 'Volunteer Recruitment Drive',
    description: 'An open day for potential volunteers to learn about opportunities and sign up.',
    date: '2025-07-28',
    time: '09:00 AM',
    location: 'Campaign HQ',
    status: 'Confirmed',
    leadOrganizer: 'David Green',
    expectedAttendance: 50,
    budget: 10000,
    associatedCampaignId: 'campaign-2',
    volunteersAssigned: 2,
  },
];

export const mockCampaigns: Campaign[] = [
  {
    id: 'campaign-1',
    name: 'Local Leadership Initiative',
    status: 'Active',
    startDate: '2025-06-01',
    endDate: '2025-11-30',
    goal: 'Elect local representatives committed to community development.',
  },
  {
    id: 'campaign-2',
    name: 'Future Forward Movement',
    status: 'Planning',
    startDate: '2025-07-15',
    endDate: '2026-03-31',
    goal: 'Empower youth through education and civic participation.',
  },
];