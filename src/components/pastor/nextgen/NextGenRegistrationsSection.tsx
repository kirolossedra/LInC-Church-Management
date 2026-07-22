import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  IdCard,
  Mail,
  Search,
  UserPlus,
  XCircle,
} from 'lucide-react';

import type {
  NextGenRegistration,
  NextGenRegistrationStatus,
  NextGenRegistrationStatusFilter,
  NextGenRegistrationsSectionProps,
} from './nextgen.types';

import {
  buildNextGenRegistrationDuplicateCounts,
  filterAndSortNextGenRegistrations,
  getDuplicateNextGenRegistrations,
  getNextGenRegistrationsByStatus,
  nextGenRegistrationHasDuplicate,
  normalizeDuplicateIdentityValue,
} from './nextgen.utils';

function getStatusLabel(
  status: NextGenRegistrationStatus,
  locale: 'en' | 'ar',
): string {
  const labels: Record<
    NextGenRegistrationStatus,
    { en: string; ar: string }
  > = {
    pending: {
      en: 'Pending',
      ar: 'قيد الانتظار',
    },
    approved: {
      en: 'Approved',
      ar: 'موافق عليها',
    },
    rejected: {
      en: 'Rejected',
      ar: 'مرفوضة',
    },
  };

  return labels[status][locale];
}

function getStatusClasses(
  status: NextGenRegistrationStatus,
): string {
  const classes: Record<
    NextGenRegistrationStatus,
    string
  > = {
    pending:
      'border-amber-200 bg-amber-50 text-amber-700',
    approved:
      'border-green-200 bg-green-50 text-green-700',
    rejected:
      'border-red-200 bg-red-50 text-red-700',
  };

  return classes[status];
}

function getCreatedLabel(
  registration: NextGenRegistration,
): string {
  if (registration.createdAtEasternTime) {
    return registration.createdAtEasternTime;
  }

  if (registration.createdAtISO) {
    return registration.createdAtISO;
  }

  if (registration.createdAt) {
    return new Date(
      registration.createdAt,
    ).toLocaleString();
  }

  return '';
}

