import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface Props { user: User }

type Chat = { id: number; name: string; description: string; type: string; msg_count: number };
type Message = { id: number; content: string; created_at: string; user: { id: number; username: string; verified: boolean; donate_level: number } };

export default function ChatPage({ user }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getChats().then(r => {
      const c = r.chats || [];
      setChats(c);
      if (c.length > 0 && !activeChat) setActiveChat(c[0]);
    });
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    setLoading(true);
    api.getMessages(activeChat.id).then(r => {
      setMessages(r.messages || []);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [activeChat]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const res = await api.sendMessage(activeChat.id, content);
    if (res.success) {
      const newMsg: Message = {
        id: res.id,
        content,
        created_at: res.created_at,
        user: { id: user.id, username: user.username, verified: user.verified, donate_level: user.donate_level }
      };
      setMessages(p => [...p, newMsg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    setSending(false);
  };

  const donateIcon = (lvl: number) => lvl >= 3 ? '🔥' : lvl >= 2 ? '💜' : lvl >= 1 ? '💙' : '';

  return (
    <div className="flex h-screen overflow-hidden animate-fade-in">
      {/* Chat list */}
      <div className="w-64 flex-shrink-0 border-r border-border flex flex-col" style={{background: 'hsl(20 8% 8%)'}}>
        <div className="p-4 border-b border-border">
          <h2 className="font-montserrat font-700 text-sm">Чаты</h2>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {chats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs font-inter px-2">
              Чаты создаёт Главный Администратор
            </div>
          )}
          {chats.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveChat(c)}
              className={`w-full text-left p-3 rounded-xl transition-all ${activeChat?.id === c.id ? 'active' : 'nav-item text-muted-foreground'}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-montserrat font-700"
                  style={{background: activeChat?.id === c.id ? 'hsl(25 95% 53% / 0.2)' : 'hsl(20 8% 18%)', color: activeChat?.id === c.id ? 'hsl(25 95% 53%)' : undefined}}>
                  {c.type === 'group' ? '#' : '💬'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-inter font-500 truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.msg_count} сообщ.</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-border glass-dark flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-montserrat font-700 text-sm" style={{background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(25 95% 53%)'}}>
                {activeChat.type === 'group' ? '#' : '💬'}
              </div>
              <div>
                <p className="font-montserrat font-700 text-sm">{activeChat.name}</p>
                {activeChat.description && <p className="text-xs text-muted-foreground font-inter">{activeChat.description}</p>}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Icon name="Loader" size={20} className="animate-spin mr-2" /> Загрузка...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Icon name="MessageSquare" size={40} className="mb-3 opacity-20" />
                  <p className="font-inter text-sm">Нет сообщений. Напишите первым!</p>
                </div>
              ) : (
                messages.map(m => {
                  const isMe = m.user?.id === user.id;
                  return (
                    <div key={m.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-montserrat font-700 flex-shrink-0"
                        style={{background: isMe ? 'hsl(25 95% 53% / 0.2)' : 'hsl(20 8% 20%)', color: isMe ? 'hsl(25 95% 53%)' : undefined}}>
                        {(m.user?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <div className="flex items-center gap-1.5">
                          {!isMe && <span className="text-xs font-montserrat font-600 text-muted-foreground">{m.user?.username}</span>}
                          {m.user?.verified && <span className="text-[10px]">✅</span>}
                          {donateIcon(m.user?.donate_level) && <span className="text-[10px]">{donateIcon(m.user?.donate_level)}</span>}
                        </div>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm font-inter ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                          style={{background: isMe ? 'hsl(25 95% 53% / 0.2)' : 'hsl(20 8% 15%)', border: '1px solid', borderColor: isMe ? 'hsl(25 95% 53% / 0.3)' : 'hsl(20 8% 22%)'}}>
                          {m.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground px-1">{new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={send} className="p-4 border-t border-border">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-400 transition-colors font-inter text-sm"
                />
                <button type="submit" disabled={sending || !input.trim()}
                  className="px-4 py-3 rounded-xl btn-orange disabled:opacity-40 disabled:cursor-not-allowed">
                  <Icon name="Send" size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Icon name="MessageSquare" size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-inter">Выберите чат</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
