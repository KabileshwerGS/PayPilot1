import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Copy, ExternalLink, Users, CreditCard, ShieldCheck, Plus, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import api from '../../services/api';

export default function CreatorPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // New Profile Form
  const [profileForm, setProfileForm] = useState({
    handle: '',
    display_name: '',
    bio: '',
    suggested_tips: '[5, 10, 25, 50]',
    currency: 'USD',
  });

  // New Membership Tier Form
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    billing_interval: 'MONTHLY',
    perks: '',
  });
  const [showPlanModal, setShowPlanModal] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/creators/profile');
      setProfile(data);
      if (data) {
        setProfileForm({
          handle: data.handle,
          display_name: data.display_name,
          bio: data.bio || '',
          suggested_tips: data.suggested_tips || '[5, 10, 25, 50]',
          currency: data.currency || 'USD',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCreateOrUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (profile) {
        const updated = await api.put('/api/creators/profile', profileForm);
        setProfile(updated);
        setMessage('Creator profile updated successfully!');
      } else {
        const created = await api.post('/api/creators/profile', profileForm);
        setProfile(created);
        setMessage('Creator Hub launched! Your public Tip Jar is now live.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save creator profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/creators/plans', {
        ...planForm,
        price: parseFloat(planForm.price),
      });
      setShowPlanModal(false);
      setPlanForm({ name: '', description: '', price: '', currency: 'USD', billing_interval: 'MONTHLY', perks: '' });
      fetchProfile();
      setMessage('New membership tier created successfully!');
    } catch (err) {
      setError(err.message || 'Failed to create membership tier.');
    } finally {
      setSaving(false);
    }
  };

  const publicTipUrl = profile ? `${window.location.origin}/tip/${profile.handle}` : '';

  const copyTipLink = () => {
    navigator.clipboard.writeText(publicTipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `Support my work on PayPilot Creator Hub! You can leave a tip or join my membership here: ${publicTipUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="secondary-page" style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Creator Hub...</p>
      </div>
    );
  }

  return (
    <div className="secondary-page" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0 }}>Creator Hub</h1>
            <span className="sol-badge creator">
              Solution 2: Creators
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
            Fan tipping, recurring memberships, and direct supporter funding powered by PayPal.
          </p>
        </div>

        {profile && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.open(publicTipUrl, '_blank')}
              className="primary-button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px', background: 'var(--color-creator-gradient)', boxShadow: '0 4px 18px rgba(236, 72, 153, 0.45)' }}
            >
              <ExternalLink size={15} /> View Public Tip Page
            </button>
          </div>
        )}
      </div>

      {message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' }}>
          <CheckCircle2 size={16} /> <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', marginBottom: '20px' }}>
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      {/* KPI Stats */}
      {profile && (
        <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
          <div className="stat-card card-revenue">
            <span className="stat-label">Total Fan Tips</span>
            <div className="stat-value" style={{ color: 'var(--status-success)' }}>
              {profile.currency} {parseFloat(profile.total_tips_amount || 0).toFixed(2)}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {profile.total_tips_count} supporters tipped
            </span>
          </div>

          <div className="stat-card card-creator">
            <span className="stat-label">Active Members</span>
            <div className="stat-value" style={{ color: 'var(--color-creator-light)' }}>
              {profile.total_subscribers}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recurring subscribers</span>
          </div>

          <div className="stat-card card-freelancer">
            <span className="stat-label">Membership Tiers</span>
            <div className="stat-value" style={{ color: 'var(--aurora-cyan)' }}>
              {profile.plans?.length || 0}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active subscription plans</span>
          </div>

          <div className="stat-card card-marketplace">
            <span className="stat-label">Public Handle</span>
            <div className="stat-value" style={{ fontSize: '20px', color: 'var(--lavender)' }}>
              @{profile.handle}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--status-success)' }}>● Live on Web</span>
          </div>
        </div>
      )}

      {/* Share Box if profile exists */}
      {profile && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(225, 29, 72, 0.25)',
          padding: '22px 26px',
          borderRadius: '16px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--color-creator-gradient)' }} />
          <div>
            <strong style={{ color: 'var(--color-creator, #E11D48)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={16} style={{ color: '#E11D48', fill: '#E11D48' }} /> Your Public Tip Jar & Membership Link
            </strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Share this link in your social bios, YouTube descriptions, or website to collect direct PayPal tips.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={copyTipLink}
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Copy size={14} /> {copied ? 'Copied Link!' : 'Copy Tip Link'}
            </button>
            <button
              onClick={shareWhatsApp}
              className="btn-whatsapp"
            >
              <MessageCircle size={15} /> Share on WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Profile Setup / Edit Form */}
      <div style={{ background: 'var(--card-gradient)', backdropFilter: 'blur(18px)', border: '1px solid var(--glass-border)', padding: '28px', borderRadius: '16px', marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '17px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--bright-violet)' }} />
          {profile ? 'Edit Creator Profile' : 'Set Up Your Creator Profile'}
        </h3>
        <form onSubmit={handleCreateOrUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: profile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '16px' }}>
            {!profile && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Creator Handle (Unique Slug) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ padding: '10px 12px', background: '#F1F5F9', border: '1px solid var(--border-muted)', borderRight: 'none', borderRadius: '8px 0 0 8px', color: 'var(--text-secondary)' }}>@</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alexmusic"
                    value={profileForm.handle}
                    onChange={(e) => setProfileForm({ ...profileForm, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    style={{ borderRadius: '0 8px 8px 0' }}
                  />
                </div>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Display / Brand Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Rivera Audio"
                value={profileForm.display_name}
                onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Preset Tip Amounts (JSON)
              </label>
              <input
                type="text"
                placeholder="[5, 10, 25, 50]"
                value={profileForm.suggested_tips}
                onChange={(e) => setProfileForm({ ...profileForm, suggested_tips: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Creator Bio & Mission Statement
            </label>
            <textarea
              rows={3}
              placeholder="Tell your fans what your content is about and how their support helps you create..."
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <button type="submit" disabled={saving} className="primary-button" style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600 }}>
              {saving ? 'Saving...' : profile ? 'Update Profile' : 'Launch Creator Hub'}
            </button>
          </div>
        </form>
      </div>

      {/* Membership Tiers & Recent Tips */}
      {profile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Memberships */}
          <div style={{ background: 'var(--card-gradient)', backdropFilter: 'blur(18px)', border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: 'var(--aurora-cyan)' }} /> Membership Tiers
              </h3>
              <button
                onClick={() => setShowPlanModal(true)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-muted)', background: 'var(--bg-elevated)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add Tier
              </button>
            </div>

            {profile.plans && profile.plans.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {profile.plans.map((p) => (
                  <div key={p.id} style={{ padding: '14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid var(--border-muted, #E2E8F0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--lavender)' }}>{p.name}</strong>
                      <span style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: '14px' }}>
                        {p.currency} {parseFloat(p.price).toFixed(2)} / {p.billing_interval.toLowerCase()}
                      </span>
                    </div>
                    {p.description && <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.description}</p>}
                    {p.perks && <small style={{ color: 'var(--aurora-cyan)', fontSize: '11px' }}>Perks: {p.perks}</small>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                No membership tiers defined yet. Add a tier to allow fans to subscribe monthly!
              </p>
            )}
          </div>

          {/* Recent Tips Feed */}
          <div style={{ background: 'var(--card-gradient)', backdropFilter: 'blur(18px)', border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={16} style={{ color: '#ec4899' }} /> Recent Fan Tips
            </h3>
            {profile.recent_tips && profile.recent_tips.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {profile.recent_tips.map((t) => (
                  <div key={t.id} style={{ padding: '12px 14px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid var(--border-muted, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        {t.is_anonymous ? 'Anonymous Supporter' : t.supporter_name}
                      </strong>
                      {t.message && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{t.message}"</p>}
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: '14px' }}>
                      +{t.currency} {parseFloat(t.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                No tips received yet. Share your public link to start collecting tips!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Membership Tier */}
      {showPlanModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>Add Membership Tier</h3>
            <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Supporter"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="9.99"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cycle</label>
                  <select
                    value={planForm.billing_interval}
                    onChange={(e) => setPlanForm({ ...planForm, billing_interval: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Benefits & Perks</label>
                <input
                  type="text"
                  placeholder="e.g. Discord VIP role, early access, shoutouts"
                  value={planForm.perks}
                  onChange={(e) => setPlanForm({ ...planForm, perks: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Short Description</label>
                <textarea
                  rows={2}
                  placeholder="What fans get by supporting this tier..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowPlanModal(false)} style={{ background: 'none', border: '1px solid var(--border-muted)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="primary-button" style={{ padding: '8px 18px' }}>
                  {saving ? 'Creating...' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
