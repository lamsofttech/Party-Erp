import { useState, useEffect, createContext} from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import MemberSidenav from "../components/MemberSidenav";

const API_URL = "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/get_member.php";

interface Email {
    id: number;
    subject: string;
    datee: string;
}

interface Expenditure {
    reference_id: string;
    purporse: string;
    amount: number;
    date: string;
}

interface Payment {
    payment_intent_id: string;
    purpose: string;
    amount: number;
    date_completed: string;
}

// 🔹 Define a TypeScript interface for student data
export interface Student {
    id: number;
    fullName: string;
    gender?: string;
    idNumber?: string;
    email: string;
    phone: string;
    ispEmail?: string;
    password?: string;
    programOption: string;
    programVersion?: string;
    gmatScore?: string;
    greScore?: string;
    enrollmentDate?: string;
    highSchool?: string;
    kcsePoint?: string;
    degree?: string;
    uGrade?: string;
    gpa?: string;
    kcseCert: string;
    undergradCert: string;
    undergradTranscript: string;
    creditReport: string;
    gpaReport: string;
    emails: Email[];
    payments: Payment[];
    expenditure: Expenditure[];
}

// 🔹 Create Context for Student Data
const StudentContext = createContext<{ student: Student | null; loading: boolean; error: string | null; refreshStudent: () => void; }>({
    student: null,
    loading: true,
    error: null,
    refreshStudent: () => {},
});

// ✅ Fetch Student Data in ViewMember and Provide Context
function ViewMember() {
    const { membershipType, memberName } = useParams<{ membershipType: string; memberName: string }>();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const studentEmail = queryParams.get("email");

    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStudent = async () => {
        try {
            const response = await fetch(`${API_URL}?email=${studentEmail}`);
            const text = await response.text();
            // console.log("Raw API Response:", text);
            
            const data = JSON.parse(text);
            if (data.status === "success" && data.data) {
                setStudent({
                    id: Number(data.data.id),
                    fullName: data.data.fullnames || "N/A",
                    gender: data.data.gender || "N/A",
                    idNumber: data.data.id_no || "N/A",
                    email: data.data.email || "N/A",
                    phone: data.data.phone_no || "N/A",
                    ispEmail: data.data.prog_Email || "N/A",
                    password: data.data.temp_password || "N/A",
                    programOption: data.data.package || "N/A",
                    programVersion: data.data.converted || "N/A",
                    gmatScore: data.data.gmatScore || "N/A",
                    greScore: data.data.greScore || "N/A",
                    enrollmentDate: data.data.enrollment_date || "N/A",
                    highSchool: data.data.high_school || "N/A",
                    kcsePoint: data.data.kcse_point || "N/A",
                    degree: data.data.degree || "N/A",
                    uGrade: data.data.u_grade || "N/A",
                    gpa: data.data.gpa || "N/A",
                    kcseCert: data.data.kcse_cert || "N/A",
                    undergradCert: data.data.u_cert || "N/A",
                    undergradTranscript: data.data.transcript || "N/A",
                    creditReport: data.data.credit_report || "N/A",
                    gpaReport: data.data.gpa_doc || "N/A",
                    emails: data.emails || [],
                    payments: data.payments || [],
                    expenditure:data.expenditures || [],
                });
            } else {
                setError(data.message || "Student not found.");
            }
        } catch (error) {
            setError("Error fetching student details.");
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
       if (studentEmail) {
            fetchStudent();
        } else {
            setError("Invalid student Email.");
            setLoading(false);
        }
    }, [studentEmail]);

    return (
        <StudentContext.Provider value={{ student, loading, error, refreshStudent: fetchStudent }}>
            <main>
                <div className="bg-[linear-gradient(90deg,#2164A6_0%,rgba(33,100,166,0.50)_100%)] rounded-lg py-3 w-full">
                    <p className="text-white text-[32px] text-center font-bold">{memberName}'s Details</p>
                </div>
                <div className="mt-10">
                    {/* Progress Bar Example */}
                </div>
                <div className="flex my-8 gap-40">
                    <MemberSidenav membershipType={membershipType || ""} memberName={memberName || ""} memberEmail={studentEmail || ""} />
                    <div className="flex-1 px-4">
                        <Outlet />
                    </div>
                </div>
            </main>
        </StudentContext.Provider>
    );
}

export default ViewMember;
export { StudentContext };
