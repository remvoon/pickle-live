import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth';
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import GlobalPlayersPage from './pages/GlobalPlayersPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/players" element={<GlobalPlayersPage />} />
          <Route path="/event/:slug" element={<EventPage />} />
          <Route path="/admin/:slug/login" element={<AdminLogin />} />
          <Route path="/admin/:slug/*" element={<AdminDashboard />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
