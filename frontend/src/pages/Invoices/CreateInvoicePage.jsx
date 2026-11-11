import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, AlertCircle, Save, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function CreateInvoicePage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('Thank you for your business. Please remit payment by the due date.');
  const [terms, setTerms] = useState('Payment due within 14 days of invoice date.');

  const [items, setItems] = useState([
    { description: 'Web Development & Design Consulting', quantity: 1, unit_price: 500.0 },
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await api.get('/api/clients');
        setClients(data.clients || []);
        if (data.clients && data.clients.length > 0) {
          setClientId(data.clients[0].id);
          setCurrency(data.clients[0].preferred_currency || 'USD');
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadClients();
  }, []);

  const handleClientChange = (id) => {
    setClientId(id);
    const selected = clients.find((c) => String(c.id) === String(id));
    if (selected && selected.preferred_currency) {
      setCurrency(selected.preferred_currency);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Decimal-safe line item calculation
  const subtotal = items.reduce((acc, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return acc + qty * price;
  }, 0);

  const taxAmount = (subtotal * (parseFloat(taxRate) || 0)) / 100;
  const discount = parseFloat(discountAmount) || 0;
  const totalAmount = Math.max(0, subtotal + taxAmount - discount);

  const handleSubmit = async (e, approve = false) => {
    e.preventDefault();
    setError('');

    if (!clientId) {
      setError('Please select or register a client first.');
      return;
    }

    if (items.some((it) => !it.description.trim() || it.quantity <= 0)) {
      setError('All line items must have a valid description and positive quantity.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: parseInt(clientId, 10),
        currency,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: parseFloat(taxRate) || 0,
        discount_amount: parseFloat(discountAmount) || 0,
        notes,
        terms,
        items: items.map((it) => ({
          description: it.description,
          quantity: parseFloat(it.quantity),
          unit_price: parseFloat(it.unit_price),
        })),
        approve_immediately: approve,
      };

      const result = await api.post('/api/invoices', payload);
      navigate(`/invoices/${result.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="secondary-page" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/invoices')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary, #9CAAC4)',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={16} /> Back to Invoices
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Create <span>Invoice</span></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
            Multi-currency financial record with decimal calculations.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div style={{ background: 'var(--bg-card, #FFFFFF)', borderRadius: '16px', border: '1px solid var(--border-color, #E2E8F0)', padding: '32px', marginBottom: '24px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          {/* Header Row: Client, Dates, Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Select Client *</label>
              {clients.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#E11D48' }}>
                  No clients registered.{' '}
                  <span onClick={() => navigate('/clients')} style={{ color: 'var(--primary-color, #4F46E5)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Add client first
                  </span>
                </div>
              ) : (
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Issue Date</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main, #0F172A)', marginBottom: '12px' }}>Line Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((item, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 2fr 2fr auto', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    required
                    placeholder="Item / service description..."
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="Rate"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                  />
                  <div style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-main, #0F172A)', fontSize: '14px' }}>
                    {currency} {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                    style={{ background: 'none', border: 'none', color: items.length === 1 ? 'var(--text-muted, #94A3B8)' : '#E11D48', cursor: items.length === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              style={{
                marginTop: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-main, #0F172A)',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>

          {/* Calculations Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '24px' }}>
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Payment Terms</label>
                <input
                  type="text"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>Client Notes</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '13px', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary, #F8FAFC)', padding: '22px', borderRadius: '14px', border: '1px solid var(--border-color, #E2E8F0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
                <span>Subtotal:</span>
                <strong style={{ color: 'var(--text-main, #0F172A)' }}>{currency} {subtotal.toFixed(2)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
                <span>Tax Rate (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', textAlign: 'right', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
                <span>Discount ({currency}):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', textAlign: 'right', fontSize: '13px' }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', color: 'var(--text-main, #0F172A)' }}>
                <strong>Total Amount:</strong>
                <strong style={{ color: 'var(--status-success, #10B981)', fontSize: '20px' }}>{currency} {totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-secondary, #475569)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #CBD5E1)',
              background: '#FFFFFF',
              color: 'var(--text-main, #0F172A)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <Save size={16} /> Save as Draft
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={(e) => handleSubmit(e, true)}
            className="primary-button"
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle size={16} /> Create & Approve
          </button>
        </div>
      </form>
    </div>
  );
}

