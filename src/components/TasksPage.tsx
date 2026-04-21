import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }

type Task = { id: number; title: string; description: string; status: string; priority: string; due_date: string | null; created_at: string; assigned_to: { id: number; username: string }; created_by: { id: number; username: string } };
type UserItem = { id: number; username: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Ожидает', color: '#f97316', bg: '#f9731620' },
  in_progress: { label: 'В работе', color: '#3b82f6', bg: '#3b82f620' },
  done: { label: 'Готово', color: '#22c55e', bg: '#22c55e20' },
  cancelled: { label: 'Отменено', color: '#6b7280', bg: '#6b728020' },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: string }> = {
  low: { label: 'Низкий', icon: '↓' },
  medium: { label: 'Средний', icon: '→' },
  high: { label: 'Высокий', icon: '↑' },
};

export default function TasksPage({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getTasks().then(r => setTasks(r.tasks || []));
    api.getUsers().then(r => setUsers(r.users || []));
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.addTask({
      ...form,
      assigned_to: form.assigned_to ? parseInt(form.assigned_to) : undefined,
      due_date: form.due_date || undefined
    });
    if (res.id) {
      const assignedUser = users.find(u => u.id === parseInt(form.assigned_to));
      setTasks(p => [{
        id: res.id, ...form, status: 'pending',
        due_date: form.due_date || null,
        created_at: new Date().toISOString(),
        assigned_to: { id: parseInt(form.assigned_to), username: assignedUser?.username || '' },
        created_by: { id: user.id, username: user.username }
      }, ...p]);
      setShowAdd(false);
      setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
    }
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    await api.updateTask(id, { status });
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
  };

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-montserrat font-800">Задания</h1>
          <p className="text-muted-foreground text-sm font-inter">{tasks.length} заданий</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-orange text-sm">
          <Icon name="Plus" size={16} />
          Новое задание
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['all', 'Все'], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} onClick={() => setFilterStatus(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-montserrat font-600 transition-all ${filterStatus === k ? 'btn-orange' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addTask} className="glass rounded-xl p-5 mb-6 animate-fade-in">
          <h3 className="font-montserrat font-700 mb-4">Новое задание</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Название</label>
              <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Название задания" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Описание</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400 resize-none"
                placeholder="Подробности задания" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Назначить</label>
              <select value={form.assigned_to} onChange={e => setForm(p => ({...p, assigned_to: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400">
                <option value="">Не назначено</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Приоритет</label>
              <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Срок</label>
              <input type="datetime-local" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg btn-orange text-sm disabled:opacity-50">
              {loading ? 'Создание...' : 'Создать'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-lg bg-muted text-sm hover:bg-accent">Отмена</button>
          </div>
        </form>
      )}

      {/* Tasks list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="ClipboardList" size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-inter">Заданий нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
            const pr = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
            return (
              <div key={t.id} className="glass rounded-xl p-4 card-hover">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-montserrat font-700 text-sm">{t.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-montserrat font-600" style={{background: sc.bg, color: sc.color}}>{sc.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-montserrat font-600 text-muted-foreground">{pr.icon} {pr.label}</span>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground font-inter mb-2 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-inter flex-wrap">
                      {t.assigned_to?.username && <span>👤 {t.assigned_to.username}</span>}
                      <span>✍️ {t.created_by?.username}</span>
                      {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString('ru-RU')}</span>}
                    </div>
                  </div>
                  <select
                    value={t.status}
                    onChange={e => updateStatus(t.id, e.target.value)}
                    className="text-xs px-2 py-1.5 rounded-lg bg-muted border border-border font-montserrat font-600 focus:outline-none focus:border-orange-400 flex-shrink-0"
                    style={{color: sc.color}}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
