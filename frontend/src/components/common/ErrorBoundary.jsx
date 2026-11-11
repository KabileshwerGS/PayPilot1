import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('PayPilot React Runtime Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              maxWidth: '640px',
              width: '100%',
              background: 'var(--bg-card, #111A2E)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.6))',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--neon-pink, #FF3D9A)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 0 12px rgba(255, 61, 154, 0.3)',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: 'var(--text-main, #F1F5FF)', fontWeight: 700 }}>
              {this.props.title || 'Something went wrong rendering this view'}
            </h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px', lineHeight: 1.5 }}>
              PayPilot intercepted a component runtime exception. Rather than showing a blank page, this error boundary allows you to review the error or reload the view.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: 'var(--bg-elevated, #16223A)',
                  border: '1px solid var(--border-muted, #24324B)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  textAlign: 'left',
                  marginBottom: '24px',
                  overflowX: 'auto',
                }}
              >
                <code style={{ fontSize: '13px', color: 'var(--neon-pink, #FF3D9A)', fontWeight: 600 }}>
                  {this.state.error.toString()}
                </code>
                {this.state.errorInfo?.componentStack && (
                  <details style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary, #9CAAC4)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Component Stack Details</summary>
                    <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.4, color: 'var(--text-muted, #64748B)' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'var(--primary-blue, #2563EB)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: 'var(--glow-blue)',
                }}
              >
                <RefreshCw size={15} /> Try Reloading View
              </button>
              <button
                onClick={() => (window.location.href = '/dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'var(--bg-elevated, #16223A)',
                  color: 'var(--text-main, #F1F5FF)',
                  border: '1px solid var(--border-muted, #24324B)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <Home size={15} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

