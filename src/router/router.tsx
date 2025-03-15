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
import GMATApplicants from "../pages/GMATApplications";
import GMATApplicant from "../pages/GMATApplicant";
import GMATTrainings from "../pages/GMATTrainings";
import GMATMocks from "../pages/GMATMocks";
import GMATBookings from "../pages/GMATBookings";
import GMATBookedExams from "../pages/GMATBookedExams";
import GMATResults from "../pages/GMATResults";
import GMATScores from "../pages/GMATScores";
import GMATResources from "../pages/GMATResources";
// import GREApplicants from "../pages/GREApplications";
// import GREApplicant from "../pages/GREApplicant";
// import GRETrainings from "../pages/GRETraining";
// import GREMocks from "../pages/GREMocks";
// import GREBookings from "../pages/GREBookings";
// import GREBookedExams from "../pages/GREBookedExams";

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
            <Route path="entrance-exams/applications" element={<GMATApplicants />} />
            <Route path="entrance-exams/applications/:memberName" element={<GMATApplicant />} />
            <Route path="entrance-exams/trainings" element={<GMATTrainings />} />
            <Route path="entrance-exams/mocks" element={<GMATMocks />} />
            <Route path="entrance-exams/bookings" element={<GMATBookings />} />
            <Route path="entrance-exams/booked-exams" element={<GMATBookedExams />} />
            <Route path="entrance-exams/results" element={<GMATResults />} />
            <Route path="entrance-exams/scores" element={<GMATScores />} />
            <Route path="entrance-exams/resources" element={<GMATResources />} />
            {/* <Route path="entrance-exams/gre-applications" element={<GREApplicants />} />
            <Route path="entrance-exams/gre-applications/:memberName" element={<GREApplicant />} />
            <Route path="entrance-exams/gre-trainings" element={<GRETrainings />} />
            <Route path="entrance-exams/gre-mocks" element={<GREMocks />} />
            <Route path="entrance-exams/gre-bookings" element={<GREBookings />} />
            <Route path="entrance-exams/gre-booked-exams" element={<GREBookedExams />} /> */}
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default Router;