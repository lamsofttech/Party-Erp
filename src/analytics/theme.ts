// src/analytics/theme.ts
import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#006233' },
        secondary: { main: '#bf0a30' },
        background: { default: '#121212', paper: '#1e1e1e' },
        text: { primary: '#ffffff', secondary: '#b0b0b0' },
    },
    typography: { fontFamily: 'Roboto, sans-serif', h1: { fontWeight: 700 }, h4: { fontWeight: 600 } },
    components: {
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: '#2b2b2b',
                    border: '1px solid #333',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' },
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: { height: 8, borderRadius: 4, backgroundColor: '#444' },
                bar: { borderRadius: 4, backgroundColor: '#bf0a30' },
            },
        },
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#004a25' } } } },
    },
});
