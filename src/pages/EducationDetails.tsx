import { useContext } from "react";
import { StudentContext } from "../layouts/view-member";

function EducationDetails() {
    const { student, loading, error } = useContext(StudentContext);

    if (loading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;
    if (!student) return <p className="text-red-500 text-center">Student not found.</p>;

    return (
        <main>
            <div className="shadow-[9px_9px_54px_9px_rgba(0,0,0,0.08)] p-10 rounded-lg dark:bg-gray-700">
                <p className="font-bold text-center text-[24px] text-[#2164a6] dark:text-blue-300">Education Details</p>
                <p><strong>High School:</strong> {student.highSchool}</p><br />
                <p><strong>High School Points:</strong> {student.kcsePoint}</p><br />
                <p><strong>Undergraduate Degree:</strong> {student.degree}</p><br />
                <p><strong>Undergraduate Qualifications/Honors:</strong> {student.uGrade}</p><br />
                <p><strong>GPA:</strong> {student.gpa}</p><br />
            </div>
        </main>
    );
}

export default EducationDetails;
