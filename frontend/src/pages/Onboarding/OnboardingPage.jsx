import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Building2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateBusiness } = useAuth();

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'Freelancer',
    owner_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    country: 'United States',
    address: '',
    default_currency: 'USD',
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.business_name.trim() || !formData.owner_name.trim() || !formData.email.trim()) {
      setError('Please provide your business name, owner name, and email.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/business', formData);
      updateBusiness(response);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save business profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-mesh, #0A0618)', color: 'var(--text-main, #F8FAFC)', padding: '40px 20px', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px', background: 'var(--card-gradient, rgba(22, 15, 50, 0.7))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '40px', borderRadius: '18px', border: '1px solid rgba(167, 139, 250, 0.3)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 35px rgba(124, 58, 237, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(124, 58, 237, 0.18)', color: 'var(--lavender, #C4B5FD)', display: 'grid', placeItems: 'center', boxShadow: '0 0 18px rgba(124, 58, 237, 0.3)', border: '1px solid rgba(167, 139, 250, 0.25)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-main, #F8FAFC)' }}>Set up your business workspace</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #94A3B8)', fontSize: '14px' }}>
              Enter your business information to configure invoicing and currency settings.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '24px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Business / Agency Name *</label>
              <input
                type="text"
                name="business_name"
                required
                placeholder="Apex Studio Ltd."
                value={formData.business_name}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Business Type</label>
              <select
                name="business_type"
                value={formData.business_type}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              >
                <option value="Freelancer">Independent Freelancer</option>
                <option value="Consultant">Consultant / Advisor</option>
                <option value="Agency">Digital Agency</option>
                <option value="Creator">Content Creator / Service Provider</option>
                <option value="Small Business">Small Business</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Owner / Representative Name *</label>
              <input
                type="text"
                name="owner_name"
                required
                value={formData.owner_name}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Business Email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Phone Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Billing Address</label>
            <input
              type="text"
              name="address"
              placeholder="123 Innovation Blvd, Suite 400"
              value={formData.address}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Default Reporting Currency</label>
              <select
                name="default_currency"
                value={formData.default_currency}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
                <option value="SGD">SGD ($) - Singapore Dollar</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #9CAAC4)', marginBottom: '6px' }}>Time Zone</label>
              <input
                type="text"
                name="time_zone"
                value={formData.time_zone}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-input, #0B1224)', color: 'var(--text-main, #F1F5FF)', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated, #16223A)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-muted, #24324B)', marginTop: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #F1F5FF)', display: 'block', marginBottom: '4px' }}>
              PayPal & Payment Gateways
            </span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #9CAAC4)', lineHeight: 1.5 }}>
              You can connect your PayPal API Sandbox or Live credentials at any time under Settings.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
            style={{
              padding: '12px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {loading ? 'Launching Workspace...' : 'Complete & Open Workspace'} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

