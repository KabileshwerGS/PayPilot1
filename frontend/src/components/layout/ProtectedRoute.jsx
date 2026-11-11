import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { user, business, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'grid', height: '100vh', placeItems: 'center', background: '#f6f8fc' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-icon" style={{ margin: '0 auto 16px', width: '48px', height: '48px', fontSize: '24px' }}>
            P
          </div>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading PayPilot workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user has not completed onboarding and route requires onboarding
  if (requireOnboarding && !business && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

