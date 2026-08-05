import { BookOpen, Users } from 'lucide-react';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function GroupSummary({ controller }: { controller: CongregationGroupNotesController }) {
  const { isAr, groupConfig, groupLabel, groupDescription, assignments } = controller;
  if (!groupConfig) return null;

  return (
                  <section className={`rounded-3xl border-2 p-5 shadow-sm sm:p-7 ${groupConfig.cardClass}`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-2 text-sm font-black">
                          <Users size={17} />
                          {isAr ? 'مجموعتك الحالية' : 'Your Assigned Group'}
                        </div>
                        <h3 className="text-4xl font-black leading-none">
                          {groupLabel}
                        </h3>
                        <p className="mt-3 max-w-2xl text-base leading-relaxed opacity-85">
                          {groupDescription}
                        </p>
                      </div>

                      <div className={`rounded-3xl px-5 py-4 text-center shadow-sm ${groupConfig.accentClass}`}>
                        <BookOpen className="mx-auto mb-2" size={28} />
                        <div className="text-3xl font-black">{assignments.length}</div>
                        <div className="text-sm uppercase tracking-widest opacity-90">
                          {isAr ? 'ملاحظات' : 'Notes'}
                        </div>
                      </div>
                    </div>
                  </section>
  );
}

