import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Users,
  FileText,
  CreditCard,
  BellRing,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Building2,
  Sparkles,
  Heart,
  Split,
  QrCode,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, business, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, iconColor: '#A78BFA' },
    { label: 'Freelancer Hub', to: '/invoices', icon: FileText, iconColor: '#38BDF8', badge: 'SOL 1', tagClass: 'blue' },
    { label: 'Clients', to: '/clients', icon: Users, iconColor: '#60A5FA' },
    { label: 'Creator Hub', to: '/creator', icon: Heart, iconColor: '#F472B6', badge: 'SOL 2', tagClass: 'pink' },
    { label: 'Marketplace', to: '/marketplace', icon: Split, iconColor: '#C084FC', badge: 'SOL 3', tagClass: 'purple' },
    { label: 'POS Terminal', to: '/pos', icon: QrCode, iconColor: '#34D399', badge: 'SOL 4', tagClass: 'emerald' },
    { label: 'Products / Inventory', to: '/products', icon: Package, iconColor: '#FBBF24' },
    { label: 'Payments Ledger', to: '/payments', icon: CreditCard, iconColor: '#2DD4BF' },
    { label: 'AI Pilot', to: '/ai', icon: Bot, iconColor: '#E879F9', badge: 'GEMINI', tagClass: 'aurora' },
    { label: 'Analytics', to: '/analytics', icon: BarChart3, iconColor: '#818CF8' },
    { label: 'Reminders', to: '/reminders', icon: BellRing, iconColor: '#F59E0B' },
    { label: 'Notifications', to: '/notifications', icon: Bell, iconColor: '#FB7185' },
    { label: 'Settings', to: '/settings', icon: Settings, iconColor: '#94A3B8' },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        <div className="brand-icon">P</div>
        <div>
          <h2>PayPilot</h2>
          <span>AUTONOMOUS BACK OFFICE</span>
        </div>
      </div>

      {/* Active Business Workspace */}
      <div className="workspace">
        <div className="workspace-avatar">
          {business?.business_name ? business.business_name[0].toUpperCase() : 'B'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {business?.business_name || 'My Business'}
          </strong>
          <small style={{ color: 'var(--text-secondary, #9CAAC4)' }}>
            {business?.default_currency || 'USD'} Account
          </small>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="nav-label">MAIN MENU</div>
      <nav className="nav-menu">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="nav-icon" style={{ color: item.iconColor }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <span className={`new-tag ${item.tagClass || ''}`}>{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Bottom Upgrade/AI Hint & User Profile */}
      <div className="sidebar-bottom">
        <div className="upgrade-card">
          <div className="upgrade-symbol">
            <Sparkles size={16} />
          </div>
          <strong>Autonomous Pilot</strong>
          <p>Real-time payment tracking & automated reminders active.</p>
          <button onClick={() => navigate('/ai')}>Open AI Pilot</button>
        </div>

        <div className="profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="profile-avatar">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <strong>{user?.full_name || 'User'}</strong>
              <small style={{ color: 'var(--text-secondary, #9CAAC4)' }}>{user?.email || ''}</small>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #9CAAC4)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

