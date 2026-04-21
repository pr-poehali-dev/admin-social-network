import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }
type Task = { id: number; title: string; description: string; status: string; priority: string; due_date: string | null; created_at: string; assigned_to: { id: number; username: string }; created_by: { id: number; username: string } };
type UserItem = { id: number; username: string };

const STATUS: Record<string, { label: string; color: string; icon: string }> = {
  pending:     { label: 'Ожидает',  color: 'hsl(24 95% 56%)', icon: 'Clock' },
  in_progress: { label: 'В работе', color: '#60a5fa',          icon: 'Zap' },
  done:        { label: 'Готово',   color: '#34d399',          icon: 'CheckCircle' },
  cancelled:   { label: 'Отменено', color: '#6b7280',          icon: 'XCircle' },
};
const PRIORITY: Record<string, { label: string; color: string }> = {
  low:    { label: 'Низкий',   color: '#6b7280' },
  medium: { label: 'Средний',  color: 'hsl(24 95% 56%)' },
  high:   { label: 'Высокий', color: '#f87171' },
};

export default function TasksPage({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    Promise.all([api.getTasks(), api.getUsers()]).then(([t, u]) => {
      setTasks(t.tasks || []);
      setUsers(u.users || []);
      setFetching(false);
    });
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await api.addTask({
      title: form.title,
      description: form.description,
      assigned_to: form.assigned_to ? parseInt(form.assigned_to) : undefined,
      priority: form.priority,
      due_date: form.due_date || undefined,
    });
    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      const assignedUser = users.find(u => u.id === parseInt(form.assigned_to));
      setTasks(p => [{
        id: res.id, title: form.title, description: form.description,
        status: 'pending', priority: form.priority,
        due_date: form.due_date || null, created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assigned_to: { id: parseInt(form.assigned_to), username: assignedUser?.username || 'Не назначено' },
        created_by: { id: user.id, username: user.username }
      }, ...p]);
      setShowAdd(false);
      setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
    }
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await api.updateTask(id, { status });
    if (!res.error) setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const counts: Record<string, number> = { all: tasks.length };
  Object.keys(STATUS).forEach(s => { counts[s] = tasks.filter(t => t.status === s).length; });

  return (
    <div className="p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">📋 Задания</h1>
          <p className="text-sm text-muted-foreground font-inter mt-0.5">{tasks.length} заданий в системе</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary px-4 py-2.5 rounded-xl text-sm">
          <Icon name="Plus" size={15} /> Новое задание
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-montserrat font-bold transition-all ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}>
          Все {counts.all > 0 && `(${counts.all})`}
        </button>
        {Object.entries(STATUS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-montserrat font-bold transition-all ${filter === k ? '' : 'btn-ghost'}`}
            style={filter === k ? { background: v.color + '20', color: v.color, border: `1px solid ${v.color}40` } : {}}>
            {v.label} {counts[k] > 0 && `(${counts[k]})`}
          </button>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={addTask} className="card-base p-5 mb-6 animate-scale">
          <h3 className="font-montserrat font-bold mb-4">Создать задание</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <span className="label-xs">Название *</span>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                className="input-field" placeholder="Что нужно сделать?" />
            </div>
            <div className="sm:col-span-2">
              <span className="label-xs">Описание</span>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                className="input-field resize-none" style={{ lineHeight: '1.6' }} placeholder="Подробности задания..." />
            </div>
            <div>
              <span className="label-xs">Назначить администратору</span>
              <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                className="input-field appearance-none">
                <option value="">Не назначено</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div>
              <span className="label-xs">Приоритет</span>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="input-field appearance-none">
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <span className="label-xs">Срок выполнения</span>
              <input type="datetime-local" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="input-field" />
            </div>
          </div>
          {error && <p className="text-destructive text-sm font-inter mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Создание...</> : '✓ Создать задание'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError(''); }}
              className="btn-ghost px-5 py-2.5 rounded-xl text-sm">Отмена</button>
          </div>
        </form>
      )}

      {fetching ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-base p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Icon name="ClipboardList" size={52} className="mx-auto mb-4 opacity-10" />
          <p className="font-montserrat font-bold text-lg mb-1">
            {filter === 'all' ? 'Заданий пока нет' : `Нет заданий со статусом «${STATUS[filter]?.label}»`}
          </p>
          <p className="text-sm font-inter">Создайте первое задание</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const s = STATUS[t.status] || STATUS.pending;
            const pr = PRIORITY[t.priority] || PRIORITY.medium;
            const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
            return (
              <div key={t.id} className="card-base p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: s.color + '15' }}>
                  <Icon name={s.icon as Parameters<typeof Icon>[0]['name']} size={15} style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-montserrat font-bold text-sm">{t.title}</span>
                    <span className="badge" style={{ background: pr.color + '18', color: pr.color }}>{pr.label}</span>
                    {isOverdue && <span className="badge" style={{ background: '#f8717115', color: '#f87171' }}>⏰ Просрочено</span>}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground font-inter leading-relaxed mb-2 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-inter flex-wrap">
                    <span>👤 {t.assigned_to?.username || 'Не назначено'}</span>
                    <span>✍️ {t.created_by?.username}</span>
                    {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString('ru-RU')}</span>}
                  </div>
                </div>
                <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl font-montserrat font-bold focus:outline-none cursor-pointer flex-shrink-0"
                  style={{ background: s.color + '18', color: s.color, border: `1px solid ${s.color}35` }}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
