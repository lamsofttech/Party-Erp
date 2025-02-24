import { useState, useEffect } from "react";
import assets from "../assets/assets";
import { PieChart } from "@mui/x-charts/PieChart";
import { motion } from "framer-motion";
import { messages, applications, fees, onboards, members, totalApplicationsToday, totalFees, totalOnboardsToday, totalMembersToday, valueFormatter } from "../data/data";

function Dashboard() {
    const [currentDate, setCurrentDate] = useState("");
    const [dailyMessage, setDailyMessage] = useState("");

    const applicationsData = {
        data: applications,
        valueFormatter,
    };
    const feesData = {
        data: fees,
        valueFormatter,
    };
    const onboardsData = {
        data: onboards,
        valueFormatter,
    };
    const membersData = {
        data: members,
        valueFormatter,
    };

    useEffect(() => {
        const today = new Date();
        const formattedDate = today.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
        setCurrentDate(formattedDate);
    }, []);

    useEffect(() => {
        const todayIndex = new Date().getDay();
        setDailyMessage(messages[todayIndex]);
    }, []);
    return (
        <main>
            <div className="overflow-x-hidden">
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    transition={{ duration: 1.5, ease: "easeIn" }}
                    className="bg-[linear-gradient(99deg,rgba(33,100,166,0.54)_133.66%,#CFF7D6_155.43%)] p-6 rounded-[14px] flex items-center justify-between">
                    <div className="flex flex-col text-white gap-12">
                        <p>{currentDate}</p>
                        <div>
                            <p className="font-bold text-[25px]">Welcome back, John!</p>
                            <p>{dailyMessage}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <img className="h-[200px]" src={assets.office} alt="office" />
                        <img className="h-[200px]" src={assets.workspace} alt="workspace" />
                    </div>
                </motion.div>
            </div>
            <div className="py-10 grid grid-cols-[2fr_1fr] gap-20 items-center justify-between">
                <div className="flex flex-col gap-12">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="grid grid-cols-2 gap-10">
                        <div className="flex flex-col items-center justify-center rounded-[14px] shadow-[7.015px_7.015px_42.088px_7.015px_rgba(0,0,0,0.08)] dark:bg-gray-700 p-6 w-full min-w-0">
                            <div className="w-full h-auto flex justify-center">
                                <PieChart
                                    series={[{ ...applicationsData }]}
                                    width={450}
                                    height={180}
                                />
                            </div>
                            <div className="text-center text-gray-500 dark:text-white">
                                <p className="font-bold text-[18px]">{totalApplicationsToday}</p>
                                <p>Total Applications Made</p>
                                <p>(Today)</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-[14px] shadow-[7.015px_7.015px_42.088px_7.015px_rgba(0,0,0,0.08)] dark:bg-gray-700 p-6 w-full min-w-0">
                            <div className="w-full h-auto flex justify-center">
                                <PieChart
                                    colors={['orange', 'red', 'green']}
                                    series={[{ ...feesData }]}
                                    width={490}
                                    height={180}
                                />
                            </div>
                            <div className="text-center text-gray-500 dark:text-white">
                                <p className="font-bold text-[18px]">{totalFees}</p>
                                <p>Total Application Fees</p>
                                <p>(Today)</p>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="grid grid-cols-2 gap-10">
                        <div className="flex flex-col items-center justify-center rounded-[14px] shadow-[7.015px_7.015px_42.088px_7.015px_rgba(0,0,0,0.08)] dark:bg-gray-700 p-6 w-full min-w-0">
                            <div className="w-full h-auto flex justify-center">
                                <PieChart
                                    colors={['olive', 'teal', 'lime']}
                                    series={[{ ...onboardsData }]}
                                    width={450}
                                    height={180}
                                />
                            </div>
                            <div className="text-center text-gray-500 dark:text-white">
                                <p className="font-bold text-[18px]">{totalOnboardsToday}</p>
                                <p>Total Onboards</p>
                                <p>(Today)</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-[14px] shadow-[7.015px_7.015px_42.088px_7.015px_rgba(0,0,0,0.08)] dark:bg-gray-700 p-6 w-full min-w-0">
                            <div className="w-full h-auto flex justify-center">
                                <PieChart
                                    colors={['violet', 'cyan', 'burlywood']}
                                    series={[{ ...membersData }]}
                                    width={450}
                                    height={180}
                                />
                            </div>
                            <div className="text-center text-gray-500 dark:text-white">
                                <p className="font-bold text-[18px]">{totalMembersToday}</p>
                                <p>Total Members</p>
                                <p>(Today)</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
                <motion.div
                    initial={{ maxWidth: "0px", opacity: 0 }}
                    animate={{ maxWidth: "500px", opacity: 1 }}
                    transition={{ duration: 1, ease: "easeIn" }}
                    className="flex flex-col gap-4 h-full">
                    <div className="flex justify-between font-bold text-[20px]">
                        <p className="text-black dark:text-white">Recent Notifications</p>
                        <p className="text-[#2586E5] dark:text-blue-400 cursor-pointer">See all</p>
                    </div>
                    <div className="shadow-[9.016px_9.016px_54.097px_9.016px_rgba(0,0,0,0.08)] dark:bg-gray-700 p-6 rounded-[14px] flex flex-col gap-10">
                        <div className="text-[18px]">
                            <p className="font-bold text-black dark:text-white">Student payment due</p>
                            <p className="text-gray-500 dark:text-gray-300">payments due are requested to be followed up</p>
                            <p className="text-[#2586E5] dark:text-blue-400 font-bold cursor-pointer">See more</p>
                        </div>
                        <div className="text-[18px]">
                            <p className="font-bold text-black dark:text-white">Ticket schedule</p>
                            <p className="text-gray-500 dark:text-gray-300">today onwards the following schedule is to be adhered to for the ticketing process that was...</p>
                            <p className="text-[#2586E5] dark:text-blue-400 font-bold cursor-pointer">See more</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </main>
    )
}

export default Dashboard