import { useState } from 'react';
import { api } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props {
  onAuth: (user: object, token: string) => void;
}

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'admin' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await api.login({ login: form.username, password: form.password });
      } else {
        res = await api.register(form);
      }
      if (res.error) {
        setError(res.error);
      } else {
        localStorage.setItem('token', res.token);
        onAuth(res.user, res.token);
      }
    } catch {
      setError('Ошибка соединения');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{background: 'hsl(25 95% 53% / 0.08)'}} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl" style={{background: 'hsl(25 95% 53% / 0.05)'}} />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(20 8% 20% / 0.3) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl btn-orange flex items-center justify-center orange-glow">
              <Icon name="Shield" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-montserrat font-900 tracking-tight" style={{color: 'hsl(25 95% 53%)'}}>AdminHub</h1>
              <p className="text-xs text-muted-foreground font-inter">Платформа для администраторов</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 animate-fade-in" style={{animationDelay: '0.1s'}}>
          <div className="flex gap-1 mb-6 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-montserrat font-600 transition-all ${mode === 'login' ? 'btn-orange' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Войти
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-montserrat font-600 transition-all ${mode === 'register' ? 'btn-orange' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-xs font-montserrat font-600 text-muted-foreground mb-1.5 uppercase tracking-wider">
                {mode === 'login' ? 'Логин или email' : 'Имя пользователя'}
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({...p, username: e.target.value}))}
                required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-400 transition-colors font-inter text-sm"
                placeholder={mode === 'login' ? 'admin или admin@mail.ru' : 'coolAdmin'}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-montserrat font-600 text-muted-foreground mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({...p, email: e.target.value}))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-400 transition-colors font-inter text-sm"
                  placeholder="admin@example.com"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-montserrat font-600 text-muted-foreground mb-1.5 uppercase tracking-wider">Пароль</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({...p, password: e.target.value}))}
                required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-400 transition-colors font-inter text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <Icon name="AlertCircle" size={14} className="text-destructive flex-shrink-0" />
                <span className="text-destructive text-sm font-inter">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl btn-orange text-sm font-montserrat font-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Подождите...' : mode === 'login' ? 'Войти в систему' : 'Создать аккаунт'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
