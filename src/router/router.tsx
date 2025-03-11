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
import GMATDashboard from "../pages/GMAT";
import GMATApplicants from "../pages/GMATApplications";
import GMATApplicant from "../pages/GMATApplicant";
import GMATTrainings from "../pages/GMATTrainings";

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
            <Route path="entrance-exams-gmat" element={<GMATDashboard />} />
            <Route path="entrance-exams-gmat/applications" element={<GMATApplicants />} />
            <Route path="entrance-exams-gmat/applications/:memberName" element={<GMATApplicant />} />
            <Route path="entrance-exams-gmat/trainings" element={<GMATTrainings />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default Router;