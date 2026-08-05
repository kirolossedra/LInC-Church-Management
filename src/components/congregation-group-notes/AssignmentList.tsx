import { BookOpen, Clock, FileText, Search } from 'lucide-react';
import { formatDateLabel, getAssignmentDisplayGroupLabel } from './congregationGroupNotes.utils';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function AssignmentList({ controller }: { controller: CongregationGroupNotesController }) {
  const {
    isAr,
    displayLocale,
    groupConfig,
    groupLabel,
    assignmentsLoading,
    filteredAssignments,
    searchTerm,
    setSearchTerm,
    setSelectedAssignment,
  } = controller;
  if (!groupConfig) return null;

  return (
                  <section className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-2xl font-black text-[#7a1717]">
                          {isAr ? 'كل ملاحظات وتكليفات المجموعة' : 'All Group Notes & Assignments'}
                        </h3>
                        <p className="mt-1 text-[#6b4b4b]">
                          {isAr
                            ? 'هذه الملاحظات مرتبطة بالمجموعة التي تم تعيينك فيها.'
                            : 'These notes are tied to the group you are currently assigned to.'}
                        </p>
                      </div>

                      <div className="relative w-full lg:w-[320px]">
                        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b7b7b]" size={18} />
                        <input
                          value={searchTerm}
                          onChange={event => setSearchTerm(event.target.value)}
                          placeholder={isAr ? 'بحث في الملاحظات...' : 'Search notes...'}
                          className="w-full rounded-2xl border-2 border-[#ead9d0] bg-white py-3 ps-11 pe-4 text-[#2b1717] outline-none focus:border-[#7a1717] focus:ring-2 focus:ring-[#7a1717]/20"
                        />
                      </div>
                    </div>

                    {assignmentsLoading ? (
                      <div className="rounded-2xl border border-[#ead9d0] bg-stone-50 p-8 text-center text-[#7a1717]">
                        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#7a1717]/25 border-t-[#7a1717]" />
                        {isAr ? 'جار تحميل الملاحظات...' : 'Loading notes...'}
                      </div>
                    ) : filteredAssignments.length === 0 ? (
                      <div className="rounded-2xl border border-[#ead9d0] bg-stone-50 p-8 text-center text-[#6b4b4b]">
                        <BookOpen className="mx-auto mb-3 text-[#7a1717]" size={34} />
                        <h4 className="text-xl font-black text-[#7a1717]">
                          {searchTerm ? (isAr ? 'لا توجد نتائج' : 'No matching notes') : (isAr ? 'لا توجد ملاحظات بعد' : 'No notes yet')}
                        </h4>
                        <p className="mt-2">
                          {searchTerm
                            ? (isAr ? 'جرّب كلمة بحث مختلفة.' : 'Try a different search term.')
                            : (isAr ? 'عندما يضيف Pastor ملاحظات أو تكليفات لهذه المجموعة، ستظهر هنا.' : 'When Pastor posts notes or assignments for this group, they will appear here.')}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {filteredAssignments.map(assignment => (
                          <button
                            key={assignment.id}
                            type="button"
                            onClick={() => setSelectedAssignment(assignment)}
                            className="rounded-2xl border-2 border-[#ead9d0] bg-white p-4 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#7a1717]/30 hover:bg-[#f8eeee] hover:shadow-md"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <span className={`rounded-full border px-3 py-1 text-sm font-black ${groupConfig.badgeClass}`}>
                                {getAssignmentDisplayGroupLabel(assignment, groupLabel)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-sm text-[#7a1717]/65">
                                <Clock size={14} />
                                {formatDateLabel(assignment.date || assignment.createdAtISO, assignment.createdAt, displayLocale)}
                              </span>
                            </div>
                            {assignment.text && (
                              <p className="line-clamp-5 whitespace-pre-wrap leading-relaxed text-[#2b1717]">
                                {assignment.text}
                              </p>
                            )}
                            {assignment.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {assignment.attachments.map((attachment, index) => (
                                  <span
                                    key={`${assignment.id}-attachment-chip-${index}`}
                                    className="inline-flex items-center gap-1 rounded-full border border-[#d8aaaa] bg-[#f8eeee] px-3 py-1 text-xs font-black text-[#7a1717]"
                                  >
                                    <FileText size={13} />
                                    {attachment.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
  );
}
