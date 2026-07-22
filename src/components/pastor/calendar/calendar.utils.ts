export function timeToHour(time?: string): number {
  if (!time) {
    return 0;
  }

  const [hours, minutes] = time.split(':').map(Number);

  return hours + (minutes || 0) / 60;
}

export function hourToTime(hourValue: number): string {
  const hours = Math.floor(hourValue);
  const minutes = Math.round((hourValue - hours) * 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}`;
}

export function hourToLabel(
  hourValue: number,
  locale: 'en' | 'ar',
): string {
  const isArabic = locale === 'ar';
  const hours = Math.floor(hourValue);
  const minutes = Math.round((hourValue - hours) * 60);

  const period =
    hours >= 12
      ? isArabic
        ? 'م'
        : 'PM'
      : isArabic
        ? 'ص'
        : 'AM';

  const hour12 =
    hours === 0
      ? 12
      : hours > 12
        ? hours - 12
        : hours;

  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function timeToLabel(
  time: string | undefined,
  locale: 'en' | 'ar',
): string {
  return hourToLabel(timeToHour(time || '00:00'), locale);
}

export function timeRangeToLabel(
  startTime: string | undefined,
  endTime: string | undefined,
  locale: 'en' | 'ar',
): string {
  return `${timeToLabel(startTime, locale)} - ${timeToLabel(
    endTime,
    locale,
  )}`;
}

export function buildTimeOptions(
  startHour: number,
  endHour: number,
  step = 0.5,
): { value: string; hour: number }[] {
  const options: { value: string; hour: number }[] = [];

  for (let hour = startHour; hour <= endHour; hour += step) {
    const roundedHour = Math.round(hour * 100) / 100;

    options.push({
      value: hourToTime(roundedHour),
      hour: roundedHour,
    });
  }

  return options;
}

export function slotOverlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && endA > startB;
}
