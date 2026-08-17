import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Download, MessageCircle, Send, Sparkles, X } from 'lucide-react';

import bezalelImage from '../../assets/bezalel/bezalel.png';
import type { BezalelMessage } from '../../services/bezalel';
import { downloadBezalelSession, type BezalelActionRecord } from './bezalelExport';

export type BezalelActivity = 'idle' | 'thinking' | 'acting' | 'success' | 'error';

export type BezalelTravelRequest = {
  id: number;
  targets: Array<{
    date: string;
    targetSelector: string;
    ariaLabel: string;
  }>;
};

type BezalelTravelTarget = BezalelTravelRequest['targets'][number];

type BezalelJourney = {
  id: number;
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  phase: 'travelling' | 'casting';
  ariaLabel: string;
};

export default function BezalelChat({
  title,
  subtitle,
  messages,
  activity,
  quickPrompts = [],
  onSend,
  travelRequest,
  onPrepareTravelTarget,
  onTravelComplete,
  participant,
  participantRole,
  actionLog = [],
}: {
  title: string;
  subtitle: string;
  messages: BezalelMessage[];
  activity: BezalelActivity;
  quickPrompts?: string[];
  onSend: (message: string) => Promise<void>;
  travelRequest?: BezalelTravelRequest;
  onPrepareTravelTarget?: (target: BezalelTravelTarget) => void;
  onTravelComplete?: (requestId: number) => void;
  participant: string;
  participantRole: string;
  actionLog?: BezalelActionRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [journey, setJourney] = useState<BezalelJourney | null>(null);
  const [journeyActive, setJourneyActive] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const onTravelCompleteRef = useRef(onTravelComplete);
  const onPrepareTravelTargetRef = useRef(onPrepareTravelTarget);

  useEffect(() => {
    onTravelCompleteRef.current = onTravelComplete;
  }, [onTravelComplete]);

  useEffect(() => {
    onPrepareTravelTargetRef.current = onPrepareTravelTarget;
  }, [onPrepareTravelTarget]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, activity]);

  useEffect(() => {
    if (!travelRequest || travelRequest.targets.length === 0) return;

    let cancelled = false;
    let locateTimer = 0;
    let travelTimer = 0;
    let castTimer = 0;
    let previousEnd: { x: number; y: number } | null = null;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const finishJourney = () => {
      if (cancelled) return;
      setJourney(null);
      setJourneyActive(false);
      onTravelCompleteRef.current?.(travelRequest.id);
    };

    const locateTarget = (targetIndex: number, attempt: number) => {
      if (cancelled) return;
      const travelTarget = travelRequest.targets[targetIndex];
      const target = document.querySelector<HTMLElement>(travelTarget.targetSelector);
      if (!target) {
        if (attempt < 15) {
          locateTimer = window.setTimeout(() => locateTarget(targetIndex, attempt + 1), 80);
        } else {
          const nextIndex = targetIndex + 1;
          if (nextIndex < travelRequest.targets.length) prepareTarget(nextIndex);
          else finishJourney();
        }
        return;
      }

      target.scrollIntoView?.({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'center',
        inline: 'center',
      });

      locateTimer = window.setTimeout(() => {
        if (cancelled) return;
        const targetRect = target.getBoundingClientRect();
        const launcherRect = launcherRef.current?.getBoundingClientRect();
        const width = 88;
        const height = 116;
        const endX = clamp(targetRect.right - width * 0.78, 8, window.innerWidth - width - 8);
        const endY = clamp(targetRect.bottom - height * 0.88, 8, window.innerHeight - height - 8);
        const startX = reducedMotion
          ? endX
          : previousEnd?.x ?? clamp(launcherRect?.left ?? window.innerWidth - width - 24, 8, window.innerWidth - width - 8);
        const startY = reducedMotion
          ? endY
          : previousEnd?.y ?? clamp(launcherRect?.top ?? window.innerHeight - height - 24, 8, window.innerHeight - height - 8);
        previousEnd = { x: endX, y: endY };

        setJourney({
          id: travelRequest.id,
          x: startX,
          y: startY,
          deltaX: endX - startX,
          deltaY: endY - startY,
          phase: reducedMotion ? 'casting' : 'travelling',
          ariaLabel: travelTarget.ariaLabel,
        });

        travelTimer = window.setTimeout(() => {
          if (cancelled) return;
          setJourney(current => current ? { ...current, phase: 'casting' } : null);
          castTimer = window.setTimeout(() => {
            if (cancelled) return;
            const nextIndex = targetIndex + 1;
            if (nextIndex < travelRequest.targets.length) {
              locateTimer = window.setTimeout(() => prepareTarget(nextIndex), reducedMotion ? 20 : 180);
            } else {
              setJourney(null);
              finishJourney();
            }
          }, reducedMotion ? 600 : 1550);
        }, reducedMotion ? 0 : 900);
      }, reducedMotion ? 20 : 520);
    };

    const prepareTarget = (targetIndex: number) => {
      if (cancelled) return;
      const target = travelRequest.targets[targetIndex];
      onPrepareTravelTargetRef.current?.(target);
      locateTimer = window.setTimeout(() => locateTarget(targetIndex, 0), 100);
    };

    locateTimer = window.setTimeout(() => {
      if (cancelled) return;
      setOpen(false);
      setJourney(null);
      setJourneyActive(true);
      prepareTarget(0);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(locateTimer);
      window.clearTimeout(travelTimer);
      window.clearTimeout(castTimer);
    };
  }, [travelRequest]);

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
            <button type="button" onClick={() => downloadBezalelSession({ participant, participantRole, context: subtitle, messages, actions: actionLog })} className="rounded-xl bg-white/10 p-2 text-stone-200" aria-label="Export Bezalel chat"><Download size={17} /></button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-white/10 p-2 text-stone-200" aria-label="Close Bezalel"><X size={17} /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'ms-auto bg-[#7a1717] text-white' : 'bg-[#f1e8dc] text-stone-800'}`}>
                <div>{message.content}</div>
                <time className={`mt-1 block text-[9px] ${message.role === 'user' ? 'text-white/60' : 'text-stone-400'}`} dateTime={message.timestamp}>{formatChatTime(message.timestamp)}</time>
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

      <button ref={launcherRef} type="button" onClick={() => setOpen(value => !value)} className={`bezalel-launcher bezalel-${activity} ms-auto flex items-center gap-2 rounded-full border border-white/20 bg-[#1b0d0d] p-2 pe-4 text-white shadow-[0_16px_45px_rgba(40,10,10,0.3)] transition-opacity ${journeyActive ? 'pointer-events-none opacity-0' : 'opacity-100'}`} aria-expanded={open}>
        <span className="relative grid h-14 w-14 place-items-end overflow-hidden rounded-full bg-[#dceef8]"><img src={bezalelImage} alt="" className="h-[76px] w-[62px] object-contain object-bottom" /></span>
        <span className="text-left"><strong className="block font-serif text-xl leading-none">Bezalel</strong><span className="mt-1 flex items-center gap-1 text-[10px] text-stone-300">{activity === 'idle' ? <MessageCircle size={11} /> : <Sparkles size={11} />} {activity === 'acting' ? 'Working' : activity === 'thinking' ? 'Thinking' : 'Ask me'}</span></span>
        {open && <ChevronDown size={16} />}
      </button>

      {journey && createPortal(
        <div
          className={`bezalel-calendar-journey bezalel-calendar-${journey.phase}`}
          style={{
            left: journey.x,
            top: journey.y,
            '--bezalel-travel-x': `${journey.deltaX}px`,
            '--bezalel-travel-y': `${journey.deltaY}px`,
          } as CSSProperties}
          role="status"
          aria-label={journey.ariaLabel}
        >
          <span className="bezalel-travel-trail" aria-hidden="true" />
          <img src={bezalelImage} alt="" className="bezalel-calendar-character" />
          <span className="bezalel-wand-orbit" aria-hidden="true"><Sparkles size={18} /></span>
          <span className="bezalel-cast-ripple" aria-hidden="true" />
        </div>,
        document.body,
      )}
    </div>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function formatChatTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}
