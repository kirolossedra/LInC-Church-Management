export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function formatDateLabel(dateValue: string, isArabic: boolean): string {
  if (!dateValue) return isArabic ? 'غير محدد' : 'Not set';

  try {
    return new Intl.DateTimeFormat(isArabic ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${dateValue}T00:00:00`));
  } catch {
    return dateValue;
  }
}

export function formatDateTimeLabel(timestamp: number, isArabic: boolean): string {
  if (!timestamp) return isArabic ? 'غير محدد' : 'Not set';

  try {
    return new Intl.DateTimeFormat(isArabic ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return String(timestamp);
  }
}
