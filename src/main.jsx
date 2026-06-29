import React from 'react';
import { createRoot } from 'react-dom/client';
import CounterDefaultsStudio from './studio/CounterDefaultsStudio.jsx';
import './styles/fonts.css';

// The mixing-desk "Studio" is the main view (June 2026). The earlier slider
// tool lives at src/components/CounterDefaults.jsx if we ever need to revert.
document.body.style.margin = '0';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CounterDefaultsStudio />
  </React.StrictMode>
);
