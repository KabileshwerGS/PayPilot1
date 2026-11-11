import React, { useState, useEffect } from 'react';
import { ShoppingBag, Split, ShieldCheck, CheckCircle2, AlertCircle, CreditCard, ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export default function PublicStorePage() {
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [error, setError] = useState('');

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/public/marketplace/store');
      setCatalog(data.catalog || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load store catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.product_id === product.id);
      if (existing) {
        return prev.map((it) => (it.product_id === product.id ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, store_name: product.store_name, commission_rate_pct: product.commission_rate_pct, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((it) => it.product_id !== productId));
  };

  const totalGross = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const estimatedCommission = cart.reduce((sum, it) => sum + (it.price * it.quantity * (it.commission_rate_pct / 100)), 0);
  const estimatedVendorNet = totalGross - estimatedCommission;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setCheckingOut(true);
    setError('');
    try {
      const res = await api.post('/api/public/marketplace/checkout', {
        buyer_name: buyerName || 'Alex Customer',
        buyer_email: buyerEmail || 'alex.customer@example.com',
        items: cart.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
      });
      setCompletedOrder(res);
      setCart([]);
    } catch (err) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main, #F8FAFC)' }}>
        <p style={{ color: 'var(--text-secondary, #475569)' }}>Loading Marketplace Storefront...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #F8FAFC)', color: 'var(--text-main, #0F172A)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '20px', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}>
              P
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main, #0F172A)' }}>PayPilot Marketplace</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>Multi-Vendor Store with Automated Split Checkout</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '6px 14px', borderRadius: '9999px', fontWeight: 600 }}>
              <ShieldCheck size={16} /> Automated Multi-Party Split
            </div>
          </div>
        </div>

        {/* Order Completed Success */}
        {completedOrder && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '18px', padding: '36px', textAlign: 'center', marginBottom: '28px' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--status-success, #22C55E)', margin: '0 auto 12px' }} />
            <h2 style={{ margin: '0 0 6px', color: 'var(--status-success, #22C55E)' }}>Payment Captured & Split Automatically! 🛒</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-main, #0F172A)', fontSize: '15px' }}>
              Order <strong>{completedOrder.order_number}</strong> for ${completedOrder.total_amount.toFixed(2)} completed.
            </p>

            <div style={{ display: 'inline-flex', gap: '20px', padding: '16px 24px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)', marginBottom: '20px', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)' }}>PLATFORM COMMISSION (10%)</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-success, #10B981)' }}>
                  +${completedOrder.platform_commission.toFixed(2)}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color, #E2E8F0)', paddingLeft: '20px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)' }}>SELLERS NET PAYABLE</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#4338CA' }}>
                  ${completedOrder.vendor_share.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={() => setCompletedOrder(null)}
                className="primary-button"
                style={{ padding: '9px 24px', fontSize: '13px' }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {/* Main Storefront & Cart Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
          {/* Products Grid */}
          <div>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} style={{ color: '#4F46E5' }} /> Available Vendor Products
            </h3>

            {catalog.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {catalog.map((p) => (
                  <div key={p.id} style={{ background: '#FFFFFF', border: '1px solid var(--border-color, #E2E8F0)', padding: '20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span className="badge" style={{ background: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', fontSize: '11px' }}>
                          {p.store_name}
                        </span>
                        <strong style={{ fontSize: '18px', color: 'var(--status-success, #10B981)' }}>${p.price.toFixed(2)}</strong>
                      </div>
                      <h4 style={{ margin: '4px 0 6px', fontSize: '16px', color: 'var(--text-main, #0F172A)' }}>{p.name}</h4>
                      {p.description && <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>{p.description}</p>}
                    </div>

                    <button
                      onClick={() => addToCart(p)}
                      className="primary-button"
                      style={{ width: '100%', padding: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <ShoppingCart size={15} /> Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color, #E2E8F0)' }}>
                <p style={{ color: 'var(--text-secondary, #475569)' }}>No vendor products added yet. Add products from the Marketplace Dashboard!</p>
              </div>
            )}
          </div>

          {/* Cart & Split Checkout Panel */}
          <div>
            <div style={{ background: '#FFFFFF', border: '1px solid var(--border-color, #E2E8F0)', padding: '24px', borderRadius: '16px', position: 'sticky', top: '20px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '17px', color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} style={{ color: '#0284C7' }} /> Cart & Split Preview ({cart.length})
              </h3>

              {cart.length > 0 ? (
                <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {cart.map((it) => (
                      <div key={it.product_id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary, #F8FAFC)', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--text-main, #0F172A)' }}>{it.name}</strong>
                          <div style={{ fontSize: '11px', color: '#0284C7' }}>{it.store_name} × {it.quantity}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--status-success, #10B981)' }}>${(it.price * it.quantity).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(it.product_id)}
                            style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Split Summary Box */}
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-secondary, #F8FAFC)', border: '1px solid var(--border-color, #E2E8F0)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary, #475569)' }}>Gross Total:</span>
                      <strong style={{ color: 'var(--text-main, #0F172A)' }}>${totalGross.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#0284C7' }}>Platform Fee (10%):</span>
                      <span style={{ color: 'var(--status-success, #10B981)', fontWeight: 600 }}>+${estimatedCommission.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '6px' }}>
                      <span style={{ color: '#4338CA' }}>Sellers Payout:</span>
                      <span style={{ color: '#4338CA', fontWeight: 600 }}>${estimatedVendorNet.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Buyer details */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Buyer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Smith"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Buyer Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="jordan@example.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={checkingOut}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: '#ffc439',
                      color: '#003087',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '6px',
                    }}
                  >
                    <CreditCard size={17} />
                    {checkingOut ? 'Splitting...' : `Pay $${totalGross.toFixed(2)} with PayPal`}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                  <ShoppingCart size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Your cart is empty. Add products from independent vendors to test the split checkout!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

