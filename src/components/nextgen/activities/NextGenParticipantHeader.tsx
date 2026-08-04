import { CheckCircle2, LogOut } from 'lucide-react';
import type { NextGenUserRecord } from './nextGenActivities.types';

export default function NextGenParticipantHeader({ user, isArabic, onLogout }: { user: NextGenUserRecord; isArabic: boolean; onLogout: () => void }) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[26px] border border-green-200 bg-green-50 p-5 shadow-sm">
      <div className="flex items-start gap-3 text-green-900"><CheckCircle2 size={25} className="shrink-0 mt-0.5" /><div><h2 className="text-xl font-bold">{isArabic ? `مرحباً ${user.fullName}` : `Welcome, ${user.fullName}`}</h2><p className="text-sm mt-1">{isArabic ? `المعرّف المعتمد: ${user.userId}. يتم تسجيل كل مشاركة بهذا المعرّف لمنع التكرار.` : `Approved ID: ${user.userId}. Every participation is recorded to this identifier to prevent duplicates.`}</p></div></div>
      <button type="button" onClick={onLogout} className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-green-900 rounded-xl font-bold border border-green-200 hover:bg-green-100 transition-colors"><LogOut size={17} className={isArabic ? 'rotate-180' : ''} />{isArabic ? 'تغيير المستخدم' : 'Change User'}</button>
    </div>
  );
}
