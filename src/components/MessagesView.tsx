import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Shield, MessageCircle, ChevronLeft, Ban, Send } from 'lucide-react';
import { playerAvatar } from '../lib/constants';

export function MessagesView({ userName, messages = [], blocks = [], teamSquad = [], isAdmin, onSendMessage, onBlockUser, onUnblockUser, onMarkRead }: any) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ALL_SPECIAL = [
    { name: 'Coach', type: 'special', label: 'Head Coach' },
    { name: 'Team Manager', type: 'special', label: 'Team Manager' },
  ];
  const ADMIN_ALIASES = ['Administrator', 'Coach', 'Team Manager'];

  const chatList = useMemo(() => {
    const special = ALL_SPECIAL.filter(c => c.name !== userName);
    const players = (teamSquad || [])
      .filter((p: any) => p.name !== userName && !ADMIN_ALIASES.includes(p.name))
      .map((p: any) => ({ name: p.name, type: 'player', label: '' }));
    return [...special, ...players];
  }, [teamSquad, userName]);

  useEffect(() => {
    if (selectedUser) onMarkRead(selectedUser);
  }, [selectedUser, (messages || []).length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const amIBlockedByThem = (u: string) => (blocks || []).some((b: any) => b.blocker === u && b.blocked === userName);
  const haveIBlockedThem = (u: string) => (blocks || []).some((b: any) => b.blocker === userName && b.blocked === u);

  const getUnread = (u: string) =>
    (messages || []).filter((m: any) => m.receiver === userName && m.sender === u && !m.read).length;

  const visibleMessages = (messages || []).filter((msg: any) =>
    selectedUser && (
      (msg.sender === userName && msg.receiver === selectedUser) ||
      (msg.sender === selectedUser && msg.receiver === userName)
    )
  );

  const handleSend = () => {
    if (!messageText.trim() || !selectedUser) return;
    onSendMessage(selectedUser, messageText.trim());
    setMessageText("");
  };

  const selectedContact = chatList.find((p: any) => p.name === selectedUser);

  return (
    <div className="flex gap-3 h-[calc(100svh-11rem)]">
      <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-56 shrink-0 bg-white rounded-2xl border border-slate-200 overflow-hidden`}>
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-emjsc-navy" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emjsc-navy">Messages</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {chatList.map((p: any) => {
            const unread = getUnread(p.name);
            const blocked = haveIBlockedThem(p.name);
            const isSpecial = p.type === 'special';
            return (
              <button
                key={p.name}
                onClick={() => setSelectedUser(p.name)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all text-left ${
                  selectedUser === p.name ? 'bg-emjsc-navy/5' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${isSpecial ? 'bg-emjsc-red' : ''}`}>
                  {isSpecial
                    ? <Shield className="w-3.5 h-3.5 text-white" />
                    : <img src={playerAvatar(p.name)} alt={p.name} className="w-7 h-7 rounded-full" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-black truncate ${selectedUser === p.name ? 'text-emjsc-navy' : 'text-slate-700'}`}>{p.name}</p>
                  {p.label && <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none mt-0.5">{p.label}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {unread > 0 && <span className="bg-emjsc-red text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">{unread}</span>}
                  {blocked && <Ban className="w-3 h-3 text-emjsc-red" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-col flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden`}>
        {selectedUser ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 shrink-0">
              <button onClick={() => setSelectedUser(null)} className="md:hidden p-1 -ml-1 text-slate-400 hover:text-emjsc-navy transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${selectedContact?.type === 'special' ? 'bg-emjsc-red' : ''}`}>
                {selectedContact?.type === 'special'
                  ? <Shield className="w-3.5 h-3.5 text-white" />
                  : <img src={playerAvatar(selectedUser)} alt={selectedUser} className="w-7 h-7 rounded-full" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-emjsc-navy truncate">{selectedUser}</p>
                {selectedContact?.label && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">{selectedContact.label}</p>}
              </div>
              {haveIBlockedThem(selectedUser) ? (
                <button onClick={() => onUnblockUser(selectedUser)} className="text-[9px] font-black uppercase tracking-widest text-emjsc-red border border-emjsc-red px-2 py-1 rounded-lg active:scale-95 transition-all">
                  Unblock
                </button>
              ) : (
                <button onClick={() => onBlockUser(selectedUser)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emjsc-red flex items-center gap-1 px-2 py-1 rounded-lg transition-all">
                  <Ban className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
              {visibleMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                  <MessageCircle className="w-8 h-8 text-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No messages yet</p>
                </div>
              )}
              {visibleMessages.map((msg: any) => {
                const isMe = msg.sender === userName;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-[12px] font-medium leading-snug ${
                      isMe ? 'bg-emjsc-navy text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-3 py-2.5 border-t border-slate-100 bg-white shrink-0">
              {haveIBlockedThem(selectedUser) ? (
                <p className="text-center text-[10px] font-black uppercase text-emjsc-red tracking-widest py-1">You have blocked this user</p>
              ) : amIBlockedByThem(selectedUser) ? (
                <p className="text-center text-[10px] font-black uppercase text-slate-400 tracking-widest py-1">Cannot send messages</p>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Message..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-medium outline-none focus:ring-1 focus:ring-emjsc-navy bg-slate-50 placeholder-slate-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim()}
                    className="w-8 h-8 bg-emjsc-navy text-white rounded-xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-2 text-slate-300">
            <MessageCircle className="w-10 h-10 text-slate-200" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pick a contact</p>
          </div>
        )}
      </div>
    </div>
  );
}
