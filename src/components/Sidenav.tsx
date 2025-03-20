import { Link, NavLink } from "react-router-dom";
import assets from "../assets/assets";
import DashboardIcon from '@mui/icons-material/Dashboard';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PaymentsIcon from '@mui/icons-material/Payments';
import SchoolIcon from '@mui/icons-material/School';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import { motion } from "framer-motion";
// import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import '../styles/sidenav.css';
import { useState } from "react";

function Sidenav() {
    const [isExpanded, setIsExpanded] = useState(false);
    // const [isExamsExpanded, setIsExamsExpanded] = useState(false);
    return (
        <main className="fixed top-3">
            <motion.div
                initial={{ x: "-100vw" }} // Start off-screen to the right
                animate={{ x: 0 }} // Move to the final position
                transition={{
                    type: "spring", // Smooth spring animation
                    stiffness: 50, // Spring stiffness
                    damping: 10, // Damping to reduce oscillation
                    duration: 20, // Duration in seconds
                }}
                className="bg-[linear-gradient(0deg,#2164A6_80.26%,rgba(33,100,166,0)_143.39%)] h-[calc(100vh-1.5rem)] py-8 px-6 rounded-2xl flex flex-col items-center">
                <div className="bg-white dark:bg-white/75 p-4 rounded-xl w-full"><img src={assets.logo} className="h-14" alt="" /></div>
                <div className="flex flex-col gap-6 my-20 overflow-y-auto custom-scrollbar pr-1 transition">
                    <Link to="/">
                        <div className="flex gap-3 items-center text-white">
                            <DashboardIcon />
                            <p className="">Dashboard</p>
                        </div>
                    </Link>
                    <div className="flex flex-col w-full">
                        {/* Main Menu Item */}
                        <div
                            className={`flex gap-3 items-center cursor-pointer transition-colors duration-300 ${isExpanded ? "text-white" : "text-gray-300"}`}
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <ManageAccountsIcon />
                            <p>Student Management</p>
                        </div>

                        {/* Animated Expansion */}
                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
                        >
                            <div className="ml-6 mt-2 flex flex-col gap-2">
                                <NavLink
                                    to="members"
                                    className={({ isActive }) =>
                                        `transition-colors duration-200 ${isActive ? "text-white font-bold" : "text-gray-400 hover:text-white"
                                        }`
                                    }
                                >
                                    • Members
                                </NavLink>
                                <NavLink
                                    to="onboarding"
                                    className={({ isActive }) =>
                                        `transition-colors duration-200 ${isActive ? "text-white font-bold" : "text-gray-400 hover:text-white"
                                        }`
                                    }
                                >
                                    • Onboarding
                                </NavLink>
                                {/* <div
                                    className={`flex ml-[-10px] items-center cursor-pointer transition-colors duration-300 ${isExamsExpanded ? "text-white" : "text-gray-400"}`}
                                    onClick={() => setIsExamsExpanded(!isExamsExpanded)}
                                >
                                    <ArrowRightIcon className={`transition-transform duration-300 ${isExamsExpanded ? "rotate-90" : ""}`} />
                                    <p>Entrance Exams</p>
                                </div>
                                <div
                                    className={`transition-all duration-300 ease-in-out overflow-hidden ${isExamsExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
                                >
                                    <div className="ml-12 mt-2 flex flex-col gap-2"> */}
                                <NavLink
                                    to="/entrance-exams"
                                    className={({ isActive }) =>
                                        `transition-colors duration-200 ${isActive ? "text-white font-bold" : "text-gray-400 hover:text-white"}`
                                    }
                                >
                                    • Entrance Exams
                                </NavLink>
                                {/* <NavLink
                                    to="/entrance-exams/gre"
                                    className={({ isActive }) =>
                                        `transition-colors duration-200 ${isActive ? "text-white font-bold" : "text-gray-400 hover:text-white"}`
                                    }
                                >
                                    • GRE
                                </NavLink> */}
                                    {/* </div>
                                </div> */}
                                <NavLink
                                    to="/school-admission"
                                    className={({ isActive }) =>
                                        `transition-colors duration-200 ${isActive ? "text-white font-bold" : "text-gray-400 hover:text-white"}`
                                    }
                                >
                                    • School Admission
                                </NavLink>
                                <Link to="" className="text-gray-400 hover:text-white transition-colors duration-200">
                                    • Visa
                                </Link>
                                <Link to="" className="text-gray-400 hover:text-white transition-colors duration-200">
                                    • Loan
                                </Link>
                                <Link to="" className="text-gray-400 hover:text-white transition-colors duration-200">
                                    • Job Skills
                                </Link>
                                <Link to="" className="text-gray-400 hover:text-white transition-colors duration-200">
                                    • Post Graduation
                                </Link>
                                <Link to="" className="text-gray-400 hover:text-white transition-colors duration-200">
                                    • Student Finance
                                </Link>
                                <Link to="" className="text-gray-400 hover:text-white transition-colors duration-200">
                                    • Travel & Logistics
                                </Link>
                            </div>
                        </div>
                    </div>
                    <Link to="/admin">
                        <div className="flex gap-3 items-center text-gray-300">
                            <SelfImprovementIcon />
                            <p className="">Human Resources</p>
                        </div>
                    </Link>
                    <Link to="/admin">
                        <div className="flex gap-3 items-center text-gray-300">
                            <SupervisorAccountIcon />
                            <p className="">Customer Relations</p>
                        </div>
                    </Link>
                    <Link to="/admin">
                        <div className="flex gap-3 items-center text-gray-300">
                            <PaymentsIcon />
                            <p className="">Payment/Report</p>
                        </div>
                    </Link>
                    <Link to="/admin">
                        <div className="flex gap-3 items-center text-gray-300">
                            <SchoolIcon />
                            <p className="">ISP Academy</p>
                        </div>
                    </Link>
                    <Link to="/admin">
                        <div className="flex gap-3 items-center text-gray-300">
                            <ChecklistIcon />
                            <p className="">User Roles</p>
                        </div>
                    </Link>
                    <Link to="/admin">
                        <div className="flex gap-3 items-center text-gray-300">
                            <AdminPanelSettingsIcon />
                            <p className="">Admin User</p>
                        </div>
                    </Link>
                </div>
                <div className="flex gap-3 items-center justify-center text-white">
                    <LogoutIcon />
                    <p className="">Logout</p>
                </div>
            </motion.div>
        </main>
    )
}

export default Sidenav