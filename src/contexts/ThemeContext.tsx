import { createContext, useState, useEffect, ReactNode } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export const ThemeProviderWrapper = ({ children }: { children: ReactNode }) => {
  const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
  const [theme, setTheme] = useState<"light" | "dark">(storedTheme || "light");

  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: { main: theme === "dark" ? "#90caf9" : "#1976d2" },
      background: {
        default: theme === "dark" ? "#121212" : "#ffffff",
        paper: theme === "dark" ? "#1e1e1e" : "#f5f5f5",
      },
      text: {
        primary: theme === "dark" ? "#ffffff" : "#000000",
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
