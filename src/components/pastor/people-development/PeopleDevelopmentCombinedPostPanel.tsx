import {
  useState,
} from 'react';

import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers3,
  Mail,
  Send,
  X,
} from 'lucide-react';

import {
  MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
  PEOPLE_DEVELOPMENT_GROUPS,
} from './peopleDevelopment.constants';

import type {
  PeopleDevelopmentGroupId,
} from './peopleDevelopment.types';

import {
  formatFileSize,
} from './peopleDevelopment.utils';

export interface PeopleDevelopmentCombinedPostPanelProps {
  locale: 'en' | 'ar';
  selectedGroupIds: PeopleDevelopmentGroupId[];
  draftText: string;
  selectedFile: File | null;
  fileInputResetKey: number;
  posting: boolean;

  onToggleGroup: (
    groupId: PeopleDevelopmentGroupId,
  ) => void;

  onSelectAllGroups: () => void;
  onClearGroups: () => void;
  onDraftTextChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onClearFile: () => void;
  onPost: () => Promise<void> | void;
}

export default function PeopleDevelopmentCombinedPostPanel({
  locale,
  selectedGroupIds,
  draftText,
  selectedFile,
  fileInputResetKey,
  posting,
  onToggleGroup,
  onSelectAllGroups,
  onClearGroups,
  onDraftTextChange,
  onFileChange,
  onClearFile,
  onPost,
}: PeopleDevelopmentCombinedPostPanelProps) {
  const isArabic = locale === 'ar';
  const [expanded, setExpanded] =
    useState(false);

  const allGroupsSelected =
    selectedGroupIds.length ===
    PEOPLE_DEVELOPMENT_GROUPS.length;

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-[#d9b6b6] bg-white shadow-sm">
      <button
        type="button"
        onClick={() =>
          setExpanded(previous => !previous)
        }
        className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-[#fff7f7] to-[#f8eeee] px-4 py-4 text-start transition hover:from-[#fff1f1] hover:to-[#f4e2e2] sm:px-6"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-2xl bg-[#7a1717] p-2.5 text-white shadow-sm">
            <Layers3 size={21} />
          </span>

          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-base font-black text-[#5f1111] sm:text-lg">
              {isArabic
                ? 'منشور مشترك للمجموعات'
                : 'Combined Group Post'}

              <span className="rounded-full border border-[#d9b6b6] bg-white px-2.5 py-1 text-xs font-black text-[#7a1717]">
                {selectedGroupIds.length}/
                {PEOPLE_DEVELOPMENT_GROUPS.length}
              </span>
            </span>

            <span className="mt-1 hidden text-sm font-bold text-[#6f4b4b] sm:block">
              {isArabic
                ? 'انشر ملاحظة واحدة في عدة مجموعات وأرسل إشعاراً واحداً باستخدام النسخة المخفية.'
                : 'Publish one post to multiple groups and notify everyone through one BCC email request.'}
            </span>
          </span>
        </div>

        <span className="shrink-0 rounded-full border border-[#d9b6b6] bg-white p-2 text-[#7a1717]">
          {expanded ? (
            <ChevronUp size={19} />
          ) : (
            <ChevronDown size={19} />
          )}
        </span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-[#ead1d1] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h5 className="font-black text-gray-900">
                {isArabic
                  ? 'اختر المجموعات المستهدفة'
                  : 'Select target groups'}
              </h5>

              <p className="mt-1 text-sm font-bold text-gray-500">
                {isArabic
                  ? 'سيظهر نفس المنشور في كل مجموعة محددة دون تكرار الملف في قاعدة البيانات.'
                  : 'The same post appears in every selected group without duplicating its file in the database.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSelectAllGroups}
                disabled={posting || allGroupsSelected}
                className="rounded-xl border border-[#d9b6b6] bg-[#fff7f7] px-3 py-2 text-xs font-black text-[#7a1717] transition hover:bg-[#f8eeee] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isArabic
                  ? 'اختيار الكل'
                  : 'Select all'}
              </button>

              <button
                type="button"
                onClick={onClearGroups}
                disabled={
                  posting ||
                  selectedGroupIds.length === 0
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isArabic
                  ? 'مسح الاختيار'
                  : 'Clear'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {PEOPLE_DEVELOPMENT_GROUPS.map(
              group => {
                const selected =
                  selectedGroupIds.includes(
                    group.id,
                  );

                return (
                  <button
                    key={`combined-post-${group.id}`}
                    type="button"
                    onClick={() =>
                      onToggleGroup(group.id)
                    }
                    disabled={posting}
                    className={`relative flex min-h-16 items-center gap-2 rounded-2xl border-2 px-3 py-3 text-start text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? group.cardClass
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        selected
                          ? 'border-current bg-white/80'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selected && (
                        <Check size={13} />
                      )}
                    </span>

                    <span className="min-w-0 truncate">
                      {isArabic
                        ? group.labelAr
                        : group.labelEn}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <textarea
            value={draftText}
            onChange={event =>
              onDraftTextChange(
                event.target.value,
              )
            }
            disabled={posting}
            placeholder={
              isArabic
                ? 'اكتب ملاحظة أو تكليفاً للمجموعات المحددة...'
                : 'Write a note or assignment for the selected groups...'
            }
            className="min-h-[130px] w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#242424] outline-none transition focus:border-[#c98f8f] focus:ring-2 focus:ring-[#7a1717]/10 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <label className="block rounded-2xl border border-dashed border-gray-300 bg-stone-50 p-4 text-sm font-black text-[#242424]">
            <span className="flex items-center gap-2 opacity-75">
              <FileText size={16} />

              {isArabic
                ? 'إرفاق ملف PDF اختياري'
                : 'Optional PDF attachment'}
            </span>

            <span className="mt-1 block text-xs font-bold opacity-60">
              {isArabic
                ? `الحد الأقصى ${formatFileSize(
                    MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
                  )}.`
                : `Maximum ${formatFileSize(
                    MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES,
                  )}.`}
            </span>

            <input
              key={`combined-assignment-file-${fileInputResetKey}`}
              type="file"
              accept="application/pdf,.pdf"
              disabled={posting}
              onChange={event =>
                onFileChange(
                  event.target.files?.[0] ||
                    null,
                )
              }
              className="mt-3 block w-full text-sm font-bold text-[#242424] file:me-3 file:rounded-xl file:border-0 file:bg-[#f8eeee] file:px-3 file:py-2 file:font-black file:text-[#7a1717] hover:file:bg-[#efd8d8] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          {selectedFile && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-[#242424]">
              <div className="min-w-0">
                <div className="truncate">
                  {selectedFile.name}
                </div>

                <div className="text-xs opacity-60">
                  {formatFileSize(
                    selectedFile.size,
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClearFile}
                disabled={posting}
                className="shrink-0 rounded-full bg-[#f8eeee] p-1.5 text-[#7a1717] transition-colors hover:bg-[#efd8d8] disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  isArabic
                    ? 'إزالة الملف'
                    : 'Remove file'
                }
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
              <Mail size={17} />

              <span>
                {isArabic
                  ? 'يتم إخفاء عناوين جميع المستلمين باستخدام BCC.'
                  : 'All recipient addresses are hidden through BCC.'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void onPost()}
              disabled={
                posting ||
                selectedGroupIds.length === 0
              }
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#7a1717] px-6 py-3 font-black text-white transition-colors hover:bg-[#5f1111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} />

              {posting
                ? isArabic
                  ? 'جارٍ النشر والإرسال...'
                  : 'Posting and emailing...'
                : isArabic
                  ? 'نشر للمجموعات المحددة'
                  : 'Post to selected groups'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
