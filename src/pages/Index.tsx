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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setChecking(false); return; }
    api.me().then(r => {
      if (r.user) setUser(r.user);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const handleAuth = (u: object, _token: string) => {
    setUser(u as User);
    setPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('home');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl btn-orange flex items-center justify-center animate-pulse-orange">
            <Icon name="Shield" size={24} />
          </div>
          <p className="text-muted-foreground font-inter text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage user={user} onNav={setPage} />;
      case 'chat': return <ChatPage user={user} />;
      case 'videos': return <VideosPage user={user} />;
      case 'grades': return <GradesPage user={user} />;
      case 'tasks': return <TasksPage user={user} />;
      case 'donate': return <DonatePage user={user} />;
      case 'profile': return <ProfilePage user={user} onUpdate={setUser} />;
      case 'admin':
        return user.role === 'superadmin'
          ? <AdminPanel user={user} onUpdate={setUser} />
          : <div className="p-6 text-center text-muted-foreground">
              <Icon name="Lock" size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-inter">Нет доступа</p>
            </div>;
      default: return <HomePage user={user} onNav={setPage} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar active={page} onNav={setPage} user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {renderPage()}
      </main>
    </div>
  );
}
