import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }
type Chat = { id: number; name: string; description: string; type: string; msg_count: number };
type Message = { id: number; content: string; created_at: string; user: { id: number; username: string; verified: boolean; donate_level: number } };

export default function ChatPage({ user }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [active, setActive] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getChats().then(r => {
      const c = r.chats || [];
      setChats(c);
      if (c.length > 0) setActive(c[0]);
      setLoadingChats(false);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.getMessages(active.id).then(r => {
      setMessages(r.messages || []);
      setLoadingMsgs(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
  }, [active?.id]);

  // Poll for new messages
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      api.getMessages(active.id).then(r => {
        const msgs = r.messages || [];
        setMessages(prev => {
          if (prev.length !== msgs.length) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
          return msgs;
        });
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [active?.id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !active || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const res = await api.sendMessage(active.id, content);
    if (res.success) {
      const newMsg: Message = {
        id: res.id, content, created_at: res.created_at,
        user: { id: user.id, username: user.username, verified: user.verified, donate_level: user.donate_level }
      };
      setMessages(p => [...p, newMsg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      setChats(p => p.map(c => c.id === active.id ? { ...c, msg_count: c.msg_count + 1 } : c));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const donateIcon = (lvl: number) => lvl >= 3 ? '🔥' : lvl >= 2 ? '💜' : lvl >= 1 ? '💙' : '';

  const formatTime = (s: string) => {
    try { return new Date(s).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar chats */}
      <div className="w-60 flex-shrink-0 flex flex-col border-r" style={{ background: 'hsl(16 12% 7%)', borderColor: 'hsl(18 8% 13%)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(18 8% 13%)' }}>
          <h2 className="font-montserrat font-bold text-sm">Чаты</h2>
          <span className="badge" style={{ background: 'hsl(24 95% 53% / 0.15)', color: 'hsl(24 95% 58%)' }}>{chats.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingChats ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl animate-pulse" style={{ background: 'hsl(18 8% 11%)' }}>
                <div className="h-3 rounded w-3/4 mb-1.5" style={{ background: 'hsl(18 8% 18%)' }} />
                <div className="h-2.5 rounded w-1/2" style={{ background: 'hsl(18 8% 16%)' }} />
              </div>
            ))
          ) : chats.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground font-inter px-3 leading-relaxed">
              Чаты создаёт Главный Администратор в панели управления
            </div>
          ) : chats.map(c => (
            <button key={c.id} onClick={() => setActive(c)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                active?.id === c.id
                  ? 'border font-semibold'
                  : 'hover:bg-white/5'
              }`}
              style={active?.id === c.id ? {
                background: 'hsl(24 95% 53% / 0.1)',
                border: '1px solid hsl(24 95% 53% / 0.2)',
                color: 'hsl(24 95% 58%)'
              } : {}}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-montserrat font-bold flex-shrink-0"
                  style={{ background: active?.id === c.id ? 'hsl(24 95% 53% / 0.2)' : 'hsl(18 8% 15%)' }}>
                  {c.type === 'group' ? '#' : '👤'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-inter font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.msg_count} сообщ.</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col min-w-0">
        {active ? (
          <>
            <div className="px-5 py-3.5 border-b flex items-center gap-3" style={{ background: 'hsl(16 12% 7%)', borderColor: 'hsl(18 8% 14%)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-montserrat font-bold"
                style={{ background: 'hsl(24 95% 53% / 0.15)', color: 'hsl(24 95% 58%)' }}>
                {active.type === 'group' ? '#' : '👤'}
              </div>
              <div>
                <p className="font-montserrat font-bold text-sm">{active.name}</p>
                {active.description && <p className="text-xs text-muted-foreground font-inter">{active.description}</p>}
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-muted-foreground font-inter">Онлайн</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <Icon name="Loader2" size={18} className="animate-spin" />
                  <span className="text-sm font-inter">Загрузка сообщений...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: 'hsl(24 95% 53% / 0.08)' }}>
                    <Icon name="MessageSquare" size={28} style={{ color: 'hsl(24 95% 53% / 0.4)' }} />
                  </div>
                  <p className="font-inter text-sm">Сообщений пока нет</p>
                  <p className="font-inter text-xs mt-1 opacity-60">Напишите первым!</p>
                </div>
              ) : messages.map((m, idx) => {
                const isMe = m.user?.id === user.id;
                const showDate = idx === 0 || new Date(messages[idx - 1].created_at).toDateString() !== new Date(m.created_at).toDateString();
                return (
                  <div key={m.id}>
                    {showDate && (
                      <div className="text-center my-3">
                        <span className="text-[10px] text-muted-foreground font-inter px-3 py-1 rounded-full"
                          style={{ background: 'hsl(18 8% 12%)' }}>
                          {new Date(m.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                    )}
                    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="avatar-base w-8 h-8 rounded-xl text-xs flex-shrink-0 self-end">
                        {(m.user?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className={`max-w-[68%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
                          <div className="flex items-center gap-1.5 pl-1">
                            <span className="text-[11px] font-montserrat font-semibold text-muted-foreground">{m.user?.username}</span>
                            {m.user?.verified && <span className="text-[10px]">✅</span>}
                            {donateIcon(m.user?.donate_level) && <span className="text-[10px]">{donateIcon(m.user?.donate_level)}</span>}
                          </div>
                        )}
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm font-inter leading-relaxed ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                          style={isMe
                            ? { background: 'hsl(24 95% 53% / 0.18)', border: '1px solid hsl(24 95% 53% / 0.25)', color: 'hsl(30 20% 94%)' }
                            : { background: 'hsl(18 8% 14%)', border: '1px solid hsl(18 8% 20%)' }
                          }>
                          {m.content}
                        </div>
                        <span className="text-[9px] text-muted-foreground px-1 font-inter">{formatTime(m.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="p-4 border-t" style={{ borderColor: 'hsl(18 8% 14%)', background: 'hsl(16 12% 7%)' }}>
              <div className="flex gap-2.5">
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  placeholder={`Написать в #${active.name}...`}
                  className="input-field flex-1" maxLength={2000} />
                <button type="submit" disabled={sending || !input.trim()}
                  className="btn-primary px-4 py-2.5 rounded-xl flex-shrink-0 disabled:opacity-40">
                  {sending ? <Icon name="Loader2" size={17} className="animate-spin" /> : <Icon name="Send" size={17} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Icon name="MessageSquare" size={48} className="mx-auto mb-3 opacity-10" />
              <p className="font-inter text-sm">Выберите чат слева</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
