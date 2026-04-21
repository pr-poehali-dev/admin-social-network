import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }
type Donation = { id: number; amount: number; level: number; note: string; expires_at: string | null; created_at: string; user: { id: number; username: string }; granted_by: { id: number; username: string } };

const LEVELS = [
  { level: 0, label: 'Базовый',     icon: '⬜', color: '#6b7280', perks: ['Доступ к платформе', 'Основные функции'] },
  { level: 1, label: 'Поддержка',   icon: '💙', color: '#60a5fa', perks: ['Синий значок 💙', 'Особый статус', 'Приоритет в чате'] },
  { level: 2, label: 'Продвинутый', icon: '💜', color: '#a78bfa', perks: ['Фиолетовый значок 💜', 'VIP-чат', 'Расширенный профиль'] },
  { level: 3, label: 'Элита',       icon: '🔥', color: 'hsl(24 95% 56%)', perks: ['🔥 Огненный значок', 'Все привилегии', 'Эксклюзивный доступ'] },
];

export default function DonatePage({ user }: Props) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [fetching, setFetching] = useState(true);
  const myLevel = user.donate_level || 0;

  useEffect(() => {
    api.getDonations().then(r => { setDonations(r.donations || []); setFetching(false); });
  }, []);

  const myDonations = donations.filter(d => d.user?.id === user.id);
  const currentLevel = LEVELS[Math.min(myLevel, 3)];

  return (
    <div className="p-6 animate-fade-up space-y-6">
      <div>
        <h1 className="section-title">🎁 Донат-система</h1>
        <p className="text-sm text-muted-foreground font-inter mt-0.5">Привилегии и уровни поддержки</p>
      </div>

      {/* My status card */}
      <div className="card-base p-5 animate-fade-up stagger-1"
        style={{ borderColor: currentLevel.color + '30', boxShadow: `0 0 30px ${currentLevel.color}10` }}>
        <div className="flex items-center gap-5">
          <div className="text-5xl flex-shrink-0">{currentLevel.icon}</div>
          <div className="flex-1">
            <p className="label-xs">Ваш текущий уровень</p>
            <p className="text-2xl font-montserrat font-black mt-0.5" style={{ color: currentLevel.color }}>
              {currentLevel.label}
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {currentLevel.perks.map(p => (
                <span key={p} className="badge text-[10px]"
                  style={{ background: currentLevel.color + '15', color: currentLevel.color }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
          {myLevel === 0 && (
            <div className="text-right text-xs text-muted-foreground font-inter max-w-[160px] leading-relaxed">
              Уровни выдаёт Главный Администратор
            </div>
          )}
        </div>

        {/* Progress bar */}
        {myLevel < 3 && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-muted-foreground font-inter mb-1.5">
              <span>Прогресс до следующего уровня</span>
              <span>{LEVELS[myLevel + 1]?.label}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(18 8% 16%)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(myLevel / 3) * 100}%`, background: `linear-gradient(90deg, ${currentLevel.color}, ${LEVELS[Math.min(myLevel + 1, 3)].color})` }} />
            </div>
          </div>
        )}
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {LEVELS.map((l, i) => (
          <div key={l.level}
            className={`card-base p-4 transition-all animate-fade-up stagger-${i + 1} ${myLevel === l.level ? 'border-orange' : ''}`}
            style={myLevel === l.level ? { boxShadow: `0 0 20px ${l.color}18`, borderColor: l.color + '40' } : {}}>
            <div className="text-3xl mb-3">{l.icon}</div>
            <p className="font-montserrat font-bold text-sm mb-2" style={{ color: myLevel >= l.level ? l.color : undefined }}>
              {l.label}
            </p>
            <ul className="space-y-1.5">
              {l.perks.map(p => (
                <li key={p} className="flex items-start gap-1.5 text-[11px] text-muted-foreground font-inter">
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: l.color }} />
                  {p}
                </li>
              ))}
            </ul>
            {myLevel === l.level && (
              <div className="mt-3 text-[10px] font-montserrat font-bold text-center py-1 rounded-full"
                style={{ background: l.color + '15', color: l.color }}>
                ✓ Текущий уровень
              </div>
            )}
          </div>
        ))}
      </div>

      {/* History */}
      <div className="card-base p-5">
        <h2 className="font-montserrat font-bold mb-4">История донатов</h2>
        {fetching ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'hsl(18 8% 12%)' }} />
            ))}
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Icon name="Gift" size={40} className="mx-auto mb-3 opacity-10" />
            <p className="text-sm font-inter">История пуста</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {donations.map(d => {
              const lv = LEVELS[Math.min(d.level, 3)];
              return (
                <div key={d.id} className="flex items-center gap-3.5 p-3.5 rounded-xl"
                  style={{ background: 'hsl(18 8% 11%)', border: '1px solid hsl(18 8% 16%)' }}>
                  <div className="text-2xl flex-shrink-0">{lv?.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-montserrat font-bold">{d.user?.username}</p>
                    <p className="text-xs text-muted-foreground font-inter">
                      Уровень {d.level} · Выдал: {d.granted_by?.username}
                    </p>
                    {d.note && <p className="text-xs text-muted-foreground font-inter italic">"{d.note}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="badge text-[10px]" style={{ background: lv?.color + '15', color: lv?.color }}>
                      {lv?.label}
                    </span>
                    {d.expires_at && (
                      <p className="text-[9px] text-muted-foreground font-inter mt-1">
                        до {new Date(d.expires_at).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                    <p className="text-[9px] text-muted-foreground font-inter">
                      {new Date(d.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
