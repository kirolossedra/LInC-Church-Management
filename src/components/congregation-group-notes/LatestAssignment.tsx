import { Clock, FileText, MessageSquare } from 'lucide-react';
import { formatDateLabel } from './congregationGroupNotes.utils';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function LatestAssignment({ controller }: { controller: CongregationGroupNotesController }) {
  const { isAr, displayLocale, latestAssignment, setSelectedAssignment } = controller;
  if (!latestAssignment) return null;

  return (
                    <section className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                      <div className="mb-3 flex items-center gap-2 text-[#7a1717]">
                        <MessageSquare size={20} />
                        <h3 className="text-xl font-black">{isAr ? 'أحدث ملاحظة أو تكليف' : 'Latest Note or Assignment'}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAssignment(latestAssignment)}
                        className="block w-full rounded-2xl border-2 border-[#ead9d0] bg-white p-4 text-start transition-colors hover:border-[#7a1717]/30 hover:bg-[#f8eeee]"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#7a1717]/70">
                          <Clock size={15} />
                          <span>{formatDateLabel(latestAssignment.date || latestAssignment.createdAtISO, latestAssignment.createdAt, displayLocale)}</span>
                        </div>
                        {latestAssignment.text && (
                          <p className="line-clamp-4 whitespace-pre-wrap text-[#2b1717]">
                            {latestAssignment.text}
                          </p>
                        )}
                        {latestAssignment.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {latestAssignment.attachments.map((attachment, index) => (
                              <span
                                key={`${latestAssignment.id}-latest-attachment-${index}`}
                                className="inline-flex items-center gap-1 rounded-full border border-[#d8aaaa] bg-[#f8eeee] px-3 py-1 text-sm font-black text-[#7a1717]"
                              >
                                <FileText size={14} />
                                {attachment.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    </section>
  );
}
