import React, { useState, useEffect } from 'react';
import { ShoppingCart, QrCode, Banknote, CreditCard, Plus, Minus, Trash2, CheckCircle2, RotateCcw, Search, Sparkles, ExternalLink } from 'lucide-react';
import api from '../../services/api';

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Tender state
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH or PAYPAL_QR
  const [cashTendered, setCashTendered] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeQROrder, setActiveQROrder] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/pos/products');
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.product_id === product.id);
      if (existing) {
        return prev.map((it) => (it.product_id === product.id ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [...prev, { product_id: product.id, name: product.name, sku: product.sku, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((it) => (it.product_id === productId ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setCashTendered('');
    setActiveQROrder(null);
    setCompletedOrder(null);
  };

  const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const taxRate = 8.25; // standard retail tax
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;
  const cashNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashNum - totalAmount);

  // Poll for QR payment capture
  useEffect(() => {
    if (!activeQROrder) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/public/pos/orders/${activeQROrder.order_number}`);
        if (res.payment_status === 'COMPLETED') {
          setCompletedOrder({ ...activeQROrder, payment_status: 'COMPLETED' });
          setActiveQROrder(null);
          setCart([]);
          clearInterval(interval);
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeQROrder]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const order = await api.post('/api/pos/checkout', {
        items: cart,
        payment_method: paymentMethod,
        tax_rate: taxRate,
        cash_tendered: paymentMethod === 'CASH' ? cashNum : null,
      });

      if (paymentMethod === 'PAYPAL_QR') {
        setActiveQROrder(order);
      } else {
        setCompletedOrder(order);
        setCart([]);
        setCashTendered('');
      }
    } catch (err) {
      alert('Checkout error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const categories = ['All', ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const customerQRUrl = activeQROrder ? `${window.location.origin}/pos/pay/${activeQROrder.order_number}` : '';
  const qrImageSrc = activeQROrder
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(customerQRUrl)}`
    : '';

  return (
    <div className="secondary-page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0 }}>Point-of-Sale Register</h1>
            <span className="sol-badge pos">
              Solution 4: Merchants
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
            High-speed in-store checkout terminal with cash change calculator and dynamic PayPal QR code payments.
          </p>
        </div>

        <button
          onClick={clearCart}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-muted)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
        >
          <RotateCcw size={14} /> Reset Register
        </button>
      </div>

      {/* Main POS Interface: Split 65% Catalog / 35% Register */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.1fr', gap: '24px' }}>
        {/* Left: Product Keypad Catalog */}
        <div>
          {/* Search & Category Filter Pills */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Scan barcode or type SKU / item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: selectedCategory === cat ? '1px solid #059669' : '1px solid #CBD5E1',
                  background: selectedCategory === cat ? 'var(--color-pos-gradient)' : '#FFFFFF',
                  boxShadow: selectedCategory === cat ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none',
                  color: selectedCategory === cat ? '#fff' : 'var(--text-secondary, #475569)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-muted, #E2E8F0)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, border-color 0.15s',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <span style={{ fontSize: '11px', color: 'var(--aurora-cyan)', fontWeight: 600 }}>{p.sku}</span>
                <h4 style={{ margin: '4px 0 8px', fontSize: '14px', color: 'var(--text-main)', minHeight: '34px', lineHeight: 1.3 }}>
                  {p.name}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--status-success)' }}>${parseFloat(p.price).toFixed(2)}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.stock_quantity} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cash Register & Tender Drawer */}
        <div style={{ background: '#FFFFFF', border: '1px solid var(--border-muted, #E2E8F0)', boxShadow: 'var(--shadow-card)', padding: '24px', borderRadius: '18px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-muted, #E2E8F0)', paddingBottom: '14px', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={17} style={{ color: 'var(--bright-violet)' }} /> Current Sale ({cart.reduce((s, it) => s + it.quantity, 0)} items)
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '12px' }}>
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {cart.length > 0 ? (
              cart.map((it) => (
                <div key={it.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-muted, #E2E8F0)' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>${it.price.toFixed(2)} each</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => updateQuantity(it.product_id, -1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>{it.quantity}</span>
                    <button onClick={() => updateQuantity(it.product_id, 1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                      <Plus size={12} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-success)', minWidth: '55px', textAlign: 'right' }}>
                      ${(it.price * it.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>
                Tap items on the left to add to register
              </p>
            )}
          </div>

          {/* Pricing Totals */}
          <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid var(--border-muted, #E2E8F0)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <span>Tax (8.25%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 800, borderTop: '1px solid var(--border-muted, #E2E8F0)', paddingTop: '8px', color: 'var(--text-main)' }}>
              <span>Total Due</span>
              <span style={{ color: 'var(--status-success)' }}>${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: paymentMethod === 'CASH' ? '2px solid #059669' : '1px solid #CBD5E1',
                background: paymentMethod === 'CASH' ? 'rgba(5, 150, 105, 0.10)' : '#FFFFFF',
                color: paymentMethod === 'CASH' ? '#059669' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Banknote size={16} /> Cash Tender
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('PAYPAL_QR')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: paymentMethod === 'PAYPAL_QR' ? '2px solid #6366F1' : '1px solid #CBD5E1',
                background: paymentMethod === 'PAYPAL_QR' ? 'rgba(99, 102, 241, 0.10)' : '#FFFFFF',
                color: paymentMethod === 'PAYPAL_QR' ? '#4338CA' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <QrCode size={16} /> PayPal QR
            </button>
          </div>

          {/* Cash Tender Input & Change Due */}
          {paymentMethod === 'CASH' && (
            <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #CBD5E1' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Cash Tendered ($)</label>
              <input
                type="number"
                step="1"
                placeholder={totalAmount.toFixed(2)}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                style={{ fontSize: '18px', fontWeight: 700, padding: '10px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-muted, #E2E8F0)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Change Due:</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: changeDue > 0 ? '#059669' : 'var(--text-muted)' }}>
                  ${changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Dynamic QR Payment Display */}
          {activeQROrder && (
            <div style={{ textAlign: 'center', padding: '16px', borderRadius: '12px', background: '#fff', color: '#0A0618', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca' }}>SCAN WITH PHONE TO PAY VIA PAYPAL</span>
              <div style={{ margin: '8px auto', display: 'grid', placeItems: 'center' }}>
                <img src={qrImageSrc} alt="Customer QR Code" style={{ width: '180px', height: '180px', borderRadius: '8px' }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>${activeQROrder.total_amount.toFixed(2)} Due</div>
              <small style={{ color: '#64748b', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                Order #{activeQROrder.order_number} • Waiting for customer scan...
              </small>
              <div style={{ marginTop: '8px' }}>
                <a href={customerQRUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Open Mobile Pay Link <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Completed Receipt State */}
          {completedOrder && (
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '14px' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--status-success)', margin: '0 auto 6px' }} />
              <strong style={{ display: 'block', color: 'var(--status-success)', fontSize: '15px' }}>Sale Completed! Receipt Ready</strong>
              <small style={{ color: 'var(--text-secondary)' }}>Order #{completedOrder.order_number} • {completedOrder.payment_method}</small>
            </div>
          )}

          {/* Complete Checkout Button */}
          {!activeQROrder && (
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing}
              className="primary-button"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CreditCard size={18} />
              {processing ? 'Processing...' : paymentMethod === 'PAYPAL_QR' ? `Generate PayPal QR ($${totalAmount.toFixed(2)})` : `Complete Cash Sale ($${totalAmount.toFixed(2)})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

