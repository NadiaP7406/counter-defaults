import React from 'react';
import { createRoot } from 'react-dom/client';
import CounterDefaults from './components/CounterDefaults.jsx';
import './styles/fonts.css';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CounterDefaults />
  </React.StrictMode>
);
