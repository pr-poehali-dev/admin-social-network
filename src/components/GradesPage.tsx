import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }
type Grade = { id: number; score: number; comment: string; created_at: string; from: { id: number; username: string; verified: boolean }; to: { id: number; username: string; verified: boolean } };
type UserItem = { id: number; username: string };

const scoreColor = (s: number) => s >= 8 ? '#34d399' : s >= 5 ? 'hsl(24 95% 56%)' : '#f87171';
const scoreLabel = (s: number) => s >= 9 ? 'Отлично' : s >= 7 ? 'Хорошо' : s >= 5 ? 'Средне' : 'Плохо';

export default function GradesPage({ user }: Props) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ to_user_id: '', score: 7, comment: '' });
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    Promise.all([api.getGrades(), api.getUsers()]).then(([g, u]) => {
      setGrades(g.grades || []);
      setUsers((u.users || []).filter((u: UserItem & { id: number }) => u.id !== user.id));
      setFetching(false);
    });
  }, []);

  const avg = grades.length ? (grades.reduce((a, g) => a + g.score, 0) / grades.length).toFixed(1) : null;

  const addGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.to_user_id) { setError('Выберите пользователя'); return; }
    setLoading(true);
    const res = await api.addGrade({ to_user_id: parseInt(form.to_user_id), score: form.score, comment: form.comment });
    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      const toUser = users.find(u => u.id === parseInt(form.to_user_id));
      setGrades(p => [{
        id: res.id, score: form.score, comment: form.comment,
        created_at: new Date().toISOString(),
        from: { id: user.id, username: user.username, verified: user.verified },
        to: { id: parseInt(form.to_user_id), username: toUser?.username || '', verified: false }
      }, ...p]);
      setShowAdd(false);
      setForm({ to_user_id: '', score: 7, comment: '' });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">⭐ Оценки</h1>
          <p className="text-sm text-muted-foreground font-inter mt-0.5">
            {avg ? <>Средний балл: <span className="font-montserrat font-bold" style={{ color: scoreColor(parseFloat(avg)) }}>{avg}</span></> : 'Оценок ещё нет'}
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary px-4 py-2.5 rounded-xl text-sm">
          <Icon name="Plus" size={15} /> Выставить оценку
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addGrade} className="card-base p-5 mb-6 animate-scale">
          <h3 className="font-montserrat font-bold mb-4">Новая оценка</h3>
          <div className="space-y-4">
            <div>
              <span className="label-xs">Администратор</span>
              <select value={form.to_user_id}
                onChange={e => setForm(p => ({ ...p, to_user_id: e.target.value }))} required
                className="input-field appearance-none">
                <option value="">— Выберите администратора —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div>
              <span className="label-xs">
                Оценка: <span style={{ color: scoreColor(form.score) }}>{form.score}/10 — {scoreLabel(form.score)}</span>
              </span>
              <div className="flex gap-1.5 mt-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(s => {
                  const active = hover ? s <= hover : s <= form.score;
                  return (
                    <button key={s} type="button"
                      onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                      onClick={() => setForm(p => ({ ...p, score: s }))}
                      className="flex-1 h-9 rounded-lg text-xs font-montserrat font-bold transition-all"
                      style={{
                        background: active ? scoreColor(s) + '25' : 'hsl(18 8% 14%)',
                        color: active ? scoreColor(s) : 'hsl(30 10% 45%)',
                        border: `1px solid ${active ? scoreColor(s) + '50' : 'transparent'}`,
                        transform: s === form.score ? 'scale(1.08)' : undefined,
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="label-xs">Комментарий (необязательно)</span>
              <input value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
                className="input-field" placeholder="Краткий комментарий..." maxLength={200} />
            </div>
          </div>
          {error && <p className="text-destructive text-sm font-inter mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Сохранение...</> : 'Выставить оценку'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError(''); }}
              className="btn-ghost px-5 py-2.5 rounded-xl text-sm">Отмена</button>
          </div>
        </form>
      )}

      {fetching ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-base p-4 animate-pulse flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl" style={{ background: 'hsl(18 8% 15%)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded w-1/2" style={{ background: 'hsl(18 8% 18%)' }} />
                <div className="h-3 rounded w-1/3" style={{ background: 'hsl(18 8% 15%)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Icon name="Star" size={52} className="mx-auto mb-4 opacity-10" />
          <p className="font-montserrat font-bold text-lg mb-1">Оценок пока нет</p>
          <p className="text-sm font-inter">Выставьте первую оценку коллеге</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map(g => (
            <div key={g.id} className="card-base card-interactive p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-montserrat font-black text-xl flex-shrink-0"
                style={{ background: scoreColor(g.score) + '15', color: scoreColor(g.score) }}>
                {g.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-montserrat font-bold">{g.from?.username}</span>
                  {g.from?.verified && <span className="text-xs">✅</span>}
                  <Icon name="ArrowRight" size={12} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-montserrat font-bold" style={{ color: 'hsl(24 95% 58%)' }}>{g.to?.username}</span>
                  {g.to?.verified && <span className="text-xs">✅</span>}
                </div>
                {g.comment && <p className="text-xs text-muted-foreground font-inter mt-1 leading-relaxed">"{g.comment}"</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="badge" style={{ background: scoreColor(g.score) + '15', color: scoreColor(g.score) }}>
                  {scoreLabel(g.score)}
                </span>
                <p className="text-[10px] text-muted-foreground font-inter mt-1.5">
                  {new Date(g.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