export default function NextGenRegistrationsSection({
  registrations,
  expanded,
  searchTerm,
  statusFilter,
  updatingUserId,
  locale,
  onToggleExpanded,
  onSearchTermChange,
  onStatusFilterChange,
  onStatusChange,
}: NextGenRegistrationsSectionProps) {
  const duplicateCounts =
    buildNextGenRegistrationDuplicateCounts(
      registrations,
    );

  const visibleRegistrations =
    filterAndSortNextGenRegistrations(
      registrations,
      searchTerm,
      statusFilter,
    );

  const pendingCount =
    getNextGenRegistrationsByStatus(
      registrations,
      'pending',
    ).length;

  const approvedCount =
    getNextGenRegistrationsByStatus(
      registrations,
      'approved',
    ).length;

  const rejectedCount =
    getNextGenRegistrationsByStatus(
      registrations,
      'rejected',
    ).length;

  const duplicateCount =
    getDuplicateNextGenRegistrations(
      registrations,
    ).length;

  const handleStatusChange = (
    registration: NextGenRegistration,
    nextStatus: 'approved' | 'rejected',
  ) => {
    if (updatingUserId) {
      return;
    }

    const displayName =
      registration.fullName ||
      registration.userId;

    const confirmationMessage =
      nextStatus === 'approved'
        ? locale === 'ar'
          ? `هل تريد الموافقة على تسجيل ${displayName}؟`
          : `Approve the NextGen registration for ${displayName}?`
        : locale === 'ar'
          ? `هل تريد رفض تسجيل ${displayName}؟`
          : `Reject the NextGen registration for ${displayName}?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    void onStatusChange(
      registration,
      nextStatus,
    );
  };

  return (
    <section className="rounded-3xl border border-sky-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full flex-col gap-4 text-start sm:flex-row sm:items-start sm:justify-between"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-sky-800">
            <UserPlus size={18} />

            {locale === 'ar'
              ? 'طلبات تسجيل NextGen'
              : 'NextGen Registration Requests'}

            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
              {registrations.length}
            </span>
          </h3>

          <p className="mt-1 text-xs uppercase tracking-widest text-gray-400">
            {locale === 'ar'
              ? 'مراجعة المعرّفات والحسابات قبل الموافقة'
              : 'Review identifiers and accounts before approval'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            {locale === 'ar'
              ? `قيد الانتظار: ${pendingCount}`
              : `Pending: ${pendingCount}`}
          </span>

          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            {locale === 'ar'
              ? `موافق عليها: ${approvedCount}`
              : `Approved: ${approvedCount}`}
          </span>

          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            {locale === 'ar'
              ? `مرفوضة: ${rejectedCount}`
              : `Rejected: ${rejectedCount}`}
          </span>

          {expanded ? (
            <ChevronUp
              size={18}
              className="text-gray-500"
            />
          ) : (
            <ChevronDown
              size={18}
              className="text-gray-500"
            />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={event =>
                  onSearchTermChange(
                    event.target.value,
                  )
                }
                placeholder={
                  locale === 'ar'
                    ? 'ابحث بالاسم أو البريد أو المعرّف...'
                    : 'Search by name, email, or ID...'
                }
                className="w-full rounded-xl border border-gray-200 bg-stone-50 py-3 pe-4 ps-11 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </label>

            <select
              value={statusFilter}
              onChange={event =>
                onStatusFilterChange(
                  event.target
                    .value as NextGenRegistrationStatusFilter,
                )
              }
              className="rounded-xl border border-gray-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-sky-400 focus:bg-white"
            >
              <option value="all">
                {locale === 'ar'
                  ? 'كل الحالات'
                  : 'All statuses'}
              </option>

              <option value="pending">
                {locale === 'ar'
                  ? 'قيد الانتظار'
                  : 'Pending'}
              </option>

              <option value="approved">
                {locale === 'ar'
                  ? 'موافق عليها'
                  : 'Approved'}
              </option>

              <option value="rejected">
                {locale === 'ar'
                  ? 'مرفوضة'
                  : 'Rejected'}
              </option>
            </select>
          </div>

          {duplicateCount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <h4 className="font-black text-amber-800">
                    {locale === 'ar'
                      ? `تم العثور على ${duplicateCount} تسجيلات محتملة مكررة`
                      : `${duplicateCount} potentially duplicate registrations found`}
                  </h4>

                  <p className="mt-1 text-sm leading-relaxed text-amber-700">
                    {locale === 'ar'
                      ? 'يتم وضع علامة عندما يظهر نفس البريد الإلكتروني أو نفس الاسم في أكثر من معرّف. راجع جميع الصفوف المتشابهة قبل الموافقة.'
                      : 'A warning appears when the same email or normalized name is associated with multiple IDs. Review every matching row before approving.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {registrations.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-stone-50 p-6 text-sm text-gray-500">
              {locale === 'ar'
                ? 'لا توجد تسجيلات NextGen حتى الآن.'
                : 'No NextGen registrations have been submitted yet.'}
            </div>
          ) : visibleRegistrations.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-stone-50 p-6 text-sm text-gray-500">
              {locale === 'ar'
                ? 'لا توجد تسجيلات تطابق البحث أو حالة التصفية.'
                : 'No registrations match the current search or status filter.'}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRegistrations.map(
                registration => {
                  const normalizedEmail =
                    registration.email
                      .trim()
                      .toLowerCase();

                  const normalizedName =
                    normalizeDuplicateIdentityValue(
                      registration.fullName,
                    );

                  const sameEmailCount =
                    normalizedEmail
                      ? duplicateCounts
                          .emailCounts[
                          normalizedEmail
                        ] || 0
                      : 0;

                  const sameNameCount =
                    normalizedName
                      ? duplicateCounts
                          .nameCounts[
                          normalizedName
                        ] || 0
                      : 0;

                  const hasDuplicateEmail =
                    sameEmailCount > 1;

                  const hasDuplicateName =
                    sameNameCount > 1;

                  const hasDuplicate =
                    nextGenRegistrationHasDuplicate(
                      registration,
                      duplicateCounts,
                    );

                  const isUpdating =
                    updatingUserId ===
                    registration.userId;

                  const createdLabel =
                    getCreatedLabel(
                      registration,
                    );

                  return (
                    <article
                      key={registration.userId}
                      className={`rounded-2xl border p-5 transition-all ${
                        hasDuplicate
                          ? 'border-amber-300 bg-amber-50/40'
                          : 'border-gray-100 bg-stone-50'
                      }`}
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="break-words text-base font-black text-gray-900">
                              {registration.fullName ||
                                (locale === 'ar'
                                  ? 'اسم غير متوفر'
                                  : 'Name unavailable')}
                            </h4>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                                registration.status,
                              )}`}
                            >
                              {getStatusLabel(
                                registration.status,
                                locale,
                              )}
                            </span>

                            {hasDuplicate && (
                              <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                                <AlertTriangle
                                  size={12}
                                />

                                {locale === 'ar'
                                  ? 'تكرار محتمل'
                                  : 'Possible duplicate'}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <IdCard
                                size={15}
                                className="shrink-0 text-sky-700"
                              />

                              <span className="break-all font-bold">
                                {registration.userId}
                              </span>
                            </div>

                            <div className="flex min-w-0 items-center gap-2">
                              <Mail
                                size={15}
                                className="shrink-0 text-sky-700"
                              />

                              <span className="break-all">
                                {registration.email ||
                                  (locale === 'ar'
                                    ? 'لا يوجد بريد إلكتروني'
                                    : 'No email')}
                              </span>
                            </div>
                          </div>

                          {createdLabel && (
                            <p className="mt-3 text-xs text-gray-400">
                              {locale === 'ar'
                                ? 'تم التسجيل: '
                                : 'Registered: '}

                              {createdLabel}
                            </p>
                          )}

                          {(hasDuplicateEmail ||
                            hasDuplicateName) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {hasDuplicateEmail && (
                                <span className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700">
                                  {locale === 'ar'
                                    ? `البريد مستخدم مع ${sameEmailCount} معرّفات`
                                    : `Email appears under ${sameEmailCount} IDs`}
                                </span>
                              )}

                              {hasDuplicateName && (
                                <span className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700">
                                  {locale === 'ar'
                                    ? `الاسم يظهر مع ${sameNameCount} معرّفات`
                                    : `Name appears under ${sameNameCount} IDs`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:w-52 lg:flex-col">
                          <button
                            type="button"
                            disabled={
                              Boolean(
                                updatingUserId,
                              ) ||
                              registration.status ===
                                'approved'
                            }
                            onClick={() =>
                              handleStatusChange(
                                registration,
                                'approved',
                              )
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-xs font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle
                              size={15}
                            />

                            {isUpdating
                              ? locale === 'ar'
                                ? 'جارٍ التحديث...'
                                : 'Updating...'
                              : locale === 'ar'
                                ? 'موافقة'
                                : 'Approve'}
                          </button>

                          <button
                            type="button"
                            disabled={
                              Boolean(
                                updatingUserId,
                              ) ||
                              registration.status ===
                                'rejected'
                            }
                            onClick={() =>
                              handleStatusChange(
                                registration,
                                'rejected',
                              )
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle size={15} />

                            {isUpdating
                              ? locale === 'ar'
                                ? 'جارٍ التحديث...'
                                : 'Updating...'
                              : locale === 'ar'
                                ? 'رفض'
                                : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
