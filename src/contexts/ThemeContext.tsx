import { createContext, useState, useEffect, ReactNode } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

// Central Jubilee colors
const JUBILEE_RED = "#ED1C24";
const JUBILEE_LIGHT_BG = "#FFF5F5";
const JUBILEE_TEXT_DARK = "#111111";

export const ThemeProviderWrapper = ({ children }: { children: ReactNode }) => {
  const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
  const [theme, setTheme] = useState<"light" | "dark">(storedTheme || "light");

  // 👉 Jubilee-optimised MUI theme (light + dark)
  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: {
        main: JUBILEE_RED,
        contrastText: "#FFFFFF",
      },
      background: {
        // Light: Jubilee-tinted background; Dark: standard dark
        default: theme === "dark" ? "#121212" : JUBILEE_LIGHT_BG,
        paper: theme === "dark" ? "#1e1e1e" : "#FFFFFF",
      },
      text: {
        primary: theme === "dark" ? "#FFFFFF" : JUBILEE_TEXT_DARK,
        secondary: theme === "dark" ? "#B3B3B3" : "#555555",
      },
      divider: theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    },
    typography: {
      fontFamily: `'Inter', 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`,
      fontWeightBold: 700,
    },
    components: {
      // Optional: slightly rounder look for a more modern UI
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 600,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
          },
        },
      },
    },
  });

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    // Apply Tailwind Dark Mode
    const htmlElement = document.documentElement;
    htmlElement.classList.add("theme-transition"); // Add transition effect

    if (newTheme === "dark") {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }

    // Remove transition class after animation to prevent re-triggering
    setTimeout(() => {
      htmlElement.classList.remove("theme-transition");
    }, 400);
  };

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (theme === "dark") {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
