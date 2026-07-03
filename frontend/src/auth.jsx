/**
 * Auth context and provider for admin routes
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pickle_live_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  const login = useCallback(async (password) => {
    const result = await authApi.login(password);
    localStorage.setItem('pickle_live_token', result.token);
    setToken(result.token);
    setIsAuthenticated(true);
    return result;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pickle_live_token');
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  // Check token validity on mount
  useEffect(() => {
    if (token) {
      // Simple check: token exists
      setIsAuthenticated(true);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
