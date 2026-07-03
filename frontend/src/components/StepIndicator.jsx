/**
 * Linear step indicator for admin setup flow
 */
import React from 'react';

const STEPS = [
  { id: 'event', label: 'Event' },
  { id: 'participants', label: 'Participants' },
  { id: 'teams', label: 'Teams' },
  { id: 'groups', label: 'Groups' },
  { id: 'stages', label: 'Stages' },
  { id: 'matches', label: 'Matches' },
  { id: 'scoring', label: 'Scoring' },
];

export default function StepIndicator({ currentStep, onStepClick }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="overflow-x-auto pb-2 mb-4">
      <div className="flex gap-1 min-w-max px-2">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIndex;
          
          return (
            <button
              key={step.id}
              onClick={() => onStepClick?.(step.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                touch-target whitespace-nowrap
                ${isActive ? 'bg-pickle-600 text-white' : ''}
                ${isCompleted ? 'bg-pickle-100 text-pickle-700' : ''}
                ${!isActive && !isCompleted ? 'bg-gray-100 text-gray-500' : ''}
              `}
            >
              <span className={`
                w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                ${isActive ? 'bg-white text-pickle-600' : ''}
                ${isCompleted ? 'bg-pickle-600 text-white' : ''}
                ${!isActive && !isCompleted ? 'bg-gray-300 text-gray-600' : ''}
              `}>
                {isCompleted ? '✓' : idx + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
