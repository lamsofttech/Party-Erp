import { BarChart } from "@mui/x-charts";
import assets from "../assets/assets";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export interface MembersCountResponse {
    status: string;
    message: string;
    total_members: number;
    total_pending_members: number;
    total_pending_applicants: number;
    paid_program_contribution_members: number;
    total_withdrawn_members: number;
    total_access_requests: number;
    total_unsigned_contracts: number;
    members_by_country: {
        Kenya: number;
        Zimbabwe: number;
        Uganda: number;
        "Other Countries": number;
    };
    pending_members_by_country: {
        Kenya: number;
        Zimbabwe: number;
        Uganda: number;
        "Other Countries": number;
    };
    pending_applicants_by_country: {
        Kenya: number;
        Zimbabwe: number;
        Uganda: number;
        "Other Countries": number;
    };
    withdrawn_members_by_country: {
        Kenya: number;
        Zimbabwe: number;
        Uganda: number;
        "Other Countries": number;
    };
    access_requests_by_country: {
        Kenya: number;
        Zimbabwe: number;
        Uganda: number;
        "Other Countries": number;
    };
    unsigned_contracts_by_country: {
        Kenya: number;
        Zimbabwe: number;
        Uganda: number;
        "Other Countries": number;
    };
}

function MembersDashboard() {
    const [data, setData] = useState<MembersCountResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    const memberData = [
        { country: "Kenya", FM: data?.members_by_country.Kenya, PM: data?.pending_members_by_country.Kenya, PA: data?.pending_applicants_by_country.Kenya, W: data?.withdrawn_members_by_country.Kenya, AR: data?.access_requests_by_country.Kenya, UC: data?.unsigned_contracts_by_country.Kenya },
        { country: "Zimbabwe", FM: data?.members_by_country.Zimbabwe, PM: data?.pending_members_by_country.Zimbabwe, PA: data?.pending_applicants_by_country.Zimbabwe, W: data?.withdrawn_members_by_country.Zimbabwe, AR: data?.access_requests_by_country.Zimbabwe, UC: data?.unsigned_contracts_by_country.Zimbabwe },
        { country: "Uganda", FM: data?.members_by_country.Uganda, PM: data?.pending_members_by_country.Uganda, PA: data?.pending_applicants_by_country.Uganda, W: data?.withdrawn_members_by_country.Uganda, AR: data?.access_requests_by_country.Uganda, UC: data?.unsigned_contracts_by_country.Uganda },
        { country: "Others", FM: data?.members_by_country["Other Countries"], PM: data?.pending_members_by_country["Other Countries"], PA: data?.pending_applicants_by_country["Other Countries"], W: data?.withdrawn_members_by_country["Other Countries"], AR: data?.access_requests_by_country["Other Countries"], UC: data?.unsigned_contracts_by_country["Other Countries"] },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get<MembersCountResponse>(
                    "https://finkapinternational.qhtestingserver.com/login/main/ken/student-management/members/APIs/stats.php"
                );
                setData(response.data);
            } catch (err) {
                setError("Failed to fetch data. Please refresh page and contact the tech team if the issue persists.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-red-500 text-center py-64">{error}</p>;

    return (
        <main className="">
            <div className="font-bold text-[24px] text-[#2164A6] dark:text-white">
                Members Dashboard
            </div>
            <div className="flex items-center gap-14 2xl:py-16">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="grid grid-cols-3 items-center gap-10 w-full">
                    <Link to="/members/full-members">
                        <div className="bg-full-gradient aspect-square dark:bg-gray-700 dark:bg-none flex flex-col justify-center p-6 relative rounded-2xl group transition-all duration-300 hover:scale-105">
                            <div className="absolute top-2 left-2 w-6 h-6 border-2 border-white rounded-full bg-transparent transition-all duration-300 group-hover:bg-white">
                            </div>
                            <div className="absolute top-[-12px] right-0 w-8 h-8 border border-green-500 dark:border-white rounded-full bg-white dark:bg-green-700 flex items-center justify-center">
                                <p className="text-green-500 dark:text-white text-xs">{data?.total_members}</p>
                            </div>
                            <img className="h-20" src={assets.fullM} alt="full members" />
                            <p className="text-[18px] font-bold text-center text-white 2xl:mt-6">Full<br className="3xl:hidden" /> Members</p>
                        </div>
                    </Link>
                    <Link to="/members/pending-members">
                        <div className="bg-pending-gradient aspect-square dark:bg-gray-700 dark:bg-none flex flex-col justify-center p-6 relative rounded-2xl group transition-all duration-300 hover:scale-105">
                            <div className="absolute top-2 left-2 w-6 h-6 border-2 border-white rounded-full bg-transparent transition-all duration-300 group-hover:bg-white">
                            </div>
                            <div className="absolute top-[-12px] right-0 w-8 h-8 border border-green-500 dark:border-white rounded-full bg-white dark:bg-green-700 flex items-center justify-center">
                                <p className="text-green-500 dark:text-white text-xs">{data?.total_pending_members}</p>
                            </div>
                            <img className="h-20" src={assets.pending} alt="full members" />
                            <p className="text-[18px] font-bold text-center text-white 2xl:mt-6">Pending Members</p>
                        </div>
                    </Link>
                    <Link to="/members/pending-applicants">
                        <div className="bg-pending-applicants-gradient aspect-square dark:bg-gray-700 dark:bg-none flex flex-col justify-center p-6 relative rounded-2xl group transition-all duration-300 hover:scale-105">
                            <div className="absolute top-2 left-2 w-6 h-6 border-2 border-white rounded-full bg-transparent transition-all duration-300 group-hover:bg-white">
                            </div>
                            <div className="absolute top-[-12px] right-0 w-8 h-8 border border-green-500 dark:border-white rounded-full bg-white dark:bg-green-700 flex items-center justify-center">
                                <p className="text-green-500 dark:text-white text-xs">{data?.total_pending_applicants}</p>
                            </div>
                            <img className="h-20" src={assets.pending2} alt="full members" />
                            <p className="text-[18px] font-bold text-center text-white 2xl:mt-6">Pending Applicants</p>
                        </div>
                    </Link>
                    <Link to="/members/withdrawn-members">
                        <div className="bg-withdrawal-gradient aspect-square dark:bg-gray-700 dark:bg-none flex flex-col justify-center p-6 relative rounded-2xl group transition-all duration-300 hover:scale-105">
                            <div className="absolute top-2 left-2 w-6 h-6 border-2 border-white rounded-full bg-transparent transition-all duration-300 group-hover:bg-white">
                            </div>
                            <div className="absolute top-[-12px] right-0 w-8 h-8 border border-green-500 dark:border-white rounded-full bg-white dark:bg-green-700 flex items-center justify-center">
                                <p className="text-green-500 dark:text-white text-xs">{data?.total_withdrawn_members}</p>
                            </div>
                            <img className="h-20" src={assets.withdrawal} alt="full members" />
                            <p className="text-[18px] font-bold text-center text-white 2xl:mt-6">Withdrawn Members</p>
                        </div>
                    </Link>
                    <Link to="/members/access-requests">
                        <div className="bg-access-gradient aspect-square dark:bg-gray-700 dark:bg-none flex flex-col justify-center p-6 relative rounded-2xl group transition-all duration-300 hover:scale-105">
                            <div className="absolute top-2 left-2 w-6 h-6 border-2 border-white rounded-full bg-transparent transition-all duration-300 group-hover:bg-white">
                            </div>
                            <div className="absolute top-[-12px] right-0 w-8 h-8 border border-green-500 dark:border-white rounded-full bg-white dark:bg-green-700 flex items-center justify-center">
                                <p className="text-green-500 dark:text-white text-xs">{data?.total_access_requests}</p>
                            </div>
                            <img className="h-20" src={assets.access} alt="full members" />
                            <p className="text-[18px] font-bold text-center text-white 2xl:mt-6">Access Requests</p>
                        </div>
                    </Link>
                    <Link to="/members/unsigned-contracts">
                        <div className="bg-unsigned-gradient aspect-square dark:bg-gray-700 dark:bg-none flex flex-col justify-center p-6 relative rounded-2xl group transition-all duration-300 hover:scale-105">
                            <div className="absolute top-2 left-2 w-6 h-6 border-2 border-white rounded-full bg-transparent transition-all duration-300 group-hover:bg-white">
                            </div>
                            <div className="absolute top-[-12px] right-0 w-8 h-8 border border-green-500 dark:border-white rounded-full bg-white dark:bg-green-700 flex items-center justify-center">
                                <p className="text-green-500 dark:text-white text-xs">{data?.total_unsigned_contracts}</p>
                            </div>
                            <img className="h-20" src={assets.unsigned} alt="full members" />
                            <p className="text-[18px] font-bold text-center text-white 2xl:mt-6">Unsigned Contracts</p>
                        </div>
                    </Link>
                </motion.div>
                <motion.div
                    initial={{ y: "-100vw", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        type: "spring", // Smooth spring animation
                        stiffness: 50, // Spring stiffness
                        damping: 10, // Damping to reduce oscillation
                        duration: 20, // Duration in seconds
                    }}>
                    <BarChart
                        dataset={memberData}
                        xAxis={[{ scaleType: "band", dataKey: "country", label: "Countries" }]}
                        series={[
                            { dataKey: "FM", label: "Full Members", color: "#4cc5ad" },
                            { dataKey: "PM", label: "Pending Members", color: "#ffd14b" },
                            { dataKey: "PA", label: "Pending Applicants", color: "#9b7631" },
                            { dataKey: "W", label: "Withdrawals", color: "#929292" },
                            { dataKey: "AR", label: "Access Requests", color: "#625cf8" },
                            { dataKey: "UC", label: "Unsigned Contracts", color: "#9d3738" },
                        ]}
                        yAxis={[{ label: "Members" }]}
                        margin={{ top: 100 }}
                        width={500}
                        height={500}
                    />
                </motion.div>
            </div>
        </main>
    )
}

export default MembersDashboard