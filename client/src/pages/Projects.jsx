import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Modal from '../components/Modal';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = () => {
    api.get('/projects').then(r => setProjects(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(fetchProjects, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/projects', form);
      setShowModal(false);
      setForm({ name: '', description: '', color: '#6366f1' });
      fetchProjects();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <>
      <div className="topbar">
        <h2>Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>
      <div className="page-content fade-in">
        <div className="page-header">
          <h1>Your Projects</h1>
          <p>Manage your team projects and track progress</p>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>+ Create Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((p, i) => {
              const progress = p.task_count > 0 ? (p.completed_count / p.task_count * 100) : 0;
              return (
                <div key={p.id} className="project-card slide-up" style={{ '--project-color': p.color, animationDelay: `${i * 0.05}s` }} onClick={() => navigate(`/projects/${p.id}`)}>
                  <h3>{p.name}</h3>
                  <p>{p.description || 'No description'}</p>
                  <div className="project-meta">
                    <span>👥 {p.member_count} members</span>
                    <span>📋 {p.task_count} tasks</span>
                    <span>✅ {p.completed_count} done</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <Modal title="Create Project" onClose={() => setShowModal(false)}>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Website Redesign" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this project about?" />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setForm({ ...form, color: c })}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', transition: 'transform 0.15s' }}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Project'}</button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  );
}
