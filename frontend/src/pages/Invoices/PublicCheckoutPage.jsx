import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, CreditCard, Download, Clock } from 'lucide-react';
import api from '../../services/api';

export default function PublicCheckoutPage() {
  const { invoiceNumber } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/public/invoices/${invoiceNumber}`);
      setInvoice(data);
      if (data.status === 'PAID') {
        setPaymentSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Invoice not found or inaccessible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceNumber]);

  // Load PayPal SDK if invoice is unpaid
  useEffect(() => {
    if (!invoice || invoice.status === 'PAID') return;

    const clientId = invoice.paypal_client_id || 'sb';
    const currency = invoice.currency || 'USD';
    const scriptId = 'paypal-jssdk';

    if (document.getElementById(scriptId)) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture`;
    script.async = true;
    script.onload = () => {
      setPaypalLoaded(true);
    };
    script.onerror = () => {
      console.warn('PayPal SDK could not be loaded directly from CDN. Sandbox simulator available.');
    };
    document.body.appendChild(script);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [invoice]);

  const handleSimulatePayment = async () => {
    if (!invoice) return;
    setPaying(true);
    setError('');
    try {
      // 1. Create PayPal Order on backend
      const orderData = await api.post(`/api/payments/paypal/create-order/${invoice.id}`, {});
      
      // 2. Capture PayPal Order on backend (server-side verification)
      const captureData = await api.post(`/api/payments/paypal/capture/${orderData.order_id}`, {
        invoice_id: invoice.id,
      });

      setPaymentSuccess(true);
      fetchInvoice();
    } catch (err) {
      setError(err.message || 'Payment capture failed.');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.download(`/api/public/invoices/${invoice.invoice_number}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not download PDF: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main, #F8FAFC)' }}>
        <p style={{ color: 'var(--text-secondary, #475569)' }}>Loading secure checkout...</p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-main, #F8FAFC)', padding: '20px' }}>
        <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '16px', border: '1px solid var(--border-color, #E2E8F0)', textAlign: 'center', maxWidth: '440px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <AlertCircle size={36} style={{ color: '#E11D48', margin: '0 auto 12px' }} />
          <h2 style={{ margin: '0 0 8px', color: 'var(--text-main, #0F172A)' }}>Invoice Inaccessible</h2>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main, #F8FAFC)', color: 'var(--text-main, #0F172A)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: '20px', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}>
              P
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main, #0F172A)' }}>{invoice.business_name || 'PayPilot Checkout'}</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)' }}>Secure Payment Portal</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0284C7', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '6px 14px', borderRadius: '9999px', fontWeight: 600 }}>
            <ShieldCheck size={16} /> 256-Bit SSL Encrypted
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '18px', border: '1px solid var(--border-color, #E2E8F0)', padding: '36px', marginBottom: '24px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color, #E2E8F0)', paddingBottom: '20px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', fontWeight: 700 }}>INVOICE</span>
              <h2 style={{ margin: '4px 0', fontSize: '24px', color: 'var(--text-main, #0F172A)' }}>{invoice.invoice_number}</h2>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>Due Date: {invoice.due_date}</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>AMOUNT DUE</span>
              <h2 style={{ margin: '4px 0', fontSize: '28px', color: paymentSuccess ? 'var(--status-success, #22C55E)' : 'var(--text-main, #0F172A)' }}>
                {invoice.currency} {parseFloat(invoice.total_amount).toFixed(2)}
              </h2>
              <span className={`badge badge-${invoice.status.toLowerCase()}`}>
                {paymentSuccess ? 'PAID' : invoice.status}
              </span>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: '24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items &&
                  invoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.description}</td>
                      <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>
                        {invoice.currency} {parseFloat(it.unit_price).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{invoice.currency} {parseFloat(it.total).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Payment Section */}
          {paymentSuccess ? (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <CheckCircle2 size={40} style={{ color: 'var(--status-success, #22C55E)', margin: '0 auto 8px' }} />
              <h3 style={{ margin: '0 0 6px', color: 'var(--status-success, #22C55E)' }}>Payment Verified & Received</h3>
              <p style={{ margin: '0 0 16px', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}>
                Thank you! Your payment of {invoice.currency} {parseFloat(invoice.total_amount).toFixed(2)} has been recorded.
              </p>
              <button
                onClick={handleDownloadPdf}
                style={{ padding: '8px 18px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid var(--status-success, #22C55E)', color: 'var(--status-success, #22C55E)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} /> Download Paid Receipt
              </button>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary, #F8FAFC)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color, #E2E8F0)', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 12px', color: 'var(--text-main, #0F172A)', fontSize: '16px' }}>Complete Payment via PayPal</h4>
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #475569)', fontSize: '13px' }}>
                Settle with your PayPal account or major debit / credit cards securely.
              </p>

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                <button
                  onClick={handleSimulatePayment}
                  disabled={paying}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    background: '#ffc439',
                    color: '#003087',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(255, 196, 57, 0.25)',
                  }}
                >
                  <CreditCard size={18} />
                  {paying ? 'Verifying with PayPal...' : `Pay ${invoice.currency} ${parseFloat(invoice.total_amount).toFixed(2)}`}
                </button>
                <span style={{ display: 'block', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
                  PayPal REST Checkout • Verified Backend Capture
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

