import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }

type Donation = { id: number; amount: number; level: number; note: string; expires_at: string | null; created_at: string; user: { id: number; username: string }; granted_by: { id: number; username: string } };

const LEVELS = [
  { level: 0, label: 'Базовый', icon: '⬜', color: '#6b7280', perks: ['Доступ к платформе'] },
  { level: 1, label: 'Поддержка', icon: '💙', color: '#3b82f6', perks: ['Синий значок', 'Особый статус'] },
  { level: 2, label: 'Продвинутый', icon: '💜', color: '#a855f7', perks: ['Фиолетовый значок', 'Приоритет'] },
  { level: 3, label: 'Элита', icon: '🔥', color: '#f97316', perks: ['Огненный значок', 'VIP-доступ', 'Эксклюзивный чат'] },
];

export default function DonatePage({ user }: Props) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const myDonateLevel = user.donate_level || 0;

  useEffect(() => { api.getDonations().then(r => setDonations(r.donations || [])); }, []);

  const myDonations = donations.filter(d => d.user?.id === user.id);

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-montserrat font-800">Донат-система</h1>
        <p className="text-muted-foreground text-sm font-inter">Уровни поддержки и привилегии</p>
      </div>

      {/* My status */}
      <div className="glass rounded-xl p-5" style={{borderColor: LEVELS[myDonateLevel]?.color + '40'}}>
        <div className="flex items-center gap-4">
          <div className="text-4xl">{LEVELS[myDonateLevel]?.icon}</div>
          <div>
            <p className="text-xs text-muted-foreground font-inter uppercase tracking-wider mb-0.5">Ваш текущий уровень</p>
            <p className="font-montserrat font-800 text-xl" style={{color: LEVELS[myDonateLevel]?.color}}>
              {LEVELS[myDonateLevel]?.label}
            </p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {LEVELS[myDonateLevel]?.perks.map(p => (
                <span key={p} className="text-[10px] px-2 py-0.5 rounded-full font-inter" style={{background: LEVELS[myDonateLevel]?.color + '15', color: LEVELS[myDonateLevel]?.color}}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
        {myDonateLevel === 0 && (
          <p className="text-xs text-muted-foreground font-inter mt-3 pt-3 border-t border-border">
            Уровни доната выдаются Главным Администратором. Обратитесь к нему для получения привилегий.
          </p>
        )}
      </div>

      {/* Levels showcase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LEVELS.map(l => (
          <div key={l.level}
            className={`glass rounded-xl p-4 transition-all ${myDonateLevel === l.level ? 'ring-2' : ''}`}
            style={myDonateLevel === l.level ? {ringColor: l.color, boxShadow: `0 0 20px ${l.color}25`} : {}}>
            <div className="text-2xl mb-2">{l.icon}</div>
            <p className="font-montserrat font-700 text-sm mb-1" style={{color: myDonateLevel >= l.level ? l.color : undefined}}>{l.label}</p>
            <ul className="space-y-1">
              {l.perks.map(p => (
                <li key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground font-inter">
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{background: l.color}} />
                  {p}
                </li>
              ))}
            </ul>
            {myDonateLevel === l.level && (
              <div className="mt-3 text-xs font-montserrat font-700 px-2 py-1 rounded-full text-center" style={{background: l.color + '15', color: l.color}}>
                Текущий ✓
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Donation history */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-montserrat font-700 mb-4">История донатов</h2>
        {donations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="Gift" size={40} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-inter">История пуста</p>
          </div>
        ) : (
          <div className="space-y-3">
            {donations.map(d => (
              <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg" style={{background: 'hsl(20 8% 13%)'}}>
                <div className="text-2xl">{LEVELS[d.level]?.icon || '🎁'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-montserrat font-600">{d.user?.username}</p>
                  <p className="text-xs text-muted-foreground font-inter">
                    Уровень {d.level} · Выдал: {d.granted_by?.username}
                  </p>
                  {d.note && <p className="text-xs text-muted-foreground font-inter italic mt-0.5">"{d.note}"</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-montserrat font-700 text-sm" style={{color: LEVELS[d.level]?.color || '#f97316'}}>
                    {LEVELS[d.level]?.label}
                  </p>
                  {d.expires_at && (
                    <p className="text-[10px] text-muted-foreground font-inter">до {new Date(d.expires_at).toLocaleDateString('ru-RU')}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground font-inter">{new Date(d.created_at).toLocaleDateString('ru-RU')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
