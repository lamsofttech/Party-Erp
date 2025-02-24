const formatNumber = (num: number): string => {
    return num.toLocaleString("en-US");
};

const kenyaApplicationsToday = 600;
const zimbabweApplicationsToday = 300;
const otherApplicationsToday = 120;
const totalApplications = kenyaApplicationsToday + zimbabweApplicationsToday + otherApplicationsToday;
export const totalApplicationsToday = formatNumber(totalApplications)

const kenyaApplicationsPercentage = Number(((kenyaApplicationsToday / totalApplications) * 100).toFixed(2));
const zimbabweApplicationsPercentage = Number(((zimbabweApplicationsToday / totalApplications) * 100).toFixed(2));
const otherApplicationsPercentage = Number(((otherApplicationsToday / totalApplications) * 100).toFixed(2));

const kenyaFeesToday = 4000;
const zimbabweFeesToday = 800;
const otherFeesToday = 650;
const totalFeesToday = kenyaFeesToday + zimbabweFeesToday + otherFeesToday;
export const totalFees = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalFeesToday);

const kenyaFeesPercentage = Number(((kenyaFeesToday / totalFeesToday) * 100).toFixed(2));
const zimbabweFeesPercentage = Number(((zimbabweFeesToday / totalFeesToday) * 100).toFixed(2));
const otherFeesPercentage = Number(((otherFeesToday / totalFeesToday) * 100).toFixed(2));

const kenyaOnboardsToday = 100;
const zimbabweOnboardsToday = 50;
const otherOnboardsToday = 20;
const totalOnboards = kenyaOnboardsToday + zimbabweOnboardsToday + otherOnboardsToday;
export const totalOnboardsToday = formatNumber(totalOnboards)

const kenyaOnboardsPercentage = Number(((kenyaOnboardsToday / totalOnboards) * 100).toFixed(2));
const zimbabweOnboardsPercentage = Number(((zimbabweOnboardsToday / totalOnboards) * 100).toFixed(2));
const otherOnboardsPercentage = Number(((otherOnboardsToday / totalOnboards) * 100).toFixed(2));

const kenyaMembers = 7360;
const zimbabweMembers = 3120;
const otherMembers = 1700;
const totalMembers = kenyaMembers + zimbabweMembers + otherMembers;
export const totalMembersToday = formatNumber(totalMembers)

const kenyaMembersPercentage = Number(((kenyaMembers / totalMembers) * 100).toFixed(2));
const zimbabweMembersPercentage = Number(((zimbabweMembers / totalMembers) * 100).toFixed(2));
const otherMembersPercentage = Number(((otherMembers / totalMembers) * 100).toFixed(2));

export const messages = [
    "Relax and recharge—next week is yours!",   // Sunday
    "New week, new goals! Crush it today!",         // Monday
    "Stay focused and keep pushing forward!",       // Tuesday
    "Halfway there! Make today count.",             // Wednesday
    "Your hard work is paying off. Keep going!",    // Thursday
    "Almost there! One more push before the finish line!",   // Friday
    "Finish strong! The weekend is here!",      // Saturday
];

export const applications = [
    {
        label: `Kenya ${formatNumber(kenyaApplicationsToday)}`,
        value: kenyaApplicationsPercentage,
    },
    {
        label: `Zimbabwe ${formatNumber(zimbabweApplicationsToday)}`,
        value: zimbabweApplicationsPercentage,
    },
    {
        label: `Other ${formatNumber(otherApplicationsToday)}`,
        value: otherApplicationsPercentage,
    },
];

export const fees = [
    {
        label: `Kenya ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(kenyaFeesToday)}`,
        value: kenyaFeesPercentage,
    },
    {
        label: `Zimbabwe ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(zimbabweFeesToday)}`,
        value: zimbabweFeesPercentage,
    },
    {
        label: `Other ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(otherFeesToday)}`,
        value: otherFeesPercentage,
    },
];

export const onboards = [
    {
        label: `Kenya ${kenyaOnboardsToday}`,
        value: kenyaOnboardsPercentage,
    },
    {
        label: `Zimbabwe ${zimbabweOnboardsToday}`,
        value: zimbabweOnboardsPercentage,
    },
    {
        label: `Other ${otherOnboardsToday}`,
        value: otherOnboardsPercentage,
    },
];

export const members = [
    {
        label: `Kenya ${formatNumber(kenyaMembers)}`,
        value: kenyaMembersPercentage,
    },
    {
        label: `Zimbabwe ${formatNumber(zimbabweMembers)}`,
        value: zimbabweMembersPercentage,
    },
    {
        label: `Other ${formatNumber(otherMembers)}`,
        value: otherMembersPercentage,
    },
];

export interface Student {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    country: string;
    enrollmentDate: string;
    programOption: "Prime" | "Regular";
    reportStatus: string;
    gender: string;
    idNumber: string;
    ispEmail: string;
    programVersion: string;
    gmatScore: string;
    greScore: string;
}

