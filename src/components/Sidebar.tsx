import Icon from '@/components/ui/icon';
import type { User } from '@/lib/api';

const MENU = [
  { id: 'home', label: 'Главная', icon: 'Home' },
  { id: 'chat', label: 'Чаты', icon: 'MessageSquare' },
  { id: 'videos', label: 'Видео', icon: 'Play' },
  { id: 'grades', label: 'Оценки', icon: 'Star' },
  { id: 'tasks', label: 'Задания', icon: 'CheckSquare' },
  { id: 'donate', label: 'Донат', icon: 'Gift' },
  { id: 'profile', label: 'Профиль', icon: 'User' },
];

interface Props {
  active: string;
  onNav: (id: string) => void;
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ active, onNav, user, onLogout }: Props) {
  const donateBadge = user.donate_level > 0 ? ['💙', '💜', '🔥'][Math.min(user.donate_level - 1, 2)] : null;
  const roleLabel = user.role === 'superadmin' ? 'Главный Админ' : 'Администратор';
  const roleColor = user.role === 'superadmin' ? 'text-orange-400' : 'text-muted-foreground';

  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 flex flex-col glass-dark border-r border-border">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl btn-orange flex items-center justify-center flex-shrink-0">
            <Icon name="Shield" size={18} />
          </div>
          <div>
            <h1 className="text-base font-montserrat font-800" style={{color: 'hsl(25 95% 53%)'}}>AdminHub</h1>
            <p className="text-[10px] text-muted-foreground font-inter">v1.0</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-montserrat font-700 flex-shrink-0"
            style={{background: 'hsl(25 95% 53% / 0.2)', color: 'hsl(25 95% 53%)'}}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-montserrat font-600 truncate">{user.username}</span>
              {user.verified && <span className="text-xs" title="Верифицирован">✅</span>}
              {donateBadge && <span className="text-xs" title={`Донат уровень ${user.donate_level}`}>{donateBadge}</span>}
            </div>
            <span className={`text-xs font-inter ${roleColor}`}>{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {MENU.map(item => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 text-left ${active === item.id ? 'active' : 'text-muted-foreground'}`}
          >
            <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} size={18} />
            <span className="text-sm font-inter font-500">{item.label}</span>
          </button>
        ))}

        {user.role === 'superadmin' && (
          <>
            <div className="my-2 border-t border-border" />
            <button
              onClick={() => onNav('admin')}
              className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 text-left ${active === 'admin' ? 'active' : 'text-muted-foreground'}`}
            >
              <Icon name="Settings" size={18} />
              <span className="text-sm font-inter font-500">Админ-панель</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-montserrat font-700" style={{background: 'hsl(25 95% 53% / 0.2)', color: 'hsl(25 95% 53%)'}}>SA</span>
            </button>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={onLogout}
          className="nav-item w-full flex items-center gap-3 px-3 py-2.5 text-left text-muted-foreground hover:text-destructive"
        >
          <Icon name="LogOut" size={18} />
          <span className="text-sm font-inter font-500">Выйти</span>
        </button>
      </div>
    </aside>
  );
}
