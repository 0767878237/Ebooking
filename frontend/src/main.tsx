import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// StrictMode surfaces unsafe effects during development without changing production behavior.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
