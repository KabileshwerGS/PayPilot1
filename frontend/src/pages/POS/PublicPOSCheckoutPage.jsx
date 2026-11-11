import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QrCode, ShieldCheck, CheckCircle2, AlertCircle, CreditCard, ShoppingBag, Store } from 'lucide-react';
import api from '../../services/api';

export default function PublicPOSCheckoutPage() {
  const { orderNumber } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/public/pos/orders/${orderNumber}`);
      setOrder(data);
      if (data.payment_status === 'COMPLETED') {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  const handlePayViaPayPal = async () => {
    setProcessing(true);
    setError('');
    try {
      // 1. Create PayPal Order for POS
      const ppRes = await api.post(`/api/public/pos/orders/${orderNumber}/pay-paypal`, {});
      
      // 2. Capture and verify server-side
      await api.post(`/api/public/pos/orders/${orderNumber}/capture-paypal`, {
        paypal_order_id: ppRes.paypal_order_id,
      });

      setSuccess(true);
      fetchOrder();
    } catch (err) {
      setError(err.message || 'Payment capture failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main, #F8FAFC)' }}>
        <p style={{ color: 'var(--text-secondary, #475569)' }}>Loading In-Store Checkout...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main, #F8FAFC)', padding: '20px' }}>
        <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '16px', border: '1px solid var(--border-color, #E2E8F0)', textAlign: 'center', maxWidth: '400px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <AlertCircle size={36} style={{ color: '#E11D48', margin: '0 auto 12px' }} />
          <h2 style={{ margin: '0 0 8px', color: 'var(--text-main, #0F172A)' }}>Order Not Found</h2>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #F8FAFC)', color: 'var(--text-main, #0F172A)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--primary-gradient)', borderRadius: '10px', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '18px' }}>
              P
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main, #0F172A)' }}>PayPilot In-Store POS</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)' }}>Instant Contactless QR Payment</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '5px 12px', borderRadius: '9999px', fontWeight: 600 }}>
            <ShieldCheck size={14} /> Encrypted
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.05))' }}>
            <CheckCircle2 size={54} style={{ color: 'var(--status-success, #22C55E)', margin: '0 auto 14px' }} />
            <h2 style={{ margin: '0 0 6px', color: 'var(--status-success, #22C55E)', fontSize: '24px' }}>Payment Approved! 📱</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--text-main, #0F172A)', fontSize: '15px' }}>
              ${order.total_amount.toFixed(2)} paid via PayPal. The cashier register has received verification!
            </p>
            <div style={{ display: 'inline-block', padding: '8px 16px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--border-color, #E2E8F0)', fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>
              Receipt #{order.order_number}
            </div>
          </div>
        ) : (
          /* Order Bill Card */
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border-color, #E2E8F0)', padding: '32px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.05))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #E2E8F0)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)', fontWeight: 700 }}>ORDER TICKET</span>
                <h3 style={{ margin: '2px 0 0', color: 'var(--text-main, #0F172A)', fontSize: '18px' }}>{order.order_number}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)' }}>TOTAL DUE</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--status-success, #22C55E)' }}>
                  ${order.total_amount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4338CA', marginBottom: '8px' }}>Items Summary</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {order.items?.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border-color, #F1F5F9)' }}>
                    <span>{it.name} × {it.quantity}</span>
                    <strong style={{ color: 'var(--text-main, #0F172A)' }}>${it.total.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePayViaPayPal}
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
              {processing ? 'Authorizing PayPal...' : `Pay $${order.total_amount.toFixed(2)} with PayPal`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

