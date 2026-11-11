import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, ArrowRight, ExternalLink } from 'lucide-react';
import api from '../../services/api';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/api/notifications');
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="secondary-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Notification <span>Center</span></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
            Alerts for payments, invoices, automated reminders, and system events.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', cursor: 'pointer' }}
          >
            <Trash2 size={14} /> Clear All
          </button>
        )}
      </div>

      <div className="panel">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Bell size={24} />
            </div>
            <h3>No new notifications</h3>
            <p>You are all caught up! Real-time alerts regarding invoice payments and reminders will show up here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-color, #E2E8F0)',
                  background: n.is_read ? 'transparent' : '#F5F3FF',
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: n.is_read ? 'transparent' : '#4F46E5',
                      boxShadow: n.is_read ? 'none' : '0 0 6px rgba(79, 70, 229, 0.4)',
                      marginTop: '6px',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main, #0F172A)', display: 'block' }}>{n.title}</strong>
                    <p style={{ margin: '4px 0 6px', fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>{n.message}</p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>{n.created_at}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {n.link_url && (
                    <button
                      onClick={() => navigate(n.link_url)}
                      style={{ background: 'none', border: 'none', color: 'var(--bright-blue, #3B82F6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      View <ExternalLink size={12} />
                    </button>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      title="Mark as read"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748B)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

