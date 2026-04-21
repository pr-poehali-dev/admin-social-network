import Icon from '@/components/ui/icon';
import type { User } from '@/lib/api';

const MENU = [
  { id: 'home', label: 'Главная', icon: 'Home' },
  { id: 'chat', label: 'Чаты', icon: 'MessageSquare' },
  { id: 'videos', label: 'Видео', icon: 'Play' },
  { id: 'grades', label: 'Оценки', icon: 'Star' },
  { id: 'tasks', label: 'Задания', icon: 'CheckSquare' },
  { id: 'donate', label: 'Донат', icon: 'Gift' },
  { id: 'profile', label: 'Мой профиль', icon: 'UserCircle' },
];

interface Props {
  active: string;
  onNav: (id: string) => void;
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ active, onNav, user, onLogout }: Props) {
  const donateIcon = user.donate_level >= 3 ? '🔥' : user.donate_level >= 2 ? '💜' : user.donate_level >= 1 ? '💙' : null;
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col glass-sidebar">
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'hsl(18 8% 13%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center flex-shrink-0 glow-orange">
            <Icon name="Shield" size={17} />
          </div>
          <div>
            <div className="text-base font-montserrat font-black tracking-tight" style={{ color: 'hsl(24 95% 58%)' }}>
              AdminHub
            </div>
            <div className="text-[10px] text-muted-foreground font-inter">Платформа</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="mx-3 mt-3 mb-2 p-3 rounded-xl" style={{ background: 'hsl(18 8% 11%)', border: '1px solid hsl(18 8% 15%)' }}>
        <div className="flex items-center gap-2.5">
          <div className="avatar-base w-9 h-9 rounded-xl text-xs flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-montserrat font-bold truncate">{user.username}</span>
              {user.verified && <span className="text-xs flex-shrink-0" title="Верифицирован">✅</span>}
              {donateIcon && <span className="text-xs flex-shrink-0">{donateIcon}</span>}
            </div>
            <div className="text-[10px] font-inter font-medium"
              style={{ color: user.role === 'superadmin' ? 'hsl(24 95% 56%)' : 'hsl(30 10% 48%)' }}>
              {user.role === 'superadmin' ? '👑 Главный Админ' : '🛡 Администратор'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {MENU.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)}
            className={`nav-link ${active === item.id ? 'active' : ''}`}>
            <Icon name={item.icon as Parameters<typeof Icon>[0]['name']} size={16} className="flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}

        {user.role === 'superadmin' && (
          <>
            <div className="my-2 mx-1" style={{ height: '1px', background: 'hsl(18 8% 14%)' }} />
            <button onClick={() => onNav('admin')}
              className={`nav-link ${active === 'admin' ? 'active' : ''}`}>
              <Icon name="Settings" size={16} className="flex-shrink-0" />
              <span>Панель управления</span>
              <span className="ml-auto badge text-[9px]"
                style={{ background: 'hsl(24 95% 53% / 0.15)', color: 'hsl(24 95% 58%)' }}>SA</span>
            </button>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t" style={{ borderColor: 'hsl(18 8% 13%)' }}>
        <button onClick={onLogout}
          className="nav-link w-full hover:text-destructive hover:bg-destructive/10">
          <Icon name="LogOut" size={16} />
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  );
}
