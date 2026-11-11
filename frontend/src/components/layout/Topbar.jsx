import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ notificationCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return 'Overview';
      case '/ai':
        return 'AI Pilot Assistant';
      case '/clients':
        return 'Client Management';
      case '/invoices':
        return 'Invoices';
      case '/invoices/new':
        return 'Create Invoice';
      case '/payments':
        return 'Payments & Transactions';
      case '/reminders':
        return 'Automated Reminders';
      case '/analytics':
        return 'Financial Reports & Analytics';
      case '/notifications':
        return 'Notifications';
      case '/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const title = getPageTitle(location.pathname);

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>PayPilot /</span>
        <strong>{title}</strong>
      </div>

      <div className="top-actions">
        {/* Status Indicator */}
        <div className="online-status">
          <i />
          <span>System Live</span>
        </div>

        {/* Quick New Invoice Action */}
        <button
          className="primary-button"
          style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => navigate('/invoices/new')}
        >
          <Plus size={15} />
          <span>New Invoice</span>
        </button>

        {/* Notification Bell */}
        <button
          className="notification-button"
          onClick={() => navigate('/notifications')}
          title="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                background: 'var(--neon-pink, #EC4899)',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(236, 72, 153, 0.7)',
              }}
            />
          )}
        </button>

        {/* Top Avatar */}
        <div
          className="top-avatar"
          onClick={() => navigate('/settings')}
          style={{ cursor: 'pointer' }}
          title={user?.full_name || 'User Profile'}
        >
          {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
}

