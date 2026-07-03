/**
 * Admin Dashboard - step-through wizard layout
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import StepIndicator from '../components/StepIndicator';
import AdminEventSetup from '../components/AdminEventSetup';
import AdminParticipants from '../components/AdminParticipants';
import AdminTeams from '../components/AdminTeams';
import AdminFormat from '../components/AdminFormat';
import AdminMatches from '../components/AdminMatches';

const ALL_STEPS = [
  { id: 'event', label: 'Event Setup', desc: 'Name, date, banner', icon: '📋' },
  { id: 'participants', label: 'Players', desc: 'Add players', icon: '👥' },
  { id: 'teams', label: 'Teams', desc: 'Form pairs', icon: '🏃' },
  { id: 'format', label: 'Format', desc: 'Groups & brackets', icon: '🏟️' },
  { id: 'matches', label: 'Matches', desc: 'Schedule & score', icon: '⚔️' },
];

function AdminContent({ slug, step }) {
  switch (step) {
    case 'event': return <AdminEventSetup slug={slug} />;
    case 'participants': return <AdminParticipants slug={slug} />;
    case 'teams': return <AdminTeams slug={slug} />;
    case 'format': return <AdminFormat slug={slug} />;
    case 'matches': return <AdminMatches slug={slug} />;
    default: return <AdminEventSetup slug={slug} />;
  }
}

export default function AdminDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState('event');

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/admin/${slug}/login`);
    }
  }, [isAuthenticated, slug, navigate]);

  if (!isAuthenticated) return null;

  // Scroll to top when switching steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  // Use all steps — Teams step is always visible (Royal Rumble users can skip it)
  const STEPS = ALL_STEPS;

  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  const stepInfo = STEPS[currentIndex];

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(`/admin/${slug}/login`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pickle-50/50 via-white to-pickle-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 touch-target -ml-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-base font-bold text-gray-800 leading-tight">{stepInfo?.label}</h1>
                <p className="text-[11px] text-gray-400">{stepInfo?.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a href={`/event/${slug}`} target="_blank" rel="noopener noreferrer"
                className="btn-ghost text-xs touch-target px-2" title="View public page">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button onClick={handleLogout} className="btn-ghost text-xs touch-target px-2" title="Logout">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} steps={STEPS} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 page-enter">
        <AdminContent slug={slug} step={currentStep} />

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
          <button
            onClick={goBack}
            disabled={currentIndex === 0}
            className="btn-secondary flex items-center gap-1.5 touch-target disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">
              {currentIndex + 1} / {STEPS.length}
            </span>
          </div>

          {currentIndex < STEPS.length - 1 ? (
            <button
              onClick={goNext}
              className="btn-primary flex items-center gap-1.5 touch-target"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <a
              href={`/event/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-1.5 touch-target"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Event
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
