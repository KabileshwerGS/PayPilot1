import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  DollarSign,
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  Info,
  RefreshCw,
  Bot,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import api from '../../services/api';

export default function FinancialIntelligenceCockpit({ defaultCurrency = 'USD' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [horizonDays, setHorizonDays] = useState(30);
  const [cockpitData, setCockpitData] = useState(null);

  // Confirmation modal state
  const [activeModalAction, setActiveModalAction] = useState(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [actionErrorMessage, setActionErrorMessage] = useState(null);

  // Active tab inside Cockpit: "overview", "forecast", "debtors", "anomalies"
  const [activeTab, setActiveTab] = useState('overview');

  const fetchCockpit = async (horizon = horizonDays) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/intelligence/cockpit?horizon_days=${horizon}`);
      setCockpitData(data);
    } catch (err) {
      console.error('Failed to load financial intelligence cockpit:', err);
      setError(err.message || 'Unable to load financial intelligence telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCockpit(horizonDays);
  }, [horizonDays]);

  const formatMoney = (val, cur = defaultCurrency) => {
    const num = parseFloat(val) || 0;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cur || 'USD',
      }).format(num);
    } catch {
      return `${cur || 'USD'} ${num.toFixed(2)}`;
    }
  };

  const handleOpenActionModal = (rec) => {
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setActiveModalAction(rec);
  };

  const handleCloseModal = () => {
    if (!executingAction) {
      setActiveModalAction(null);
      setActionSuccessMessage(null);
      setActionErrorMessage(null);
    }
  };

  const handleConfirmExecute = async () => {
    if (!activeModalAction) return;
    setExecutingAction(true);
    setActionErrorMessage(null);

    try {
      const payload = {
        action_type: activeModalAction.action_type,
        action_payload: activeModalAction.action_payload || {},
        confirmed: true,
      };

      const res = await api.post(
        `/api/intelligence/recommendations/${encodeURIComponent(activeModalAction.id)}/execute`,
        payload
      );

      setActionSuccessMessage(
        res.message || `Action executed successfully. Recorded in Audit Log #${res.audit_log_id}.`
      );

      // Update recommendation in local state to executed
      setCockpitData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recommendations: prev.recommendations.map((r) =>
            r.id === activeModalAction.id ? { ...r, is_executed: true } : r
          ),
        };
      });

      // Auto close modal after brief delay
      setTimeout(() => {
        setActiveModalAction(null);
        setActionSuccessMessage(null);
      }, 2400);
    } catch (err) {
      console.error('Action execution failed:', err);
      setActionErrorMessage(err.message || 'Execution failed. Please check permissions.');
    } finally {
      setExecutingAction(false);
    }
  };

  if (loading && !cockpitData) {
    return (
      <div className="panel" style={{ padding: '32px', marginBottom: '28px', textAlign: 'center' }}>
        <RefreshCw size={24} className="spin" style={{ color: 'var(--primary-violet, #6366F1)', margin: '0 auto 12px' }} />
        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text-main, #0F172A)' }}>
          Computing Financial Intelligence Telemetry...
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #64748B)' }}>
          Analyzing PayPal transaction velocity, client settlement patterns, and cash-flow horizons.
        </p>
      </div>
    );
  }

  if (error && !cockpitData) {
    return (
      <div className="panel" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid var(--neon-pink, #E11D48)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neon-pink, #E11D48)', marginBottom: '8px' }}>
          <AlertTriangle size={18} />
          <strong style={{ fontSize: '14px' }}>Financial Intelligence Engine Offline</strong>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-secondary, #64748B)' }}>{error}</p>
        <button
          onClick={() => fetchCockpit(horizonDays)}
          className="primary-button"
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          Retry Telemetry
        </button>
      </div>
    );
  }

  const {
    base_currency = defaultCurrency,
    financial_health_score = 100,
    has_deficit_risk = false,
    earliest_deficit_date = null,
    projected_runway_days = 30,
    starting_verified_balance = 0.0,
    projected_ending_balance = 0.0,
    minimum_projected_balance = 0.0,
    debtor_summary = {},
    cash_flow_timeline = [],
    anomalies = [],
    recommendations = [],
    gemini_synthesis_status = 'UNCONFIGURED',
  } = cockpitData || {};

  // Health Score styling
  const getHealthBadge = (score) => {
    if (score >= 80) {
      return {
        label: 'Optimal Liquidity',
        color: '#059669',
        bg: 'rgba(5, 150, 105, 0.1)',
        border: 'rgba(5, 150, 105, 0.3)',
        icon: <ShieldCheck size={18} />,
      };
    }
    if (score >= 50) {
      return {
        label: 'Moderate Watch',
        color: '#D97706',
        bg: 'rgba(217, 119, 6, 0.1)',
        border: 'rgba(217, 119, 6, 0.3)',
        icon: <AlertTriangle size={18} />,
      };
    }
    return {
      label: 'Deficit Alert',
      color: '#DC2626',
      bg: 'rgba(220, 38, 38, 0.1)',
      border: 'rgba(220, 38, 38, 0.3)',
      icon: <ShieldAlert size={18} />,
    };
  };

  const healthBadge = getHealthBadge(financial_health_score);

  return (
    <div
      className="panel financial-intelligence-cockpit"
      style={{
        marginBottom: '28px',
        padding: '24px 28px',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid var(--border-muted, #E2E8F0)',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* 1. Header Bar: Title, Live Gemini Status, Horizon Selector & Refresh */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '22px',
          paddingBottom: '16px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary-violet, #6366F1)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={12} /> Autonomous AI Financial Pilot
            </span>
            {gemini_synthesis_status === 'SYNTHESIZED' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(5, 150, 105, 0.08)',
                  color: '#059669',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <Bot size={12} /> Gemini 3.5 Flash Active
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  color: '#64748B',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <Sliders size={12} /> Deterministic Telemetry Baseline
              </span>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-main, #0F172A)', letterSpacing: '-0.3px' }}>
            Financial Intelligence & Cash-Flow Cockpit
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #64748B)' }}>
            Forward-looking cash forecasting, debtor behavior risk, and autonomous recommendations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Horizon Selector */}
          <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '3px' }}>
            {[14, 30, 60].map((h) => (
              <button
                key={h}
                onClick={() => setHorizonDays(h)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  background: horizonDays === h ? '#FFFFFF' : 'transparent',
                  color: horizonDays === h ? 'var(--primary-violet, #6366F1)' : '#64748B',
                  boxShadow: horizonDays === h ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {h}D Horizon
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchCockpit(horizonDays)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* 2. Top Metric Showcase: Health Score + Liquidity Runway + Impending Deficit */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Metric 1: Financial Health Score */}
        <div
          style={{
            padding: '18px 20px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Financial Health Score
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: healthBadge.color, letterSpacing: '-0.5px' }}>
                {financial_health_score}
              </span>
              <span style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 600 }}>/ 100</span>
            </div>
            <div style={{ marginTop: '6px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: healthBadge.bg,
                  color: healthBadge.color,
                  border: `1px solid ${healthBadge.border}`,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {healthBadge.icon} {healthBadge.label}
              </span>
            </div>
          </div>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: `conic-gradient(${healthBadge.color} ${financial_health_score * 3.6}deg, #E2E8F0 0deg)`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: healthBadge.color,
              }}
            >
              {financial_health_score}%
            </div>
          </div>
        </div>

        {/* Metric 2: Operating Runway */}
        <div
          style={{
            padding: '18px 20px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Simulated Runway
            </span>
            <Clock size={16} style={{ color: has_deficit_risk ? '#DC2626' : '#059669' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: has_deficit_risk ? '#DC2626' : '#0F172A', letterSpacing: '-0.5px' }}>
              {projected_runway_days}
            </span>
            <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Days</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748B' }}>
            {has_deficit_risk ? (
              <strong style={{ color: '#DC2626' }}>Breach projected on {earliest_deficit_date}</strong>
            ) : (
              'Solvent throughout the selected projection horizon'
            )}
          </p>
        </div>

        {/* Metric 3: Projected Net Horizon Position */}
        <div
          style={{
            padding: '18px 20px',
            borderRadius: '12px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Projected {horizonDays}D Balance
            </span>
            <DollarSign size={16} style={{ color: 'var(--primary-violet, #6366F1)' }} />
          </div>
          <div style={{ marginTop: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: projected_ending_balance >= 0 ? '#059669' : '#DC2626', letterSpacing: '-0.5px' }}>
              {formatMoney(projected_ending_balance, base_currency)}
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
            <span>Verified Start: {formatMoney(starting_verified_balance, base_currency)}</span>
            <span>Min: {formatMoney(minimum_projected_balance, base_currency)}</span>
          </div>
        </div>
      </div>

      {/* 3. Impending Deficit Warning Alert Banner (Conditional) */}
      {has_deficit_risk && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#DC2626',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#991B1B' }}>
                Impending Cash-Flow Deficit Warning: {earliest_deficit_date}
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#B91C1C', lineHeight: 1.4 }}>
                Known outgoing liabilities will exceed projected liquid collections. Minimum projected cash position is{' '}
                <strong>{formatMoney(minimum_projected_balance, base_currency)}</strong>. Review recommendations below.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('forecast')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            View Curve
          </button>
        </div>
      )}

      {/* 4. Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        {[
          { key: 'overview', label: 'AI Recommendations', count: recommendations.length },
          { key: 'forecast', label: `${horizonDays}-Day Cash Forecast` },
          { key: 'debtors', label: 'Client Debtor Risk', count: debtor_summary.total_clients },
          { key: 'anomalies', label: 'Financial Alerts', count: anomalies.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--primary-violet, #6366F1)' : '#64748B',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary-violet, #6366F1)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: activeTab === tab.key ? 'rgba(99, 102, 241, 0.1)' : '#F1F5F9',
                  color: activeTab === tab.key ? 'var(--primary-violet, #6366F1)' : '#64748B',
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: AI RECOMMENDATIONS & ACTIONS */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              Autonomous Action Cards • Grounded in Verified Financial Records
            </span>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
              Execution requires manual confirmation
            </span>
          </div>

          {recommendations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <ShieldCheck size={28} style={{ color: '#059669', margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#0F172A' }}>No Active Financial Risks</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Your accounts are in good standing with zero overdue balances and positive liquidity runway.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {recommendations.map((rec) => {
                const isCritical = rec.urgency === 'CRITICAL';
                const isHigh = rec.urgency === 'HIGH';

                return (
                  <div
                    key={rec.id}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      border: isCritical
                        ? '1px solid rgba(220, 38, 38, 0.4)'
                        : isHigh
                        ? '1px solid rgba(217, 119, 6, 0.4)'
                        : '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isCritical
                              ? 'rgba(220, 38, 38, 0.1)'
                              : isHigh
                              ? 'rgba(217, 119, 6, 0.1)'
                              : 'rgba(99, 102, 241, 0.1)',
                            color: isCritical ? '#DC2626' : isHigh ? '#D97706' : 'var(--primary-violet, #6366F1)',
                          }}
                        >
                          {rec.urgency}
                        </span>

                        <span
                          style={{
                            padding: '3px 7px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#F1F5F9',
                            color: '#64748B',
                          }}
                        >
                          {rec.is_prediction ? '✦ AI Prediction' : '● Confirmed Fact'}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#059669',
                          background: 'rgba(5, 150, 105, 0.08)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        Impact: {rec.quantified_impact}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>
                        {rec.title}
                      </h4>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569', lineHeight: 1.45 }}>
                        {rec.financial_rationale}
                      </p>
                      <div style={{ fontSize: '12px', color: '#64748B', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <strong>Action:</strong> {rec.recommended_action}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                      {rec.is_executed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#059669',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(5, 150, 105, 0.1)',
                          }}
                        >
                          <Check size={14} /> Action Executed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenActionModal(rec)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: isCritical
                              ? '#DC2626'
                              : 'var(--primary-violet, #6366F1)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Send size={13} /> Execute Recommendation
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CASH FLOW FORECAST TIMELINE */}
      {activeTab === 'forecast' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Simulated Net Cash Flow Curve ({horizonDays} Days)
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                Expected settlements discounted by client reliability scores minus verified pending disbursements.
              </p>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', gap: '14px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#6366F1' }} /> Projected Balance
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#DC2626' }} /> Deficit Zero Threshold
              </span>
            </div>
          </div>

          <div style={{ height: '260px', width: '100%', marginTop: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cash_flow_timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => (d ? d.slice(5) : '')}
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                  }}
                  formatter={(val) => [formatMoney(val, base_currency), 'Projected Liquidity']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="projected_cumulative_balance"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cfGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={14} style={{ flexShrink: 0, color: 'var(--primary-violet, #6366F1)' }} />
            <span>
              <strong>Model Boundary:</strong> Projections track verified invoices and authorized payouts. Fixed external overhead (office rent, external SaaS) is not tracked in PayPilot and is excluded.
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: CLIENT DEBTOR RISK MATRIX */}
      {activeTab === 'debtors' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Low Risk Clients</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                {debtor_summary.low_risk_count || 0}
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Moderate Delay Clients</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                {debtor_summary.moderate_delay_count || 0}
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>High Risk Debtors</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                {debtor_summary.high_risk_count || 0}
              </div>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Portfolio Avg Delay</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-violet, #6366F1)', marginTop: '4px' }}>
                {debtor_summary.portfolio_average_delay_days !== null
                  ? `${debtor_summary.portfolio_average_delay_days} D`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Client Debtor Breakdown */}
          {cockpitData?.debtor_profiles?.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', color: '#64748B', fontSize: '13px' }}>
              No client records found.
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Risk Grade</th>
                    <th>Avg Settlement Delay</th>
                    <th>On-Time Rate</th>
                    <th>Outstanding</th>
                    <th>Recommended Terms</th>
                  </tr>
                </thead>
                <tbody>
                  {(cockpitData?.debtor_profiles || []).map((client) => {
                    const isHigh = client.risk_tier === 'HIGH_RISK';
                    const isMod = client.risk_tier === 'MODERATE_DELAY';

                    return (
                      <tr key={client.client_id}>
                        <td>
                          <strong>{client.client_name}</strong>
                          {client.company && (
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{client.company}</div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isHigh
                                ? 'rgba(220, 38, 38, 0.1)'
                                : isMod
                                ? 'rgba(217, 119, 6, 0.1)'
                                : 'rgba(5, 150, 105, 0.1)',
                              color: isHigh ? '#DC2626' : isMod ? '#D97706' : '#059669',
                            }}
                          >
                            {client.risk_tier.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {client.average_payment_delay_days !== null ? (
                            <span>
                              {client.average_payment_delay_days > 0
                                ? `+${client.average_payment_delay_days} days late`
                                : `${client.average_payment_delay_days} days (early)`}
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>No history</span>
                          )}
                        </td>
                        <td>
                          {client.on_time_payment_rate_pct !== null
                            ? `${client.on_time_payment_rate_pct}%`
                            : '—'}
                        </td>
                        <td>{formatMoney(client.outstanding_amount, base_currency)}</td>
                        <td style={{ color: '#475569', fontSize: '11px' }}>{client.recommended_terms}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FINANCIAL ANOMALY ALERTS */}
      {activeTab === 'anomalies' && (
        <div>
          {anomalies.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <ShieldCheck size={28} style={{ color: '#059669', margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#0F172A' }}>No Anomalies Detected</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Payment velocity, client concentration, and invoice settlement flows are within normal bounds.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {anomalies.map((anom, idx) => {
                const isCrit = anom.severity === 'CRITICAL';
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: isCrit ? 'rgba(220, 38, 38, 0.05)' : 'rgba(217, 119, 6, 0.05)',
                      border: isCrit ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid rgba(217, 119, 6, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isCrit ? '#DC2626' : '#D97706',
                          color: '#FFFFFF',
                        }}
                      >
                        {anom.severity}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#0F172A' }}>{anom.title}</strong>
                    </div>
                    <p style={{ margin: '4px 0 6px', fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                      {anom.description}
                    </p>
                    {anom.recommended_action && (
                      <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 600 }}>
                        Recommendation: {anom.recommended_action}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL FOR CONTEXTUAL SAFE ACTIONS */}
      {activeModalAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary-violet, #6366F1)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Bot size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Confirm Autonomous Action
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={executingAction}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              You are authorizing PayPilot to execute the following corrective financial recommendation:
            </p>

            <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-violet, #6366F1)', textTransform: 'uppercase', marginBottom: '2px' }}>
                {activeModalAction.action_type.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                {activeModalAction.title}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {activeModalAction.recommended_action}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(5, 150, 105, 0.08)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.25)', marginBottom: '18px', fontSize: '12px', color: '#065F46' }}>
              <strong>Safety Guard:</strong> This action will stage a verified reminder/term record in PayPilot and create an audit log. It will <em>never</em> debit or transfer funds.
            </div>

            {actionErrorMessage && (
              <div style={{ padding: '10px 14px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '8px', border: '1px solid rgba(220, 38, 38, 0.25)', marginBottom: '16px', fontSize: '12px', color: '#991B1B' }}>
                {actionErrorMessage}
              </div>
            )}

            {actionSuccessMessage && (
              <div style={{ padding: '10px 14px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.3)', marginBottom: '16px', fontSize: '12px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={handleCloseModal}
                disabled={executingAction}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmExecute}
                disabled={executingAction || Boolean(actionSuccessMessage)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: 'var(--primary-violet, #6366F1)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: executingAction ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                }}
              >
                {executingAction ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Executing...
                  </>
                ) : (
                  <>
                    <Check size={15} /> Confirm & Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
