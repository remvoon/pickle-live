/**
 * Step progress bar for admin setup wizard
 */
import React from 'react';

const DEFAULT_STEPS = [
  { id: 'event', label: 'Event', icon: '📋' },
  { id: 'participants', label: 'Players', icon: '👥' },
  { id: 'teams', label: 'Teams', icon: '🏃' },
  { id: 'format', label: 'Format', icon: '🏟️' },
  { id: 'matches', label: 'Matches', icon: '⚔️' },
];

export default function StepIndicator({ currentStep, onStepClick, steps }) {
  const STEPS = steps || DEFAULT_STEPS;
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full">
      {/* Mobile: horizontal dots */}
      <div className="flex items-center justify-between mb-2 hide-scrollbar">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIndex;
          const isLast = idx === STEPS.length - 1;
          
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onStepClick?.(step.id)}
                className="flex flex-col items-center gap-1 touch-target"
                title={step.label}
              >
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200
                  ${isActive ? 'bg-pickle-600 text-white shadow-md shadow-pickle-200 scale-110' : ''}
                  ${isCompleted ? 'bg-pickle-100 text-pickle-700' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-100 text-gray-400' : ''}
                `}>
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
                <span className={`
                  text-[10px] font-medium whitespace-nowrap
                  ${isActive ? 'text-pickle-700' : ''}
                  ${isCompleted ? 'text-pickle-600' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-400' : ''}
                `}>
                  {step.label}
                </span>
              </button>
              {/* Connector line */}
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full mt-[-20px] ${
                  idx < currentIndex ? 'bg-pickle-400' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Current step title */}
      <div className="text-center mb-4">
        <p className="text-xs text-gray-400">
          Step {currentIndex + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
