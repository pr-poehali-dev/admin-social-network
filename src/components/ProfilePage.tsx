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
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await api.updateUser(user.id, form);
    if (res.error) {
      setError(res.error);
    } else if (res.user) {
      onUpdate({ ...user, ...res.user });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  };

  const initials = user.username.slice(0, 2).toUpperCase();
  const donateLabel = ['', '💙 Поддержка', '💜 Продвинутый', '🔥 Элита'][Math.min(user.donate_level, 3)];
  const roleColor = user.role === 'superadmin' ? 'hsl(24 95% 56%)' : '#6b7280';
  const roleLabel = user.role === 'superadmin' ? '👑 Главный Администратор' : '🛡 Администратор';

  return (
    <div className="p-6 max-w-2xl animate-fade-up">
      <h1 className="section-title mb-6">👤 Мой профиль</h1>

      {/* Main card */}
      <div className="card-base p-6 mb-5 animate-fade-up stagger-1">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username}
                className="w-20 h-20 rounded-2xl object-cover"
                style={{ border: '2px solid hsl(24 95% 53% / 0.35)' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="avatar-base w-20 h-20 rounded-2xl text-2xl">
                {initials}
              </div>
            )}
            {user.verified && (
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, hsl(24 95% 53%), hsl(20 90% 45%))' }}>
                ✓
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h2 className="text-xl font-montserrat font-black">{user.username}</h2>
              {user.verified && (
                <span className="badge" style={{ background: '#34d39918', color: '#34d399' }}>✅ Верифицирован</span>
              )}
              {user.donate_level > 0 && (
                <span className="badge" style={{ background: 'hsl(24 95% 53% / 0.12)', color: 'hsl(24 95% 58%)' }}>
                  {donateLabel}
                </span>
              )}
            </div>
            <p className="text-sm font-medium font-inter mb-1" style={{ color: roleColor }}>{roleLabel}</p>
            <p className="text-xs text-muted-foreground font-inter mb-3">{user.email}</p>
            {user.bio ? (
              <p className="text-sm text-muted-foreground font-inter leading-relaxed">{user.bio}</p>
            ) : !editing && (
              <p className="text-xs text-muted-foreground font-inter italic opacity-50">Биография не заполнена</p>
            )}
          </div>
        </div>

        {saved && (
          <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
            style={{ background: '#34d39915', border: '1px solid #34d39930' }}>
            <Icon name="CheckCircle" size={15} style={{ color: '#34d399' }} />
            <span className="text-sm font-inter" style={{ color: '#34d399' }}>Профиль обновлён!</span>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={() => setEditing(!editing)}
            className={`btn-ghost px-4 py-2 rounded-xl text-sm ${editing ? 'text-muted-foreground' : ''}`}>
            <Icon name="Edit2" size={14} />
            {editing ? 'Отменить' : 'Редактировать'}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={save} className="card-base p-5 mb-5 animate-scale">
          <h3 className="font-montserrat font-bold mb-4">Редактирование профиля</h3>
          <div className="space-y-4">
            <div>
              <span className="label-xs">URL аватара</span>
              <input value={form.avatar_url} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
                className="input-field" placeholder="https://example.com/avatar.jpg" />
              {form.avatar_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.avatar_url} alt="preview" className="w-10 h-10 rounded-xl object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-xs text-muted-foreground font-inter">Предпросмотр</span>
                </div>
              )}
            </div>
            <div>
              <span className="label-xs">О себе</span>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                className="input-field resize-none" style={{ lineHeight: '1.6' }}
                placeholder="Расскажите о себе, вашей роли, опыте..." maxLength={500} />
              <p className="text-[10px] text-muted-foreground font-inter mt-1">{form.bio.length}/500</p>
            </div>
          </div>
          {error && <p className="text-destructive text-sm font-inter mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Сохранение...</> : '✓ Сохранить'}
            </button>
            <button type="button" onClick={() => { setEditing(false); setError(''); }}
              className="btn-ghost px-5 py-2.5 rounded-xl text-sm">Отмена</button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up stagger-2">
        {[
          { label: 'Роль', value: user.role === 'superadmin' ? 'SA' : 'ADM', icon: 'Shield', color: roleColor },
          { label: 'Донат', value: user.donate_level > 0 ? `Уровень ${user.donate_level}` : 'Базовый', icon: 'Gift', color: 'hsl(24 95% 56%)' },
          { label: 'Статус', value: user.verified ? '✅ Подтверждён' : '⬜ Обычный', icon: 'BadgeCheck', color: user.verified ? '#34d399' : '#6b7280' },
        ].map(s => (
          <div key={s.label} className="card-base p-4 text-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{ background: s.color + '15' }}>
              <Icon name={s.icon as Parameters<typeof Icon>[0]['name']} size={18} style={{ color: s.color }} />
            </div>
            <p className="font-montserrat font-bold text-sm">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-inter mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
