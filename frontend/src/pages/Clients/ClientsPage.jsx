import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Mail, Phone, Globe, Trash2, Edit2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    country: 'United States',
    billing_address: '',
    preferred_currency: 'USD',
    notes: '',
  });
  const [error, setError] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/clients');
      setClients(data.clients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({ ...client });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        country: 'United States',
        billing_address: '',
        preferred_currency: 'USD',
        notes: '',
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, formData);
      } else {
        await api.post('/api/clients', formData);
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      setError(err.message || 'Failed to save client');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to archive client "${name}"? Historical invoices will be preserved.`)) {
      try {
        await api.delete(`/api/clients/${id}`);
        fetchClients();
      } catch (err) {
        alert(err.message || 'Failed to archive client');
      }
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="secondary-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Client <span>Management</span></h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #9CAAC4)', fontSize: '14px' }}>
            Manage client profiles, billing currencies, and contact directories.
          </p>
        </div>
        <button className="primary-button" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Add New Client
        </button>
      </div>

      {/* Filter and Search */}
      <div style={{ background: 'var(--bg-card, #FFFFFF)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)', marginBottom: '24px', display: 'flex', gap: '16px', boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05))' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary, #64748B)' }} />
          <input
            type="text"
            placeholder="Search clients by name, email or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
          />
        </div>
      </div>

      {/* Client List */}
      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users size={24} />
            </div>
            <h3>No clients registered yet</h3>
            <p>Add client details to begin creating and sending multi-currency invoices.</p>
            <button className="primary-button" onClick={() => handleOpenModal()} style={{ fontSize: '13px', padding: '8px 16px' }}>
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Company</th>
                  <th>Contact Info</th>
                  <th>Country</th>
                  <th>Currency</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.name}</strong>
                    </td>
                    <td>{client.company || '—'}</td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-main, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={13} style={{ color: 'var(--text-muted, #64748B)' }} /> {client.email}
                      </div>
                      {client.phone && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #475569)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <Phone size={12} style={{ color: 'var(--text-muted, #64748B)' }} /> {client.phone}
                        </div>
                      )}
                    </td>
                    <td>{client.country}</td>
                    <td>
                      <span className="badge badge-draft">{client.preferred_currency}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenModal(client)}
                          style={{ background: 'none', border: 'none', color: 'var(--bright-blue, #3B82F6)', cursor: 'pointer', padding: '4px' }}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id, client.name)}
                          style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', padding: '4px' }}
                          title="Archive"
                        >
                          <Trash2 size={16} />
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

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-card, #FFFFFF)', borderRadius: '16px', padding: '28px', border: '1px solid var(--border-color, #E2E8F0)', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--text-main, #0F172A)' }}>
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                <AlertCircle size={15} /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Acme Global"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="billing@acme.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 555-0192"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>Company</label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>Preferred Currency</label>
                  <select
                    value={formData.preferred_currency}
                    onChange={(e) => setFormData({ ...formData, preferred_currency: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="SGD">SGD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>Billing Address</label>
                <input
                  type="text"
                  placeholder="Address, City, Country"
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-main, #0F172A)', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color, #CBD5E1)', background: '#FFFFFF', color: 'var(--text-secondary, #475569)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
                >
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

