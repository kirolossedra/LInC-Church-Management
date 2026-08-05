import { ShieldCheck, Users } from 'lucide-react';

export default function CongregationGroupHeader({ isAr }: { isAr: boolean }) {
  return (
          <header className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 sm:p-7 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8aaaa] bg-[#f8eeee] px-4 py-2 text-[#7a1717]">
                  <ShieldCheck size={18} />
                  <span>{isAr ? 'بوابة نمو الأشخاص' : 'People Development Portal'}</span>
                </div>
                <h1 className="text-3xl font-black leading-tight text-[#7a1717] sm:text-4xl">
                  {isAr ? 'ملاحظات وتكليفات مجموعتك' : 'Your Group Notes & Assignments'}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-[#6b4b4b]">
                  {isAr
                    ? 'سجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض ملاحظات وتكليفات المجموعة التي تم تعيينك فيها.'
                    : 'Log in with your personal identifier to view the notes and assignments for your assigned group.'}
                </p>
              </div>

              <div className="rounded-3xl border border-[#ead9d0] bg-white p-4 text-center shadow-sm md:min-w-[180px]">
                <Users className="mx-auto mb-2 text-[#7a1717]" size={32} />
                <div className="text-sm uppercase tracking-widest text-[#7a1717]/70">
                  {isAr ? 'خاص بالمخدومين' : 'Congregation Side'}
                </div>
              </div>
            </div>
          </header>
  );
}

