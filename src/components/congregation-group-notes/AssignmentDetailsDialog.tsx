import { Download, ExternalLink, FileText, MessageSquare, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  formatAttachmentSize,
  formatDateLabel,
  getAssignmentDisplayGroupLabel,
} from './congregationGroupNotes.utils';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function AssignmentDetailsDialog({ controller }: { controller: CongregationGroupNotesController }) {
  const {
    dir,
    isAr,
    displayLocale,
    selectedAssignment,
    setSelectedAssignment,
    groupConfig,
    groupLabel,
    openAttachment,
    downloadAttachment,
  } = controller;

  return (
      <AnimatePresence>
        {selectedAssignment && (
          <motion.div
            key="group-note-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md"
            onClick={() => setSelectedAssignment(null)}
            dir={dir}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
          >
            <motion.div
              key="group-note-popup-panel"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[#ead9d0] bg-[#fffdf9] font-bold shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="relative bg-[#7a1717] px-6 py-5 text-white">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="absolute top-4 end-4 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 pe-10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">
                      {isAr ? 'ملاحظة أو تكليف المجموعة' : 'Group Note or Assignment'}
                    </h3>
                    <p className="mt-1 text-base text-white/90">
                      {formatDateLabel(selectedAssignment.date || selectedAssignment.createdAtISO, selectedAssignment.createdAt, displayLocale)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[62vh] overflow-y-auto p-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  {groupConfig && (
                    <span className={`rounded-full border px-3 py-1 text-sm font-black ${groupConfig.badgeClass}`}>
                      {getAssignmentDisplayGroupLabel(selectedAssignment, groupLabel)}
                    </span>
                  )}
                  <span className="rounded-full border border-[#ead9d0] bg-white px-3 py-1 text-sm text-[#6b4b4b]">
                    {selectedAssignment.id}
                  </span>
                </div>

                {selectedAssignment.text && (
                  <div className="rounded-2xl border border-[#ead9d0] bg-white p-5">
                    <p className="whitespace-pre-wrap text-lg leading-relaxed text-[#2b1717]">
                      {selectedAssignment.text}
                    </p>
                  </div>
                )}

                {selectedAssignment.attachments.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-[#ead9d0] bg-white p-5">
                    <div className="mb-3 flex items-center gap-2 text-[#7a1717]">
                      <FileText size={20} />
                      <h4 className="text-lg font-black">
                        {isAr ? 'ملفات مرفقة' : 'Attached Files'}
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {selectedAssignment.attachments.map((attachment, index) => (
                        <div
                          key={`${selectedAssignment.id}-popup-attachment-${index}`}
                          className="rounded-2xl border border-[#ead9d0] bg-[#fffdf9] p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-[#2b1717]">
                                <FileText size={18} className="shrink-0 text-[#7a1717]" />
                                <span className="truncate font-black">{attachment.name}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2 text-sm text-[#6b4b4b]">
                                <span>{attachment.type || 'application/pdf'}</span>
                                {attachment.size > 0 && <span>{formatAttachmentSize(attachment.size)}</span>}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => openAttachment(attachment)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7a1717] px-4 py-2 text-sm font-black text-white transition-colors hover:bg-[#5e1010]"
                              >
                                <ExternalLink size={16} />
                                {isAr ? 'فتح PDF' : 'Open PDF'}
                              </button>

                              <button
                                type="button"
                                onClick={() => downloadAttachment(attachment)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8aaaa] bg-[#f8eeee] px-4 py-2 text-sm font-black text-[#7a1717] transition-colors hover:bg-[#efd8d8]"
                              >
                                <Download size={16} />
                                {isAr ? 'تحميل' : 'Download'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="mt-5 w-full rounded-2xl bg-[#7a1717] px-5 py-3 text-white transition-colors hover:bg-[#5e1010]"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );
}
