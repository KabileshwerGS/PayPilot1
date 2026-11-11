import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Sparkles, ShieldCheck, CheckCircle2, AlertCircle, CreditCard, Users, Star } from 'lucide-react';
import api from '../../services/api';

export default function PublicTipPage() {
  const { creatorHandle } = useParams();

  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Tip form state
  const [amount, setAmount] = useState('10');
  const [supporterName, setSupporterName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Membership sub state
  const [subscribingPlan, setSubscribingPlan] = useState(null);
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subSuccess, setSubSuccess] = useState(false);

  const fetchCreator = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/public/creators/${creatorHandle}`);
      setCreator(data);
    } catch (err) {
      setError(err.message || 'Creator profile not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreator();
  }, [creatorHandle]);

  const handleSendTip = async () => {
    const tipAmt = parseFloat(amount);
    if (!tipAmt || tipAmt <= 0) {
      alert('Please enter a valid tip amount.');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      // 1. Create PayPal Order for Tip
      const orderRes = await api.post(`/api/public/creators/${creatorHandle}/tip/create-order`, {
        amount: tipAmt,
        currency: creator.currency || 'USD',
        supporter_name: isAnonymous ? 'Anonymous' : (supporterName || 'Kind Supporter'),
        message: message || '',
        is_anonymous: isAnonymous,
      });

      // 2. Capture PayPal Order on backend (server-side verification)
      await api.post(`/api/public/creators/${creatorHandle}/tip/capture`, {
        order_id: orderRes.order_id,
      });

      setTipSuccess(true);
      fetchCreator();
    } catch (err) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!subName || !subEmail) {
      alert('Please enter your name and email to join this tier.');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/api/public/creators/${creatorHandle}/subscribe`, {
        plan_id: plan.id,
        subscriber_name: subName,
        subscriber_email: subEmail,
      });
      setSubSuccess(true);
      setSubscribingPlan(null);
      fetchCreator();
    } catch (err) {
      alert('Subscription failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  let presetTips = [5, 10, 25, 50];
  try {
    if (creator?.suggested_tips) {
      presetTips = JSON.parse(creator.suggested_tips);
    }
  } catch {}

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main, #F8FAFC)' }}>
        <p style={{ color: 'var(--text-secondary, #475569)' }}>Loading Creator Tip Jar...</p>
      </div>
    );
  }

  if (error && !creator) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main, #F8FAFC)', padding: '20px' }}>
        <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '16px', border: '1px solid var(--border-color, #E2E8F0)', textAlign: 'center', maxWidth: '420px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <AlertCircle size={36} style={{ color: '#E11D48', margin: '0 auto 12px' }} />
          <h2 style={{ margin: '0 0 8px', color: 'var(--text-main, #0F172A)' }}>Creator Not Found</h2>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #F8FAFC)', color: 'var(--text-main, #0F172A)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--primary-gradient)', borderRadius: '10px', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '18px' }}>
              P
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main, #0F172A)' }}>PayPilot Creator Hub</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)' }}>Verified Creator Profile</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '5px 12px', borderRadius: '9999px', fontWeight: 600 }}>
            <ShieldCheck size={14} /> PayPal Verified
          </div>
        </div>

        {/* Creator Identity Hero */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border-color, #E2E8F0)', padding: '36px', textAlign: 'center', marginBottom: '24px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.05))' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '28px', fontWeight: 800, margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)' }}>
            {creator.display_name[0].toUpperCase()}
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '26px', color: 'var(--text-main, #0F172A)' }}>{creator.display_name}</h2>
          <span style={{ color: '#4338CA', fontSize: '14px', fontWeight: 600 }}>@{creator.handle}</span>

          {creator.bio && (
            <p style={{ margin: '14px auto 0', maxWidth: '520px', color: 'var(--text-secondary, #475569)', fontSize: '14px', lineHeight: 1.6 }}>
              {creator.bio}
            </p>
          )}
        </div>

        {/* Success States */}
        {tipSuccess && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '24px' }}>
            <CheckCircle2 size={44} style={{ color: 'var(--status-success, #22C55E)', margin: '0 auto 10px' }} />
            <h3 style={{ margin: '0 0 6px', color: 'var(--status-success, #22C55E)' }}>Tip Received! Thank You! 🎉</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}>
              Your tip of {creator.currency} {parseFloat(amount).toFixed(2)} has been delivered to {creator.display_name}.
            </p>
            <button
              onClick={() => { setTipSuccess(false); setMessage(''); }}
              className="primary-button"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              Send Another Tip
            </button>
          </div>
        )}

        {subSuccess && (
          <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '24px' }}>
            <Star size={44} style={{ color: '#4F46E5', margin: '0 auto 10px' }} />
            <h3 style={{ margin: '0 0 6px', color: '#4338CA' }}>Welcome to the Community! ⭐</h3>
            <p style={{ margin: 0, color: 'var(--text-main, #0F172A)', fontSize: '14px' }}>
              You are now subscribed to {creator.display_name}'s membership tier!
            </p>
          </div>
        )}

        {/* Tip Box */}
        {!tipSuccess && (
          <div style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid var(--border-color, #E2E8F0)', padding: '32px', marginBottom: '28px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.05))' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={18} style={{ color: '#ec4899' }} /> Leave a Tip
            </h3>

            {/* Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {presetTips.map((val) => {
                const isSelected = amount === String(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #4F46E5' : '1px solid var(--border-color, #CBD5E1)',
                      background: isSelected ? 'var(--primary-gradient)' : '#FFFFFF',
                      color: isSelected ? '#fff' : '#0F172A',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 10px rgba(79, 70, 229, 0.25)' : 'none',
                    }}
                  >
                    ${val}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Custom Amount ({creator.currency})</label>
              <input
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ fontSize: '18px', fontWeight: 700, padding: '12px 14px' }}
              />
            </div>

            {/* Supporter details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Your Name or Handle (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sam or @samuel"
                  value={supporterName}
                  disabled={isAnonymous}
                  onChange={(e) => setSupporterName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Message to Creator (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Say something nice or request a topic..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                Make my tip anonymous on the public feed
              </label>
            </div>

            {/* Tip Checkout Button */}
            <button
              onClick={handleSendTip}
              disabled={processing}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: '#ffc439',
                color: '#003087',
                border: 'none',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(255, 196, 57, 0.3)',
              }}
            >
              <CreditCard size={18} />
              {processing ? 'Connecting with PayPal...' : `Send ${creator.currency} ${parseFloat(amount || 0).toFixed(2)} Tip with PayPal`}
            </button>
          </div>
        )}

        {/* Membership Plans Section */}
        {creator.plans && creator.plans.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid var(--border-color, #E2E8F0)', padding: '32px', marginBottom: '28px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.05))' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} style={{ color: 'var(--primary-color, #4F46E5)' }} /> Join Membership
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {creator.plans.map((plan) => (
                <div key={plan.id} style={{ padding: '18px', borderRadius: '12px', background: 'var(--bg-secondary, #F8FAFC)', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#4338CA' }}>{plan.name}</h4>
                    <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>{plan.description}</p>
                    {plan.perks && <small style={{ color: '#0284C7', fontSize: '12px', fontWeight: 600 }}>Perks: {plan.perks}</small>}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-success, #10B981)', marginBottom: '6px' }}>
                      ${parseFloat(plan.price).toFixed(2)} <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>/ {plan.billing_interval.toLowerCase()}</span>
                    </div>
                    <button
                      onClick={() => setSubscribingPlan(plan)}
                      className="primary-button"
                      style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 600 }}
                    >
                      Join Tier
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subscribe Mini Modal */}
            {subscribingPlan && (
              <div style={{ marginTop: '20px', padding: '18px', borderRadius: '12px', background: 'var(--bg-secondary, #F8FAFC)', border: '1px solid var(--primary-color, #4F46E5)' }}>
                <h4 style={{ margin: '0 0 10px', color: '#4338CA' }}>Join {subscribingPlan.name} (${subscribingPlan.price}/mo)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Your Email"
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setSubscribingPlan(null)} style={{ background: '#FFFFFF', border: '1px solid var(--border-color, #CBD5E1)', color: 'var(--text-secondary, #475569)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => handleSubscribe(subscribingPlan)} disabled={processing} className="primary-button" style={{ padding: '6px 16px' }}>
                    {processing ? 'Processing...' : 'Confirm Subscription'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

