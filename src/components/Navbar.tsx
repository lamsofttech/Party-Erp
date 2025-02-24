import DarkModeIcon from '@mui/icons-material/DarkMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import assets from '../assets/assets';
import { motion } from "framer-motion";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton } from "@mui/material";
import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import BreadcrumbsNav from './BreadcrumbsNav';

function Navbar() {
    const themeContext = useContext(ThemeContext);

    if (!themeContext) return null;
    return (
        <main className="sticky top-3 mb-6 z-50">
            <motion.div
                initial={{ y: "-100vw" }} // Start off-screen to the right
                animate={{ y: 0 }} // Move to the final position
                transition={{
                    type: "spring", // Smooth spring animation
                    stiffness: 50, // Spring stiffness
                    damping: 10, // Damping to reduce oscillation
                    duration: 10, // Duration in seconds
                }}
                className="bg-white dark:bg-[#375472] shadow-[6.724px_6.724px_41.467px_6.724px_rgba(0,0,0,0.08)] rounded-[12px] flex justify-between items-center px-4">
                <BreadcrumbsNav />
                <div className="flex gap-6 items-center p-2 text-black dark:text-white justify-end">
                    <IconButton onClick={themeContext.toggleTheme} color="inherit">
                        {themeContext.theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
                    </IconButton>
                    <button><NotificationsIcon /></button>
                    <button className="flex items-center gap-2"><img className="h-8 rounded-full border border-[#2164A6]" src={assets.profile} alt="profile" />John Doe</button>
                </div>
            </motion.div>
        </main>
    )
}

export default Navbar