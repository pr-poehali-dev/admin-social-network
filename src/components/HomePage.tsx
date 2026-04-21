import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User; onNav: (id: string) => void; }

export default function HomePage({ user, onNav }: Props) {
  const [news, setNews] = useState<{ id: number; title: string; content: string; pinned: boolean; created_at: string; author: { username: string } }[]>([]);
  const [stats, setStats] = useState({ users: 0, tasks: 0, videos: 0, grades: 0 });
  const [recentTasks, setRecentTasks] = useState<{ id: number; title: string; status: string; priority: string; assigned_to: { username: string } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getNews(),
      api.getUsers(),
      api.getTasks(),
      api.getVideos(),
      api.getGrades(),
    ]).then(([n, u, t, v, g]) => {
      setNews(n.news || []);
      const tasks = t.tasks || [];
      setRecentTasks(tasks.slice(0, 4));
      setStats({
        users: (u.users || []).length,
        tasks: tasks.length,
        videos: (v.videos || []).length,
        grades: (g.grades || []).length,
      });
      setLoading(false);
    });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const STATS = [
    { label: 'Администраторов', value: stats.users, icon: 'Users', color: '#60a5fa', nav: 'admin' },
    { label: 'Заданий', value: stats.tasks, icon: 'CheckSquare', color: 'hsl(24 95% 56%)', nav: 'tasks' },
    { label: 'Видеороликов', value: stats.videos, icon: 'Play', color: '#a78bfa', nav: 'videos' },
    { label: 'Оценок', value: stats.grades, icon: 'Star', color: '#34d399', nav: 'grades' },
  ];

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Ожидает', color: 'hsl(24 95% 53%)' },
    in_progress: { label: 'В работе', color: '#60a5fa' },
    done: { label: 'Готово', color: '#34d399' },
    cancelled: { label: 'Отменено', color: '#6b7280' },
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-inter">{greeting},</p>
          <h1 className="text-2xl font-montserrat font-black mt-0.5 flex items-center gap-2.5">
            {user.username}
            {user.role === 'superadmin' && (
              <span className="badge text-xs" style={{ background: 'hsl(24 95% 53% / 0.15)', color: 'hsl(24 95% 58%)' }}>
                👑 Главный Админ
              </span>
            )}
          </h1>
        </div>
        <div className="text-right text-xs text-muted-foreground font-inter">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s, i) => (
          <button key={i} onClick={() => onNav(s.nav)}
            className={`card-base card-interactive p-4 text-left animate-fade-up stagger-${i + 1}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: s.color + '18' }}>
              <Icon name={s.icon as Parameters<typeof Icon>[0]['name']} size={18} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-montserrat font-black">{loading ? '—' : s.value}</div>
            <div className="text-xs text-muted-foreground font-inter mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* News */}
        <div className="lg:col-span-3 card-base p-5 animate-fade-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-montserrat font-bold text-base">📢 Новости</h2>
            {user.role === 'superadmin' && (
              <button onClick={() => onNav('admin')}
                className="text-xs font-inter font-medium transition-colors hover:brightness-125"
                style={{ color: 'hsl(24 95% 56%)' }}>
                + Добавить
              </button>
            )}
          </div>
          {!loading && news.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Icon name="Newspaper" size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-inter">Новостей пока нет</p>
              {user.role === 'superadmin' && (
                <button onClick={() => onNav('admin')} className="mt-3 text-xs font-medium transition-colors"
                  style={{ color: 'hsl(24 95% 56%)' }}>Опубликовать первую →</button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {news.slice(0, 4).map(n => (
                <div key={n.id} className="p-3.5 rounded-xl flex items-start gap-3"
                  style={{ background: 'hsl(18 8% 12%)', border: '1px solid hsl(18 8% 16%)' }}>
                  {n.pinned && <Icon name="Pin" size={12} className="mt-1 flex-shrink-0" style={{ color: 'hsl(24 95% 56%)' }} />}
                  <div className="min-w-0">
                    <p className="text-sm font-montserrat font-bold truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground font-inter mt-0.5 line-clamp-2 leading-relaxed">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground font-inter mt-1.5 opacity-60">
                      {n.author?.username} · {new Date(n.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="lg:col-span-2 card-base p-5 animate-fade-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-montserrat font-bold text-base">📋 Задания</h2>
            <button onClick={() => onNav('tasks')} className="text-xs font-inter font-medium transition-colors hover:brightness-125"
              style={{ color: 'hsl(24 95% 56%)' }}>Все →</button>
          </div>
          {!loading && recentTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Icon name="ClipboardList" size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-inter">Заданий нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map(t => {
                const s = STATUS_MAP[t.status] || STATUS_MAP.pending;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'hsl(18 8% 12%)', border: '1px solid hsl(18 8% 16%)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-inter font-medium truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{t.assigned_to?.username || 'Не назначено'}</p>
                    </div>
                    <span className="badge text-[9px]" style={{ background: s.color + '18', color: s.color }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card-base p-5 animate-fade-up stagger-4">
        <h2 className="font-montserrat font-bold text-base mb-4">⚡ Быстрые действия</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Написать в чат', icon: 'MessageSquare', nav: 'chat', color: '#60a5fa' },
            { label: 'Добавить видео', icon: 'Video', nav: 'videos', color: '#a78bfa' },
            { label: 'Оценить коллегу', icon: 'Star', nav: 'grades', color: '#fbbf24' },
            { label: 'Создать задание', icon: 'PlusCircle', nav: 'tasks', color: 'hsl(24 95% 56%)' },
          ].map(a => (
            <button key={a.nav} onClick={() => onNav(a.nav)}
              className="card-base card-interactive flex flex-col items-center gap-2.5 py-4 px-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: a.color + '18' }}>
                <Icon name={a.icon as Parameters<typeof Icon>[0]['name']} size={20} style={{ color: a.color }} />
              </div>
              <span className="text-xs font-inter font-medium text-muted-foreground text-center leading-snug">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
