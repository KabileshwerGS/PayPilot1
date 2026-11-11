import { useState, useEffect } from 'react';
import { Download, DollarSign, TrendingUp, Users, Globe, Briefcase, Heart, Split, QrCode } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AnalyticsPage() {
  const { business } = useAuth();
  const defaultCur = business?.default_currency || 'USD';

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    monthly_revenue: [],
    client_revenue: [],
    currency_breakdown: [],
    total_gross: '0.00',
    total_outstanding: '0.00',
  });

  useEffect(() => {
    let ignore = false;
    api.get('/api/analytics/reports')
      .then((data) => {
        if (!ignore) {
          setAnalytics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) {
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleExportCsv = async () => {
    try {
      const blob = await api.download('/api/analytics/export/csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PayPilot_Ledger.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not export CSV: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="secondary-page" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary, #9CAAC4)' }}>
        <p>Loading financial analytics...</p>
      </div>
    );
  }

  return (
    <div className="secondary-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Financial <span>Analytics</span></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
            Audited financial intelligence based strictly on captured transactions and live exchange rates.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #CBD5E1)',
            background: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-main, #0F172A)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.05))',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary-color, #4F46E5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color, #CBD5E1)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <Download size={16} /> Export CSV Ledger
        </button>
      </div>

      {/* Top 2 Big Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="panel stat-card">
          <div className="stat-top">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #9CAAC4)', fontWeight: 600 }}>Total Verified Collections</span>
            <div className="stat-icon green">
              <DollarSign size={20} />
            </div>
          </div>
          <h2 style={{ color: 'var(--status-success, #22C55E)', margin: '14px 0 6px' }}>
            {defaultCur} {parseFloat(analytics.total_gross).toFixed(2)}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #9CAAC4)' }}>Consolidated in {defaultCur}</span>
        </div>

        <div className="panel stat-card">
          <div className="stat-top">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #9CAAC4)', fontWeight: 600 }}>Outstanding Accounts Receivable</span>
            <div className="stat-icon orange">
              <TrendingUp size={20} />
            </div>
          </div>
          <h2 style={{ color: 'var(--status-warning, #F59E0B)', margin: '14px 0 6px' }}>
            {defaultCur} {parseFloat(analytics.total_outstanding).toFixed(2)}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #9CAAC4)' }}>Pending and overdue invoices</span>
        </div>
      </div>

      {/* 4 Business Solutions Revenue Streams */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Unified Business Solutions Revenue Streams</span>
          <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.2)', color: 'var(--lavender)' }}>4 Solutions</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="panel stat-card card-freelancer">
            <div className="stat-top">
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>1. Freelancers (Invoices)</span>
              <Briefcase size={18} style={{ color: 'var(--color-freelancer, #3B82F6)' }} />
            </div>
            <h3 style={{ color: 'var(--color-freelancer-light, #60A5FA)', margin: '10px 0 4px', fontSize: '22px', fontWeight: 800 }}>
              {defaultCur} {parseFloat(analytics.freelance_revenue || 0).toFixed(2)}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Multi-currency collections</span>
          </div>

          <div className="panel stat-card card-creator">
            <div className="stat-top">
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>2. Creators (Tips & Subs)</span>
              <Heart size={18} style={{ color: 'var(--color-creator, #EC4899)' }} />
            </div>
            <h3 style={{ color: 'var(--color-creator-light, #F472B6)', margin: '10px 0 4px', fontSize: '22px', fontWeight: 800 }}>
              {defaultCur} {parseFloat(analytics.creator_tips_revenue || 0).toFixed(2)}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Direct fan tipping & memberships</span>
          </div>

          <div className="panel stat-card card-marketplace">
            <div className="stat-top">
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>3. Marketplaces (Splits)</span>
              <Split size={18} style={{ color: 'var(--color-marketplace, #8B5CF6)' }} />
            </div>
            <h3 style={{ color: 'var(--color-marketplace-light, #A78BFA)', margin: '10px 0 4px', fontSize: '22px', fontWeight: 800 }}>
              {defaultCur} {parseFloat(analytics.marketplace_commissions || 0).toFixed(2)}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Platform fee cuts earned</span>
          </div>

          <div className="panel stat-card card-pos">
            <div className="stat-top">
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>4. Small Merchants (POS)</span>
              <QrCode size={18} style={{ color: 'var(--color-pos, #10B981)' }} />
            </div>
            <h3 style={{ color: 'var(--color-pos-light, #34D399)', margin: '10px 0 4px', fontSize: '22px', fontWeight: 800 }}>
              {defaultCur} {parseFloat(analytics.pos_retail_revenue || 0).toFixed(2)}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>In-store cash & QR checkouts</span>
          </div>
        </div>
      </div>

      {/* Multi-Currency Breakdown */}
      <div className="panel" style={{ marginBottom: '28px' }}>
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <h3>Multi-Currency Revenue Breakdown</h3>
          <p>Original transaction currencies converted to your default reporting currency ({defaultCur}).</p>
        </div>

        {analytics.currency_breakdown.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Globe size={24} />
            </div>
            <h3>No multi-currency transactions recorded</h3>
            <p>As payments are collected in different currencies (USD, EUR, GBP, INR, etc.), conversion rates and original totals will appear here.</p>
          </div>
        ) : (
          <div>
            <div style={{ height: '220px', width: '100%', marginBottom: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.currency_breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="currency" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)', color: '#0F172A', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                    formatter={(val) => [`${defaultCur} ${parseFloat(val).toFixed(2)}`, `Converted Total`]}
                  />
                  <Bar dataKey="converted_amount" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Currency</th>
                    <th>Original Total</th>
                    <th>Exchange Rate to {defaultCur}</th>
                    <th>Converted in {defaultCur}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.currency_breakdown.map((row, idx) => (
                    <tr key={idx}>
                      <td><strong>{row.currency}</strong></td>
                      <td>{row.currency} {parseFloat(row.original_amount).toFixed(2)}</td>
                      <td>{row.rate ? row.rate.toFixed(4) : '1.0000'}</td>
                      <td>
                        <strong style={{ color: 'var(--status-success, #22C55E)' }}>
                          {defaultCur} {parseFloat(row.converted_amount).toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Revenue by Client */}
      <div className="panel">
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <h3>Revenue by Client</h3>
          <p>Distribution of verified receipts and lifetime customer value.</p>
        </div>

        {analytics.client_revenue.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={24} />
            </div>
            <h3>No client revenue yet</h3>
            <p>Client billing history will automatically aggregate here once payments are verified.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Invoices Paid</th>
                  <th>Total Collected</th>
                </tr>
              </thead>
              <tbody>
                {analytics.client_revenue.map((c, i) => (
                  <tr key={i}>
                    <td><strong>{c.client_name}</strong></td>
                    <td>{c.invoices_paid}</td>
                    <td>
                      <strong style={{ color: 'var(--status-success, #22C55E)' }}>
                        {defaultCur} {parseFloat(c.total_amount).toFixed(2)}
                      </strong>
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

