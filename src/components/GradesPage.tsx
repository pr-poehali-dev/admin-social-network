import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }

type Grade = { id: number; score: number; comment: string; created_at: string; from: { id: number; username: string }; to: { id: number; username: string } };
type UserItem = { id: number; username: string };

export default function GradesPage({ user }: Props) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [form, setForm] = useState({ to_user_id: '', score: 5, comment: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    api.getGrades().then(r => setGrades(r.grades || []));
    api.getUsers().then(r => setUsers((r.users || []).filter((u: UserItem) => u.id !== user.id)));
  }, []);

  const addGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.to_user_id) return;
    setLoading(true);
    const res = await api.addGrade({ to_user_id: parseInt(form.to_user_id), score: form.score, comment: form.comment });
    if (res.id) {
      const toUser = users.find(u => u.id === parseInt(form.to_user_id));
      setGrades(p => [{
        id: res.id, score: form.score, comment: form.comment,
        created_at: new Date().toISOString(),
        from: { id: user.id, username: user.username },
        to: { id: parseInt(form.to_user_id), username: toUser?.username || '' }
      }, ...p]);
      setShowAdd(false);
      setForm({ to_user_id: '', score: 5, comment: '' });
    }
    setLoading(false);
  };

  const avgScore = grades.length ? (grades.reduce((a, g) => a + g.score, 0) / grades.length).toFixed(1) : '—';

  const scoreColor = (s: number) => s >= 8 ? '#22c55e' : s >= 5 ? '#f97316' : '#ef4444';

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-montserrat font-800">Оценки</h1>
          <p className="text-muted-foreground text-sm font-inter">Средний балл: <span className="font-montserrat font-700" style={{color: 'hsl(25 95% 53%)'}}>{avgScore}</span></p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-orange text-sm">
          <Icon name="Plus" size={16} />
          Выставить оценку
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addGrade} className="glass rounded-xl p-5 mb-6 animate-fade-in">
          <h3 className="font-montserrat font-700 mb-4">Новая оценка</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Администратор</label>
              <select value={form.to_user_id} onChange={e => setForm(p => ({...p, to_user_id: e.target.value}))} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400 appearance-none">
                <option value="">Выберите администратора</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-2 font-montserrat font-600 uppercase tracking-wider">
                Оценка: <span style={{color: scoreColor(form.score)}}>{form.score}/10</span>
              </label>
              <div className="flex gap-2">
                {[1,2,3,4,5,6,7,8,9,10].map(s => (
                  <button key={s} type="button"
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setForm(p => ({...p, score: s}))}
                    className="w-9 h-9 rounded-lg text-sm font-montserrat font-700 transition-all"
                    style={{
                      background: (hover ? s <= hover : s <= form.score) ? scoreColor(s) : 'hsl(20 8% 18%)',
                      color: (hover ? s <= hover : s <= form.score) ? '#fff' : undefined,
                      transform: s === form.score ? 'scale(1.1)' : undefined
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Комментарий</label>
              <input value={form.comment} onChange={e => setForm(p => ({...p, comment: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Необязательно" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg btn-orange text-sm disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Выставить'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-lg bg-muted text-sm hover:bg-accent transition-colors">Отмена</button>
          </div>
        </form>
      )}

      {grades.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Star" size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-inter">Оценок пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map(g => (
            <div key={g.id} className="glass rounded-xl p-4 card-hover flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-montserrat font-900 text-lg"
                style={{background: `${scoreColor(g.score)}20`, color: scoreColor(g.score)}}>
                {g.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-montserrat font-600">{g.from?.username}</span>
                  <Icon name="ArrowRight" size={12} className="text-muted-foreground" />
                  <span className="text-sm font-montserrat font-600" style={{color: 'hsl(25 95% 53%)'}}>{g.to?.username}</span>
                </div>
                {g.comment && <p className="text-xs text-muted-foreground font-inter mt-0.5">{g.comment}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Icon key={s} name="Star" size={12}
                      style={{color: s <= Math.round(g.score / 2) ? '#f97316' : 'hsl(20 8% 30%)'}}
                      className="fill-current" />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground font-inter mt-1">{new Date(g.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