export const initialData: Student[] = [
    { id: 1, fullName: "John Doe", gender: "Male", idNumber: "123456789", email: "john@example.com", phone: "123-456-789", country: "USA", enrollmentDate: "2024-01-01", programOption: "Prime", reportStatus: "Pending", ispEmail: "john@internationalscholarsprogram.com", programVersion: "V 2.0", gmatScore: "720", greScore: "330" },
    { id: 2, fullName: "Jane Smith", gender: "Female", idNumber: "987654321", email: "jane@example.com", phone: "987-654-321", country: "Canada", enrollmentDate: "2023-12-15", programOption: "Regular", reportStatus: "Completed", ispEmail: "jane@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "700", greScore: "325" },
    { id: 3, fullName: "Alice Brown", gender: "Female", idNumber: "456123789", email: "alice@example.com", phone: "456-123-789", country: "UK", enrollmentDate: "2024-02-10", programOption: "Prime", reportStatus: "Pending", ispEmail: "alice@internationalscholarsprogram.com", programVersion: "V 2.0", gmatScore: "710", greScore: "328" },
    { id: 4, fullName: "Bob Johnson", gender: "Male", idNumber: "123789456", email: "bob@example.com", phone: "123-789-456", country: "Germany", enrollmentDate: "2023-11-20", programOption: "Regular", reportStatus: "Completed", ispEmail: "bob@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "690", greScore: "320" },
    { id: 5, fullName: "Charlie White", gender: "Male", idNumber: "789123456", email: "charlie@example.com", phone: "789-123-456", country: "Australia", enrollmentDate: "2024-03-05", programOption: "Prime", reportStatus: "Pending", ispEmail: "charlie@internationalscholarsprogram.com", programVersion: "V 2.0", gmatScore: "730", greScore: "335" },
    { id: 6, fullName: "David Green", gender: "Male", idNumber: "159357852", email: "david@example.com", phone: "159-357-852", country: "France", enrollmentDate: "2024-01-22", programOption: "Regular", reportStatus: "Pending", ispEmail: "david@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "700", greScore: "325" },
    { id: 7, fullName: "Emily Adams", gender: "Female", idNumber: "357159852", email: "emily@example.com", phone: "357-159-852", country: "Japan", enrollmentDate: "2023-09-10", programOption: "Prime", reportStatus: "Completed", ispEmail: "emily@internationalscholarsprogram.com", programVersion: "V 2.0", gmatScore: "740", greScore: "340" },
    { id: 8, fullName: "Franklin Hill", gender: "Male", idNumber: "753951456", email: "franklin@example.com", phone: "753-951-456", country: "Brazil", enrollmentDate: "2024-02-18", programOption: "Regular", reportStatus: "Pending", ispEmail: "franklin@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "710", greScore: "328" },
    { id: 9, fullName: "Grace Kelly", gender: "Female", idNumber: "852741963", email: "grace@example.com", phone: "852-741-963", country: "India", enrollmentDate: "2024-03-12", programOption: "Prime", reportStatus: "Pending", ispEmail: "grace@internationalscholarsprogram.com", programVersion: "V 2.0", gmatScore: "720", greScore: "330" },
    { id: 10, fullName: "Henry Ford", gender: "Male", idNumber: "951357468", email: "henry@example.com", phone: "951-357-468", country: "South Africa", enrollmentDate: "2023-10-05", programOption: "Regular", reportStatus: "Completed", ispEmail: "henry@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "690", greScore: "320" },
    { id: 11, fullName: "Ivy Benson", gender: "Female", idNumber: "456789123", email: "ivy@example.com", phone: "456-789-123", country: "New Zealand", enrollmentDate: "2024-01-08", programOption: "Prime", reportStatus: "Pending", ispEmail: "ivy@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "710", greScore: "325" },
    { id: 12, fullName: "Jack Morrison", gender: "Male", idNumber: "789654123", email: "jack@example.com", phone: "789-654-123", country: "Mexico", enrollmentDate: "2024-02-28", programOption: "Regular", reportStatus: "Completed", ispEmail: "jack@internationalscholarsprogram.com", programVersion: "V 2.0", gmatScore: "700", greScore: "320" },
    { id: 13, fullName: "Karen Lopez", gender: "Female", idNumber: "123654789", email: "karen@example.com", phone: "123-654-789", country: "Italy", enrollmentDate: "2023-12-02", programOption: "Prime", reportStatus: "Pending", ispEmail: "karen@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "730", greScore: "335" },
    { id: 14, fullName: "Liam Nelson", gender: "Male", idNumber: "654987321", email: "liam@example.com", phone: "654-987-321", country: "Spain", enrollmentDate: "2024-01-30", programOption: "Regular", reportStatus: "Completed", ispEmail: "liam@internationalscholarsprogram.com", programVersion: "V 2.0", gmatScore: "690", greScore: "320" },
    { id: 15, fullName: "Mia Roberts", gender: "Female", idNumber: "987321654", email: "mia@example.com", phone: "987-321-654", country: "Netherlands", enrollmentDate: "2023-11-18", programOption: "Prime", reportStatus: "Pending", ispEmail: "mia@internationalscholarsprogram.com", programVersion: "V 1.0", gmatScore: "720", greScore: "330" },

];

// src/data.ts
export const userData = {
    fullName: "Test One",
    gender: "Male",
    idNumber: "1234567890",
    email: "kipronoaron47@gmail.com",
    phoneNumber: "8000000",
    ispEmail: "aron.sang@internationalscholarsprogram.com",
    ispEmailPassword: "^",
    program: "Regular",
    programVersion: "V 2.0",
    gmatScore: "N/A",
    greScore: "N/A",
    highSchool: "Test High School",
    hsPoints: "84",
    degree: "Bsc Computer Science",
    honors: "First Class",
    gpa: "4",
};

export type Email = {
    id: number;
    subject: string;
    date: string;
    content: string;
};

export const emailData: Email[] = [
    { id: 1, subject: "Meeting Reminder", date: "2024-02-04 14:30", content: "Reminder for our meeting at 3 PM." },
    { id: 2, subject: "Invoice #12345", date: "2024-02-04 15:15", content: "Your invoice for last month is attached." },
    { id: 3, subject: "Project Update", date: "2024-02-02 17:45", content: "Project update: Task 1 completed." },
    { id: 4, subject: "Job Application", date: "2024-02-01 09:00", content: "Your job application has been received." },
    { id: 5, subject: "Newsletter - February", date: "2024-01-30 12:10", content: "This month's newsletter is here!" },
    { id: 6, subject: "Event Invitation", date: "2024-01-29 15:20", content: "Join us for the annual event." },
    { id: 7, subject: "Password Reset", date: "2024-01-28 08:45", content: "Click here to reset your password." },
    { id: 8, subject: "Server Downtime Alert", date: "2024-01-27 23:30", content: "Scheduled maintenance from 12 AM to 2 AM." },
    { id: 9, subject: "Holiday Announcement", date: "2024-01-26 13:00", content: "Office closed on February 5th." },
    { id: 10, subject: "Survey Request", date: "2024-01-25 16:20", content: "We'd love your feedback!" },
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const paymentData = [
    { receiptNo: "1001", paymentFor: "Course Fee", amount: 1200, date: "2024-02-04 14:30" },
    { receiptNo: "1002", paymentFor: "Library Fee", amount: 50, date: "2024-02-03 10:15" },
    { receiptNo: "1003", paymentFor: "Gym Membership", amount: 100, date: "2024-02-02 17:45" },
    { receiptNo: "1004", paymentFor: "Hostel Rent", amount: 800, date: "2024-02-01 09:00" },
    { receiptNo: "1005", paymentFor: "Lab Equipment", amount: 250, date: "2024-01-30 12:10" },
    { receiptNo: "1006", paymentFor: "Event Registration", amount: 75, date: "2024-01-29 15:20" },
    { receiptNo: "1007", paymentFor: "Graduation Fee", amount: 300, date: "2024-01-28 08:45" },
    { receiptNo: "1008", paymentFor: "Exam Fee", amount: 150, date: "2024-01-27 23:30" },
    { receiptNo: "1009", paymentFor: "Sports Equipment", amount: 200, date: "2024-01-26 13:00" },
    { receiptNo: "1010", paymentFor: "Medical Insurance", amount: 500, date: "2024-01-25 16:20" },
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const expenseData = [
    { reference: "EXP1001", expenseFor: "Office Rent", amount: 1500, date: "2024-02-04 14:30" },
    { reference: "EXP1002", expenseFor: "Utilities", amount: 300, date: "2024-02-03 10:15" },
    { reference: "EXP1003", expenseFor: "Internet Bill", amount: 100, date: "2024-02-02 17:45" },
    { reference: "EXP1004", expenseFor: "Team Lunch", amount: 250, date: "2024-02-01 09:00" },
    { reference: "EXP1005", expenseFor: "Travel Allowance", amount: 500, date: "2024-01-30 12:10" },
    { reference: "EXP1006", expenseFor: "Stationery Purchase", amount: 80, date: "2024-01-29 15:20" },
    { reference: "EXP1007", expenseFor: "Software Subscription", amount: 120, date: "2024-01-28 08:45" },
    { reference: "EXP1008", expenseFor: "Office Furniture", amount: 700, date: "2024-01-27 23:30" },
    { reference: "EXP1009", expenseFor: "Marketing Ads", amount: 900, date: "2024-01-26 13:00" },
    { reference: "EXP1010", expenseFor: "Conference Fees", amount: 400, date: "2024-01-25 16:20" },
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const valueFormatter = (item: { value: number }) => `${item.value}%`;