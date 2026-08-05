import { ShieldCheck, Users } from 'lucide-react';
import LincPageHero from '../linc/LincPageHero';

export default function CongregationGroupHeader({ isAr }: { isAr: boolean }) {
  return (
    <LincPageHero
      title={isAr ? 'ملاحظات وتكليفات مجموعتك' : 'Your Group Notes & Assignments'}
      description={isAr
        ? 'سجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض ملاحظات وتكليفات المجموعة التي تم تعيينك فيها.'
        : 'Log in with your personal identifier to view the notes and assignments for your assigned group.'}
      eyebrow={isAr ? 'بوابة نمو الأشخاص' : 'People Development Portal'}
      icon={<ShieldCheck size={22} />}
      aside={(
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md">
          <Users size={24} className="text-[#f2a900]" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">
            {isAr ? 'خاص بالمخدومين' : 'Congregation Side'}
          </span>
        </div>
      )}
    />
  );
}
