import React from 'react';
import { Trash2 } from 'lucide-react';

export function AdminModeration({ messages = [], blocks = [], onAdminDeleteMessage, onAdminDeleteBlock }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chat & Block Moderation</h3>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-emjsc-navy uppercase">Recent Messages</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {(messages || []).slice().reverse().map((msg: any) => (
            <div key={msg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{msg.sender} → {msg.receiver}</p>
                <p className="text-sm font-medium">{msg.content}</p>
              </div>
              <button
                onClick={() => onAdminDeleteMessage(msg.id)}
                className="p-2 bg-red-100 text-emjsc-red rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {messages.length === 0 && <p className="text-xs text-slate-400 uppercase tracking-widest text-center">No messages.</p>}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-emjsc-navy uppercase">Active Blocks</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {blocks.map((block: any) => (
            <div key={block.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] font-bold text-slate-800 uppercase">{block.blocker} <span className="text-emjsc-red">blocked</span> {block.blocked}</p>
              <button
                onClick={() => onAdminDeleteBlock(block.id)}
                className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1 rounded-lg uppercase tracking-widest hover:bg-slate-300"
              >
                Remove Block
              </button>
            </div>
          ))}
          {blocks.length === 0 && <p className="text-xs text-slate-400 uppercase tracking-widest text-center">No blocks.</p>}
        </div>
      </div>
    </div>
  );
}
