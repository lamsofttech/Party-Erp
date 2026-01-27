// src/types/feedback.ts
// This file defines the TypeScript interfaces and enums used across your feedback management system.

/**
 * Enum for the possible statuses of a Feedback/Interaction item.
 * These should align with the 'status' enum in your SQL schema.
 */
export enum FeedbackStatus {
    New = 'New',
    Assigned = 'Assigned',
    InProgress = 'In Progress',
    Actioned = 'Actioned',
    Closed = 'Closed',
    Escalated = 'Escalated',
    RequiresFollowUp = 'Requires Follow-up',
    Archived = 'Archived',
    Rejected = 'Rejected', // Added based on the MenuItem in FeedbackDashboard.tsx
}

/**
 * Enum for the possible types of Feedback/Interaction.
 * These should align with the 'type' enum in your SQL schema.
 */
export enum FeedbackType {
    ConstituentGrievance = 'Constituent Grievance',
    PolicySuggestion = 'Policy Suggestion',
    CampaignStrategyIdea = 'Campaign Strategy Idea',
    VolunteerReport = 'Volunteer Report',
    SentimentPositive = 'Sentiment (Positive)',
    SentimentNegative = 'Sentiment (Negative)',
    MediaMonitoringAlert = 'Media Monitoring Alert',
    RivalPartyActivity = 'Rival Party Activity',
}

/**
 * Enum for the priority level of a Feedback/Interaction.
 * These should align with the 'priority' enum in your SQL schema.
 */
export enum FeedbackPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical',
}

/**
 * Enum for sentiment polarity.
 * This can be used for sentiment analysis results if applicable.
 */
export enum SentimentPolarity {
    Positive = 'Positive',
    Negative = 'Negative',
    Neutral = 'Neutral',
}

/**
 * Interface representing a single Feedback/Interaction item.
 * The keys here are in camelCase to align with JavaScript/TypeScript conventions,
 * but remember to convert them to snake_case when sending to your PHP backend.
 *
 * This interface should reflect the columns in your `interactions` SQL table.
 */
export interface FeedbackItem {
    id: string; // Unique identifier for the interaction (e.g., ENG-001)
    title: string; // Short summary of the interaction
    description: string; // Detailed description of the interaction
    type: FeedbackType; // Type of interaction, using the enum
    status: FeedbackStatus; // Current status, using the enum
    priority: FeedbackPriority; // Priority level, using the enum
    submissionDate: string; // Date and time when the interaction was submitted (ISO 8601 string)
    lastUpdated: string; // Date and time when the interaction was last updated (ISO 8601 string)
    source: string; // How the interaction was received (e.g., 'Email', 'Phone Call', 'Online Form', 'Field Report')
    county?: string | null; // Makueni
    constituency?: string | null; // Wote
    ward?: string | null; // Wote
    locationDetails?: string | null; // Specific location details if any
    contactMethod?: string | null; // Preferred contact method for follow-up (e.g., 'Email', 'Phone')
    contactInfo?: string | null; // Contact details (e.g., email address, phone number)
    assignedTo?: string | null; // The team member or department assigned to this interaction
    sentiment?: SentimentPolarity | null; // Overall sentiment if applicable
    tags?: string[] | null; // Keywords or categories for the interaction, stored as a JSON array string
    followUpDate?: string | null; // Date for scheduled follow-up (ISO 8601 string)
    resolutionDetails?: string | null; // Details of how the interaction was resolved
}