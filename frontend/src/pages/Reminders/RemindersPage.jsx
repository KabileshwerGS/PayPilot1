import React, { useState, useEffect } from 'react';
import { BellRing, Play, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import api from '../../services/api';

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/reminders');
      setReminders(data.reminders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleRunReminders = async () => {
    setRunning(true);
    setStatusMessage('');
    try {
      const result = await api.post('/api/reminders/process');
      setStatusMessage(`Scan completed: ${result.sent_count || 0} reminders processed.`);
      fetchReminders();
    } catch (err) {
      setStatusMessage('Error executing reminder scanner: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="secondary-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Automated <span>Reminders</span></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
            Systematic accounts receivable follow-up sequences that stop automatically upon payment.
          </p>
        </div>

        <button
          onClick={handleRunReminders}
          disabled={running}
          className="primary-button"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Play size={16} /> {running ? 'Running Scanner...' : 'Scan Due Dates Now'}
        </button>
      </div>

      {statusMessage && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
          {statusMessage}
        </div>
      )}

      {/* Reminder Strategy Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--bg-card, #FFFFFF)', borderRadius: '14px', border: '1px solid var(--border-color, #E2E8F0)', padding: '22px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4F46E5', fontWeight: 600, fontSize: '14px' }}>
            <Clock size={18} /> Pre-Due Courtesies (3 Days Prior)
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
            Gentle notification letting the client know an invoice will be due shortly with a direct payment link.
          </p>
        </div>

        <div style={{ background: 'var(--bg-card, #FFFFFF)', borderRadius: '14px', border: '1px solid var(--border-color, #E2E8F0)', padding: '22px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#D97706', fontWeight: 600, fontSize: '14px' }}>
            <AlertTriangle size={18} /> Due Date Alert (On Due Date)
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
            Reminder sent on the due date ensuring the invoice doesn't slip through the client's accounts payable.
          </p>
        </div>

        <div style={{ background: 'var(--bg-card, #FFFFFF)', borderRadius: '14px', border: '1px solid var(--border-color, #E2E8F0)', padding: '22px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#E11D48', fontWeight: 600, fontSize: '14px' }}>
            <BellRing size={18} /> Overdue Escalation (Every 7 Days)
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
            Recurring follow-up for invoices exceeding payment terms until verified settlement is logged.
          </p>
        </div>
      </div>

      {/* Reminder Audit Log */}
      <div className="panel">
        <div className="panel-heading" style={{ marginBottom: '16px' }}>
          <h3>Reminder Dispatch Log</h3>
          <p>Historical audit trail of all automated and manual reminder deliveries.</p>
        </div>

        {reminders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BellRing size={24} />
            </div>
            <h3>No reminders dispatched yet</h3>
            <p>When invoices approach or pass due dates, reminder logs and delivery events will appear here.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Reminder Type</th>
                  <th>Date Scheduled / Dispatched</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.invoice_number}</strong></td>
                    <td>{r.client_name}</td>
                    <td><span className="badge badge-draft">{r.reminder_type}</span></td>
                    <td>{r.sent_at || r.scheduled_date}</td>
                    <td>
                      <span className={`badge badge-${r.status === 'SENT' ? 'paid' : 'pending'}`}>
                        {r.status}
                      </span>
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

