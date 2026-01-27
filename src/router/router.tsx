// src/router/router.tsx (replace your whole file with this)

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop";
import { useUser } from "../contexts/UserContext";

/**
 * ✅ GOAL:
 * - Only the Login page is bundled/loaded on first visit.
 * - EVERYTHING else (layout + protected pages + providers) loads only after auth.
 *
 * Key tactics:
 * 1) Login is the ONLY eager import.
 * 2) MainLayout is lazy (so it won’t load on /login).
 * 3) TurnoutStoreProvider is loaded ONLY when visiting mobilization/turnout routes.
 * 4) Route-level Suspense boundaries (faster perceived loading).
 */

/** ✅ ONLY eager page */
import PinLoginPage from "../pages/PinLoginPage";

/** ✅ Lazy layout + helpers */
const MainLayoutLazy = lazy(() => import("../layouts/main"));
const PrivateRouteLazy = lazy(() => import("../components/PrivateRoute")); // keeps login light

/** ✅ Lazy pages (ALL protected pages are lazy) */
const Dashboard = lazy(() => import("../pages/Dashboard"));
const ModulesDashboard = lazy(() => import("../pages/ModulesDashboard"));
const AgentOnboardingDashboard = lazy(() => import("../pages/AgentOnboardingDashboard"));
const FeedbackDashboard = lazy(() => import("../pages/FeedbackDashboard"));
const GovernorResultsPage = lazy(() => import("../pages/GovernorResultsPage"));
const WhatsAppOutreachWithCountyLinks = lazy(() =>
  import("../pages/WhatsAppOutreachWithCountyLinks")
);
const MeetingPage = lazy(() => import("../pages/MeetingPage"));
const AnalyticsDashboard = lazy(() => import("../pages/ElectionDashboard"));

const VoteHeatmapPage = lazy(() => import("../pages/VoteHeatmapPage"));
const HeatMapTurnoutPage = lazy(() => import("../pages/HeatMapTurnoutPage"));
const GISMapPage = lazy(() => import("../pages/GISMapPage"));
const VoteAnalyticsDashboard = lazy(() => import("../pages/VoteAnalyticsDashboard"));
const FinancialDashboard = lazy(() => import("../pages/FinancialDashboard"));
const LegalWarRoomDashboard = lazy(() => import("../pages/LegalWarRoomDashboard"));
const NationalPresidentialTallyingPage = lazy(() =>
  import("../pages/NationalTallyingDashboard")
);
const CandidateManagementPage = lazy(() => import("../pages/CandidateManagementPage"));
const CommunicationCenter = lazy(() => import("../pages/CommunicationCenter"));
const EmailBlasts = lazy(() => import("../pages/EmailBlasts"));
const WhatsAppOutreach = lazy(() => import("../pages/WhatsAppOutreach"));
const SocialMediaPostsPage = lazy(() => import("../pages/SocialMediaPostsPage"));
const MediaMonitoringPage = lazy(() => import("../pages/MediaMonitoringPage"));

const MembersDashboard = lazy(() => import("../pages/MembersDashboard"));
const FullMembers = lazy(() => import("../pages/FullMembers"));
const PendingMembers = lazy(() => import("../pages/PendingMembers"));
const NewMembers = lazy(() => import("../pages/NewMembers"));
const WithdrawnMembers = lazy(() => import("../pages/WithdrawnMembers"));
const ApprovedMembers = lazy(() => import("../pages/ApprovedMembers"));

const OnboardingDashboard = lazy(() => import("../pages/OnboardingDashboard"));
const UpdatePassword = lazy(() => import("../pages/UpdatePassword"));
const Nominations = lazy(() => import("../pages/Onboard"));
const NomineeList = lazy(() => import("../pages/NomineeList"));
const NomineeDetail = lazy(() => import("../pages/NomineeDetail"));
const NewNomineePage = lazy(() => import("../pages/NewNomineePage"));
const PendingNomineesPage = lazy(() => import("../pages/PendingNomineesPage"));
const ClearedNomineesPage = lazy(() => import("../pages/ClearedNomineesPage"));
const AllNominees = lazy(() => import("../pages/AllNominees"));
const NominationAnalyticsDashboard = lazy(() =>
  import("../pages/NominationAnalyticsDashboard")
);

