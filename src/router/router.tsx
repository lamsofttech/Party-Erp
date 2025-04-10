import { Route, Routes } from "react-router-dom";
import App from "../App";
import Dashboard from "../pages/Dashboard";
import ScrollToTop from "../components/ScrollToTop";
import MainLayout from "../layouts/main";
import MembersDashboard from "../pages/MembersDashboard";
import FullMembers from "../pages/FullMembers";
import PendingMembers from "../pages/PendingMembers";
import PendingApplicants from "../pages/PendingApplicants";
import WithdrawnMembers from "../pages/WithdrawnMembers";
import AccessRequests from "../pages/AccessRequests";
import UnsignedContracts from "../pages/UnsignedContracts";
import ViewMember from "../layouts/view-member";
import PersonalDetails from "../pages/PersonalDetails";
import EducationDetails from "../pages/EducationDetails";
import MemberDocuments from "../pages/MemberDocuments";
import SentMails from "../pages/SentMails";
import MemberContributions from "../pages/MemberContributions";
import MemberExpenses from "../pages/MemberExpenses";
import OnboardingDashboard from "../pages/OnboardingDashboard";
import NewApplications from "../pages/NewApplications";
import ApplicationDetails from "../pages/ApplicationDetails";
import PendingApplications from "../pages/PendingApplications";
import GpaApprovals from "../pages/ApproveGPA";
import ApproveApplication from "../pages/ApproveApplication";
import RejectedApplicants from "../pages/RejectedApplications";
import Cosigners from "../pages/Cosigners";
import CosignerDetails from "../pages/CosignerDetails";
import CreditReportReview from "../pages/CreditReportReview";
import Onboarding from "../pages/Onboard";
import DisableProgramEmail from "../pages/DisableProgramEmail";
import UpdatePassword from "../pages/UpdatePassword";
import EntranceExamsDashboard from "../pages/EntranceExams";
import ExamApplicants from "../pages/ExamApplications";
import ExamApplicant from "../pages/ExamApplicant";
import Trainings from "../pages/Trainings";
import Mocks from "../pages/Mocks";
import Bookings from "../pages/Bookings";
import BookedExams from "../pages/BookedExams";
import Results from "../pages/Results";
import Scores from "../pages/Scores";
import Resources from "../pages/Resources";
import SchoolApplicationDashboard from "../pages/SchoolAdmission";
import Intakes from "../pages/Intakes";
import ViewIntake from "../pages/SingleIntake";
import MeetingRequests from "../pages/MeetingRequests";
import Room from "../pages/Room";
import GPADashboard from "../pages/GPADashboard";
import GpaCalculations from "../pages/GPACalculation";
import CareerGpaCalculations from "../pages/CareerGPACalculation";
import PendingGpaCalculations from "../pages/PendingGPA";
import GPAApprovals from "../pages/GPAApproval";
import Resubmissions from "../pages/Re-submissions";
import DocumentDashboard from "../pages/DocumentsDashboard";
import StudentDocuments from "../pages/StudentDocuments";
import ApprovedDocuments from "../pages/ApprovedDocuments";
import RejectedDocuments from "../pages/RejectedDocuments";
import Transcripts from "../pages/Transcripts";
import DocumentsReview from "../pages/DocumentReview";
import SchoolApplications from "../pages/SchoolApplications";
import AssignedApplications from "../pages/AssignedApplications";
import SchoolApplicationDetails from "../pages/Application";
import RejectedSchoolApplications from "../pages/Rejected";

