// src/theme.ts
import { createTheme } from "@mui/material/styles";

const primaryRed = "#F5333F"; // from your screenshot

export const theme = createTheme({
  palette: {
    primary: {
      main: primaryRed,
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#263238",
    },
    background: {
      default: "#FFF5F6", // soft tinted background
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 16,
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          marginTop: 8,
        },
      },
    },
  },
});
