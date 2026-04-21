import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import AuthPage from '@/components/AuthPage';
import Sidebar from '@/components/Sidebar';
import HomePage from '@/components/HomePage';
import ChatPage from '@/components/ChatPage';
import VideosPage from '@/components/VideosPage';
import GradesPage from '@/components/GradesPage';
import TasksPage from '@/components/TasksPage';
import DonatePage from '@/components/DonatePage';
import ProfilePage from '@/components/ProfilePage';
import AdminPanel from '@/components/AdminPanel';
import Icon from '@/components/ui/icon';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('home');
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setChecking(false); return; }
    api.me().then(r => {
      if (r.user) setUser(r.user);
      else localStorage.removeItem('token');
      setChecking(false);
    }).catch(() => { setChecking(false); });
  }, []);

  const handleAuth = (u: object) => {
    setUser(u as User);
    setPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('home');
  };

  const handleNav = (id: string) => {
    setPage(id);
    setSidebarOpen(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl btn-primary flex items-center justify-center animate-pulse-orange glow-orange">
            <Icon name="Shield" size={26} />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span className="font-inter text-sm">Загрузка...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  const renderPage = () => {
    switch (page) {
      case 'home':    return <HomePage user={user} onNav={handleNav} />;
      case 'chat':    return <ChatPage user={user} />;
      case 'videos':  return <VideosPage user={user} />;
      case 'grades':  return <GradesPage user={user} />;
      case 'tasks':   return <TasksPage user={user} />;
      case 'donate':  return <DonatePage user={user} />;
      case 'profile': return <ProfilePage user={user} onUpdate={setUser} />;
      case 'admin':
        if (user.role !== 'superadmin') return (
          <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
            <div className="text-center">
              <Icon name="Lock" size={48} className="mx-auto mb-3 opacity-10" />
              <p className="font-montserrat font-bold">Нет доступа</p>
              <p className="text-sm font-inter mt-1 opacity-60">Только для Главного Администратора</p>
            </div>
          </div>
        );
        return <AdminPanel user={user} onUpdate={setUser} />;
      default: return <HomePage user={user} onNav={handleNav} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed lg:sticky top-0 z-50 lg:z-auto h-screen transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar active={page} onNav={handleNav} user={user} onLogout={handleLogout} />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-30"
          style={{ background: 'hsl(16 12% 7%)', borderColor: 'hsl(18 8% 13%)' }}>
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 rounded-xl">
            <Icon name="Menu" size={20} />
          </button>
          <span className="font-montserrat font-bold text-sm" style={{ color: 'hsl(24 95% 58%)' }}>AdminHub</span>
        </div>
        {renderPage()}
      </main>
    </div>
  );
}
