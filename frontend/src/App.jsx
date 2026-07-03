import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth';
import EventPage from './pages/EventPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function HomeRedirect() {
  return <Navigate to="/event/demo" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/event/:slug" element={<EventPage />} />
          <Route path="/admin/:slug/login" element={<AdminLogin />} />
          <Route path="/admin/:slug/*" element={<AdminDashboard />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
