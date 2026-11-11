import React, { useState, useEffect } from 'react';
import { ShoppingBag, Users, Split, DollarSign, Download, Plus, CheckCircle2, AlertCircle, ExternalLink, Percent, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

export default function MarketplacePage() {
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Modals
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [vendorForm, setVendorForm] = useState({
    vendor_name: '',
    contact_email: '',
    phone: '',
    paypal_email: '',
    store_name: '',
    commission_rate_pct: '10.0',
  });

  const [productForm, setProductForm] = useState({
    vendor_id: '',
    name: '',
    description: '',
    price: '',
    currency: 'USD',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vData, oData, pData] = await Promise.all([
        api.get('/api/marketplace/vendors'),
        api.get('/api/marketplace/orders'),
        api.get('/api/marketplace/products'),
      ]);
      setVendors(vData || []);
      setOrders(oData || []);
      setProducts(pData || []);
      if (vData && vData.length > 0 && !productForm.vendor_id) {
        setProductForm(f => ({ ...f, vendor_id: vData[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load marketplace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/api/marketplace/vendors', {
        ...vendorForm,
        commission_rate_pct: parseFloat(vendorForm.commission_rate_pct),
      });
      setShowVendorModal(false);
      setVendorForm({ vendor_name: '', contact_email: '', phone: '', paypal_email: '', store_name: '', commission_rate_pct: '10.0' });
      setMessage('New vendor registered and active in the marketplace!');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/marketplace/products', {
        ...productForm,
        vendor_id: parseInt(productForm.vendor_id),
        price: parseFloat(productForm.price),
      });
      setShowProductModal(false);
      setProductForm({ vendor_id: vendors[0]?.id || '', name: '', description: '', price: '', currency: 'USD' });
      setMessage('Product added to vendor store catalog!');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to add product.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPayPalCSV = async () => {
    try {
      const blob = await api.download('/api/marketplace/payouts/export-paypal-csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PayPal_Mass_Payout_Batch_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not export CSV: ' + err.message);
    }
  };

  const totalGMV = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalCommission = orders.reduce((sum, o) => sum + parseFloat(o.platform_commission || 0), 0);
  const totalVendorShare = orders.reduce((sum, o) => sum + parseFloat(o.vendor_total || 0), 0);

  if (loading) {
    return (
      <div className="secondary-page" style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Marketplace Engine...</p>
      </div>
    );
  }

  return (
    <div className="secondary-page" style={{ maxWidth: '1150px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0 }}>Marketplace & Split Payments</h1>
            <span className="sol-badge marketplace">
              Solution 3: Marketplaces
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
            Vendor onboarding, platform commissions, split checkouts, and PayPal Mass Payout batch settlement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open('/store', '_blank')}
            className="primary-button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px', background: 'var(--color-marketplace-gradient)', boxShadow: '0 4px 18px rgba(139, 92, 246, 0.45)' }}
          >
            <ExternalLink size={15} /> Open Multi-Vendor Store
          </button>
          <button
            onClick={handleExportPayPalCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}
          >
            <Download size={15} /> Export PayPal Payout CSV
          </button>
          <button
            onClick={() => setShowVendorModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.3)', background: 'rgba(124, 58, 237, 0.08)', color: 'var(--color-marketplace, #7C3AED)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={15} /> Add Vendor
          </button>
        </div>
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

      {/* KPI Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
        <div className="stat-card card-freelancer">
          <span className="stat-label">Gross Marketplace Volume</span>
          <div className="stat-value" style={{ color: 'var(--text-main)' }}>
            ${totalGMV.toFixed(2)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{orders.length} orders processed</span>
        </div>

        <div className="stat-card card-revenue">
          <span className="stat-label">Platform Commissions Earned</span>
          <div className="stat-value" style={{ color: 'var(--status-success)' }}>
            ${totalCommission.toFixed(2)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--status-success)' }}>● Net platform profit cut</span>
        </div>

        <div className="stat-card card-marketplace">
          <span className="stat-label">Vendor Net Payable</span>
          <div className="stat-value" style={{ color: 'var(--color-marketplace-light)' }}>
            ${totalVendorShare.toFixed(2)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Split to sellers via PayPal</span>
        </div>

        <div className="stat-card card-clients">
          <span className="stat-label">Onboarded Vendors</span>
          <div className="stat-value" style={{ color: 'var(--aurora-cyan)' }}>
            {vendors.length}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{products.length} listed products</span>
        </div>
      </div>

      {/* Vendors Roster */}
      <div style={{ background: 'var(--card-gradient)', backdropFilter: 'blur(18px)', border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '16px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} style={{ color: 'var(--aurora-cyan)' }} /> Seller / Vendor Directory
          </h3>
          <button
            onClick={() => setShowProductModal(true)}
            disabled={vendors.length === 0}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-muted)', background: 'var(--bg-elevated)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={14} /> Add Vendor Product
          </button>
        </div>

        {vendors.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Store / Vendor</th>
                <th>PayPal Account</th>
                <th>Commission Cut</th>
                <th style={{ textAlign: 'right' }}>Total Sales</th>
                <th style={{ textAlign: 'right' }}>Platform Cut</th>
                <th style={{ textAlign: 'right' }}>Pending Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.store_name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{v.vendor_name} ({v.contact_email})</div>
                  </td>
                  <td><code style={{ color: 'var(--aurora-cyan)' }}>{v.paypal_email}</code></td>
                  <td><span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: 'var(--lavender)' }}>{v.commission_rate_pct}%</span></td>
                  <td style={{ textAlign: 'right' }}>${parseFloat(v.total_sales).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>${parseFloat(v.total_commission_paid).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: v.pending_payout > 0 ? 'var(--neon-pink)' : 'var(--text-secondary)' }}>
                    ${parseFloat(v.pending_payout).toFixed(2)}
                  </td>
                  <td>
                    <span className="badge badge-paid">{v.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
            No vendors registered yet. Click "Add Vendor" to start your multi-vendor marketplace!
          </p>
        )}
      </div>

      {/* Orders & Automatic Split Ledger */}
      <div style={{ background: 'var(--card-gradient)', backdropFilter: 'blur(18px)', border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Split size={16} style={{ color: 'var(--bright-violet)' }} /> Recent Orders & Split Settlements
        </h3>

        {orders.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Buyer</th>
                <th>Items & Vendor Splits</th>
                <th style={{ textAlign: 'right' }}>Gross Total</th>
                <th style={{ textAlign: 'right' }}>Platform Fee</th>
                <th style={{ textAlign: 'right' }}>Sellers Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.order_number}</strong></td>
                  <td>
                    {o.buyer_name}
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{o.buyer_email}</div>
                  </td>
                  <td>
                    {o.items?.map((it, idx) => (
                      <div key={idx} style={{ fontSize: '12px' }}>
                        {it.item_name} × {it.quantity} (<span style={{ color: 'var(--aurora-cyan)' }}>{it.store_name}</span>)
                      </div>
                    ))}
                  </td>
                  <td style={{ textAlign: 'right' }}><strong>${parseFloat(o.total_amount).toFixed(2)}</strong></td>
                  <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>+${parseFloat(o.platform_commission).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--bright-violet)' }}>${parseFloat(o.vendor_total).toFixed(2)}</td>
                  <td><span className="badge badge-paid">SPLIT PAID</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
            No marketplace orders yet. Open the Multi-Vendor Store to simulate a split purchase!
          </p>
        )}
      </div>

      {/* Modal: Add Vendor */}
      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>Onboard Marketplace Vendor</h3>
            <form onSubmit={handleCreateVendor} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vintage Audio Gear"
                  value={vendorForm.store_name}
                  onChange={(e) => setVendorForm({ ...vendorForm, store_name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Vendor Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus Stone"
                    value={vendorForm.vendor_name}
                    onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Platform Commission (%) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    required
                    placeholder="10.0"
                    value={vendorForm.commission_rate_pct}
                    onChange={(e) => setVendorForm({ ...vendorForm, commission_rate_pct: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Vendor PayPal Email (For Payouts) *</label>
                <input
                  type="email"
                  required
                  placeholder="marcus@vintageseller.com"
                  value={vendorForm.paypal_email}
                  onChange={(e) => setVendorForm({ ...vendorForm, paypal_email: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Contact Email *</label>
                <input
                  type="email"
                  required
                  placeholder="contact@vintageseller.com"
                  value={vendorForm.contact_email}
                  onChange={(e) => setVendorForm({ ...vendorForm, contact_email: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowVendorModal(false)} style={{ background: 'none', border: '1px solid var(--border-muted)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} className="primary-button" style={{ padding: '8px 18px' }}>
                  {saving ? 'Onboarding...' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>Add Vendor Product</h3>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Vendor *</label>
                <select
                  value={productForm.vendor_id}
                  onChange={(e) => setProductForm({ ...productForm, vendor_id: e.target.value })}
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.store_name} ({v.vendor_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Studio Monitor Headphones"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Price (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="149.00"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Product specs and vendor fulfillment notes..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ background: 'none', border: '1px solid var(--border-muted)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} className="primary-button" style={{ padding: '8px 18px' }}>
                  {saving ? 'Adding...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