const EntranceExamsDashboard = lazy(() => import("../pages/EntranceExams"));
const ExamApplicants = lazy(() => import("../pages/ExamApplications"));
const ExamApplicant = lazy(() => import("../pages/ExamApplicant"));
const Resources = lazy(() => import("../pages/Resources"));
const ExamResults = lazy(() => import("../pages/ExamResults"));

const OnboardPresidentPage = lazy(() => import("../pages/OnboardPresidentPage"));
const ViewPresidentsPage = lazy(() => import("../pages/ViewPresidentsPage"));
const LegalDashboard = lazy(() => import("../pages/LegalDashboard"));
const GovernorDashboard = lazy(() => import("../pages/GovernorDashboard"));
const ParliamentDashboard = lazy(() => import("../pages/ParliamentDashboard"));
const McaDashboard = lazy(() => import("../pages/McaDashboard"));
const SenatorsDashboard = lazy(() => import("../pages/SenatorsDashboard"));
const OnboardWomenRepresentativePage = lazy(() =>
  import("../pages/OnboardWomenRepresentativePage")
);
const Certificates = lazy(() => import("../pages/Certificates"));

const RecruitManageAgents = lazy(() => import("../pages/RecruitManageAgents"));
const IEBCPresidentialResultsPage = lazy(() => import("../pages/IEBCPresidentialResultsPage"));
const IEBCGovernorsResultsPage = lazy(() => import("../pages/IEBCGovernorsResultsPage"));
const IncidentReportingPage = lazy(() => import("../pages/IncidentReportingPage"));
const RejectedNominees = lazy(() => import("../pages/RejectedNominees"));
const OperationRoomDashboard = lazy(() => import("../pages/OperationRoomDashboard"));
const TurnoutMobilizationPage = lazy(() => import("../pages/TurnoutMobilizationPage"));
const TurnoutGamePage = lazy(() => import("../pages/TurnoutGamePage"));
const FlaggedForm34B = lazy(() => import("../pages/FlaggedForm34B"));
const FlaggedForm34A = lazy(() => import("../pages/FlaggedForm34A"));

const ResultFormsBoardroom = lazy(() => import("../pages/ResultFormsBoardroom"));
const PartyAssignmentDashboard = lazy(() => import("../pages/PartyAssignmentDashboard"));

const Donors = lazy(() => import("../pages/Donors"));
const ExpenseLedgerPage = lazy(() => import("../pages/ExpenseLedgerPage"));
const ApprovedPaymentsPage = lazy(() => import("../pages/ApprovedPaymentsPage"));
const PendingRequestsPage = lazy(() => import("../pages/PendingRequestsPage"));
const RegisteredVendors = lazy(() => import("../pages/RegisteredVendors"));
const VendorPayments = lazy(() => import("../pages/VendorPayments"));

const UserRolesDashboard = lazy(() => import("../pages/UserRolesDashboard"));
const UserRolesManagement = lazy(() => import("../pages/UserRolesManagement"));
const SystemRolesManagement = lazy(() => import("../pages/SystemRolesManagement"));

const WardCandidatesPage = lazy(() => import("../pages/WardCandidatesPage"));
const CandidateDetailsPage = lazy(() => import("../pages/CandidateDetailsPage"));
const CampaignsPage = lazy(() => import("../pages/CampaignsPage"));
const CampaignDetail = lazy(() => import("../components/campaigns/CampaignDetail"));
const EventsPage = lazy(() => import("../pages/EventsPage"));
const EventDetail = lazy(() => import("../components/Events/EventDetail"));

