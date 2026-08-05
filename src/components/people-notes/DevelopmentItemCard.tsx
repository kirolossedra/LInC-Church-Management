import { MessageSquareText, Trash2 } from 'lucide-react';
import type { DevelopmentItem } from '../../services/peopleNotes';
import { formatDateLabel, formatDateTimeLabel } from './peopleNotes.utils';
import type { PeopleNotesController } from './usePeopleNotes';

export default function DevelopmentItemCard({
  controller,
  item,
}: {
  controller: PeopleNotesController;
  item: DevelopmentItem;
}) {
  const {
    isArabic,
    actionsDisabled,
    followUpInputs,
    setFollowUpInputs,
    commentInputs,
    setCommentInputs,
    handleDeleteItem,
    handleUpdateFollowUpDate,
    handleAddComment,
    handleDeleteComment,
  } = controller;
  const itemLabel =
    item.type === 'strength'
      ? isArabic
        ? 'نقطة قوة'
        : 'Strength'
      : isArabic
        ? 'مجال نمو'
        : 'Growth Area';

  return (
      <div key={item.id} className="rounded-2xl border border-gray-100 bg-stone-50 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-bold text-[#8B1E1E]">
                {itemLabel}
              </span>
              <span className="text-[11px] text-gray-400">
                {isArabic ? 'أضيف في' : 'Added'}: {formatDateLabel(item.dateAdded, isArabic)}
              </span>
              <span className="text-[11px] text-gray-400">
                {isArabic ? 'آخر متابعة' : 'Latest follow-up'}:{' '}
                {formatDateLabel(item.latestFollowUpDate, isArabic)}
              </span>
            </div>

            <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>

            {item.description && (
              <p className="text-sm leading-6 text-gray-600 whitespace-pre-wrap">
                {item.description}
              </p>
            )}

            {item.createdBy && (
              <p className="text-[11px] text-gray-400">
                {isArabic ? 'أضيف بواسطة' : 'Added by'}: {item.createdBy}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleDeleteItem(item)}
            disabled={actionsDisabled}
            className="self-start p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title={isArabic ? 'حذف' : 'Delete'}
          >
            <Trash2 size={17} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">
              {isArabic ? 'تحديث آخر تاريخ متابعة' : 'Update latest follow-up date'}
            </label>
            <input
              type="date"
              value={followUpInputs[item.id] ?? item.latestFollowUpDate ?? ''}
              onChange={e => setFollowUpInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
              disabled={actionsDisabled}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={() => handleUpdateFollowUpDate(item)}
            disabled={actionsDisabled}
            className="px-5 py-3 bg-[#8B1E1E] text-white rounded-xl font-bold text-sm hover:bg-[#641414] transition-colors disabled:opacity-50"
          >
            {isArabic ? 'حفظ المتابعة' : 'Save Follow-up'}
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h5 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <MessageSquareText size={16} className="text-[#8B1E1E]" />
            {isArabic ? 'الملاحظات' : 'Notes'}
          </h5>

          <div className="space-y-2">
            {item.comments.length === 0 ? (
              <div className="text-sm text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl p-4">
                {isArabic ? 'لا توجد ملاحظات لهذا العنصر بعد.' : 'No notes for this item yet.'}
              </div>
            ) : (
              item.comments.map(comment => (
                <div key={comment.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">
                        {comment.text}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-2">
                        {formatDateTimeLabel(comment.createdAt, isArabic)}
                        {comment.createdBy ? ` • ${comment.createdBy}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteComment(item, comment)}
                      disabled={actionsDisabled}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      title={isArabic ? 'حذف الملاحظة' : 'Delete note'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <textarea
              value={commentInputs[item.id] || ''}
              onChange={e => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
              rows={3}
              disabled={actionsDisabled}
              placeholder={isArabic ? 'أضف ملاحظة أو تعليق متابعة...' : 'Add a note or follow-up comment...'}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm resize-none disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => handleAddComment(item)}
              disabled={actionsDisabled}
              className="self-end px-5 py-3 bg-white border border-[#8B1E1E] text-[#8B1E1E] rounded-xl font-bold text-sm hover:bg-[#f8eeee] transition-colors disabled:opacity-50"
            >
              {isArabic ? 'إضافة ملاحظة' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
  );
}

