import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Filter, Download, ExternalLink, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/invoices';
      if (statusFilter !== 'ALL') {
        endpoint += `?status=${statusFilter}`;
      }
      const data = await api.get(endpoint);
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleDownloadPdf = async (id, invNum) => {
    try {
      const blob = await api.download(`/api/invoices/${id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Could not download PDF: ' + err.message);
    }
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.client_name && inv.client_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="secondary-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0 }}>Invoice <span>Center</span></h1>
            <span className="sol-badge freelancer">
              Solution 1: Freelancers
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
            Issue smart multi-currency invoices with verified decimal arithmetic, WhatsApp share, and PayPal links.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => navigate('/invoices/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-freelancer-gradient)', boxShadow: '0 4px 18px rgba(59, 130, 246, 0.45)' }}
        >
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: 'var(--bg-card, #FFFFFF)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary, #64748B)' }} />
          <input
            type="text"
            placeholder="Search by invoice # or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'DRAFT', 'APPROVED', 'SENT', 'PAID', 'OVERDUE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '7px 16px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: statusFilter === status ? '#4F46E5' : 'var(--border-color, #CBD5E1)',
                background: statusFilter === status ? 'var(--primary-gradient)' : '#FFFFFF',
                color: statusFilter === status ? '#fff' : 'var(--text-secondary, #475569)',
                boxShadow: statusFilter === status ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={24} />
            </div>
            <h3>No invoices found</h3>
            <p>
              {statusFilter !== 'ALL'
                ? `No invoices currently marked as ${statusFilter}.`
                : 'Create your first invoice with line items, tax, and automated PayPal checkout links.'}
            </p>
            <button className="primary-button" onClick={() => navigate('/invoices/new')} style={{ fontSize: '13px', padding: '8px 16px' }}>
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Client</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <strong className="invoice-id">{inv.invoice_number}</strong>
                    </td>
                    <td>{inv.client_name || 'Client'}</td>
                    <td>{inv.issue_date}</td>
                    <td>{inv.due_date}</td>
                    <td>
                      <strong className="amount">
                        {inv.currency} {parseFloat(inv.total_amount).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge badge-${inv.status.toLowerCase()}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #9CAAC4)', cursor: 'pointer', padding: '4px' }}
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/pay/${inv.invoice_number}`)}
                          style={{ background: 'none', border: 'none', color: 'var(--cyan-accent, #38BDF8)', cursor: 'pointer', padding: '4px' }}
                          title="Open Checkout Link"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          style={{ background: 'none', border: 'none', color: 'var(--bright-blue, #3B82F6)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', padding: '4px 8px' }}
                        >
                          View
                        </button>
                      </div>
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