const AgentLandingPage = lazy(() => import("../pages/AgentLandingPage"));
const AgentIncidentFormPage = lazy(() => import("../pages/AgentIncidentFormPage"));
const EnterForm34APage = lazy(() => import("../pages/EnterForm34APage"));

const ConstituencyResultDashboard = lazy(() =>
  import("../pages/president/ConstituencyResultDashboard")
);
const AgentPayments = lazy(() => import("../pages/AgentPayments"));
const ConstituencyResults34A = lazy(() => import("../pages/president/ConstituencyResults34A"));
const ResultFormsDrilldown = lazy(() => import("../pages/president/ResultFormsDrilldown"));
const TurnoutDrilldown = lazy(() => import("../pages/turnout/TurnoutDrilldown"));
const NationalTurnoutDrilldown = lazy(() => import("../pages/turnout/NationalTurnoutDrilldown"));
const NationalResultsDrilldown = lazy(() => import("../pages/NationalResultsDrilldown"));
const StationStreamsPage = lazy(() => import("../pages/president/StationStreamsPage"));
const Stream34AUploadPage = lazy(() => import("../pages/president/Stream34AUploadPage"));

const ProfilePage = lazy(() => import("../pages/ProfilePage"));

const VoterRegisterDashboard = lazy(() => import("../pages/voter-register/VoterRegisterDashboard"));
const VoterRegisterImport = lazy(() => import("../pages/voter-register/VoterRegisterImport"));
const VoterRegisterSearch = lazy(() => import("../pages/voter-register/VoterRegisterSearch"));
const VoterRegisterCompare = lazy(() => import("../pages/voter-register/VoterRegisterCompare"));
const VoterRegisterRollups = lazy(() => import("../pages/voter-register/VoterRegisterRollups"));
const VoterRegisterCleanup = lazy(() => import("../pages/voter-register/VoterRegisterCleanup"));
const VoterRegisterGeoMapping = lazy(() =>
  import("../pages/voter-register/VoterRegisterGeoMapping")
);
const VoterRegisterExports = lazy(() => import("../pages/voter-register/VoterRegisterExports"));
const VoterRegisterAIInsights = lazy(() =>
  import("../pages/voter-register/VoterRegisterAIInsights")
);

const SettingsPage = lazy(() => import("../pages/Settings"));

/** ✅ Turnout provider: lazy-loaded only when turnout routes are visited */
const TurnoutStoreProvider = lazy(() =>
  import("../contexts/TurnoutStoreContext").then((m) => ({ default: m.TurnoutStoreProvider }))
);

// ✅ FIX FOR TS7031: children must be typed (React.ReactNode)
type PropsWithChildren = {
  children: React.ReactNode;
};

/** Small helper */
function Page({ children }: PropsWithChildren) {
  return <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>{children}</Suspense>;
}

/** Role-based home: agent gets AgentLandingPage, others get Dashboard */
function RoleBasedHome() {
  const { user } = useUser();
  const role = (user?.role || "AGENT").toUpperCase();
  const isAgent = role === "AGENT" || role === "WARD_OFFICER";

  return <Page>{isAgent ? <AgentLandingPage /> : <Dashboard />}</Page>;
}

/** Wrap ONLY turnout pages with the turnout provider */
function WithTurnoutProvider({ children }: PropsWithChildren) {
  return (
    <Page>
      <TurnoutStoreProvider>{children}</TurnoutStoreProvider>
    </Page>
  );
}

