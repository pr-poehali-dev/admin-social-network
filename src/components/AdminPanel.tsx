import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User; onUpdate: (u: User) => void }

type UserItem = { id: number; username: string; email: string; role: string; verified: boolean; donate_level: number; is_active: boolean; created_at: string };

const TABS = [
  { id: 'users', label: 'Пользователи', icon: 'Users' },
  { id: 'chats', label: 'Чаты', icon: 'MessageSquare' },
  { id: 'news', label: 'Новости', icon: 'Newspaper' },
  { id: 'donate', label: 'Донаты', icon: 'Gift' },
];

export default function AdminPanel({ user }: Props) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', pinned: false });
  const [chatForm, setChatForm] = useState({ name: '', description: '', type: 'group' });
  const [donateForm, setDonateForm] = useState({ user_id: '', level: 1, note: '', expires_at: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => { api.getUsers().then(r => setUsers(r.users || [])); }, []);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const updateUserRole = async (uid: number, role: string) => {
    await api.updateUser(uid, { role });
    setUsers(p => p.map(u => u.id === uid ? { ...u, role } : u));
    showSuccess('Роль обновлена');
  };

  const toggleActive = async (uid: number, is_active: boolean) => {
    await api.updateUser(uid, { is_active });
    setUsers(p => p.map(u => u.id === uid ? { ...u, is_active } : u));
    showSuccess(is_active ? 'Пользователь активирован' : 'Пользователь заблокирован');
  };

  const toggleVerified = async (uid: number, verified: boolean) => {
    await api.updateUser(uid, { verified });
    setUsers(p => p.map(u => u.id === uid ? { ...u, verified } : u));
    showSuccess(verified ? 'Галочка выдана ✅' : 'Галочка снята');
  };

  const createChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.createChat(chatForm);
    if (res.chat_id) { showSuccess('Чат создан!'); setChatForm({ name: '', description: '', type: 'group' }); }
    setLoading(false);
  };

  const publishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.addNews(newsForm);
    if (res.id) { showSuccess('Новость опубликована!'); setNewsForm({ title: '', content: '', pinned: false }); }
    setLoading(false);
  };

  const grantDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donateForm.user_id) return;
    setLoading(true);
    const res = await api.addDonation({ ...donateForm, user_id: parseInt(donateForm.user_id), amount: donateForm.level * 100 });
    if (res.id) {
      setUsers(p => p.map(u => u.id === parseInt(donateForm.user_id) ? { ...u, donate_level: donateForm.level } : u));
      showSuccess('Донат выдан!');
      setDonateForm({ user_id: '', level: 1, note: '', expires_at: '' });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl btn-orange flex items-center justify-center">
          <Icon name="Settings" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-montserrat font-800">Панель управления</h1>
          <p className="text-xs text-muted-foreground font-inter">Только для Главного Администратора</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 animate-fade-in" style={{background: '#22c55e15', border: '1px solid #22c55e30'}}>
          <Icon name="CheckCircle" size={16} style={{color: '#22c55e'}} />
          <span className="text-sm font-inter" style={{color: '#22c55e'}}>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-montserrat font-600 whitespace-nowrap transition-all ${tab === t.id ? 'btn-orange' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon name={t.icon as Parameters<typeof Icon>[0]['name']} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-inter">{users.length} пользователей в системе</p>
          {users.map(u => (
            <div key={u.id} className="glass rounded-xl p-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-montserrat font-700 flex-shrink-0"
                style={{background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)'}}>
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-montserrat font-700 text-sm">{u.username}</span>
                  {u.verified && <span className="text-xs">✅</span>}
                  {u.donate_level > 0 && <span className="text-xs">{['','💙','💜','🔥'][Math.min(u.donate_level,3)]}</span>}
                  {!u.is_active && <span className="text-xs px-2 py-0.5 rounded-full" style={{background: '#ef444415', color: '#ef4444'}}>Заблокирован</span>}
                </div>
                <p className="text-xs text-muted-foreground font-inter">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Role */}
                <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value)}
                  disabled={u.id === user.id}
                  className="text-xs px-2 py-1.5 rounded-lg bg-muted border border-border font-montserrat font-600 focus:outline-none cursor-pointer disabled:opacity-50"
                  style={{color: u.role === 'superadmin' ? '#f97316' : undefined}}>
                  <option value="admin">Админ</option>
                  <option value="superadmin">Главный Админ</option>
                </select>
                {/* Verified */}
                <button onClick={() => toggleVerified(u.id, !u.verified)}
                  className="text-xs px-3 py-1.5 rounded-lg font-montserrat font-600 transition-all"
                  title={u.verified ? 'Снять галочку' : 'Выдать галочку'}
                  style={{background: u.verified ? '#22c55e15' : 'hsl(20 8% 18%)', color: u.verified ? '#22c55e' : undefined}}>
                  {u.verified ? '✅ Снять' : '☑ Выдать'}
                </button>
                {/* Block/Unblock */}
                {u.id !== user.id && (
                  <button onClick={() => toggleActive(u.id, !u.is_active)}
                    className="text-xs px-3 py-1.5 rounded-lg font-montserrat font-600 transition-all"
                    style={{background: u.is_active ? '#ef444415' : '#22c55e15', color: u.is_active ? '#ef4444' : '#22c55e'}}>
                    {u.is_active ? 'Блок' : 'Разбл.'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chats tab */}
      {tab === 'chats' && (
        <form onSubmit={createChat} className="glass rounded-xl p-5 max-w-lg">
          <h3 className="font-montserrat font-700 mb-4">Создать новый чат</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Название</label>
              <input value={chatForm.name} onChange={e => setChatForm(p => ({...p, name: e.target.value}))} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Название чата" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Описание</label>
              <input value={chatForm.description} onChange={e => setChatForm(p => ({...p, description: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Описание чата" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="mt-4 px-5 py-2.5 rounded-lg btn-orange text-sm disabled:opacity-50">
            {loading ? 'Создание...' : 'Создать чат'}
          </button>
        </form>
      )}

      {/* News tab */}
      {tab === 'news' && (
        <form onSubmit={publishNews} className="glass rounded-xl p-5 max-w-lg">
          <h3 className="font-montserrat font-700 mb-4">Опубликовать новость</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Заголовок</label>
              <input value={newsForm.title} onChange={e => setNewsForm(p => ({...p, title: e.target.value}))} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Заголовок новости" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Текст</label>
              <textarea value={newsForm.content} onChange={e => setNewsForm(p => ({...p, content: e.target.value}))} required rows={4}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400 resize-none"
                placeholder="Текст новости..." />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newsForm.pinned} onChange={e => setNewsForm(p => ({...p, pinned: e.target.checked}))}
                className="w-4 h-4 accent-orange-500" />
              <span className="text-sm font-inter">Закрепить новость</span>
            </label>
          </div>
          <button type="submit" disabled={loading} className="mt-4 px-5 py-2.5 rounded-lg btn-orange text-sm disabled:opacity-50">
            {loading ? 'Публикация...' : 'Опубликовать'}
          </button>
        </form>
      )}

      {/* Donate tab */}
      {tab === 'donate' && (
        <form onSubmit={grantDonate} className="glass rounded-xl p-5 max-w-lg">
          <h3 className="font-montserrat font-700 mb-4">Выдать донат пользователю</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Пользователь</label>
              <select value={donateForm.user_id} onChange={e => setDonateForm(p => ({...p, user_id: e.target.value}))} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400">
                <option value="">Выберите пользователя</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Уровень</label>
              <div className="grid grid-cols-4 gap-2">
                {[0,1,2,3].map(l => (
                  <button key={l} type="button" onClick={() => setDonateForm(p => ({...p, level: l}))}
                    className="py-2 rounded-lg text-sm font-montserrat font-700 transition-all"
                    style={donateForm.level === l ? {background: '#f9731620', color: '#f97316', border: '1px solid #f9731640'} : {background: 'hsl(20 8% 18%)'}}>
                    {['⬜ 0','💙 1','💜 2','🔥 3'][l]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Заметка</label>
              <input value={donateForm.note} onChange={e => setDonateForm(p => ({...p, note: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Причина/заметка" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Действует до</label>
              <input type="datetime-local" value={donateForm.expires_at} onChange={e => setDonateForm(p => ({...p, expires_at: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          <button type="submit" disabled={loading || !donateForm.user_id} className="mt-4 px-5 py-2.5 rounded-lg btn-orange text-sm disabled:opacity-50">
            {loading ? 'Выдача...' : 'Выдать донат'}
          </button>
        </form>
      )}
    </div>
  );
}
