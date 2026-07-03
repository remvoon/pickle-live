import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const PIN_LENGTH = 4;

export default function AdminLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [pin, setPin] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePress = async (num) => {
    if (pin.length >= PIN_LENGTH || loading) return;
    const newPin = [...pin, num];
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      setError('');
      try {
        await login(newPin.join(''));
        navigate(`/admin/${slug}`);
      } catch (err) {
        setError('Wrong PIN');
        setPin([]);
        setLoading(false);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin([]);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pickle-50 via-white to-pickle-50/30 px-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl hero-gradient flex items-center justify-center shadow-lg shadow-pickle-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Enter Admin PIN</h1>
          <p className="text-sm text-gray-400 mt-1">{slug}</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150
              ${pin[i] !== undefined ? 'bg-pickle-600 scale-110' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && (
          <div className="text-center mb-4">
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {/* PIN Pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handlePress(num)}
              disabled={loading}
              className="w-full aspect-square rounded-2xl bg-white text-gray-800 text-2xl font-bold
                         shadow-[0_1px_3px_0_rgb(0_0_0/0.06)] border border-gray-100
                         hover:bg-pickle-50 hover:border-pickle-200 active:scale-95
                         transition-all duration-100 touch-target flex items-center justify-center
                         disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          {/* Bottom row: clear, 0, backspace */}
          <button onClick={handleClear} disabled={pin.length === 0 || loading}
            className="w-full aspect-square rounded-2xl bg-gray-50 text-gray-500 text-sm font-medium
                       border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all
                       touch-target flex items-center justify-center disabled:opacity-30">
            Clear
          </button>
          <button onClick={() => handlePress(0)} disabled={loading}
            className="w-full aspect-square rounded-2xl bg-white text-gray-800 text-2xl font-bold
                       shadow-[0_1px_3px_0_rgb(0_0_0/0.06)] border border-gray-100
                       hover:bg-pickle-50 hover:border-pickle-200 active:scale-95
                       transition-all duration-100 touch-target flex items-center justify-center
                       disabled:opacity-50">
            0
          </button>
          <button onClick={handleBackspace} disabled={pin.length === 0 || loading}
            className="w-full aspect-square rounded-2xl bg-gray-50 text-gray-600
                       border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all
                       touch-target flex items-center justify-center disabled:opacity-30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
            </svg>
          </button>
        </div>

        <p className="text-center mt-8 text-sm">
          <a href={`/event/${slug}`} className="text-gray-400 hover:text-pickle-600 transition-colors">
            ← View public page
          </a>
        </p>
      </div>
    </div>
  );
}
