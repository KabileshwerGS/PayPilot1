import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Download, CheckCircle, Clock, AlertTriangle, ExternalLink, Filter, Sparkles } from 'lucide-react';
import api from '../../services/api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/payments');
      setPayments(data.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const sources = [
    { key: 'ALL', label: 'All Sources' },
    { key: 'Freelancer Invoice', label: 'Freelancer Invoices' },
    { key: 'Creator Tip', label: 'Creator Tips' },
    { key: 'Creator Membership', label: 'Creator Memberships' },
    { key: 'Marketplace Order', label: 'Marketplace Orders' },
    { key: 'POS Transaction', label: 'POS Sales' },
  ];

  const filtered = payments.filter((p) => {
    const matchesSource = sourceFilter === 'ALL' || (p.payment_source && p.payment_source.toLowerCase().includes(sourceFilter.toLowerCase()));
    const term = search.toLowerCase();
    const matchesSearch =
      p.transaction_id.toLowerCase().includes(term) ||
      (p.payment_source && p.payment_source.toLowerCase().includes(term)) ||
      (p.customer && p.customer.toLowerCase().includes(term)) ||
      (p.client_name && p.client_name.toLowerCase().includes(term)) ||
      (p.invoice_number && p.invoice_number.toLowerCase().includes(term)) ||
      (p.provider && p.provider.toLowerCase().includes(term));
    return matchesSource && matchesSearch;
  });

  const getSourceBadgeStyle = (source) => {
    if (source === 'Creator Tip' || source === 'Creator Membership') {
      return { background: '#FDF2F8', color: '#DB2777', border: '1px solid #FBCFE8' };
    }
    if (source === 'Marketplace Order') {
      return { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' };
    }
    if (source === 'POS Transaction') {
      return { background: '#ECFEFF', color: '#0891B2', border: '1px solid #A5F3FC' };
    }
    return { background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' };
  };

  return (
    <div className="secondary-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Unified Payment <span>Ledger</span></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #475569)', fontSize: '14px' }}>
            Consolidated transaction history across Freelancers, Creators, Marketplace, and POS.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ background: 'var(--bg-card, #FFFFFF)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color, #E2E8F0)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {sources.map((s) => (
            <button
              key={s.key}
              onClick={() => setSourceFilter(s.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: sourceFilter === s.key ? '1px solid #4F46E5' : '1px solid var(--border-color, #CBD5E1)',
                background: sourceFilter === s.key ? 'var(--primary-gradient)' : '#FFFFFF',
                color: sourceFilter === s.key ? '#fff' : 'var(--text-secondary, #475569)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary, #64748B)' }} />
          <input
            type="text"
            placeholder="Search by transaction ID, customer, payment source, or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
          />
        </div>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CreditCard size={24} />
            </div>
            <h3>No payments found</h3>
            <p>Transactions will appear automatically as clients settle invoices, fans tip, buyers purchase on the marketplace, or POS sales complete.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Payment Source</th>
                  <th>Customer</th>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Provider</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: '12px', background: '#EEF2FF', color: '#4338CA', padding: '3px 8px', borderRadius: '6px', border: '1px solid #C7D2FE', fontWeight: 600 }}>{p.transaction_id}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, ...getSourceBadgeStyle(p.payment_source) }}>
                        {p.payment_source || 'Freelancer Invoice'}
                      </span>
                    </td>
                    <td>
                      <strong>{p.customer || p.client_name || 'Customer'}</strong>
                      {p.invoice_number && <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>Ref: {p.invoice_number}</div>}
                    </td>
                    <td>{p.payment_date}</td>
                    <td>
                      <strong style={{ color: 'var(--status-success, #10B981)' }}>
                        {p.currency} {parseFloat(p.amount).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className="badge badge-draft">{p.provider}</span>
                    </td>
                    <td>
                      <span className="badge badge-paid">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

