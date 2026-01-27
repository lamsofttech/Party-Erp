import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import Router from "./router/router";
import { ThemeProviderWrapper } from "./contexts/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import "./styles/index.css";

// ✅ Party-based theming (multi-party colors)
import { PartyThemeProvider } from "./contexts/PartyThemeContext";

// 👇 PWA service worker
import { registerSW } from "virtual:pwa-register";

/**
 * ✅ Safe SW registration (no updateSW variable):
 * - production only
 * - registers after window load
 * - reloads once when update is available (prevents loops)
 */
if (import.meta.env.PROD) {
  window.addEventListener("load", () => {
    registerSW({
      immediate: false,

      onNeedRefresh() {
        const key = "pwa_sw_reloaded_once";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        } else {
          console.log("Update available. Please refresh to update.");
        }
      },

      onOfflineReady() {
        console.log("App ready to work offline.");
      },
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserProvider>
      <ThemeProviderWrapper>
        <PartyThemeProvider>
          {/* ✅ IMPORTANT: app is hosted at /dist/ */}
          <BrowserRouter basename="/dist">
            <Router />
          </BrowserRouter>
        </PartyThemeProvider>
      </ThemeProviderWrapper>
    </UserProvider>
  </StrictMode>
);
