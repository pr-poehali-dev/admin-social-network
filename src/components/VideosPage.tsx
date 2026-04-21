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

  useEffect(() => { api.getVideos().then(r => setVideos(r.videos || [])); }, []);

  const getEmbedUrl = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    return url;
  };

  const isYT = (url: string) => /youtube|youtu\.be/.test(url);

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.addVideo(form);
    if (res.id) {
      setVideos(p => [{
        id: res.id, ...form, views: 0, created_at: new Date().toISOString(),
        author: { username: user.username }
      }, ...p]);
      setShowAdd(false);
      setForm({ title: '', description: '', url: '', thumbnail_url: '' });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-montserrat font-700 text-lg">{playing.title}</h3>
              <button onClick={() => setPlaying(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden" style={{paddingTop: '56.25%'}}>
              {isYT(playing.url) ? (
                <iframe src={getEmbedUrl(playing.url)} className="absolute inset-0 w-full h-full" allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              ) : (
                <video src={playing.url} controls className="absolute inset-0 w-full h-full" />
              )}
            </div>
            {playing.description && <p className="text-muted-foreground font-inter text-sm mt-3">{playing.description}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-montserrat font-800">Видеотека</h1>
          <p className="text-muted-foreground text-sm font-inter">{videos.length} видео</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-orange text-sm">
          <Icon name="Plus" size={16} />
          Добавить видео
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addVideo} className="glass rounded-xl p-5 mb-6 animate-fade-in">
          <h3 className="font-montserrat font-700 mb-4">Новое видео</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Название</label>
              <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Название видео" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Ссылка (YouTube или прямая)</label>
              <input value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))} required
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1.5 font-montserrat font-600 uppercase tracking-wider">Описание</label>
              <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm font-inter focus:outline-none focus:border-orange-400"
                placeholder="Краткое описание" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg btn-orange text-sm disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Добавить'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2.5 rounded-lg bg-muted text-sm hover:bg-accent transition-colors">
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Videos grid */}
      {videos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Play" size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-inter">Видео пока нет. Добавьте первое!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map(v => (
            <div key={v.id} className="glass rounded-xl overflow-hidden card-hover cursor-pointer group" onClick={() => setPlaying(v)}>
              <div className="relative" style={{paddingTop: '56.25%', background: 'hsl(20 8% 13%)'}}>
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : isYT(v.url) ? (
                  <img
                    src={`https://img.youtube.com/vi/${v.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/hqdefault.jpg`}
                    alt={v.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="Play" size={40} className="opacity-30" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 rounded-full btn-orange flex items-center justify-center orange-glow">
                    <Icon name="Play" size={22} />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="font-montserrat font-700 text-sm mb-1 line-clamp-1">{v.title}</p>
                {v.description && <p className="text-xs text-muted-foreground font-inter line-clamp-2 mb-2">{v.description}</p>}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-inter">
                  <span>{v.author?.username}</span>
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
