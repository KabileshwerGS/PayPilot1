import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide your email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email, password);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-main, #F8FAFC)', color: 'var(--text-main, #0F172A)' }}>
      {/* Left Branding Panel */}
      <div
        style={{
          flex: '0 0 420px',
          background: '#FFFFFF',
          color: 'var(--text-main, #0F172A)',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--border-color, #E2E8F0)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div
              style={{
                width: '42px',
                height: '42px',
                background: 'var(--primary-gradient)',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: '22px',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              }}
            >
              P
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main, #0F172A)' }}>PayPilot</h3>
              <span style={{ fontSize: '9px', letterSpacing: '1.2px', color: 'var(--primary-color, #4F46E5)', fontWeight: 700, display: 'block' }}>AUTONOMOUS BACK OFFICE</span>
            </div>
          </div>

          <div style={{ marginTop: '80px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.3, marginBottom: '16px', color: 'var(--text-main, #0F172A)' }}>
              Welcome back to your financial cockpit.
            </h2>
            <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '15px', lineHeight: 1.6 }}>
              Check real-time receivables, monitor PayPal transactions, and run autonomous business operations.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-success, #10B981)', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Verified Secure Session
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
            Multi-tenant data isolation and cryptographic security.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', padding: '36px', borderRadius: '18px', boxShadow: 'var(--shadow-card, 0 10px 30px rgba(0, 0, 0, 0.06))', border: '1px solid var(--border-color, #E2E8F0)' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Sign In</h2>
          <p style={{ margin: '0 0 24px', color: 'var(--text-secondary, #475569)', fontSize: '14px' }}>
            Enter your credentials to access your PayPilot dashboard.
          </p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="name@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Password</label>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary, #475569)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-button"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
            Don't have an account yet?{' '}
            <Link to="/register" style={{ color: 'var(--primary-color, #4F46E5)', fontWeight: 600 }}>
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

