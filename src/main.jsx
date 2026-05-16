import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import LegacyAnalytics from './LegacyAnalytics.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LegacyAnalytics />
    <App />
  </React.StrictMode>
);
