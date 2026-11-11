import React, { useState, useEffect } from 'react';
import { Settings, Shield, Building2, CreditCard, Bot, Mail, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function SettingsPage() {
  const { user, business, updateBusiness, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('business');
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    business_type: 'Freelancer',
    owner_name: '',
    email: '',
    phone: '',
    country: 'United States',
    address: '',
    default_currency: 'USD',
    time_zone: 'UTC',
  });

  const [paypalForm, setPaypalForm] = useState({
    mode: 'sandbox',
    client_id: '',
    client_secret: '',
  });

  const [aiForm, setAiForm] = useState({
    gemini_api_key: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (business) {
      setBusinessForm({
        business_name: business.business_name || '',
        business_type: business.business_type || 'Freelancer',
        owner_name: business.owner_name || '',
        email: business.email || '',
        phone: business.phone || '',
        country: business.country || 'United States',
        address: business.address || '',
        default_currency: business.default_currency || 'USD',
        time_zone: business.time_zone || 'UTC',
      });
    }

    const loadSettings = async () => {
      try {
        const data = await api.get('/api/settings');
        if (data.paypal) {
          setPaypalForm({
            mode: data.paypal.mode || 'sandbox',
            client_id: data.paypal.client_id || '',
            client_secret: '', // Don't expose secret
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadSettings();
  }, [business]);

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const updated = await api.put('/api/business', businessForm);
      updateBusiness(updated);
      setMessage('Business settings updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update business profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaypal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await api.put('/api/settings/paypal', paypalForm);
      setMessage('PayPal integration settings updated securely.');
    } catch (err) {
      setError(err.message || 'Failed to update PayPal settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAI = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await api.put('/api/settings/ai', aiForm);
      setMessage('Gemini AI API configuration updated.');
    } catch (err) {
      setError(err.message || 'Failed to update AI settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="secondary-page" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>System <span>Settings</span></h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
          Configure business details, currency preferences, PayPal gateway, and AI credentials.
        </p>
      </div>

      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
          <CheckCircle2 size={16} /> <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-muted, #24324B)', marginBottom: '24px' }}>
        {[
          { id: 'business', label: 'Business Profile', icon: Building2 },
          { id: 'paypal', label: 'PayPal Integration', icon: CreditCard },
          { id: 'ai', label: 'Gemini AI', icon: Bot },
          { id: 'security', label: 'Security & Access', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage('');
                setError('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '2px solid var(--bright-violet, #8B5CF6)' : '2px solid transparent',
                color: isActive ? 'var(--lavender, #C4B5FD)' : 'var(--text-secondary, #94A3B8)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Business Profile */}
      {activeTab === 'business' && (
        <div style={{ background: 'var(--card-gradient, rgba(22, 15, 50, 0.7))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '18px', border: '1px solid rgba(167, 139, 250, 0.28)', padding: '32px', boxShadow: 'var(--glass-shadow)' }}>
          <form onSubmit={handleSaveBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Business Name</label>
                <input
                  type="text"
                  required
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Business Type</label>
                <select
                  value={businessForm.business_type}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_type: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
                >
                  <option value="Freelancer">Independent Freelancer</option>
                  <option value="Consultant">Consultant / Advisor</option>
                  <option value="Agency">Digital Agency</option>
                  <option value="Creator">Content Creator</option>
                  <option value="Small Business">Small Business</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Owner Name</label>
                <input
                  type="text"
                  required
                  value={businessForm.owner_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, owner_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Business Email</label>
                <input
                  type="email"
                  required
                  value={businessForm.email}
                  onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Default Currency</label>
                <select
                  value={businessForm.default_currency}
                  onChange={(e) => setBusinessForm({ ...businessForm, default_currency: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="SGD">SGD ($)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Country</label>
                <input
                  type="text"
                  value={businessForm.country}
                  onChange={(e) => setBusinessForm({ ...businessForm, country: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" disabled={loading} className="primary-button" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: PayPal */}
      {activeTab === 'paypal' && (
        <div style={{ background: 'var(--bg-card, #111A2E)', borderRadius: '16px', border: '1px solid var(--border-muted, #24324B)', padding: '32px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--text-main, #F1F5FF)' }}>PayPal REST Integration</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
              Connect your PayPal developer credentials. Secrets remain strictly stored on the backend.
            </p>
          </div>

          <form onSubmit={handleSavePaypal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Environment Mode</label>
              <select
                value={paypalForm.mode}
                onChange={(e) => setPaypalForm({ ...paypalForm, mode: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              >
                <option value="sandbox">Sandbox (Development / Test accounts)</option>
                <option value="live">Live (Real payments in production)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>PayPal Client ID</label>
              <input
                type="text"
                placeholder="A..."
                value={paypalForm.client_id}
                onChange={(e) => setPaypalForm({ ...paypalForm, client_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>PayPal Client Secret</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={paypalForm.client_secret}
                onChange={(e) => setPaypalForm({ ...paypalForm, client_secret: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" disabled={loading} className="primary-button" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> Save PayPal Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Gemini AI */}
      {activeTab === 'ai' && (
        <div style={{ background: 'var(--bg-card, #111A2E)', borderRadius: '16px', border: '1px solid var(--border-muted, #24324B)', padding: '32px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--text-main, #F1F5FF)' }}>Google Gemini AI Configuration</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
              Provides intelligence for financial queries, automated reminder drafting, and revenue summaries.
            </p>
          </div>

          <form onSubmit={handleSaveAI} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={aiForm.gemini_api_key}
                onChange={(e) => setAiForm({ ...aiForm, gemini_api_key: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', display: 'block', marginTop: '4px' }}>
                If set via server environment variable (<code>GEMINI_API_KEY</code>), this override is optional.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" disabled={loading} className="primary-button" style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={16} /> Save AI Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div style={{ background: 'var(--bg-card, #111A2E)', borderRadius: '16px', border: '1px solid var(--border-muted, #24324B)', padding: '32px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--text-main, #F1F5FF)' }}>Security & Sessions</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
              Manage password updates and active authentication sessions.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-muted, #24324B)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '14px', color: 'var(--text-main, #F1F5FF)', display: 'block' }}>Signed in as</strong>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary, #9CAAC4)' }}>{user?.email}</span>
            </div>
            <button
              onClick={logout}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'var(--bg-elevated, #16223A)', color: 'var(--neon-pink, #FF3D9A)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign Out Everywhere
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

