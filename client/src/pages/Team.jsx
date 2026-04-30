import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Modal from '../components/Modal';

export default function Team() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = () => {
    api.get(`/projects/${id}/members`).then(r => setMembers(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(fetchMembers, [id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/projects/${id}/members`, form);
      setShowModal(false);
      setForm({ email: '', role: 'MEMBER' });
      fetchMembers();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.put(`/projects/${id}/members/${memberId}`, { role: newRole });
      fetchMembers();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${memberId}`);
      fetchMembers();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${id}`)}>← Back</button>
          <h2>Team Members</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Add Member</button>
      </div>
      <div className="page-content fade-in">
        <div className="page-header">
          <h1>Team Management</h1>
          <p>Add or remove members and manage roles</p>
        </div>

        <div className="members-list">
          {members.map((m, i) => (
            <div key={m.id} className="member-row slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="member-info">
                <div className="member-avatar">{m.user.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{m.user.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.user.email}</div>
                </div>
              </div>
              <div className="member-actions">
                <span className={`badge badge-${m.role.toLowerCase()}`}>{m.role}</span>
                <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleRemove(m.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <Modal title="Add Team Member" onClose={() => setShowModal(false)}>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="colleague@example.com" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Adding...' : 'Add Member'}</button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  );
}
