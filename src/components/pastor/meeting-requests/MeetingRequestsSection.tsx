import {
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Hourglass,
  Mail,
  User,
  XCircle,
} from 'lucide-react';

import { useI18n } from '../../../i18n';

import { timeRangeToLabel } from '../calendar';

import type {
  MeetingRequestDecision,
  MeetingRequestSectionProps,
} from './meetingRequests.types';

import {
  getMeetingRequestId,
  getPendingMeetingRequests,
} from './meetingRequests.utils';

export default function MeetingRequestsSection({
  meetingRequests,
  expanded,
  loading,
  locale,
  onToggleExpanded,
  onDecision,
}: MeetingRequestSectionProps) {
  const { t } = useI18n();

  const pendingRequests =
    getPendingMeetingRequests(
      meetingRequests,
    );

  if (pendingRequests.length === 0) {
    return null;
  }

  const handleDecision = (
    requestId: string,
    decision: MeetingRequestDecision,
  ) => {
    if (!requestId || loading) {
      return;
    }

    void onDecision(
      requestId,
      decision,
    );
  };

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-amber-700">
          <Hourglass size={18} />

          {t('requests.title')}

          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {pendingRequests.length}
          </span>
        </h3>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="text-xs font-bold text-[#7a1717] hover:underline"
        >
          {expanded
            ? t('requests.hide')
            : t('requests.viewAll')}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {pendingRequests.map(request => {
            const requestId =
              getMeetingRequestId(request);

            return (
              <div
                key={requestId}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-100 bg-stone-50 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white">
                    <User
                      size={18}
                      className="text-[#7a1717]"
                    />
                  </div>

                  <div className="min-w-0">
                    <h4 className="break-words text-sm font-bold">
                      {request.name ||
                        (locale === 'ar'
                          ? 'مستخدم'
                          : 'User')}
                    </h4>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {request.email && (
                        <span className="flex min-w-0 items-center gap-1">
                          <Mail
                            size={11}
                            className="shrink-0"
                          />

                          <span className="break-all">
                            {request.email}
                          </span>
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <CalendarIcon size={11} />

                        {request.date}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock size={11} />

                        {timeRangeToLabel(
                          request.startTime,
                          request.endTime,
                          locale,
                        )}
                      </span>
                    </div>

                    {request.reason && (
                      <p className="mt-1 break-words text-xs italic text-gray-400">
                        {request.reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={
                      loading ||
                      !requestId
                    }
                    onClick={() =>
                      handleDecision(
                        requestId,
                        'accepted',
                      )
                    }
                    className="flex items-center gap-1 rounded-lg bg-green-50 px-4 py-2 text-xs font-bold text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle size={14} />

                    {t('requests.accept')}
                  </button>

                  <button
                    type="button"
                    disabled={
                      loading ||
                      !requestId
                    }
                    onClick={() =>
                      handleDecision(
                        requestId,
                        'rejected',
                      )
                    }
                    className="flex items-center gap-1 rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle size={14} />

                    {t('requests.reject')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
