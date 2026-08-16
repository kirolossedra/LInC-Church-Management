import { Loader2, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { EMPTY_ADMIN_AUTHORITY } from '../admin.constants';
import type { AdminAccount, AdminAuthority } from '../admin.types';

interface AdminHierarchySectionProps {
  chiefEmail: string;
  sortedAdminAccounts: AdminAccount[];
  authorityDrafts: Record<string, AdminAuthority>;
  savingAdminUid: string | null;
  updateAuthorityDraft: (
    uid: string,
    field: keyof AdminAuthority,
    enabled: boolean
  ) => void;
  handleSaveAdminAuthority: (account: AdminAccount) => void | Promise<void>;
  handleSuspendAdmin: (account: AdminAccount) => void | Promise<void>;
}

export function AdminHierarchySection({
  chiefEmail,
  sortedAdminAccounts,
  authorityDrafts,
  savingAdminUid,
  updateAuthorityDraft,
  handleSaveAdminAuthority,
  handleSuspendAdmin,
}: AdminHierarchySectionProps) {
  return (
  <section className="overflow-hidden rounded-[28px] border border-amber-200 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
    <div className="border-b border-amber-100 bg-amber-50/60 px-6 py-5 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700/70">
            Chief Controls
          </p>
          <h2 className="text-2xl font-extrabold text-[#641414]">
            Administrator Hierarchy
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-500">
            The first Firebase account that successfully signed in claimed the Chief role. Every later account remains pending until you select its authority and activate it.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm">
          <p className="font-extrabold text-amber-900">Chief account</p>
          <p className="mt-1 break-all font-semibold text-stone-600">
            {chiefEmail}
          </p>
        </div>
      </div>
    </div>

    <div className="space-y-5 p-6 sm:p-8">
      {sortedAdminAccounts.filter((account) => account.role !== 'chief').length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center">
          <Users size={30} className="mx-auto mb-3 text-stone-400" />
          <h3 className="font-extrabold text-stone-800">
            No additional administrators yet
          </h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            When another Firebase email/password account signs in successfully, it will appear here as pending.
          </p>
        </div>
      ) : (
        sortedAdminAccounts
          .filter((account) => account.role !== 'chief')
          .map((account) => {
            const draft =
              authorityDrafts[account.uid] || EMPTY_ADMIN_AUTHORITY;
            const isSaving = savingAdminUid === account.uid;

            return (
              <article
                key={account.uid}
                className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="break-all text-lg font-extrabold text-[#641414]">
                      {account.email || 'Firebase account without email'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-stone-400">
                      First successful sign-in:{' '}
                      {account.firstSignedInAt
                        ? new Date(account.firstSignedInAt).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-extrabold ${
                      account.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : account.status === 'suspended'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {account.status === 'active'
                      ? 'Active'
                      : account.status === 'suspended'
                        ? 'Suspended'
                        : 'Pending'}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {(
                    [
                      {
                        key: 'manageAssessmentForms',
                        title: 'Assessment Forms',
                        description: 'Show, disable, or hide assessments.',
                      },
                      {
                        key: 'manageCarousel',
                        title: 'Landing Carousel',
                        description: 'Control visibility, photos, and ordering.',
                      },
                      {
                        key: 'manageAttendance',
                        title: 'Attendance',
                        description: 'Manage people, attendance, and analysis.',
                      },
                      {
                        key: 'manageArchives',
                        title: 'LInC Archives',
                        description: 'Organize folders and manage archive files.',
                      },
                      {
                        key: 'manageNextGenQa',
                        title: 'NextGen QA',
                        description: 'Create QA sessions, review voters, and open or close voting.',
                      },
                      {
                        key: 'managePeopleAccess',
                        title: 'People Access',
                        description: 'Register and repair Firebase access for People Notes.',
                      },
                    ] as const
                  ).map((authorityOption) => {
                    const selected = draft[authorityOption.key];

                    return (
                      <label
                        key={authorityOption.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                          selected
                            ? 'border-[#8b1e1e] bg-[#f8eeee]'
                            : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateAuthorityDraft(
                              account.uid,
                              authorityOption.key,
                              event.target.checked
                            )
                          }
                          className="mt-1 h-4 w-4 accent-[#8b1e1e]"
                        />
                        <span>
                          <span className="block text-sm font-extrabold text-stone-800">
                            {authorityOption.title}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-stone-500">
                            {authorityOption.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleSaveAdminAuthority(account)}
                    disabled={isSaving}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-5 text-sm font-extrabold text-white transition hover:bg-[#761919] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    Save Authority & Activate
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSuspendAdmin(account)}
                    disabled={isSaving || account.status === 'suspended'}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-red-200 bg-red-50 px-5 text-sm font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LockKeyhole size={17} />
                    Suspend
                  </button>
                </div>
              </article>
            );
          })
      )}
    </div>
  </section>
  );
}
