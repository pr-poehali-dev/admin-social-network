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
  const [showPass, setShowPass] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await api.login({ login: form.username, password: form.password });
      } else {
        res = await api.register({ username: form.username, email: form.email, password: form.password, role: form.role });
      }
      if (res.error) {
        setError(res.error);
      } else if (res.token) {
        localStorage.setItem('token', res.token);
        onAuth(res.user, res.token);
      } else {
        setError('Неизвестная ошибка. Попробуйте снова.');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'hsl(24 95% 53% / 0.07)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'hsl(24 80% 40% / 0.05)' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(30 20% 60%) 1px, transparent 0)', backgroundSize: '36px 36px' }} />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl btn-primary flex items-center justify-center glow-orange animate-pulse-orange">
              <Icon name="Shield" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-montserrat font-black tracking-tight glow-text"
                style={{ color: 'hsl(24 95% 58%)' }}>AdminHub</h1>
              <p className="text-sm text-muted-foreground font-inter mt-1">Закрытая платформа для администраторов</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-7 animate-fade-up stagger-1">
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'hsl(18 8% 11%)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-montserrat font-bold transition-all ${
                  mode === m ? 'btn-primary' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {m === 'login' ? '🔑 Войти' : '✨ Регистрация'}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <span className="label-xs">{mode === 'login' ? 'Логин или Email' : 'Имя пользователя'}</span>
              <div className="relative">
                <Icon name="User" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'hsl(30 10% 40%)' }} />
                <input type="text" value={form.username} onChange={f('username')} required
                  className="input-field pl-9"
                  placeholder={mode === 'login' ? 'admin или email@mail.ru' : 'coolAdmin'} />
              </div>
            </div>

            {mode === 'register' && (
              <div className="animate-scale">
                <span className="label-xs">Email</span>
                <div className="relative">
                  <Icon name="Mail" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'hsl(30 10% 40%)' }} />
                  <input type="email" value={form.email} onChange={f('email')} required
                    className="input-field pl-9" placeholder="admin@example.com" />
                </div>
              </div>
            )}

            <div>
              <span className="label-xs">Пароль</span>
              <div className="relative">
                <Icon name="Lock" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'hsl(30 10% 40%)' }} />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={f('password')} required
                  className="input-field pl-9 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'hsl(30 10% 40%)' }}>
                  <Icon name={showPass ? 'EyeOff' : 'Eye'} size={15} />
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="animate-scale">
                <span className="label-xs">Роль</span>
                <div className="relative">
                  <Icon name="ShieldCheck" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'hsl(30 10% 40%)' }} />
                  <select value={form.role} onChange={f('role')} className="input-field pl-9 appearance-none">
                    <option value="admin">Администратор</option>
                    <option value="superadmin">Главный Администратор</option>
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl animate-scale"
                style={{ background: 'hsl(0 72% 51% / 0.1)', border: '1px solid hsl(0 72% 51% / 0.25)' }}>
                <Icon name="AlertCircle" size={15} className="text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-destructive text-sm font-inter">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm font-montserrat font-bold mt-1">
              {loading
                ? <><Icon name="Loader2" size={15} className="animate-spin" /> Подождите...</>
                : mode === 'login'
                ? <><Icon name="LogIn" size={15} /> Войти в систему</>
                : <><Icon name="UserPlus" size={15} /> Создать аккаунт</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground font-inter mt-5">
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-semibold transition-colors hover:brightness-125"
              style={{ color: 'hsl(24 95% 56%)' }}>
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
