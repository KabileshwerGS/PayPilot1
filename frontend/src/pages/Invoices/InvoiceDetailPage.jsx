import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  CreditCard,
  AlertCircle,
  Clock,
  MessageCircle,
} from 'lucide-react';
import api from '../../services/api';
import { getInvoiceShareUrl } from '../../utils/invoiceUrl';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/invoices/${id}`);
      setInvoice(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/invoices/${id}/approve`);
      setMessage('Invoice approved successfully.');
      fetchInvoice();
    } catch (err) {
      alert('Error approving invoice: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/invoices/${id}/send`);
      setMessage('Invoice marked as Sent and notification recorded.');
      fetchInvoice();
    } catch (err) {
      alert('Error sending invoice: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      setActionLoading(true);
      try {
        await api.post(`/api/invoices/${id}/cancel`);
        setMessage('Invoice cancelled.');
        fetchInvoice();
      } catch (err) {
        alert('Error cancelling invoice: ' + err.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.download(`/api/invoices/${id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Could not download PDF: ' + err.message);
    }
  };

  const checkoutUrl = invoice ? getInvoiceShareUrl(invoice.invoice_number) : '';

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!invoice) return;
    const greeting = invoice.client_name ? `Hi ${invoice.client_name},\n` : 'Hello,\n';
    const text = `${greeting}Here is your invoice *${invoice.invoice_number}* for *${invoice.currency} ${parseFloat(invoice.total_amount).toFixed(2)}* from ${invoice.business_name || 'PayPilot'}.\n\nYou can view and pay it securely online here:\n${checkoutUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="secondary-page" style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-secondary, #9CAAC4)' }}>Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="secondary-page">
        <p style={{ color: 'var(--neon-pink, #FF3D9A)' }}>Invoice not found.</p>
        <button className="primary-button" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </button>
      </div>
    );
  }

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

      {message && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* Top Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0 }}>{invoice.invoice_number}</h1>
            <span className={`badge badge-${invoice.status.toLowerCase()}`}>
              {invoice.status}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
            Issued to <strong>{invoice.client_name}</strong> on {invoice.issue_date}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadPdf}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0F172A)', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Download size={15} /> Download PDF
          </button>

          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="primary-button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px' }}
            >
              <CheckCircle size={15} /> Approve
            </button>
          )}

          {(invoice.status === 'APPROVED' || invoice.status === 'DRAFT') && (
            <button
              onClick={handleSend}
              disabled={actionLoading}
              className="primary-button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px' }}
            >
              <Send size={15} /> Send Invoice
            </button>
          )}

          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: '1px solid #FECDD3', background: '#FFF1F2', fontSize: '13px', fontWeight: 600, color: '#E11D48', cursor: 'pointer' }}
            >
              <XCircle size={15} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Payment Link Card for Approved / Sent Invoices */}
      {invoice.status !== 'CANCELLED' && (
        <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', padding: '18px 22px', borderRadius: '14px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.05))' }}>
          <div>
            <strong style={{ color: 'var(--primary-color, #4F46E5)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={16} /> Client Payment & PayPal Checkout Link
            </strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #475569)', fontSize: '13px' }}>
              Share this link with your client to settle securely via PayPal or Credit Card.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={copyPaymentLink}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <Copy size={14} /> {copied ? 'Copied Link!' : 'Copy Link'}
            </button>
            <button
              onClick={shareWhatsApp}
              className="btn-whatsapp"
            >
              <MessageCircle size={15} /> Share on WhatsApp
            </button>
            <button
              onClick={() => window.open(`/pay/${invoice.invoice_number}`, '_blank')}
              className="primary-button"
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={14} /> Open Checkout
            </button>
          </div>
        </div>
      )}

      {/* Invoice Document Body */}
      <div style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid var(--border-color, #E2E8F0)', padding: '40px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.05))' }}>
        {/* Top Company & Client Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, #E2E8F0)', paddingBottom: '28px', marginBottom: '28px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', fontWeight: 700, letterSpacing: '1px' }}>BILLED TO</span>
            <h3 style={{ margin: '8px 0 4px', fontSize: '18px', color: 'var(--text-main, #0F172A)' }}>{invoice.client_name}</h3>
            {invoice.client_company && <p style={{ margin: '0 0 2px', color: 'var(--text-secondary, #475569)', fontSize: '14px' }}>{invoice.client_company}</p>}
            <p style={{ margin: '0 0 2px', color: 'var(--text-secondary, #475569)', fontSize: '14px' }}>{invoice.client_email}</p>
            {invoice.client_address && <p style={{ margin: 0, color: 'var(--text-secondary, #475569)', fontSize: '13px' }}>{invoice.client_address}</p>}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>Issue Date: </span>
              <strong style={{ fontSize: '13px', color: 'var(--text-main, #0F172A)' }}>{invoice.issue_date}</strong>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>Due Date: </span>
              <strong style={{ fontSize: '13px', color: '#E11D48' }}>{invoice.due_date}</strong>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div style={{ marginBottom: '32px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items &&
                invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.description}</strong></td>
                    <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>
                      {invoice.currency} {parseFloat(item.unit_price).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{invoice.currency} {parseFloat(item.total).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
          <div style={{ width: '320px', background: 'var(--bg-secondary, #F8FAFC)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
              <span>Subtotal:</span>
              <strong style={{ color: 'var(--text-main, #0F172A)' }}>{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</strong>
            </div>
            {parseFloat(invoice.tax_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
                <span>Tax ({invoice.tax_rate}%):</span>
                <strong style={{ color: 'var(--text-main, #0F172A)' }}>{invoice.currency} {parseFloat(invoice.tax_amount).toFixed(2)}</strong>
              </div>
            )}
            {parseFloat(invoice.discount_amount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>
                <span>Discount:</span>
                <strong style={{ color: '#E11D48' }}>-{invoice.currency} {parseFloat(invoice.discount_amount).toFixed(2)}</strong>
              </div>
            )}
            <div style={{ borderTop: '2px solid var(--border-color, #E2E8F0)', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: 'var(--text-main, #0F172A)' }}>
              <strong>Total Due:</strong>
              <strong style={{ color: 'var(--status-success, #22C55E)' }}>{invoice.currency} {parseFloat(invoice.total_amount).toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>
          <div>
            <strong style={{ color: 'var(--text-main, #0F172A)', display: 'block', marginBottom: '4px' }}>Terms & Conditions</strong>
            <p style={{ margin: 0 }}>{invoice.terms || 'Payment due as specified.'}</p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-main, #0F172A)', display: 'block', marginBottom: '4px' }}>Additional Notes</strong>
            <p style={{ margin: 0 }}>{invoice.notes || 'Thank you for your business.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

