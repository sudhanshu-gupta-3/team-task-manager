import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', assignee_id: '', due_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const fetchData = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`)
      ]);
      setProject(pRes.data);
      setTasks(tRes.data);
      const myMembership = pRes.data.members?.find(m => m.user.id === user?.id);
      setUserRole(myMembership?.role || null);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...taskForm };
      if (!payload.assignee_id) delete payload.assignee_id;
      if (!payload.due_date) delete payload.due_date;
      else payload.due_date = new Date(payload.due_date).toISOString();
      await api.post(`/projects/${id}/tasks`, payload);
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', assignee_id: '', due_date: '' });
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await api.put(`/projects/${id}/tasks/${taskId}`, { status: newStatus });
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...taskForm };
      if (!payload.assignee_id) payload.assignee_id = null;
      if (!payload.due_date) payload.due_date = null;
      else payload.due_date = new Date(payload.due_date).toISOString();
      await api.put(`/projects/${id}/tasks/${editingTask}`, payload);
      setEditingTask(null);
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', assignee_id: '', due_date: '' });
      fetchData();
    } catch (err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setSubmitting(false); }
  };

  const openEditTask = (task) => {
    setEditingTask(task.id);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignee_id: task.assignee_id || '',
      due_date: task.due_date ? task.due_date.slice(0, 16) : '',
    });
    setShowTaskModal(true);
  };

  const isOverdue = (d) => d && new Date(d) < new Date();
  const isAdmin = userRole === 'ADMIN';

  if (loading) return <div className="loader"><div className="spinner"></div></div>;
  if (!project) return null;

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Back</button>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: project.color, display: 'inline-block' }}></span>
            {project.name}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/projects/${id}/team`)}>👥 Team</button>}
          {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', priority: 'MEDIUM', assignee_id: '', due_date: '' }); setShowTaskModal(true); }}>+ Add Task</button>}
        </div>
      </div>
      <div className="page-content fade-in">
        {project.description && <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{project.description}</p>}

        <div className="kanban-board">
          {STATUSES.map(status => {
            const colTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="kanban-column">
                <div className="kanban-column-header">
                  <span>{STATUS_LABELS[status]}</span>
                  <span className="count">{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <div key={task.id} className="task-card">
                    <h4>{task.title}</h4>
                    {task.description && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>}
                    <div className="task-card-meta">
                      <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                      {task.due_date && (
                        <span className={`due-date ${isOverdue(task.due_date) && task.status !== 'DONE' ? 'overdue' : ''}`}>
                          📅 {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.assignee && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', fontWeight: 700 }}>
                          {task.assignee.name?.[0]?.toUpperCase()}
                        </span>
                        {task.assignee.name}
                      </div>
                    )}
                    <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {status !== 'DONE' && (
                        <select className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '0.25rem 0.4rem', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-secondary)' }}
                          value={status} onChange={(e) => handleUpdateStatus(task.id, e.target.value)}>
                          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      )}
                      {isAdmin && (
                        <>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }} onClick={() => openEditTask(task)}>✏️</button>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', color: 'var(--accent-red)' }} onClick={() => handleDeleteTask(task.id)}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No tasks</div>}
              </div>
            );
          })}
        </div>

        {showTaskModal && (
          <Modal title={editingTask ? 'Edit Task' : 'Create Task'} onClose={() => { setShowTaskModal(false); setEditingTask(null); }}>
            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask}>
              <div className="form-group">
                <label>Title</label>
                <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required placeholder="Task title" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {editingTask && (
                  <div className="form-group">
                    <label>Status</label>
                    <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select value={taskForm.assignee_id} onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {project.members?.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name} ({m.role})</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowTaskModal(false); setEditingTask(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}</button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </>
  );
}
