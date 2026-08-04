export type BookingRequestEmailInput = {
  name: string
  email: string
  date: string
  startTime: string
  endTime: string
  reason: string
  locale: 'en' | 'ar'
}

export function buildBookingRequestEmail(
  request: BookingRequestEmailInput,
) {
  const isArabic = request.locale === 'ar'
  const subject = isArabic
    ? `طلب اجتماع جديد من ${request.name}`
    : `New meeting request from ${request.name}`

  const labels = isArabic
    ? {
        heading: 'طلب اجتماع جديد',
        name: 'الاسم',
        email: 'البريد الإلكتروني',
        date: 'التاريخ',
        time: 'الوقت',
        reason: 'السبب',
      }
    : {
        heading: 'New meeting request',
        name: 'Name',
        email: 'Email',
        date: 'Date',
        time: 'Time',
        reason: 'Reason',
      }

  const textContent = [
    labels.heading,
    '',
    `${labels.name}: ${request.name}`,
    `${labels.email}: ${request.email}`,
    `${labels.date}: ${request.date}`,
    `${labels.time}: ${request.startTime} - ${request.endTime}`,
    `${labels.reason}: ${request.reason}`,
  ].join('\n')

  const htmlContent = `
    <html>
      <body dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family:Arial,sans-serif;color:#222">
        <h2>${escapeHtml(labels.heading)}</h2>
        <p><strong>${escapeHtml(labels.name)}:</strong> ${escapeHtml(request.name)}</p>
        <p><strong>${escapeHtml(labels.email)}:</strong> ${escapeHtml(request.email)}</p>
        <p><strong>${escapeHtml(labels.date)}:</strong> ${escapeHtml(request.date)}</p>
        <p><strong>${escapeHtml(labels.time)}:</strong> ${escapeHtml(request.startTime)} - ${escapeHtml(request.endTime)}</p>
        <p><strong>${escapeHtml(labels.reason)}:</strong><br>${escapeHtml(request.reason).replace(/\n/g, '<br>')}</p>
      </body>
    </html>
  `

  return { subject, htmlContent, textContent }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