function Router() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<MainLayout />} >
            <Route index element={<Dashboard />} />
            <Route path="members" element={<MembersDashboard />} />
            <Route path="members/full-members" element={<FullMembers />} />
            <Route path="members/pending-members" element={<PendingMembers />} />
            <Route path="members/pending-applicants" element={<PendingApplicants />} />
            <Route path="members/withdrawn-members" element={<WithdrawnMembers />} />
            <Route path="members/access-requests" element={<AccessRequests />} />
            <Route path="members/unsigned-contracts" element={<UnsignedContracts />} />
            <Route path="members/:membershipType/:memberName" element={<ViewMember />} >
              <Route index element={<PersonalDetails />} />
              <Route path="education" element={<EducationDetails />} />
              <Route path="documents" element={<MemberDocuments />} />
              <Route path="sent-mails" element={<SentMails />} />
              <Route path="contributions" element={<MemberContributions />} />
              <Route path="expenses" element={<MemberExpenses />} />
            </Route>
            <Route path="onboarding" element={<OnboardingDashboard />} />
            <Route path="onboarding/new-applications" element={<NewApplications />} />
            <Route path="onboarding/:onboardingType/:memberName" element={<ApplicationDetails />} />
            <Route path="onboarding/pending-applications" element={<PendingApplications />} />
            <Route path="onboarding/approve-gpa" element={<GpaApprovals />} />
            <Route path="onboarding/approve-application" element={<ApproveApplication />} />
            <Route path="onboarding/rejected-applications" element={<RejectedApplicants />} />
            <Route path="onboarding/cosigners" element={<Cosigners />} />
            <Route path="onboarding/cosigners/:memberName" element={<CosignerDetails />} />
            <Route path="onboarding/credit-report-review" element={<CreditReportReview />} />
            <Route path="onboarding/onboard" element={<Onboarding />} />
            <Route path="onboarding/onboard/disable-program-email" element={<DisableProgramEmail />} />
            <Route path="onboarding/onboard/update-password" element={<UpdatePassword />} />
            <Route path="entrance-exams" element={<EntranceExamsDashboard />} />
            <Route path="entrance-exams/applications" element={<ExamApplicants />} />
            <Route path="entrance-exams/applications/:memberName" element={<ExamApplicant />} />
            <Route path="entrance-exams/trainings" element={<Trainings />} />
            <Route path="entrance-exams/mocks" element={<Mocks />} />
            <Route path="entrance-exams/bookings" element={<Bookings />} />
            <Route path="entrance-exams/booked-exams" element={<BookedExams />} />
            <Route path="entrance-exams/results" element={<Results />} />
            <Route path="entrance-exams/scores" element={<Scores />} />
            <Route path="entrance-exams/resources" element={<Resources />} />
            <Route path="school-admission" element={<SchoolApplicationDashboard />} />
            <Route path="school-admission/intakes" element={<Intakes />} />
            <Route path="school-admission/intakes/:intakeName" element={<ViewIntake />} />
            <Route path="school-admission/meeting-requests" element={<MeetingRequests />} />
            <Route path="school-admission/meeting-requests/:roomName" element={<Room />} />
            <Route path="school-admission/GPA-dashboard" element={<GPADashboard />} />
            <Route path="school-admission/GPA-dashboard/GPA-calculation" element={<GpaCalculations />} />
            <Route path="school-admission/GPA-dashboard/GPA-calculation/:memberName" element={<ApplicationDetails />} />
            <Route path="school-admission/GPA-dashboard/career-advisory-GPA-calculation" element={<CareerGpaCalculations />} />
            <Route path="school-admission/GPA-dashboard/career-advisory-GPA-calculation/:memberName" element={<ApplicationDetails />} />
            <Route path="school-admission/GPA-dashboard/pending-gpa-calculation" element={<PendingGpaCalculations />} />
            <Route path="school-admission/GPA-dashboard/gpa-approval" element={<GPAApprovals />} />
            <Route path="school-admission/GPA-dashboard/gpa-approval/:memberName" element={<ApplicationDetails />} />
            <Route path="school-admission/GPA-dashboard/transcript-resubmissions/" element={<Resubmissions />} />
            <Route path="school-admission/GPA-dashboard/transcript-resubmissions/:memberName" element={<ApplicationDetails />} />
            <Route path="school-admission/application-documents" element={<DocumentDashboard />} />
            <Route path="school-admission/application-documents/student-documents" element={<StudentDocuments />} />
            <Route path="school-admission/application-documents/approved-documents" element={<ApprovedDocuments />} />
            <Route path="school-admission/application-documents/rejected-documents" element={<RejectedDocuments />} />
            <Route path="school-admission/application-documents/transcripts" element={<Transcripts />} />
            <Route path="school-admission/application-documents/transcripts/:memberName" element={<DocumentsReview />} />
            <Route path="school-admission/new-school-applications" element={<SchoolApplications />} />
            <Route path="school-admission/new-school-applications/assigned-applications" element={<AssignedApplications />} />
            <Route path="school-admission/new-school-applications/assigned-applications/:memberName" element={<SchoolApplicationDetails />} />
            <Route path="school-admission/new-school-applications/:memberName" element={<SchoolApplicationDetails />} />
            <Route path="school-admission/new-school-applications/rejected-applications" element={<RejectedSchoolApplications />} />
            <Route path="school-admission/new-school-applications/rejected-applications/:memberName" element={<SchoolApplicationDetails />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default Router;