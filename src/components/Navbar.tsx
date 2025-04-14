import DarkModeIcon from '@mui/icons-material/DarkMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import assets from '../assets/assets';
import { motion } from "framer-motion";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { useContext, useState } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import BreadcrumbsNav from './BreadcrumbsNav';
import { useUser } from '../contexts/UserContext';
import axios from 'axios';
import { config } from '../config';

function Navbar() {
    const themeContext = useContext(ThemeContext);
    const { user, setUser } = useUser();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    if (!themeContext) return null;

    const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        try {
            // Optionally call a logout endpoint to clear server-side session
            await axios.post(
                'https://finkapinternational.qhtestingserver.com/login/logout_api.php',
                {},
                { withCredentials: true }
            );
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear user from context
            setUser(null);
            // Redirect to login page
            window.location.href = config.loginUrl;
        }
    };

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
                    <button
            className="flex items-center gap-2"
            onClick={handleProfileClick}
            aria-controls={open ? 'profile-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <img
              className="h-8 rounded-full border border-[#2164A6]"
              src={assets.profile}
              alt="profile"
            />
            {user?.name}
          </button>
          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'profile-button',
            }}
            PaperProps={{
              className: themeContext.theme === 'dark' ? 'bg-[#375472] text-white' : 'bg-white text-black',
            }}
          >
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
                </div>
            </motion.div>
        </main>
    )
}

export default Navbar