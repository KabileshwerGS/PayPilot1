import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const calculatePasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = calculatePasswordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the terms of service.');
      return;
    }

    setLoading(true);
    try {
      await register(fullName, email, password);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
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
              Take command of your business finances.
            </h2>
            <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '15px', lineHeight: 1.6 }}>
              Join thousands of independent professionals using PayPilot to automate invoicing, collect international payments, and maintain crystal-clear books.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-success, #10B981)', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
            <ShieldCheck size={16} /> 256-bit bank-grade encryption
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
            Your financial data is private and strictly isolated.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', padding: '36px', borderRadius: '18px', boxShadow: 'var(--shadow-card, 0 10px 30px rgba(0, 0, 0, 0.06))', border: '1px solid var(--border-color, #E2E8F0)' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Create your account</h2>
          <p style={{ margin: '0 0 24px', color: 'var(--text-secondary, #475569)', fontSize: '14px' }}>
            Get started with PayPilot in under 2 minutes.
          </p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Full Name</label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px', outline: 'none' }}
              />
              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          borderRadius: '2px',
                          background: idx < strength ? strengthColors[strength - 1] : '#E2E8F0',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: strength > 0 ? strengthColors[strength - 1] : 'var(--text-muted, #64748B)' }}>
                    Strength: {strengthLabels[strength - 1] || 'Too short'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <label htmlFor="terms" style={{ fontSize: '13px', color: 'var(--text-secondary, #475569)', lineHeight: 1.4 }}>
                I agree to the <span style={{ color: 'var(--primary-color, #4F46E5)' }}>Terms of Service</span> and <span style={{ color: 'var(--primary-color, #4F46E5)' }}>Privacy Policy</span>.
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
              {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary-color, #4F46E5)', fontWeight: 600 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

