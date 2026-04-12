import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider }  from './context/AuthContext.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import App from './App.jsx';
import './index.css';

// ─── Loading / error gate ─────────────────────────────────────────
// Renders while Supabase is loading; AuthProvider waits until data is ready
// so the student session resolves correctly on first render.
function AppLoadWrapper() {
  const { loading, dbError, reload } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg">
        <div className="w-10 h-10 rounded-full border-4 border-gold border-t-transparent animate-spin" />
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <p className="text-4xl">⚠️</p>
        <p className="text-primary font-semibold">Could not connect to database</p>
        <p className="text-muted text-sm max-w-sm">{dbError}</p>
        <button
          onClick={reload}
          className="mt-2 px-6 py-2.5 bg-gold text-bg font-semibold rounded-xl text-sm hover:bg-gold-l transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <AppLoadWrapper />
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
