import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../utils/api';

const STATUS_COLORS = { TODO: '#3b82f6', IN_PROGRESS: '#f59e0b', IN_REVIEW: '#a855f7', DONE: '#22c55e' };
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/my-tasks')])
      .then(([s, t]) => { setStats(s.data); setMyTasks(t.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  const chartData = stats ? Object.entries(stats.status_distribution)
    .map(([key, val]) => ({ name: STATUS_LABELS[key] || key, value: val, color: STATUS_COLORS[key] || '#64748b' }))
    .filter(d => d.value > 0) : [];

  const isOverdue = (d) => d && new Date(d) < new Date();

  return (
    <>
      <div className="topbar"><h2>Dashboard</h2></div>
      <div className="page-content fade-in">
        <div className="page-header">
          <h1>Overview</h1>
          <p>Track your projects and tasks at a glance</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card slide-up">
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>📁</div>
            <div className="stat-info"><h3>{stats?.total_projects || 0}</h3><p>Total Projects</p></div>
          </div>
          <div className="stat-card slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>📋</div>
            <div className="stat-info"><h3>{stats?.total_tasks || 0}</h3><p>Total Tasks</p></div>
          </div>
          <div className="stat-card slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>✅</div>
            <div className="stat-info"><h3>{stats?.completion_rate || 0}%</h3><p>Completion Rate</p></div>
          </div>
          <div className="stat-card slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>⏰</div>
            <div className="stat-info"><h3>{stats?.overdue_tasks || 0}</h3><p>Overdue Tasks</p></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Status Distribution</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="empty-state"><p>No tasks yet</p></div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {chartData.map(d => (
                <span key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block' }}></span>
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>

          <div className="card slide-up" style={{ animationDelay: '0.25s' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>My Assigned Tasks</h3>
            {myTasks.length === 0 ? (
              <div className="empty-state"><p>No tasks assigned to you</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
                {myTasks.slice(0, 10).map(task => (
                  <div key={task.id} className="task-card" onClick={() => navigate(`/projects/${task.project_id}`)}>
                    <h4>{task.title}</h4>
                    <div className="task-card-meta">
                      <span className={`badge badge-${task.status.toLowerCase().replace('_', '-')}`}>{STATUS_LABELS[task.status]}</span>
                      {task.due_date && (
                        <span className={`due-date ${isOverdue(task.due_date) && task.status !== 'DONE' ? 'overdue' : ''}`}>
                          📅 {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
