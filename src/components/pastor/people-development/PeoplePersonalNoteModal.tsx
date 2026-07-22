import type {
  FormEvent,
} from 'react';

import {
  CheckCircle,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';

import type {
  PeopleDevelopmentGroupId,
  PeoplePersonalNoteType,
} from './peopleDevelopment.types';

export interface PeoplePersonalNotePerson {
  memberKey: string;
  identifier: string;
  name: string;
  email: string;
}

export interface PeoplePersonalNoteModalProps {
  open: boolean;
  person: PeoplePersonalNotePerson | null;
  noteType: PeoplePersonalNoteType;
  noteText: string;
  saving: boolean;
  locale: 'en' | 'ar';
  assignedGroup: PeopleDevelopmentGroupId | '';
  groupLabel: string;

  onNoteTypeChange: (
    noteType: PeoplePersonalNoteType,
  ) => void;

  onNoteTextChange: (
    value: string,
  ) => void;

  onClose: () => void;

  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void> | void;
}

function getNoteTypeLabel(
  noteType: PeoplePersonalNoteType,
  locale: 'en' | 'ar',
): string {
  if (noteType === 'weakness') {
    return locale === 'ar'
      ? 'نقطة تحتاج إلى نمو'
      : 'Area for growth';
  }

  return locale === 'ar'
    ? 'نقطة قوة'
    : 'Strength';
}

export default function PeoplePersonalNoteModal({
  open,
  person,
  noteType,
  noteText,
  saving,
  locale,
  assignedGroup,
  groupLabel,
  onNoteTypeChange,
  onNoteTextChange,
  onClose,
  onSubmit,
}: PeoplePersonalNoteModalProps) {
  if (!open || !person) {
    return null;
  }

  const isArabic =
    locale === 'ar';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={event => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="people-personal-note-title"
        className="w-full max-w-xl rounded-3xl border border-gray-100 bg-white shadow-2xl"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <h2
              id="people-personal-note-title"
              className="text-xl font-black text-gray-900"
            >
              {isArabic
                ? 'إضافة ملاحظة شخصية'
                : 'Add Personal Note'}
            </h2>

            <p className="mt-1 break-words text-sm text-gray-500">
              {person.name ||
                (isArabic
                  ? 'عضو'
                  : 'Member')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={
              isArabic
                ? 'إغلاق'
                : 'Close'
            }
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-6 p-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                onNoteTypeChange(
                  'strength',
                )
              }
              disabled={saving}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-black transition ${
                noteType === 'strength'
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <ThumbsUp size={17} />

              {getNoteTypeLabel(
                'strength',
                locale,
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                onNoteTypeChange(
                  'weakness',
                )
              }
              disabled={saving}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-black transition ${
                noteType === 'weakness'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <ThumbsDown size={17} />

              {getNoteTypeLabel(
                'weakness',
                locale,
              )}
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-gray-100 bg-stone-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {isArabic
                  ? 'المعرّف'
                  : 'Identifier'}
              </div>

              <div className="mt-1 break-all font-bold text-gray-800">
                {person.identifier ||
                  '—'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {isArabic
                  ? 'المجموعة'
                  : 'Group'}
              </div>

              <div className="mt-1 break-words font-bold text-gray-800">
                {assignedGroup
                  ? groupLabel ||
                    assignedGroup
                  : isArabic
                    ? 'غير معيّن'
                    : 'Unassigned'}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-gray-800">
              {isArabic
                ? 'نص الملاحظة'
                : 'Note text'}
            </span>

            <textarea
              value={noteText}
              onChange={event =>
                onNoteTextChange(
                  event.target.value,
                )
              }
              disabled={saving}
              rows={7}
              required
              placeholder={
                noteType === 'strength'
                  ? isArabic
                    ? 'اكتب نقطة القوة التي لاحظتها...'
                    : 'Write the strength you observed...'
                  : isArabic
                    ? 'اكتب المجال الذي يحتاج إلى نمو...'
                    : 'Write the area that needs growth...'
              }
              className="w-full resize-y rounded-2xl border border-gray-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-[#7a1717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isArabic
                ? 'إلغاء'
                : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !noteText.trim()
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-[#7a1717] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5f1111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle size={17} />

              {saving
                ? isArabic
                  ? 'جارٍ الحفظ...'
                  : 'Saving...'
                : isArabic
                  ? 'حفظ الملاحظة'
                  : 'Save note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
