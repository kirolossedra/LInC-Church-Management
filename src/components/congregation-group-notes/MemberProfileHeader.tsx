import { LogOut, User } from 'lucide-react';
import type { CongregationGroupNotesController } from './useCongregationGroupNotes';

export default function MemberProfileHeader({ controller }: { controller: CongregationGroupNotesController }) {
  const { isAr, profile, handleLogout } = controller;
  if (!profile) return null;

  return (
              <section className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f8eeee] text-[#7a1717]">
                      <User size={25} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black text-[#7a1717]">
                        {profile.fullName || (isAr ? 'مرحباً' : 'Welcome')}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#ead9d0] bg-white px-3 py-1 text-sm text-[#6b4b4b]">
                          {profile.identifier}
                        </span>
                        {profile.email && (
                          <span className="rounded-full border border-[#ead9d0] bg-white px-3 py-1 text-sm text-[#6b4b4b]">
                            {profile.email}
                          </span>
                        )}
                        {profile.primaryGift && (
                          <span className="rounded-full border border-[#d8aaaa] bg-[#f8eeee] px-3 py-1 text-sm text-[#7a1717]">
                            {profile.primaryGift}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8aaaa] bg-[#f8eeee] px-5 py-3 text-[#7a1717] transition-colors hover:bg-[#efd8d8]"
                  >
                    <LogOut size={18} />
                    {isAr ? 'تسجيل خروج' : 'Log out'}
                  </button>
                </div>
              </section>
  );
}

