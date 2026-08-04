import type { Meeting } from '../../../types';

export type CalendarEmailLocale = 'en' | 'ar';

export function getMeetingRequestEmail(
  meeting: Meeting,
): string {
  return String(
    (meeting as Meeting & { requestEmail?: string }).requestEmail || '',
  ).trim();
}

export function getMeetingRequesterLocale(
  meeting: Meeting,
): CalendarEmailLocale {
  return (
    meeting as Meeting & {
      requesterLocale?: string;
    }
  ).requesterLocale === 'ar'
    ? 'ar'
    : 'en';
}
