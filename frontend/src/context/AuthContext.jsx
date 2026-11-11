import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      setBusiness(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await api.get('/api/auth/me');
      setUser(userData);

      try {
        const businessData = await api.get('/api/business');
        setBusiness(businessData);
      } catch (err) {
        // Business profile might not be created yet (user is in onboarding)
        setBusiness(null);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      api.setToken(null);
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleExpired = () => {
      setUser(null);
      setBusiness(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    api.setToken(data.access_token);
    await fetchCurrentUser();
    return data;
  };

  const register = async (fullName, email, password) => {
    const data = await api.post('/api/auth/register', {
      full_name: fullName,
      email,
      password,
    });
    api.setToken(data.access_token);
    await fetchCurrentUser();
    return data;
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setBusiness(null);
  };

  const updateBusiness = (updatedProfile) => {
    setBusiness(updatedProfile);
  };

  const value = {
    user,
    business,
    loading,
    isAuthenticated: !!user,
    hasBusinessProfile: !!business,
    login,
    register,
    logout,
    refreshUser: fetchCurrentUser,
    updateBusiness,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

