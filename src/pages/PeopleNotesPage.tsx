
import { BookOpenText, Plus, Search, UserRound, Sparkles, AlertTriangle } from 'lucide-react';
import PageTitle from '../components/PageTitle';
import { useI18n } from '../i18n';

export default function PeopleNotesPage() {
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';

  return (
    <div className="space-y-8" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <PageTitle
        title={isArabic ? 'ملاحظات نمو الأشخاص' : 'People Development Notes'}
        subtitle={
          isArabic
            ? 'تتبع نقاط القوة، مجالات النمو، المتابعات، والملاحظات الرعوية لكل شخص'
            : 'Track strengths, growth areas, follow-ups, and pastoral notes for each person'
        }
        icon={<BookOpenText size={22} />}
      />

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">
              {isArabic ? 'سجل الأشخاص' : 'People Records'}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              {isArabic
                ? 'ابدأ بإضافة شخص، ثم أضف نقاط القوة ومجالات النمو والملاحظات الخاصة به.'
                : 'Start by adding a person, then record strengths, growth areas, and notes under their profile.'}
            </p>
          </div>

          <button
            type="button"
            className="flex items-center justify-center gap-2 bg-[#8B1E1E] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#8B1E1E]/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            <span>{isArabic ? 'إضافة شخص' : 'Add Person'}</span>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 bg-stone-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder={isArabic ? 'ابحث عن شخص...' : 'Search people...'}
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <UserRound size={24} className="text-gray-500" />
            </div>
            <h3 className="font-bold text-gray-800">
              {isArabic ? 'لا توجد سجلات بعد' : 'No records yet'}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {isArabic
                ? 'سيظهر الأشخاص هنا بعد إضافتهم.'
                : 'People will appear here after they are added.'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-xl font-bold text-[#8B1E1E] flex items-center gap-2">
              <Sparkles size={20} />
              {isArabic ? 'نقاط القوة' : 'Strengths'}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {isArabic
                ? 'لكل نقطة قوة: العنوان، تاريخ الإضافة، آخر متابعة، وملاحظات مرتبطة بها.'
                : 'Each strength will include a title, date added, latest follow-up date, and related notes.'}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-xl font-bold text-[#8B1E1E] flex items-center gap-2">
              <AlertTriangle size={20} />
              {isArabic ? 'مجالات النمو' : 'Growth Areas'}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {isArabic
                ? 'لكل مجال نمو: العنوان، تاريخ الإضافة، آخر متابعة، وملاحظات مرتبطة به.'
                : 'Each growth area will include a title, date added, latest follow-up date, and related notes.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
