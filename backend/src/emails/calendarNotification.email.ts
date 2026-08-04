export type CalendarNotificationKind =
  | 'confirmation'
  | 'rejection'
  | 'cancellation'

export type CalendarNotificationInput = {
  kind: CalendarNotificationKind
  locale: 'en' | 'ar'
  name: string
  date: string
  startTime: string
  endTime: string
  location?: string
  meetLink?: string
}

export function buildCalendarNotificationEmail(
  input: CalendarNotificationInput,
) {
  const isArabic = input.locale === 'ar'
  const copy = isArabic
    ? arabicCopy(input.kind)
    : englishCopy(input.kind)
  const greeting = input.name
    ? `${copy.greeting} ${input.name},`
    : `${copy.greeting},`
  const detailLines = [
    `${copy.date}: ${input.date}`,
    `${copy.time}: ${input.startTime} - ${input.endTime}`,
    input.location
      ? `${copy.location}: ${input.location}`
      : '',
    input.meetLink
      ? `${copy.link}: ${input.meetLink}`
      : '',
  ].filter(Boolean)

  const textContent = [
    greeting,
    '',
    copy.message,
    '',
    ...detailLines,
  ].join('\n')

  const htmlContent = `
    <html>
      <body dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family:Arial,sans-serif;color:#222">
        <h2>${escapeHtml(copy.subject)}</h2>
        <p>${escapeHtml(greeting)}</p>
        <p>${escapeHtml(copy.message)}</p>
        <ul>${detailLines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      </body>
    </html>
  `

  return {
    subject: copy.subject,
    textContent,
    htmlContent,
  }
}

function englishCopy(kind: CalendarNotificationKind) {
  if (kind === 'confirmation') {
    return {
      subject: 'Your meeting request was accepted',
      greeting: 'Hello',
      message: 'Your meeting with Pastor has been confirmed.',
      date: 'Date',
      time: 'Time',
      location: 'Location',
      link: 'Meeting link',
    }
  }
  if (kind === 'rejection') {
    return {
      subject: 'Update about your meeting request',
      greeting: 'Hello',
      message: 'Unfortunately, your meeting request could not be accepted.',
      date: 'Requested date',
      time: 'Requested time',
      location: 'Location',
      link: 'Meeting link',
    }
  }
  return {
    subject: 'Your meeting was cancelled',
    greeting: 'Hello',
    message: 'Your scheduled meeting with Pastor has been cancelled.',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    link: 'Meeting link',
  }
}

function arabicCopy(kind: CalendarNotificationKind) {
  if (kind === 'confirmation') {
    return {
      subject: 'تم قبول طلب الاجتماع',
      greeting: 'مرحباً',
      message: 'تم تأكيد اجتماعك مع القس.',
      date: 'التاريخ',
      time: 'الوقت',
      location: 'المكان',
      link: 'رابط الاجتماع',
    }
  }
  if (kind === 'rejection') {
    return {
      subject: 'تحديث بشأن طلب الاجتماع',
      greeting: 'مرحباً',
      message: 'للأسف، تعذر قبول طلب الاجتماع.',
      date: 'التاريخ المطلوب',
      time: 'الوقت المطلوب',
      location: 'المكان',
      link: 'رابط الاجتماع',
    }
  }
  return {
    subject: 'تم إلغاء الاجتماع',
    greeting: 'مرحباً',
    message: 'تم إلغاء اجتماعك المحدد مع القس.',
    date: 'التاريخ',
    time: 'الوقت',
    location: 'المكان',
    link: 'رابط الاجتماع',
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
