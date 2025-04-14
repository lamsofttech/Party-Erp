import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter} from "react-router-dom";
import Router from './router/router.tsx';
import { ThemeProviderWrapper } from "./contexts/ThemeContext";
import { UserProvider } from './contexts/UserContext.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <ThemeProviderWrapper>
        <BrowserRouter basename="/admin">
          <Router />
        </BrowserRouter>
      </ThemeProviderWrapper>
    </UserProvider>
  </StrictMode>,
)
