import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, MessageCircle, Send, Sparkles, X } from 'lucide-react';

import bezalelImage from '../../assets/bezalel/bezalel.png';
import type { BezalelMessage } from '../../services/bezalel';

export type BezalelActivity = 'idle' | 'thinking' | 'acting' | 'success' | 'error';

export default function BezalelChat({
  title,
  subtitle,
  messages,
  activity,
  quickPrompts = [],
  onSend,
}: {
  title: string;
  subtitle: string;
  messages: BezalelMessage[];
  activity: BezalelActivity;
  quickPrompts?: string[];
  onSend: (message: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, activity]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || activity === 'thinking' || activity === 'acting') return;
    setDraft('');
    await onSend(value);
  };

  const busy = activity === 'thinking' || activity === 'acting';

  return (
    <div className="bezalel-assistant fixed bottom-24 right-3 z-[120] md:bottom-8 md:right-8">
      {open && (
        <section className="mb-3 flex h-[min(620px,72vh)] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-[1.8rem] border border-[#7a1717]/15 bg-[#fffdf9] shadow-[0_24px_80px_rgba(40,10,10,0.25)]">
          <header className="relative flex items-center gap-3 bg-[#1b0d0d] px-4 py-4 text-white">
            <div className={`bezalel-portrait bezalel-${activity} relative h-16 w-14 shrink-0 overflow-visible`}>
              <img src={bezalelImage} alt="Bezalel" className="h-full w-full object-contain object-bottom" />
              {(activity === 'thinking' || activity === 'acting') && <span className="bezalel-orbit" aria-hidden="true"><Sparkles size={14} /></span>}
            </div>
            <div className="min-w-0 flex-1"><h2 className="font-serif text-2xl font-semibold">{title}</h2><p className="truncate text-[11px] text-stone-300">{subtitle}</p></div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-white/10 p-2 text-stone-200" aria-label="Close Bezalel"><X size={17} /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'ms-auto bg-[#7a1717] text-white' : 'bg-[#f1e8dc] text-stone-800'}`}>
                {message.content}
              </div>
            ))}
            {busy && <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f1e8dc] px-4 py-3 text-sm font-bold text-[#7a1717]"><Sparkles size={15} className="animate-pulse" /> {activity === 'acting' ? 'Working on the calendar…' : 'Considering your request…'}</div>}
            <div ref={endRef} />
          </div>

          {quickPrompts.length > 0 && messages.length <= 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
              {quickPrompts.map(prompt => <button key={prompt} type="button" onClick={() => void onSend(prompt)} className="shrink-0 rounded-full border border-[#7a1717]/15 bg-white px-3 py-2 text-xs font-bold text-[#7a1717]">{prompt}</button>)}
            </div>
          )}

          <form onSubmit={submit} className="flex gap-2 border-t border-[#7a1717]/10 bg-white p-3">
            <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={1} maxLength={2000} placeholder="Ask Bezalel…" className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-stone-200 bg-[#fffdf9] px-3 py-2.5 text-sm outline-none focus:border-[#7a1717]" />
            <button type="submit" disabled={busy || !draft.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-[#7a1717] text-white disabled:opacity-40" aria-label="Send"><Send size={17} /></button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setOpen(value => !value)} className={`bezalel-launcher bezalel-${activity} ms-auto flex items-center gap-2 rounded-full border border-white/20 bg-[#1b0d0d] p-2 pe-4 text-white shadow-[0_16px_45px_rgba(40,10,10,0.3)]`} aria-expanded={open}>
        <span className="relative grid h-14 w-14 place-items-end overflow-hidden rounded-full bg-[#dceef8]"><img src={bezalelImage} alt="" className="h-[76px] w-[62px] object-contain object-bottom" /></span>
        <span className="text-left"><strong className="block font-serif text-xl leading-none">Bezalel</strong><span className="mt-1 flex items-center gap-1 text-[10px] text-stone-300">{activity === 'idle' ? <MessageCircle size={11} /> : <Sparkles size={11} />} {activity === 'acting' ? 'Working' : activity === 'thinking' ? 'Thinking' : 'Ask me'}</span></span>
        {open && <ChevronDown size={16} />}
      </button>
    </div>
  );
}
