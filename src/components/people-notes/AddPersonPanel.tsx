import { Plus } from 'lucide-react';
import type { PeopleNotesController } from './usePeopleNotes';

export default function AddPersonPanel({ controller }: { controller: PeopleNotesController }) {
  const { isArabic, saving, personForm, setPersonForm, actionsDisabled, handleAddPerson } = controller;

  return (
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">
              {isArabic ? 'سجل الأشخاص' : 'People Records'}
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-3xl">
              {isArabic
                ? 'أضف شخصاً، ثم سجّل نقاط القوة ومجالات النمو وتواريخ المتابعة والملاحظات المرتبطة بكل نقطة.'
                : 'Add a person, then record strengths, growth areas, follow-up dates, and notes attached to each item.'}
            </p>
          </div>

          <form
            onSubmit={handleAddPerson}
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 w-full xl:max-w-3xl"
          >
            <input
              type="text"
              value={personForm.fullName}
              onChange={e => setPersonForm(prev => ({ ...prev, fullName: e.target.value }))}
              disabled={actionsDisabled}
              placeholder={isArabic ? 'اسم الشخص' : 'Person name'}
              className="px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
            />

            <input
              type="text"
              value={personForm.contact}
              onChange={e => setPersonForm(prev => ({ ...prev, contact: e.target.value }))}
              disabled={actionsDisabled}
              placeholder={isArabic ? 'وسيلة تواصل اختيارية' : 'Optional contact'}
              className="px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B1E1E]/20 outline-none text-sm disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={actionsDisabled}
              className="flex items-center justify-center gap-2 bg-[#8B1E1E] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#8B1E1E]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Plus size={18} />
              <span>
                {saving
                  ? isArabic
                    ? 'جار الحفظ...'
                    : 'Saving...'
                  : isArabic
                    ? 'إضافة شخص'
                    : 'Add Person'}
              </span>
            </button>
          </form>
        </div>
      </section>
  );
}

