import { BookOpenText, CheckCircle, ShieldCheck, XCircle } from 'lucide-react';
import PageTitle from '../PageTitle';
import type { PeopleNotesController } from './usePeopleNotes';

export default function PeopleNotesHeader({
  controller,
  hasPastorAccess,
}: {
  controller: PeopleNotesController;
  hasPastorAccess: boolean;
}) {
  const { isArabic, currentUserEmail, pageError, pageSuccess, statusText } = controller;

  return (
    <>
      <PageTitle
        title={isArabic ? 'ملاحظات نمو الأشخاص' : 'People Development Notes'}
        subtitle={
          isArabic
            ? 'تتبع نقاط القوة، مجالات النمو، المتابعات، والملاحظات الرعوية لكل شخص'
            : 'Track strengths, growth areas, follow-ups, and pastoral notes for each person'
        }
        icon={<BookOpenText size={22} />}
      />

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                hasPastorAccess ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <ShieldCheck size={21} />
            </div>

            <div>
              <h3 className="font-bold text-gray-900">{isArabic ? 'حالة الوصول' : 'Access Status'}</h3>
              <p className="text-sm text-gray-500 mt-1">{statusText}</p>
              <p className="text-xs text-gray-400 mt-1">
                {isArabic ? 'الحساب الحالي' : 'Current account'}:{' '}
                {currentUserEmail || (isArabic ? 'غير معروف' : 'Unknown')}
              </p>
            </div>
          </div>

          {!hasPastorAccess && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm font-bold text-amber-700">
              <XCircle size={16} />
              {isArabic ? 'الأزرار معطلة لهذا الحساب' : 'Actions are disabled for this account'}
            </div>
          )}
        </div>
      </section>

      {pageError && (
        <section className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-bold flex items-start gap-2">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <span>{pageError}</span>
        </section>
      )}

      {pageSuccess && (
        <section className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm font-bold flex items-start gap-2">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <span>{pageSuccess}</span>
        </section>
      )}
    </>
  );
}

