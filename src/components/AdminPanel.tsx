import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User; onUpdate: (u: User) => void }
type UserItem = { id: number; username: string; email: string; role: string; verified: boolean; donate_level: number; is_active: boolean };

const TABS = [
  { id: 'users',  label: 'Пользователи', icon: 'Users' },
  { id: 'chats',  label: 'Чаты',         icon: 'MessageSquare' },
  { id: 'news',   label: 'Новости',       icon: 'Newspaper' },
  { id: 'donate', label: 'Донаты',        icon: 'Gift' },
];

export default function AdminPanel({ user }: Props) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', pinned: false });
  const [chatForm, setChatForm] = useState({ name: '', description: '' });
  const [donateForm, setDonateForm] = useState({ user_id: '', level: 1, note: '', expires_at: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.getUsers().then(r => { setUsers(r.users || []); setFetching(false); });
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const updateUser = async (uid: number, data: object, optimistic: Partial<UserItem>) => {
    setUsers(p => p.map(u => u.id === uid ? { ...u, ...optimistic } : u));
    const res = await api.updateUser(uid, data);
    if (res.error) {
      showToast('Ошибка: ' + res.error);
      api.getUsers().then(r => setUsers(r.users || []));
    } else {
      showToast('✓ Изменения сохранены');
    }
  };

  const createChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.createChat({ ...chatForm, type: 'group' });
    if (res.error) { showToast('Ошибка: ' + res.error); }
    else { showToast('✓ Чат создан!'); setChatForm({ name: '', description: '' }); }
    setLoading(false);
  };

  const publishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.addNews(newsForm);
    if (res.error) { showToast('Ошибка: ' + res.error); }
    else { showToast('✓ Новость опубликована!'); setNewsForm({ title: '', content: '', pinned: false }); }
    setLoading(false);
  };

  const grantDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donateForm.user_id) return;
    setLoading(true);
    const res = await api.addDonation({
      user_id: parseInt(donateForm.user_id),
      level: donateForm.level,
      note: donateForm.note,
      expires_at: donateForm.expires_at || undefined,
      amount: donateForm.level * 100,
    });
    if (res.error) {
      showToast('Ошибка: ' + res.error);
    } else {
      setUsers(p => p.map(u => u.id === parseInt(donateForm.user_id) ? { ...u, donate_level: donateForm.level } : u));
      showToast('✓ Донат выдан!');
      setDonateForm({ user_id: '', level: 1, note: '', expires_at: '' });
    }
    setLoading(false);
  };

  const DONATE_LEVELS = [
    { level: 0, icon: '⬜', label: 'Базовый', color: '#6b7280' },
    { level: 1, icon: '💙', label: 'Поддержка', color: '#60a5fa' },
    { level: 2, icon: '💜', label: 'Продвинутый', color: '#a78bfa' },
    { level: 3, icon: '🔥', label: 'Элита', color: 'hsl(24 95% 56%)' },
  ];

  return (
    <div className="p-6 animate-fade-up">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl font-inter text-sm animate-scale"
          style={{ background: toast.startsWith('Ошибка') ? 'hsl(0 72% 51% / 0.15)' : 'hsl(18 8% 14%)', border: `1px solid ${toast.startsWith('Ошибка') ? 'hsl(0 72% 51% / 0.3)' : 'hsl(18 8% 22%)'}`, color: toast.startsWith('Ошибка') ? '#f87171' : '#34d399' }}>
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl btn-primary flex items-center justify-center glow-orange">
          <Icon name="Settings" size={20} />
        </div>
        <div>
          <h1 className="section-title">Панель управления</h1>
          <p className="text-xs text-muted-foreground font-inter">Только Главный Администратор</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto" style={{ background: 'hsl(18 8% 11%)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-montserrat font-bold whitespace-nowrap transition-all flex-shrink-0 ${tab === t.id ? 'btn-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon name={t.icon as Parameters<typeof Icon>[0]['name']} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* USERS */}
      {tab === 'users' && (
        <div>
          <p className="text-xs text-muted-foreground font-inter mb-4">{users.length} пользователей в системе</p>
          {fetching ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-base h-16 animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Icon name="Users" size={40} className="mx-auto mb-3 opacity-10" />
              <p className="font-inter text-sm">Пользователей ещё нет</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {users.map(u => (
                <div key={u.id} className="card-base p-4 flex items-center gap-3 flex-wrap">
                  <div className="avatar-base w-10 h-10 rounded-xl text-sm flex-shrink-0">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-montserrat font-bold text-sm">{u.username}</span>
                      {u.verified && <span className="text-xs">✅</span>}
                      {u.donate_level > 0 && <span className="text-xs">{['','💙','💜','🔥'][Math.min(u.donate_level,3)]}</span>}
                      {!u.is_active && <span className="badge" style={{ background: '#f8717115', color: '#f87171' }}>Заблокирован</span>}
                    </div>
                    <p className="text-xs text-muted-foreground font-inter">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={u.role}
                      onChange={e => updateUser(u.id, { role: e.target.value }, { role: e.target.value })}
                      disabled={u.id === user.id}
                      className="text-xs px-2.5 py-1.5 rounded-xl font-montserrat font-bold focus:outline-none cursor-pointer disabled:opacity-40"
                      style={{ background: u.role === 'superadmin' ? 'hsl(24 95% 53% / 0.15)' : 'hsl(18 8% 14%)', color: u.role === 'superadmin' ? 'hsl(24 95% 58%)' : 'hsl(30 15% 65%)', border: '1px solid hsl(18 8% 20%)' }}>
                      <option value="admin">Администратор</option>
                      <option value="superadmin">Главный Админ</option>
                    </select>
                    <button
                      onClick={() => updateUser(u.id, { verified: !u.verified }, { verified: !u.verified })}
                      title={u.verified ? 'Снять верификацию' : 'Верифицировать'}
                      className="btn-ghost px-3 py-1.5 rounded-xl text-xs font-montserrat font-bold"
                      style={u.verified ? { background: '#34d39915', color: '#34d399', borderColor: '#34d39930' } : {}}>
                      {u.verified ? '✅ Снять' : '✓ Верифицировать'}
                    </button>
                    {u.id !== user.id && (
                      <button
                        onClick={() => updateUser(u.id, { is_active: !u.is_active }, { is_active: !u.is_active })}
                        className="btn-ghost px-3 py-1.5 rounded-xl text-xs font-montserrat font-bold"
                        style={u.is_active ? { color: '#f87171' } : { background: '#34d39915', color: '#34d399' }}>
                        {u.is_active ? 'Блокировать' : 'Разблокировать'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHATS */}
      {tab === 'chats' && (
        <form onSubmit={createChat} className="card-base p-5 max-w-lg">
          <h3 className="font-montserrat font-bold mb-4">Создать групповой чат</h3>
          <div className="space-y-4">
            <div>
              <span className="label-xs">Название *</span>
              <input value={chatForm.name} onChange={e => setChatForm(p => ({ ...p, name: e.target.value }))} required
                className="input-field" placeholder="Название чата" />
            </div>
            <div>
              <span className="label-xs">Описание</span>
              <input value={chatForm.description} onChange={e => setChatForm(p => ({ ...p, description: e.target.value }))}
                className="input-field" placeholder="Краткое описание" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-inter mt-3">Все активные пользователи будут автоматически добавлены в чат</p>
          <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 rounded-xl text-sm mt-4">
            {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Создание...</> : '+ Создать чат'}
          </button>
        </form>
      )}

      {/* NEWS */}
      {tab === 'news' && (
        <form onSubmit={publishNews} className="card-base p-5 max-w-lg">
          <h3 className="font-montserrat font-bold mb-4">Опубликовать новость</h3>
          <div className="space-y-4">
            <div>
              <span className="label-xs">Заголовок *</span>
              <input value={newsForm.title} onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))} required
                className="input-field" placeholder="Заголовок новости" />
            </div>
            <div>
              <span className="label-xs">Текст *</span>
              <textarea value={newsForm.content} onChange={e => setNewsForm(p => ({ ...p, content: e.target.value }))} required rows={5}
                className="input-field resize-none" style={{ lineHeight: '1.7' }} placeholder="Напишите текст новости..." />
            </div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-colors hover:bg-muted/50">
              <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${newsForm.pinned ? 'btn-primary' : 'border-2'}`}
                style={!newsForm.pinned ? { borderColor: 'hsl(18 8% 25%)' } : {}}>
                {newsForm.pinned && <Icon name="Check" size={11} />}
              </div>
              <input type="checkbox" className="hidden" checked={newsForm.pinned}
                onChange={e => setNewsForm(p => ({ ...p, pinned: e.target.checked }))} />
              <div>
                <p className="text-sm font-inter font-medium">Закрепить новость</p>
                <p className="text-xs text-muted-foreground font-inter">Будет показана вверху списка</p>
              </div>
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 rounded-xl text-sm mt-4">
            {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Публикация...</> : '📢 Опубликовать'}
          </button>
        </form>
      )}

      {/* DONATE */}
      {tab === 'donate' && (
        <form onSubmit={grantDonate} className="card-base p-5 max-w-lg">
          <h3 className="font-montserrat font-bold mb-4">Выдать донат пользователю</h3>
          <div className="space-y-4">
            <div>
              <span className="label-xs">Пользователь *</span>
              <select value={donateForm.user_id} onChange={e => setDonateForm(p => ({ ...p, user_id: e.target.value }))} required
                className="input-field appearance-none">
                <option value="">— Выберите пользователя —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email}) {u.donate_level > 0 ? `· Уровень ${u.donate_level}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label-xs">Уровень доната</span>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {DONATE_LEVELS.map(l => (
                  <button key={l.level} type="button" onClick={() => setDonateForm(p => ({ ...p, level: l.level }))}
                    className="py-2.5 rounded-xl text-xs font-montserrat font-bold transition-all"
                    style={donateForm.level === l.level
                      ? { background: l.color + '20', color: l.color, border: `1px solid ${l.color}40` }
                      : { background: 'hsl(18 8% 13%)', color: 'hsl(30 10% 48%)', border: '1px solid hsl(18 8% 18%)' }}>
                    <div className="text-base mb-0.5">{l.icon}</div>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label-xs">Заметка (необязательно)</span>
              <input value={donateForm.note} onChange={e => setDonateForm(p => ({ ...p, note: e.target.value }))}
                className="input-field" placeholder="Причина выдачи..." />
            </div>
            <div>
              <span className="label-xs">Действует до (необязательно)</span>
              <input type="datetime-local" value={donateForm.expires_at}
                onChange={e => setDonateForm(p => ({ ...p, expires_at: e.target.value }))}
                className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={loading || !donateForm.user_id}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm mt-4">
            {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Выдача...</> : '🎁 Выдать донат'}
          </button>
        </form>
      )}
    </div>
  );
}
