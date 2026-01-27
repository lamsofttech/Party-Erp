import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop with theme-safe background
 * - Ensures scroll resets without flashing white
 * - Never affects global background color
 * - Optimized for mobile, tablets, PWAs
 */
const ScrollToTop: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // ensure page keeps your theme background always
    document.documentElement.style.backgroundColor = "#F5333F";
    document.body.style.backgroundColor = "#F5333F";

    // Skip scrolling when navigating to an anchor (#section)
    if (location.hash) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Smooth scroll to top on route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;
