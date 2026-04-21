import { useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User; onUpdate: (u: User) => void }

export default function ProfilePage({ user, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio: user.bio || '', avatar_url: user.avatar_url || '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.updateUser(user.id, form);
    if (res.user) {
      onUpdate({ ...user, ...res.user });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    }
    setLoading(false);
  };

  const donateLevels = ['', '💙 Поддержка', '💜 Продвинутый', '🔥 Элита'];
  const roleLabel = user.role === 'superadmin' ? 'Главный Администратор' : 'Администратор';
  const roleColor = user.role === 'superadmin' ? '#f97316' : '#6b7280';

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-montserrat font-800 mb-6">Мой профиль</h1>

      {/* Profile card */}
      <div className="glass rounded-2xl p-6 mb-5">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username}
                className="w-20 h-20 rounded-2xl object-cover border-2"
                style={{borderColor: 'hsl(25 95% 53% / 0.4)'}} />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-montserrat font-900"
                style={{background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)', border: '2px solid hsl(25 95% 53% / 0.3)'}}>
                {initials}
              </div>
            )}
            {user.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{background: 'linear-gradient(135deg, #f97316, #fb923c)'}}>
                ✓
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-montserrat font-800">{user.username}</h2>
              {user.verified && <span className="text-xs px-2 py-0.5 rounded-full font-montserrat font-600" style={{background: '#f9731615', color: '#f97316'}}>✅ Верифицирован</span>}
              {user.donate_level > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-montserrat font-600" style={{background: '#6b728015', color: '#9ca3af'}}>
                  {donateLevels[Math.min(user.donate_level, 3)]}
                </span>
              )}
            </div>
            <p className="text-sm font-inter mb-1" style={{color: roleColor}}>{roleLabel}</p>
            <p className="text-xs text-muted-foreground font-inter mb-3">{user.email}</p>
            {user.bio && <p className="text-sm text-muted-foreground font-inter">{user.bio}</p>}
          </div>
        </div>

        {saved && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{background: '#22c55e15', border: '1px solid #22c55e30'}}>
            <Icon name="Check" size={14} style={{color: '#22c55e'}} />
            <span className="text-sm font-inter" style={{color: '#22c55e'}}>Сохранено!</span>
          </div>
        )}

        <button onClick={() => setEditing(!editing)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-inter transition-all"
          style={{background: 'hsl(20 8% 18%)', color: editing ? 'hsl(25 95% 53%)' : undefined}}>
          <Icon name="Edit2" size={14} />
          {editing ? 'Отменить' : 'Редактировать'}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={save} className="glass rounded-xl p-5 animate-fade-in">
          <h3 className="font-montserrat font-700 mb-4">Редактирование профиля</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">URL аватара</label>
              <input value={form.avatar_url} onChange={e => setForm(p => ({...p, avatar_url: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="https://example.com/avatar.jpg" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">О себе</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({...p, bio: e.target.value}))} rows={3}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400 resize-none"
                placeholder="Расскажите о себе..." />
            </div>
          </div>
          <button type="submit" disabled={loading} className="mt-4 px-5 py-2.5 rounded-lg btn-orange text-sm disabled:opacity-50">
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-5">
        {[
          { label: 'Уровень доната', value: user.donate_level, icon: 'Gift' },
          { label: 'Роль', value: user.role === 'superadmin' ? 'SA' : 'ADM', icon: 'Shield' },
          { label: 'Статус', value: user.verified ? '✓ Верифицирован' : 'Обычный', icon: 'BadgeCheck' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <Icon name={s.icon as Parameters<typeof Icon>[0]['name']} size={20} className="mx-auto mb-2" style={{color: 'hsl(25 95% 53%)'}} />
            <p className="font-montserrat font-700 text-sm">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-inter mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
