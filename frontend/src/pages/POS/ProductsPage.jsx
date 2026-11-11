import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Tag, AlertCircle, CheckCircle2, DollarSign, Layers } from 'lucide-react';
import api from '../../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: 'Retail',
    price: '',
    cost_price: '',
    stock_quantity: '100',
    barcode: '',
    description: '',
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/pos/products');
      setProducts(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.post('/api/pos/products', {
        ...form,
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price || '0.0'),
        stock_quantity: parseInt(form.stock_quantity || '100'),
      });
      setShowModal(false);
      setForm({ sku: '', name: '', category: 'Retail', price: '', cost_price: '', stock_quantity: '100', barcode: '', description: '' });
      setMessage('Product created and available in POS Terminal!');
      loadProducts();
    } catch (err) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="secondary-page" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0 }}>Product Inventory & SKUs</h1>
            <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              Solution 4: Merchants
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
            Manage in-store products, barcodes, stock tracking, and prices for your POS register.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="primary-button"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px' }}
        >
          <Plus size={16} /> Add Product / SKU
        </button>
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

      {/* Search Bar */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
        <input
          type="text"
          placeholder="Search products by SKU, title, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card-gradient)', backdropFilter: 'blur(18px)', border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px 0' }}>Loading catalog...</p>
        ) : filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Title</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Retail Price</th>
                <th style={{ textAlign: 'right' }}>Cost Price</th>
                <th style={{ textAlign: 'right' }}>Stock Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><code>{p.sku}</code></td>
                  <td>
                    <strong>{p.name}</strong>
                    {p.barcode && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Barcode: {p.barcode}</div>}
                  </td>
                  <td><span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: 'var(--lavender)' }}>{p.category}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>
                    ${parseFloat(p.price).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                    ${parseFloat(p.cost_price || 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: p.stock_quantity < 10 ? 'var(--neon-pink)' : 'var(--text-main)' }}>
                      {p.stock_quantity} units
                    </span>
                  </td>
                  <td><span className="badge badge-paid">IN STOCK</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
            No products found. Add products to populate your POS register!
          </p>
        )}
      </div>

      {/* Modal: Add Product */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--text-main)' }}>Add In-Store Product SKU</h3>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SKU Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COF-001"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beverages, Apparel"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artisanal Cold Brew Bottle"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Retail Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="5.50"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2.10"
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Stock</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="100"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Barcode / UPC (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 789123456789"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: '1px solid var(--border-muted)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} className="primary-button" style={{ padding: '8px 18px' }}>
                  {saving ? 'Saving...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

