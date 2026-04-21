import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props {
  user: User;
  onNav: (id: string) => void;
}

export default function HomePage({ user, onNav }: Props) {
  const [news, setNews] = useState<object[]>([]);
  const [stats, setStats] = useState({ users: 0, tasks: 0, videos: 0, messages: 0 });
  const [tasks, setTasks] = useState<object[]>([]);

  useEffect(() => {
    api.getNews().then(r => setNews(r.news || []));
    api.getUsers().then(r => setStats(s => ({...s, users: (r.users || []).length})));
    api.getTasks().then(r => {
      const t = r.tasks || [];
      setTasks(t.slice(0, 3));
      setStats(s => ({...s, tasks: t.length}));
    });
    api.getVideos().then(r => setStats(s => ({...s, videos: (r.videos || []).length})));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const STAT_CARDS = [
    { label: 'Администраторов', value: stats.users, icon: 'Users', color: 'hsl(210 100% 65%)' },
    { label: 'Заданий', value: stats.tasks, icon: 'CheckSquare', color: 'hsl(25 95% 53%)' },
    { label: 'Видео', value: stats.videos, icon: 'Play', color: 'hsl(280 100% 70%)' },
    { label: 'В сети', value: 1, icon: 'Wifi', color: 'hsl(120 60% 50%)' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-inter">{greeting()},</p>
          <h1 className="text-2xl font-montserrat font-800">
            {user.username}
            {user.role === 'superadmin' && <span className="ml-2 text-sm font-600 px-2 py-0.5 rounded-full align-middle" style={{background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)'}}>Главный Админ</span>}
          </h1>
        </div>
        <div className="text-right text-xs text-muted-foreground font-inter">
          <p>{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="glass rounded-xl p-4 card-hover" style={{animationDelay: `${i * 0.05}s`}}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: `${s.color}20`}}>
                <Icon name={s.icon as Parameters<typeof Icon>[0]['name']} size={18} style={{color: s.color}} />
              </div>
            </div>
            <p className="text-2xl font-montserrat font-800">{s.value}</p>
            <p className="text-xs text-muted-foreground font-inter mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* News */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-montserrat font-700 text-base">Новости</h2>
            {user.role === 'superadmin' && (
              <button onClick={() => onNav('admin')} className="text-xs text-orange-400 hover:text-orange-300 font-inter transition-colors">
                + Добавить
              </button>
            )}
          </div>
          {news.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="Newspaper" size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-inter">Новостей пока нет</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(news as { id: number; title: string; content: string; pinned: boolean; created_at: string; author: { username: string } }[]).slice(0, 5).map(n => (
                <div key={n.id} className="p-3 rounded-lg" style={{background: 'hsl(20 8% 13%)'}}>
                  <div className="flex items-start gap-2">
                    {n.pinned && <Icon name="Pin" size={12} className="text-orange-400 mt-1 flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-montserrat font-600">{n.title}</p>
                      <p className="text-xs text-muted-foreground font-inter mt-0.5 line-clamp-2">{n.content}</p>
                      <p className="text-[10px] text-muted-foreground font-inter mt-1">{n.author?.username} · {new Date(n.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent tasks */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-montserrat font-700 text-base">Последние задания</h2>
            <button onClick={() => onNav('tasks')} className="text-xs text-orange-400 hover:text-orange-300 font-inter transition-colors">
              Все →
            </button>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="ClipboardList" size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-inter">Заданий пока нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(tasks as { id: number; title: string; status: string; priority: string; assigned_to: { username: string } }[]).map(t => {
                const statusColors: Record<string, string> = { pending: '#f97316', in_progress: '#3b82f6', done: '#22c55e', cancelled: '#6b7280' };
                const statusLabels: Record<string, string> = { pending: 'Ожидает', in_progress: 'В работе', done: 'Готово', cancelled: 'Отменено' };
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg" style={{background: 'hsl(20 8% 13%)'}}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: statusColors[t.status] || '#f97316'}} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-inter truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{t.assigned_to?.username}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-montserrat font-600" style={{background: `${statusColors[t.status]}20`, color: statusColors[t.status]}}>
                      {statusLabels[t.status]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-montserrat font-700 text-base mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Написать в чат', icon: 'MessageSquare', nav: 'chat' },
            { label: 'Смотреть видео', icon: 'Play', nav: 'videos' },
            { label: 'Выставить оценку', icon: 'Star', nav: 'grades' },
            { label: 'Мой профиль', icon: 'User', nav: 'profile' },
          ].map(a => (
            <button key={a.nav} onClick={() => onNav(a.nav)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl card-hover border border-border hover:border-orange-400/30 transition-all text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'hsl(25 95% 53% / 0.1)'}}>
                <Icon name={a.icon as Parameters<typeof Icon>[0]['name']} size={20} style={{color: 'hsl(25 95% 53%)'}} />
              </div>
              <span className="text-xs font-inter font-500 text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
