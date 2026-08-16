import { UserRound, X } from 'lucide-react';

import AttendancePersonEditor from './AttendancePersonEditor';
import type { AttendanceController } from './useAttendanceManagement';

export default function AttendancePersonModal({ controller }: { controller: AttendanceController }) {
  const { selectedPersonId, isSavingPerson, isPersonEditModalOpen, personEditModalRef, text, closePersonEditor } = controller;

  if (!isPersonEditModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] grid place-items-center overflow-hidden bg-[#160909]/70 p-2 backdrop-blur-md sm:p-6"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isSavingPerson) closePersonEditor();
      }}
    >
      <section
        ref={personEditModalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-person-edit-title"
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 bg-[#1d0e0e] px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10"><UserRound size={21} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">LINC One</p>
              <h2 id="attendance-person-edit-title" className="truncate font-serif text-xl font-semibold sm:text-2xl">
                {selectedPersonId ? text.editPerson : text.addPerson}
              </h2>
              <p className="mt-0.5 hidden text-xs text-white/60 sm:block">{selectedPersonId ? text.editPersonDescription : text.addPersonDescription}</p>
            </div>
          </div>
          <button type="button" onClick={closePersonEditor} disabled={isSavingPerson} aria-label={text.close} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 transition hover:bg-white/10 disabled:opacity-50"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <AttendancePersonEditor controller={controller} />
        </div>
      </section>
    </div>
  );
}
