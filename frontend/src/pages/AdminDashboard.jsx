/**
 * Admin Dashboard - main admin page with step navigation
 */
import React, { useState } from 'react';
import { useParams, useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../auth';
import StepIndicator from '../components/StepIndicator';
import AdminEventSetup from '../components/AdminEventSetup';
import AdminParticipants from '../components/AdminParticipants';
import AdminTeams from '../components/AdminTeams';
import AdminGroups from '../components/AdminGroups';
import AdminStages from '../components/AdminStages';
import AdminMatches from '../components/AdminMatches';

function AdminContent({ slug, step, onStepChange }) {
  switch (step) {
    case 'event':
      return <AdminEventSetup slug={slug} />;
    case 'participants':
      return <AdminParticipants slug={slug} />;
    case 'teams':
      return <AdminTeams slug={slug} />;
    case 'groups':
      return <AdminGroups slug={slug} />;
    case 'stages':
      return <AdminStages slug={slug} />;
    case 'matches':
    case 'scoring':
      return <AdminMatches slug={slug} />;
    default:
      return <AdminEventSetup slug={slug} />;
  }
}

export default function AdminDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState('event');
  const [menuOpen, setMenuOpen] = useState(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/admin/${slug}/login`);
    }
  }, [isAuthenticated, slug, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate(`/admin/${slug}/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-pickle-700">Pickle-Live</h1>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {slug}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/event/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pickle-600 touch-target px-2"
              >
                View
              </a>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 touch-target px-2"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Step Indicator */}
          <div className="mt-3">
            <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <AdminContent slug={slug} step={currentStep} onStepChange={setCurrentStep} />
      </main>
    </div>
  );
}
