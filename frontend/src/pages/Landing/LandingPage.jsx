import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  BellRing,
  Bot,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Heart,
  Split,
  QrCode,
  Package,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-mesh, #0A0618)', color: 'var(--text-main, #F8FAFC)', overflowX: 'hidden' }}>
      {/* Navigation */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          borderBottom: '1px solid var(--border-sidebar, rgba(139, 92, 246, 0.16))',
          position: 'sticky',
          top: 0,
          background: 'rgba(13, 9, 30, 0.82)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div
            style={{
              width: '42px',
              height: '42px',
              background: 'var(--primary-gradient)',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '22px',
              color: '#fff',
              boxShadow: 'var(--glow-button)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            P
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-main, #F8FAFC)' }}>PayPilot</h2>
            <span style={{ fontSize: '9px', letterSpacing: '1.5px', background: 'linear-gradient(135deg, var(--lavender, #C4B5FD) 0%, var(--aurora-cyan, #06B6D4) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, display: 'block' }}>
              AUTONOMOUS BACK OFFICE
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <button onClick={() => scrollTo('features')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94A3B8)', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }}>
            Features
          </button>
          <button onClick={() => scrollTo('how-it-works')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94A3B8)', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }}>
            How It Works
          </button>
          <button onClick={() => scrollTo('why-paypilot')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94A3B8)', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }}>
            Why PayPilot
          </button>
          <button onClick={() => scrollTo('faq')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94A3B8)', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }}>
            FAQ
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'rgba(30, 21, 65, 0.65)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'var(--text-main, #F8FAFC)',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'var(--primary-gradient)',
              border: '1px solid rgba(196, 181, 253, 0.35)',
              color: '#fff',
              padding: '10px 22px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--glow-button)',
            }}
          >
            Get Started <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '90px 24px 70px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(124, 58, 237, 0.18)',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            borderRadius: '9999px',
            padding: '6px 20px',
            fontSize: '13px',
            color: 'var(--lavender, #C4B5FD)',
            marginBottom: '24px',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.25)',
          }}
        >
          <Sparkles size={15} style={{ color: 'var(--neon-pink, #EC4899)' }} /> Next-Gen AI Financial Pilot for Freelancers & Agencies
        </div>

        <h1
          style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-1.5px',
            maxWidth: '900px',
            margin: '0 auto 24px',
            color: 'var(--text-main, #F8FAFC)',
          }}
        >
          Your business.{' '}
          <span style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #38BDF8 50%, #EC4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Your AI pilot.
          </span>
        </h1>

        <p
          style={{
            fontSize: '19px',
            color: 'var(--text-secondary, #94A3B8)',
            maxWidth: '680px',
            margin: '0 auto 36px',
            lineHeight: 1.6,
          }}
        >
          An autonomous back-office platform. Generate multi-currency invoices, collect PayPal payments,
          automate reminder sequences, and converse directly with your business intelligence.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'var(--primary-gradient)',
              border: '1px solid rgba(196, 181, 253, 0.35)',
              color: '#fff',
              padding: '14px 34px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: 'var(--glow-button)',
            }}
          >
            Start Free Pilot <ArrowRight size={18} />
          </button>
          <button
            onClick={() => scrollTo('features')}
            style={{
              background: 'rgba(30, 21, 65, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'var(--text-main, #F8FAFC)',
              padding: '14px 30px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Explore Features
          </button>
        </div>

        {/* Hero Visual Mockup */}
        <div
          style={{
            marginTop: '60px',
            background: 'var(--card-gradient, rgba(22, 15, 50, 0.7))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 35px rgba(124, 58, 237, 0.2)',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--status-error, #EF4444)' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--status-warning, #F59E0B)' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--status-success, #10B981)' }} />
            <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-secondary, #94A3B8)' }}>PayPilot Autonomous Cockpit</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--card-elevated-gradient, rgba(30, 21, 65, 0.72))', padding: '18px', borderRadius: '14px', border: '1px solid rgba(139, 92, 246, 0.22)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>Total Revenue (Verified)</span>
              <h3 style={{ fontSize: '24px', margin: '8px 0', color: 'var(--status-success, #10B981)' }}>$24,850.00</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>↑ 18.2% from last month</span>
            </div>
            <div style={{ background: 'var(--card-elevated-gradient, rgba(30, 21, 65, 0.72))', padding: '18px', borderRadius: '14px', border: '1px solid rgba(139, 92, 246, 0.22)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>Pending Payments</span>
              <h3 style={{ fontSize: '24px', margin: '8px 0', color: 'var(--status-warning, #F59E0B)' }}>$4,120.00</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)' }}>3 invoices awaiting client</span>
            </div>
            <div style={{ background: 'var(--card-elevated-gradient, rgba(30, 21, 65, 0.72))', padding: '18px', borderRadius: '14px', border: '1px solid rgba(139, 92, 246, 0.22)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>AI Action Automation</span>
              <h3 style={{ fontSize: '24px', margin: '8px 0', color: 'var(--aurora-cyan, #06B6D4)' }}>2 Reminders</h3>
              <span style={{ fontSize: '12px', color: 'var(--status-success, #10B981)' }}>Auto-dispatched on schedule</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 24px', borderTop: '1px solid var(--border-muted, #24324B)' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-main, #F1F5FF)' }}>
            The Freelance Financial Headache
          </h2>
          <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Independent workers spend an average of 14 hours per month chasing unpaid invoices and wrestling spreadsheets.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[
            {
              title: 'Manual Invoicing Drudgery',
              desc: 'Creating Word or PDF invoices manually leads to calculation errors, missing terms, and wasted hours.',
            },
            {
              title: 'Chronic Late Payments',
              desc: 'Clients procrastinate. Without systematic, automated reminders, accounts receivable drag past due.',
            },
            {
              title: 'Multi-Currency Chaos',
              desc: 'International clients pay in USD, EUR, GBP, or INR with unpredictable fees and conversion losses.',
            },
            {
              title: 'Zero Business Clarity',
              desc: 'No single source of truth for verified revenue versus issued quotes, leaving tax time stressful.',
            },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--bg-card, #111A2E)', border: '1px solid var(--border-muted, #24324B)', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ color: 'var(--neon-pink, #FF3D9A)', marginBottom: '12px', fontWeight: 800 }}>✕</div>
              <h4 style={{ margin: '0 0 8px', fontSize: '17px', color: 'var(--text-main, #F1F5FF)' }}>{item.title}</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #9CAAC4)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution Section */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 24px', borderTop: '1px solid var(--border-muted, #24324B)' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-main, #F1F5FF)' }}>
            How PayPilot Solves It
          </h2>
          <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            A fully integrated financial operations platform built specifically for solo operators and boutique firms.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[
            {
              icon: Zap,
              title: 'Smart Instant Invoicing',
              desc: 'Generate professional, compliant invoices with automated decimal-safe tax and discount calculations.',
            },
            {
              icon: CreditCard,
              title: 'Seamless PayPal Payments',
              desc: 'Direct PayPal REST integration. One-click payment links with server-side capture verification.',
            },
            {
              icon: BellRing,
              title: 'Automated Reminders',
              desc: 'Configurable gentle follow-up sequences before, on, and after due dates that stop automatically once paid.',
            },
            {
              icon: Bot,
              title: 'Conversational AI Pilot',
              desc: 'Query your revenue, draft invoices, and analyze client balances through natural language with Google Gemini.',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{ background: 'var(--bg-card, #111A2E)', border: '1px solid var(--border-muted, #24324B)', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-gradient)', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '16px', boxShadow: 'var(--glow-blue)' }}>
                  <Icon size={20} />
                </div>
                <h4 style={{ margin: '0 0 8px', fontSize: '17px', color: 'var(--text-main, #F1F5FF)' }}>{item.title}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #9CAAC4)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Unified Business Solutions Section */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 24px', borderTop: '1px solid var(--border-muted, #24324B)' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(196, 181, 253, 0.1)', border: '1px solid rgba(196, 181, 253, 0.25)', color: 'var(--lavender, #C4B5FD)', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
            <Sparkles size={14} /> Four Business Engines in One Platform
          </div>
          <h2 style={{ fontSize: '34px', fontWeight: 800, margin: '0 0 16px', color: 'var(--text-main, #F1F5FF)' }}>
            Purpose-Built Business Solutions
          </h2>
          <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '16px', maxWidth: '680px', margin: '0 auto' }}>
            Whether you bill international clients, collect direct supporter tips, run a multi-vendor marketplace, or manage in-store retail checkout.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {/* Solution 1: Freelancers */}
          <div style={{ background: 'var(--card-gradient, rgba(22, 15, 50, 0.7))', backdropFilter: 'blur(18px)', padding: '26px', borderRadius: '18px', border: '1px solid rgba(59, 130, 246, 0.35)', borderTop: '3px solid #3B82F6', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--color-freelancer-gradient)', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '16px', boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)' }}>
                <FileText size={22} />
              </div>
              <span className="sol-badge freelancer">Solution 01</span>
              <h3 style={{ margin: '8px 0 10px', fontSize: '19px', color: '#FFFFFF', fontWeight: 700 }}>Freelancer Invoicing</h3>
              <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Multi-currency billing across USD, EUR, GBP, CAD & AUD. Automated tax calculations, PDF downloads, WhatsApp instant payment links, and hosted PayPal checkout.
              </p>
            </div>
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Multi-Currency & WhatsApp</span>
              <span style={{ color: '#60A5FA', fontWeight: 700 }}>● Active Engine</span>
            </div>
          </div>

          {/* Solution 2: Creators */}
          <div style={{ background: 'var(--card-gradient, rgba(22, 15, 50, 0.7))', backdropFilter: 'blur(18px)', padding: '26px', borderRadius: '18px', border: '1px solid rgba(236, 72, 153, 0.35)', borderTop: '3px solid #EC4899', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(236, 72, 153, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--color-creator-gradient)', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '16px', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)' }}>
                <Heart size={22} />
              </div>
              <span className="sol-badge creator">Solution 02</span>
              <h3 style={{ margin: '8px 0 10px', fontSize: '19px', color: '#FFFFFF', fontWeight: 700 }}>Creator Tipping & Subs</h3>
              <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Direct fan tipping with custom presets ($5, $10, $25, $50), supporter notes, recurring membership tiers, and instant WhatsApp / social share links.
              </p>
            </div>
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(236, 72, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Direct Fan Funding</span>
              <span style={{ color: '#F472B6', fontWeight: 700 }}>● Active Engine</span>
            </div>
          </div>

          {/* Solution 3: Marketplaces */}
          <div style={{ background: 'var(--card-gradient, rgba(22, 15, 50, 0.7))', backdropFilter: 'blur(18px)', padding: '26px', borderRadius: '18px', border: '1px solid rgba(139, 92, 246, 0.35)', borderTop: '3px solid #8B5CF6', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--color-marketplace-gradient)', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '16px', boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)' }}>
                <Split size={22} />
              </div>
              <span className="sol-badge marketplace">Solution 03</span>
              <h3 style={{ margin: '8px 0 10px', fontSize: '19px', color: '#FFFFFF', fontWeight: 700 }}>Marketplace Split Engine</h3>
              <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Sub-merchant seller onboarding, multi-vendor product catalog, automated commission splits on checkout, and PayPal Mass Payout batch exports.
              </p>
            </div>
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Split Settlement</span>
              <span style={{ color: '#A78BFA', fontWeight: 700 }}>● Active Engine</span>
            </div>
          </div>

          {/* Solution 4: Small Merchants */}
          <div style={{ background: 'var(--card-gradient, rgba(22, 15, 50, 0.7))', backdropFilter: 'blur(18px)', padding: '26px', borderRadius: '18px', border: '1px solid rgba(16, 185, 129, 0.35)', borderTop: '3px solid #10B981', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--color-pos-gradient)', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '16px', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)' }}>
                <QrCode size={22} />
              </div>
              <span className="sol-badge pos">Solution 04</span>
              <h3 style={{ margin: '8px 0 10px', fontSize: '19px', color: '#FFFFFF', fontWeight: 700 }}>Point-of-Sale & QR</h3>
              <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                High-speed cashier POS register with SKU inventory tracking, cash change calculator, and dynamic PayPal QR code payment detection.
              </p>
            </div>
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Dynamic QR Pay</span>
              <span style={{ color: '#34D399', fontWeight: 700 }}>● Active Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 24px', borderTop: '1px solid var(--border-muted, #24324B)' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-main, #F1F5FF)' }}>
            Built for Modern Freelancers & Agencies
          </h2>
          <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '16px' }}>Every tool required to run your international back office without friction.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div style={{ background: 'var(--bg-card, #111A2E)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-muted, #24324B)', boxShadow: 'var(--shadow-card)' }}>
            <Globe size={24} style={{ color: 'var(--cyan-accent, #38BDF8)', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 10px', fontSize: '19px', color: 'var(--text-main, #F1F5FF)' }}>Multi-Currency Architecture</h3>
            <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px', lineHeight: 1.6 }}>
              Bill clients in USD, EUR, GBP, INR, CAD, or AUD. Real-time exchange rate caching converts balances for consolidated reporting.
            </p>
          </div>

          <div style={{ background: 'var(--bg-card, #111A2E)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-muted, #24324B)', boxShadow: 'var(--shadow-card)' }}>
            <ShieldCheck size={24} style={{ color: 'var(--status-success, #22C55E)', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 10px', fontSize: '19px', color: 'var(--text-main, #F1F5FF)' }}>Verified Financial Data</h3>
            <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px', lineHeight: 1.6 }}>
              Zero fabricated totals. Invoices reflect real status; revenue calculates strictly from verified payment transactions.
            </p>
          </div>

          <div style={{ background: 'var(--bg-card, #111A2E)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-muted, #24324B)', boxShadow: 'var(--shadow-card)' }}>
            <FileText size={24} style={{ color: 'var(--status-warning, #F59E0B)', marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 10px', fontSize: '19px', color: 'var(--text-main, #F1F5FF)' }}>PDF Invoicing & Checkout</h3>
            <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px', lineHeight: 1.6 }}>
              Instant PDF generation ready to download or send. Hosted checkout link with embedded PayPal Smart Buttons for friction-free settlement.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 24px', borderTop: '1px solid var(--border-muted, #24324B)' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-main, #F1F5FF)' }}>
            How PayPilot Works
          </h2>
          <p style={{ color: 'var(--text-secondary, #9CAAC4)', fontSize: '16px' }}>From contract signed to funds in your account in 4 clear steps.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {[
            { step: '01', title: 'Add Client Profile', desc: 'Enter client details, billing address, and default invoicing currency.' },
            { step: '02', title: 'Issue Invoice', desc: 'Add line items, review tax and discounts, and generate payment links.' },
            { step: '03', title: 'Client Pays with PayPal', desc: 'Your client settles using PayPal or credit card on the secure checkout page.' },
            { step: '04', title: 'Autonomous Verification', desc: 'PayPilot verifies the transaction, stops reminders, and updates your ledger.' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-elevated, #16223A)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-muted, #24324B)', boxShadow: 'var(--shadow-card)' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--cyan-accent, #38BDF8)', display: 'block', marginBottom: '8px', textShadow: '0 0 12px rgba(56, 189, 248, 0.4)' }}>
                {s.step}
              </span>
              <h4 style={{ margin: '0 0 8px', fontSize: '17px', color: 'var(--text-main, #F1F5FF)' }}>{s.title}</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #9CAAC4)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px', borderTop: '1px solid var(--border-muted, #24324B)' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-main, #F1F5FF)' }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              q: 'Do I need a PayPal Business account?',
              a: 'Yes, connecting your PayPal Client ID and Secret in settings allows PayPilot to generate secure checkout links and capture verified payments directly into your account.',
            },
            {
              q: 'How does the AI Assistant protect my financial data?',
              a: 'The AI uses Google Gemini to read your actual database records (invoices, revenue, overdue payments) with strict multi-tenant isolation. It will never execute financial changes without your explicit confirmation.',
            },
            {
              q: 'Are multi-currency exchange rates updated automatically?',
              a: 'Yes. PayPilot retrieves real-time exchange rates and records the exact rate timestamp with each converted report.',
            },
            {
              q: 'Can I start using PayPilot in Sandbox mode?',
              a: 'Absolutely. PayPilot supports both PayPal Sandbox for testing and Live mode for production client payments.',
            },
          ].map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg-card, #111A2E)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-muted, #24324B)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text-main, #F1F5FF)' }}>{item.q}</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #9CAAC4)', lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-muted, #24324B)', background: 'var(--bg-sidebar, #0B1224)', padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--primary-gradient)', borderRadius: '8px', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '16px', color: '#fff', boxShadow: 'var(--glow-blue)' }}>
            P
          </div>
          <span style={{ fontWeight: 700, color: 'var(--text-main, #F1F5FF)' }}>PayPilot</span>
          <span style={{ color: 'var(--text-muted, #64748B)', fontSize: '13px' }}>© 2026 PayPilot Inc. All rights reserved.</span>
        </div>

        <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: 'var(--text-secondary, #9CAAC4)' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/register')}>Register</span>
          <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
          <span style={{ cursor: 'pointer' }}>Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}

