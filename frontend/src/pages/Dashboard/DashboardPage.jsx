import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  CreditCard,
  Plus,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Bot,
  Activity,
  Heart,
  Split,
  QrCode,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import FinancialIntelligenceCockpit from '../../components/dashboard/FinancialIntelligenceCockpit';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const currency = business?.default_currency || 'USD';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_revenue: '0.00',
    pending_amount: '0.00',
    overdue_amount: '0.00',
    total_clients: 0,
    total_invoices: 0,
    successful_payments: 0,
  });
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [summaryData, revenueData, activityData, invoicesData] = await Promise.all([
        api.get('/api/dashboard/summary').catch(() => ({
          total_revenue: '0.00',
          pending_amount: '0.00',
          overdue_amount: '0.00',
          total_clients: 0,
          total_invoices: 0,
          successful_payments: 0,
        })),
        api.get('/api/dashboard/revenue').catch(() => ({ trends: [] })),
        api.get('/api/dashboard/activity').catch(() => ({ activities: [] })),
        api.get('/api/invoices?limit=5').catch(() => ({ invoices: [] })),
      ]);

      setSummary(summaryData);
      setRevenueTrends(revenueData.trends || []);
      setRecentActivities(activityData.activities || []);
      setRecentInvoices(invoicesData.invoices || []);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.get('/api/dashboard/summary').catch(() => ({
        total_revenue: '0.00',
        pending_amount: '0.00',
        overdue_amount: '0.00',
        total_clients: 0,
        total_invoices: 0,
        successful_payments: 0,
      })),
      api.get('/api/dashboard/revenue').catch(() => ({ trends: [] })),
      api.get('/api/dashboard/activity').catch(() => ({ activities: [] })),
      api.get('/api/invoices?limit=5').catch(() => ({ invoices: [] })),
    ])
      .then(([summaryData, revenueData, activityData, invoicesData]) => {
        if (!ignore) {
          setSummary(summaryData);
          setRevenueTrends(revenueData.trends || []);
          setRecentActivities(activityData.activities || []);
          setRecentInvoices(invoicesData.invoices || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching dashboard data:', err);
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const formatMoney = (val, cur) => {
    const num = parseFloat(val) || 0;
    const safeCurrency = (cur && typeof cur === 'string' && cur.trim()) ? cur.trim().toUpperCase() : (currency || 'USD');
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: safeCurrency,
      }).format(num);
    } catch {
      return `${safeCurrency} ${num.toFixed(2)}`;
    }
  };

  return (
    <div className="dashboard-content">
      {/* Welcome Bar */}
      <div className="welcome-section">
        <div>
          <div className="date-label">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Cockpit <span>Overview</span>
          </h1>
          <p className="welcome-subtitle">
            Autonomous financial telemetry for <strong>{business?.business_name || 'your business'}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: '#FFFFFF',
              border: '1px solid var(--border-muted, #E2E8F0)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary, #475569)',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => navigate('/invoices/new')}
            className="primary-button"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px' }}
          >
            <Plus size={16} /> Create Invoice
          </button>
        </div>
      </div>

      {/* 4 Unified Business Solutions Cockpit Showcase */}
      <div className="solutions-cockpit">
        <div className="solutions-cockpit-header">
          <h3>
            <Sparkles size={16} style={{ color: 'var(--lavender, #C4B5FD)' }} />
            Unified Business Experiences
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>
            PayPal AI Hackathon • 4 Business Solutions
          </span>
        </div>

        <div className="solutions-cockpit-grid">
          {/* Solution 1: Freelancers */}
          <div className="solution-cockpit-card freelancer">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="sol-badge freelancer">Solution 1</span>
                <div className="stat-icon blue" style={{ width: '34px', height: '34px' }}>
                  <FileText size={17} />
                </div>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-main, #0F172A)', fontWeight: 700 }}>
                Freelancer Hub
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.45 }}>
                Multi-currency billing in USD, EUR, GBP, INR with live PayPal checkout & WhatsApp links.
              </p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/invoices/new')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: 'var(--color-freelancer-gradient)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(59, 130, 246, 0.35)',
                }}
              >
                + Invoice
              </button>
              <button
                onClick={() => navigate('/invoices')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: 'var(--color-freelancer-light)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Manage
              </button>
            </div>
          </div>

          {/* Solution 2: Creators */}
          <div className="solution-cockpit-card creator">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="sol-badge creator">Solution 2</span>
                <div className="stat-icon pink" style={{ width: '34px', height: '34px' }}>
                  <Heart size={17} />
                </div>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-main, #0F172A)', fontWeight: 700 }}>
                Creator Hub
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.45 }}>
                Public fan tipping jar, recurring membership tiers, and direct supporter funding via PayPal.
              </p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/creator')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: 'var(--color-creator-gradient)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(236, 72, 153, 0.35)',
                }}
              >
                Launch Tip Jar
              </button>
              <button
                onClick={() => navigate('/creator')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'rgba(236, 72, 153, 0.12)',
                  border: '1px solid rgba(236, 72, 153, 0.35)',
                  color: 'var(--color-creator-light)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tiers
              </button>
            </div>
          </div>

          {/* Solution 3: Marketplaces */}
          <div className="solution-cockpit-card marketplace">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="sol-badge marketplace">Solution 3</span>
                <div className="stat-icon purple" style={{ width: '34px', height: '34px' }}>
                  <Split size={17} />
                </div>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-main, #0F172A)', fontWeight: 700 }}>
                Marketplace Splits
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.45 }}>
                Vendor onboarding, automatic 15% platform split commissions, and PayPal Mass Payout exports.
              </p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/store')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: 'var(--color-marketplace-gradient)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(139, 92, 246, 0.35)',
                }}
              >
                Public Store
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  color: 'var(--color-marketplace-light)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Splits
              </button>
            </div>
          </div>

          {/* Solution 4: Small Merchants (POS) */}
          <div className="solution-cockpit-card pos">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="sol-badge pos">Solution 4</span>
                <div className="stat-icon green" style={{ width: '34px', height: '34px' }}>
                  <QrCode size={17} />
                </div>
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-main, #0F172A)', fontWeight: 700 }}>
                POS Terminal
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.45 }}>
                Touchscreen retail checkout, cash change calculation, and dynamic PayPal QR payment detection.
              </p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/pos')}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: 'var(--color-pos-gradient)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                }}
              >
                Open Register
              </button>
              <button
                onClick={() => navigate('/products')}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: 'var(--color-pos-light)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Catalog
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary Financial Cards */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        <div className="panel stat-card card-revenue">
          <div className="stat-top">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Total Verified Revenue</span>
            <div className="stat-icon green">
              <DollarSign size={20} />
            </div>
          </div>
          <h2 style={{ color: 'var(--status-success, #10B981)', margin: '14px 0 6px', letterSpacing: '-0.5px' }}>
            {formatMoney(summary.total_revenue)}
          </h2>
          <div className="stat-bottom">
            <strong className="green">{summary.successful_payments}</strong>
            <span>verified payment{summary.successful_payments === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="panel stat-card card-pending">
          <div className="stat-top">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Pending Receivables</span>
            <div className="stat-icon orange">
              <Clock size={20} />
            </div>
          </div>
          <h2 style={{ color: 'var(--status-warning, #F59E0B)', margin: '14px 0 6px', letterSpacing: '-0.5px' }}>
            {formatMoney(summary.pending_amount)}
          </h2>
          <div className="stat-bottom">
            <strong className="orange">Active</strong>
            <span>awaiting client settlement</span>
          </div>
        </div>

        <div className="panel stat-card card-overdue">
          <div className="stat-top">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Overdue Invoices</span>
            <div className="stat-icon red">
              <AlertTriangle size={20} />
            </div>
          </div>
          <h2 style={{ color: 'var(--neon-pink, #EC4899)', margin: '14px 0 6px', letterSpacing: '-0.5px', textShadow: '0 0 16px rgba(236, 72, 153, 0.45)' }}>
            {formatMoney(summary.overdue_amount)}
          </h2>
          <div className="stat-bottom">
            <strong className="red">Past Due</strong>
            <span>triggers automated reminder</span>
          </div>
        </div>

        <div className="panel stat-card card-clients">
          <div className="stat-top">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>Active Clients & Invoices</span>
            <div className="stat-icon purple">
              <Users size={20} />
            </div>
          </div>
          <h2 style={{ color: 'var(--lavender, #C4B5FD)', margin: '14px 0 6px', letterSpacing: '-0.5px' }}>
            {summary.total_clients} <span style={{ fontSize: '16px', color: 'var(--text-secondary, #94A3B8)' }}>Clients</span>
          </h2>
          <div className="stat-bottom">
            <strong className="purple">{summary.total_invoices}</strong>
            <span>invoices created</span>
          </div>
        </div>
      </div>

      {/* Autonomous AI Financial Intelligence Cockpit */}
      <FinancialIntelligenceCockpit defaultCurrency={currency} />

      {/* Main Grid: Revenue / Activity + AI Assistant Preview */}
      <div className="middle-grid" style={{ marginBottom: '28px' }}>
        {/* Revenue Performance */}
        <div className="panel revenue-panel">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Verified Revenue Performance</h3>
              <p>Monthly gross collections based on real settled payments.</p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              style={{ background: 'none', border: 'none', color: 'var(--bright-blue, #3B82F6)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              Full Analytics <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div className="revenue-total">
              <h2>{formatMoney(summary.total_revenue)}</h2>
              <span>Verified lifetime collections</span>
            </div>

            {/* If zero revenue */}
            {parseFloat(summary.total_revenue) === 0 ? (
              <div className="empty-state" style={{ marginTop: '20px' }}>
                <div className="empty-state-icon">
                  <CreditCard size={24} />
                </div>
                <h3>No verified payments yet</h3>
                <p>When clients settle invoices via PayPal, verified revenue telemetry and growth charts will render here in real time.</p>
                <button
                  className="primary-button"
                  onClick={() => navigate('/invoices/new')}
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  Create Your First Invoice
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '20px', height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.65} />
                        <stop offset="60%" stopColor="#8B5CF6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.15)" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#0F172A', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}
                      formatter={(val) => [formatMoney(val), 'Verified Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#A78BFA" strokeWidth={3} fillOpacity={1} fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* AI Pilot Assistant Widget */}
        <div className="panel ai-panel">
          <div className="ai-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="ai-logo">
                <Bot size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>AI Pilot Assistant</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #9CAAC4)' }}>Powered by Google Gemini</p>
              </div>
            </div>
            <div className="ai-live">
              <span /> ONLINE
            </div>
          </div>

          <div className="ai-message" style={{ marginTop: '20px' }}>
            <div className="ai-small-icon">✦</div>
            <p>
              {parseFloat(summary.overdue_amount) > 0
                ? `You have ${formatMoney(summary.overdue_amount)} in overdue invoices. Would you like me to prepare reminder emails?`
                : summary.total_clients === 0
                ? "Welcome to PayPilot! To begin, register your first client and issue a multi-currency invoice."
                : `Your account is in good standing. ${summary.total_clients} clients registered and ${summary.total_invoices} invoices tracked.`}
            </p>
          </div>

          <div className="ai-suggestions" style={{ marginTop: '16px' }}>
            <button onClick={() => navigate('/ai?prompt=Show all my overdue invoices')}>
              "Show overdue invoices"
            </button>
            <button onClick={() => navigate('/ai?prompt=Summarize my business revenue')}>
              "Summarize business revenue"
            </button>
            <button onClick={() => navigate('/ai?prompt=Prepare a reminder for pending clients')}>
              "Prepare payment reminders"
            </button>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              onClick={() => navigate('/ai')}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: '#F8FAFC',
                border: '1px solid var(--border-muted, #E2E8F0)',
                color: 'var(--text-main, #0F172A)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Sparkles size={15} style={{ color: 'var(--neon-pink, #FF3D9A)' }} /> Open AI Pilot Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="panel invoice-panel">
        <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3>Recent Invoices</h3>
            <p>Track statuses and real-time PayPal settlement links.</p>
          </div>
          <button
            onClick={() => navigate('/invoices')}
            className="text-button"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            View All Invoices <ArrowRight size={14} />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={24} />
            </div>
            <h3>No invoices created yet</h3>
            <p>Create your first invoice in any currency to send to clients and receive payments via PayPal.</p>
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
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <strong className="invoice-id">{inv.invoice_number}</strong>
                    </td>
                    <td>{inv.client_name || 'Client'}</td>
                    <td>{inv.issue_date}</td>
                    <td>{inv.due_date}</td>
                    <td>
                      <strong className="amount">{formatMoney(inv.total_amount, inv.currency)}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${inv.status.toLowerCase()}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--bright-blue, #3B82F6)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="panel" style={{ marginTop: '28px' }}>
        <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3>Audit & Activity Telemetry</h3>
            <p>Live stream of invoices, payments, reminders, and back-office events.</p>
          </div>
          <button
            onClick={() => navigate('/notifications')}
            style={{ background: 'none', border: 'none', color: 'var(--bright-blue, #3B82F6)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            All Activity <ArrowRight size={14} />
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 20px' }}>
            <div className="empty-state-icon">
              <Activity size={24} />
            </div>
            <h3>No recent events logged</h3>
            <p>Actions such as creating invoices, sending payment links, and settling transactions will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid var(--border-muted, #E2E8F0)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--primary-violet, #6366F1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <Activity size={17} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main, #0F172A)', display: 'block' }}>{act.title}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>{act.message}</span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', whiteSpace: 'nowrap' }}>{act.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

