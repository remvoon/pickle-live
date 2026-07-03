/**
 * Toggle button group for binary choices (gender, handedness)
 */
import React from 'react';

export default function ToggleGroup({ options, value, onChange, label }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1 font-medium">{label}</p>
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? '' : opt.value)}
            className={`flex-1 py-2.5 text-sm font-medium transition-all touch-target
              ${value === opt.value
                ? 'bg-pickle-600 text-white shadow-sm'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
