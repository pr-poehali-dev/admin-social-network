import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }
type Video = { id: number; title: string; description: string; url: string; thumbnail_url: string; views: number; created_at: string; author: { username: string } };

export default function VideosPage({ user }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', url: '', thumbnail_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.getVideos().then(r => { setVideos(r.videos || []); setFetching(false); });
  }, []);

  const ytId = (url: string) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?#]+)/);
    return m ? m[1] : null;
  };
  const embedUrl = (url: string) => {
    const id = ytId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
  };
  const thumbUrl = (v: Video) => {
    if (v.thumbnail_url) return v.thumbnail_url;
    const id = ytId(v.url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await api.addVideo(form);
    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      setVideos(p => [{ id: res.id, ...form, views: 0, created_at: new Date().toISOString(), author: { username: user.username } }, ...p]);
      setShowAdd(false);
      setForm({ title: '', description: '', url: '', thumbnail_url: '' });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 animate-fade-up">
      {/* Video player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={e => e.target === e.currentTarget && setPlaying(null)}>
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-base truncate pr-4">{playing.title}</h3>
              <button onClick={() => setPlaying(null)}
                className="btn-ghost w-9 h-9 rounded-xl flex-shrink-0">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden" style={{ paddingTop: '56.25%', background: '#000' }}>
              {ytId(playing.url) ? (
                <iframe src={embedUrl(playing.url)}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              ) : (
                <video src={playing.url} controls autoPlay
                  className="absolute inset-0 w-full h-full" />
              )}
            </div>
            {playing.description && (
              <p className="text-sm text-muted-foreground font-inter mt-4 leading-relaxed">{playing.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">🎬 Видеотека</h1>
          <p className="text-sm text-muted-foreground font-inter mt-0.5">{videos.length} видеороликов</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="btn-primary px-4 py-2.5 rounded-xl text-sm">
          <Icon name="Plus" size={15} /> Добавить видео
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addVideo} className="card-base p-5 mb-6 animate-scale">
          <h3 className="font-montserrat font-bold mb-4">Новое видео</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="label-xs">Название *</span>
              <input value={form.title} onChange={f('title')} required className="input-field" placeholder="Название видео" />
            </div>
            <div>
              <span className="label-xs">Ссылка (YouTube или прямая) *</span>
              <input value={form.url} onChange={f('url')} required className="input-field" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="sm:col-span-2">
              <span className="label-xs">Описание</span>
              <input value={form.description} onChange={f('description')} className="input-field" placeholder="Краткое описание" />
            </div>
          </div>
          {error && <p className="text-destructive text-sm font-inter mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              {loading ? <><Icon name="Loader2" size={14} className="animate-spin" /> Сохранение...</> : 'Добавить'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError(''); }}
              className="btn-ghost px-5 py-2.5 rounded-xl text-sm">Отмена</button>
          </div>
        </form>
      )}

      {fetching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-base animate-pulse">
              <div className="rounded-t-xl" style={{ paddingTop: '56%', background: 'hsl(18 8% 13%)' }} />
              <div className="p-4 space-y-2">
                <div className="h-3.5 rounded w-3/4" style={{ background: 'hsl(18 8% 18%)' }} />
                <div className="h-3 rounded w-1/2" style={{ background: 'hsl(18 8% 15%)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Icon name="Play" size={52} className="mx-auto mb-4 opacity-10" />
          <p className="font-montserrat font-bold text-lg mb-1">Видеотека пуста</p>
          <p className="text-sm font-inter">Добавьте первое видео с YouTube или прямой ссылке</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map(v => (
            <div key={v.id} className="card-base card-interactive group overflow-hidden" onClick={() => setPlaying(v)}>
              <div className="relative bg-black" style={{ paddingTop: '56.25%' }}>
                {thumbUrl(v) ? (
                  <img src={thumbUrl(v)!} alt={v.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'hsl(18 8% 13%)' }}>
                    <Icon name="Play" size={40} className="opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <div className="w-14 h-14 rounded-full btn-primary flex items-center justify-center glow-orange">
                    <Icon name="Play" size={22} />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="font-montserrat font-bold text-sm line-clamp-1 mb-1">{v.title}</p>
                {v.description && <p className="text-xs text-muted-foreground font-inter line-clamp-2 mb-2.5 leading-relaxed">{v.description}</p>}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-inter">
                  <span>👤 {v.author?.username}</span>
                  <span>{new Date(v.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
