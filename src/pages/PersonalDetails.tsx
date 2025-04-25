import { useContext } from "react";
import { StudentContext } from "../layouts/view-member";

function PersonalDetails() {
    const { student, loading, error } = useContext(StudentContext);

    if (loading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;
    if (!student) return <p className="text-red-500 text-center">Student not found.</p>;

    return (
        <main>
            <div className="shadow-[9px_9px_54px_9px_rgba(0,0,0,0.08)] p-10 rounded-lg dark:bg-gray-700">
                <p className="font-bold text-center text-[24px] text-[#2164a6] dark:text-blue-300">Personal Details</p>
                <p><strong>Full Name:</strong> {student.fullName}</p><br />
                <p><strong>Gender:</strong> {student.gender}</p><br />
                <p><strong>ID Number:</strong> {student.idNumber}</p><br />
                <p><strong>Email:</strong> {student.email}</p><br />
                <p><strong>Phone Number:</strong> {student.phone}</p><br />
                <p><strong>ISP Email:</strong> {student.ispEmail}</p><br />
                <p><strong>ISP Email Password:</strong> {student.password}</p><br />
                <p><strong>Program:</strong> {student.programOption}</p><br />
                <p><strong>Program Version:</strong> {student.programVersion}</p><br />
                {/* <p><strong>GMAT Score:</strong> {student.gmatScore}</p><br />
                <p><strong>GRE Score:</strong> {student.greScore}</p><br /> */}
            </div>
        </main>
    );
}

export default PersonalDetails;
