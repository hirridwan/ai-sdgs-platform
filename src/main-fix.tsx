import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import AppAI from './AppAI';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const RootApp = path === '/ai' ? AppAI : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