export default function Router() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* ✅ Public: ONLY login is eager */}
        <Route path="/login" element={<PinLoginPage />} />

        {/* ✅ Protected app shell is lazy (won't load on /login) */}
        <Route
          path="/"
          element={
            <Page>
              <PrivateRouteLazy>
                <MainLayoutLazy />
              </PrivateRouteLazy>
            </Page>
          }
        >
          {/* Default home – role-based */}
          <Route index element={<RoleBasedHome />} />

          {/* Settings */}
          <Route
            path="settings"
            element={
              <Page>
                <SettingsPage />
              </Page>
            }
          />

          {/* Agent-specific */}
          <Route
            path="agent"
            element={
              <Page>
                <AgentLandingPage />
              </Page>
            }
          />
          <Route
            path="agent/results"
            element={
              <Page>
                <IEBCPresidentialResultsPage />
              </Page>
            }
          />
          <Route
            path="agent/results/enter"
            element={
              <Page>
                <EnterForm34APage />
              </Page>
            }
          />
          <Route
            path="agent/results/34a"
            element={
              <Page>
                <EnterForm34APage />
              </Page>
            }
          />
          <Route
            path="agent/turnout"
            element={
              <WithTurnoutProvider>
                <TurnoutMobilizationPage />
              </WithTurnoutProvider>
            }
          />
          <Route
            path="agent/incidents"
            element={
              <Page>
                <AgentIncidentFormPage />
              </Page>
            }
          />

          {/* Modules */}
          <Route
            path="modules"
            element={
              <Page>
                <ModulesDashboard />
              </Page>
            }
          />

          {/* Voter Register */}
          <Route
            path="voter-register"
            element={
              <Page>
                <VoterRegisterDashboard />
              </Page>
            }
          />
          <Route
            path="voter-register/import"
            element={
              <Page>
                <VoterRegisterImport />
              </Page>
            }
          />
          <Route
            path="voter-register/search"
            element={
              <Page>
                <VoterRegisterSearch />
              </Page>
            }
          />
          <Route
            path="voter-register/compare"
            element={
              <Page>
                <VoterRegisterCompare />
              </Page>
            }
          />
          <Route
            path="voter-register/rollups"
            element={
              <Page>
                <VoterRegisterRollups />
              </Page>
            }
          />
          <Route
            path="voter-register/cleanup"
            element={
              <Page>
                <VoterRegisterCleanup />
              </Page>
            }
          />
          <Route
            path="voter-register/geo-mapping"
            element={
              <Page>
                <VoterRegisterGeoMapping />
              </Page>
            }
          />
          <Route
            path="voter-register/exports"
            element={
              <Page>
                <VoterRegisterExports />
              </Page>
            }
          />
          <Route
            path="voter-register/ai-insights"
            element={
              <Page>
                <VoterRegisterAIInsights />
              </Page>
            }
          />

          {/* Profile */}
          <Route
            path="profile"
            element={
              <Page>
                <ProfilePage />
              </Page>
            }
          />

          {/* Party operations */}
          <Route
            path="party-operations/onboarding"
            element={
              <Page>
                <AgentOnboardingDashboard />
              </Page>
            }
          />
          <Route
            path="party-operations/events"
            element={
              <Page>
                <EventsPage />
              </Page>
            }
          />

          {/* Mobilization (turnout provider only here) */}
          <Route
            path="mobilization"
            element={
              <WithTurnoutProvider>
                <TurnoutMobilizationPage />
              </WithTurnoutProvider>
            }
          />
          <Route
            path="mobilization/stations/:stationId/game"
            element={
              <WithTurnoutProvider>
                <TurnoutGamePage />
              </WithTurnoutProvider>
            }
          />
          <Route
            path="mobilization/stations/:stationId/incidents/new"
            element={
              <Page>
                <AgentIncidentFormPage />
              </Page>
            }
          />
          <Route
            path="turnout/:stationId"
            element={
              <WithTurnoutProvider>
                <TurnoutGamePage />
              </WithTurnoutProvider>
            }
          />

          {/* Legacy redirects */}
          <Route path="onboarding/voter_turnout" element={<Navigate to="/mobilization" replace />} />
          <Route
            path="onboarding/voter_turnout/:stationId"
            element={<Navigate to="/mobilization" replace />}
          />

          {/* Members */}
          <Route
            path="members"
            element={
              <Page>
                <MembersDashboard />
              </Page>
            }
          />
          <Route
            path="members/full-members"
            element={
              <Page>
                <FullMembers />
              </Page>
            }
          />
          <Route
            path="members/pending-members"
            element={
              <Page>
                <PendingMembers />
              </Page>
            }
          />
          <Route
            path="members/new-members"
            element={
              <Page>
                <NewMembers />
              </Page>
            }
          />
          <Route
            path="members/withdrawn-members"
            element={
              <Page>
                <WithdrawnMembers />
              </Page>
            }
          />
          <Route
            path="members/approved-members"
            element={
              <Page>
                <ApprovedMembers />
              </Page>
            }
          />

          {/* Nominations */}
          <Route
            path="nominations"
            element={
              <Page>
                <OnboardingDashboard />
              </Page>
            }
          />
          <Route
            path="nominations/pending-vetting"
            element={
              <Page>
                <PendingNomineesPage />
              </Page>
            }
          />
          <Route
            path="nominations/rejected-nominees"
            element={
              <Page>
                <RejectedNominees />
              </Page>
            }
          />
          <Route
            path="nominations/cleared-nominees"
            element={
              <Page>
                <ClearedNomineesPage />
              </Page>
            }
          />
          <Route
            path="nominations/onboard"
            element={
              <Page>
                <Nominations />
              </Page>
            }
          />
          <Route
            path="nominations/onboard/update-password"
            element={
              <Page>
                <UpdatePassword />
              </Page>
            }
          />
          <Route
            path="nominations/new"
            element={
              <Page>
                <NomineeList />
              </Page>
            }
          />
          <Route
            path="nominees/:id"
            element={
              <Page>
                <NomineeDetail />
              </Page>
            }
          />
          <Route
            path="nominations/new/add"
            element={
              <Page>
                <NewNomineePage />
              </Page>
            }
          />
          <Route
            path="nominations/all"
            element={
              <Page>
                <AllNominees />
              </Page>
            }
          />
          <Route
            path="nominations/dashboard"
            element={
              <Page>
                <NominationAnalyticsDashboard />
              </Page>
            }
          />
          <Route
            path="nominations/certificates"
            element={
              <Page>
                <Certificates />
              </Page>
            }
          />

          {/* Entrance Exams */}
          <Route
            path="onboarding"
            element={
              <Page>
                <EntranceExamsDashboard />
              </Page>
            }
          />
          <Route
            path="onboarding/enrollments"
            element={
              <Page>
                <ExamApplicants />
              </Page>
            }
          />
          <Route
            path="onboarding/enrollments/:memberName"
            element={
              <Page>
                <ExamApplicant />
              </Page>
            }
          />
          <Route
            path="onboarding/exam-results"
            element={
              <Page>
                <ExamResults />
              </Page>
            }
          />
          <Route
            path="onboarding/resources"
            element={
              <Page>
                <Resources />
              </Page>
            }
          />

          {/* Candidates */}
          <Route
            path="ward-candidates/:wardCode/:wardName"
            element={
              <Page>
                <WardCandidatesPage />
              </Page>
            }
          />
          <Route
            path="candidate/:candidateId"
            element={
              <Page>
                <CandidateDetailsPage />
              </Page>
            }
          />

          {/* Governor */}
          <Route
            path="onboarding/governor-candidates"
            element={
              <Page>
                <GovernorDashboard />
              </Page>
            }
          />
          <Route
            path="onboarding/governor-candidates/results"
            element={
              <Page>
                <IEBCGovernorsResultsPage />
              </Page>
            }
          />
          <Route
            path="onboarding/Governor-candidates/view-results"
            element={
              <Page>
                <GovernorResultsPage />
              </Page>
            }
          />

          {/* Other onboarding */}
          <Route
            path="onboarding/senators-candidates"
            element={
              <Page>
                <SenatorsDashboard />
              </Page>
            }
          />
          <Route
            path="onboarding/women-candidates"
            element={
              <Page>
                <OnboardWomenRepresentativePage />
              </Page>
            }
          />
          <Route
            path="onboarding/parliament-candidates"
            element={
              <Page>
                <ParliamentDashboard />
              </Page>
            }
          />
          <Route
            path="onboarding/mca-candidates"
            element={
              <Page>
                <McaDashboard />
              </Page>
            }
          />
          <Route
            path="onboarding/president-candidates"
            element={
              <Page>
                <OnboardPresidentPage />
              </Page>
            }
          />

          {/* President candidates nested */}
          <Route path="onboarding/president-candidates/presidents">
            <Route
              index
              element={
                <Page>
                  <ViewPresidentsPage />
                </Page>
              }
            />
            <Route
              path="results"
              element={
                <Page>
                  <IEBCPresidentialResultsPage />
                </Page>
              }
            />
          </Route>

          {/* Legal & Election */}
          <Route
            path="legal"
            element={
              <Page>
                <LegalDashboard />
              </Page>
            }
          />
          <Route
            path="legal/war-room"
            element={
              <Page>
                <LegalWarRoomDashboard />
              </Page>
            }
          />
          <Route
            path="legal/34b"
            element={
              <Page>
                <FlaggedForm34B />
              </Page>
            }
          />
          <Route
            path="legal/34a"
            element={
              <Page>
                <FlaggedForm34A />
              </Page>
            }
          />
          <Route
            path="election/heatmap"
            element={
              <Page>
                <VoteHeatmapPage />
              </Page>
            }
          />

          <Route
            path="election/recruit-manage-agents"
            element={
              <Page>
                <RecruitManageAgents />
              </Page>
            }
          />
          <Route
            path="election/result-forms"
            element={
              <Page>
                <ResultFormsBoardroom />
              </Page>
            }
          />
          <Route
            path="election/candidates"
            element={
              <Page>
                <CandidateManagementPage />
              </Page>
            }
          />
          <Route
            path="election/national-tallying"
            element={
              <Page>
                <NationalPresidentialTallyingPage />
              </Page>
            }
          />
          <Route
            path="election/national-turnout"
            element={
              <Page>
                <NationalTurnoutDrilldown />
              </Page>
            }
          />
          <Route
            path="election/national-results"
            element={
              <Page>
                <NationalResultsDrilldown />
              </Page>
            }
          />
          <Route
            path="election"
            element={
              <Page>
                <AnalyticsDashboard />
              </Page>
            }
          />

          {/* Constituency tallying */}
          <Route
            path="president/constituency-results-dashboard"
            element={
              <Page>
                <ConstituencyResultDashboard />
              </Page>
            }
          />
          <Route
            path="president/constituency/results-34a"
            element={
              <Page>
                <ConstituencyResults34A />
              </Page>
            }
          />
          <Route
            path="president/constituency/results"
            element={
              <Page>
                <ResultFormsDrilldown />
              </Page>
            }
          />
          <Route
            path="president/constituency/turnout"
            element={
              <WithTurnoutProvider>
                <TurnoutDrilldown />
              </WithTurnoutProvider>
            }
          />
          <Route
            path="president/station/:stationId/streams"
            element={
              <Page>
                <StationStreamsPage />
              </Page>
            }
          />
          <Route
            path="president/results/34a/:stationId/:streamId"
            element={
              <Page>
                <Stream34AUploadPage />
              </Page>
            }
          />

          {/* Analytics/GIS */}
          <Route
            path="analytics/vote"
            element={
              <Page>
                <VoteAnalyticsDashboard />
              </Page>
            }
          />
          <Route
            path="GisMapPage"
            element={
              <Page>
                <GISMapPage />
              </Page>
            }
          />
          <Route
            path="election/candidate-management"
            element={
              <Page>
                <CandidateManagementPage />
              </Page>
            }
          />
          <Route
            path="election/incident-reporting"
            element={
              <Page>
                <IncidentReportingPage />
              </Page>
            }
          />

          {/* Finance */}
          <Route
            path="finance"
            element={
              <Page>
                <FinancialDashboard />
              </Page>
            }
          />
          <Route
            path="finance/donors"
            element={
              <Page>
                <Donors />
              </Page>
            }
          />
          <Route
            path="finance/expenses"
            element={
              <Page>
                <ExpenseLedgerPage />
              </Page>
            }
          />
          <Route
            path="finance/approved-expenses"
            element={
              <Page>
                <ApprovedPaymentsPage />
              </Page>
            }
          />
          <Route
            path="finance/pending-expenses"
            element={
              <Page>
                <PendingRequestsPage />
              </Page>
            }
          />
          <Route
            path="finance/vendors"
            element={
              <Page>
                <RegisteredVendors />
              </Page>
            }
          />
          <Route
            path="finance/vendor-payments"
            element={
              <Page>
                <VendorPayments />
              </Page>
            }
          />
          <Route
            path="finance/agent-payments"
            element={
              <Page>
                <AgentPayments />
              </Page>
            }
          />
          <Route
            path="operations/party-assignments"
            element={
              <Page>
                <PartyAssignmentDashboard />
              </Page>
            }
          />

          {/* Admin & Roles */}
          <Route
            path="admin/user-roles"
            element={
              <Page>
                <UserRolesDashboard />
              </Page>
            }
          />
          <Route
            path="admin/user-roles/manage"
            element={
              <Page>
                <UserRolesManagement />
              </Page>
            }
          />
          <Route
            path="admin/system-roles/manage"
            element={
              <Page>
                <SystemRolesManagement />
              </Page>
            }
          />

          {/* Comms */}
          <Route
            path="party-operations"
            element={
              <Page>
                <OperationRoomDashboard />
              </Page>
            }
          />
          <Route
            path="party-operations/communication-center"
            element={
              <Page>
                <CommunicationCenter />
              </Page>
            }
          />
          <Route
            path="party-operations/communication-center/email-blasts"
            element={
              <Page>
                <EmailBlasts />
              </Page>
            }
          />
          <Route
            path="communication/whatsapp-outreach"
            element={
              <Page>
                <WhatsAppOutreach />
              </Page>
            }
          />
          <Route
            path="communication/social-media-posts"
            element={
              <Page>
                <SocialMediaPostsPage />
              </Page>
            }
          />
          <Route
            path="party-operations/communication-center/templates"
            element={
              <Page>
                <MeetingPage />
              </Page>
            }
          />
          <Route
            path="communication/media-monitoring"
            element={
              <Page>
                <MediaMonitoringPage />
              </Page>
            }
          />
          <Route
            path="party-operations/communication-center/feedback"
            element={
              <Page>
                <FeedbackDashboard />
              </Page>
            }
          />

          <Route
            path="mobilization/heatmap-turnout"
            element={
              <WithTurnoutProvider>
                <HeatMapTurnoutPage />
              </WithTurnoutProvider>
            }
          />

          <Route
            path="onboarding/Governor-candidates/results"
            element={<Navigate to="/onboarding/governor-candidates/results" replace />}
          />

          <Route
            path="party-operations/communication-center/whatsapp"
            element={
              <Page>
                <WhatsAppOutreachWithCountyLinks />
              </Page>
            }
          />

          {/* Campaigns & Events */}
          <Route
            path="party-operations/campaigns"
            element={
              <Page>
                <CampaignsPage />
              </Page>
            }
          />
          <Route
            path="party-operations/campaigns/:campaignId"
            element={
              <Page>
                <CampaignDetail />
              </Page>
            }
          />
          <Route
            path="events"
            element={
              <Page>
                <EventsPage />
              </Page>
            }
          />
          <Route
            path="events/:eventId"
            element={
              <Page>
                <EventDetail />
              </Page>
            }
          />

          {/* Catch-all inside protected */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Catch-all at root */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
