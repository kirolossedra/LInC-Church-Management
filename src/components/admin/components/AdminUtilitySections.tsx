import { ShieldCheck } from 'lucide-react';
import { AttendanceManagement } from '../attendance';

export function NoAuthorityCard() {
  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-center shadow-sm sm:p-8">
      <ShieldCheck size={30} className="mx-auto mb-3 text-amber-700" />
      <h2 className="text-xl font-extrabold text-amber-950">
        No authority assigned
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-amber-900/75">
        Your profile is active, but it currently has no enabled administration
        areas. The Chief can update your authority.
      </p>
    </section>
  );
}

export function AttendanceAdminSection() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
      <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
            Administration Operations
          </p>
          <h2 className="text-2xl font-extrabold text-[#641414]">
            Attendance Management
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-500">
            The complete attendance system is available after unlocking this
            Administrator Panel. No additional attendance passcode is required.
          </p>
        </div>
      </div>

      <div className="bg-[#f5f4f0] p-4 sm:p-6">
        <AttendanceManagement />
      </div>
    </section>
  );
}
