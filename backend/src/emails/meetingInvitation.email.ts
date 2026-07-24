import type {
  MeetingInvitationRequest,
} from '../schemas/meetingInvitation.schema'

type InvitationLocale = MeetingInvitationRequest['locale']
type MeetingData = MeetingInvitationRequest['meeting']

export interface MeetingInvitationEmail {
  subject: string
  htmlContent: string
  textContent: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function parseMeetingDate(value: string): Date {
  const [year, month, day] = value
    .split('-')
    .map(Number)

  return new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0),
  )
}

function formatMeetingDate(
  value: string,
  locale: InvitationLocale,
): string {
  return new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar' : 'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    },
  ).format(parseMeetingDate(value))
}

function formatMeetingTime(
  value: string,
  locale: InvitationLocale,
): string {
  const [hours, minutes] = value
    .split(':')
    .map(Number)

  const date = new Date(
    Date.UTC(2000, 0, 1, hours, minutes, 0),
  )

  return new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar' : 'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    },
  ).format(date)
}

function buildEnglishEmail(
  recipientName: string,
  meeting: MeetingData,
): MeetingInvitationEmail {
  const meetingDate = formatMeetingDate(
    meeting.date,
    'en',
  )

  const meetingTime =
    `${formatMeetingTime(meeting.startTime, 'en')} – ` +
    formatMeetingTime(meeting.endTime, 'en')

  const location = meeting.location || 'TBA'

  const safeName = escapeHtml(recipientName)
  const safeTitle = escapeHtml(meeting.title)
  const safeDate = escapeHtml(meetingDate)
  const safeTime = escapeHtml(meetingTime)
  const safeLocation = escapeHtml(location)
  const safeMeetLink = escapeHtml(meeting.meetLink)

  const onlineLinkHtml = meeting.meetLink
    ? `
      <p style="margin: 4px 0; font-size: 14px;">
        <strong>Online meeting link:</strong>
        <a
          href="${safeMeetLink}"
          style="color: #8b1e1e; font-weight: 700; word-break: break-all;"
        >
          ${safeMeetLink}
        </a>
      </p>
    `
    : ''

  const onlineLinkText = meeting.meetLink
    ? `\nOnline meeting link: ${meeting.meetLink}`
    : ''

  return {
    subject: `Meeting Invitation: ${meeting.title}`,

    htmlContent: `
      <!doctype html>
      <html lang="en">
        <body style="margin: 0; padding: 24px; background: #f5f4f0;">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f4f0; border-radius: 22px;">
            <div style="background: #8b1e1e; color: white; padding: 16px; border-radius: 14px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 20px;">
                LINC Meeting Invitation
              </h1>
            </div>

            <p style="color: #333; font-size: 15px;">
              Dear ${safeName},
            </p>

            <p style="color: #555; font-size: 14px;">
              You are invited to attend the following meeting:
            </p>

            <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid #e5e5e5; margin-bottom: 16px;">
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Meeting:</strong> ${safeTitle}
              </p>

              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Date:</strong> ${safeDate}
              </p>

              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Time:</strong> ${safeTime}
              </p>

              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Location:</strong> ${safeLocation}
              </p>

              ${onlineLinkHtml}
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              We look forward to seeing you there.
            </p>
          </div>
        </body>
      </html>
    `.trim(),

    textContent: [
      `Dear ${recipientName},`,
      '',
      'You are invited to attend the following meeting:',
      '',
      `Meeting: ${meeting.title}`,
      `Date: ${meetingDate}`,
      `Time: ${meetingTime}`,
      `Location: ${location}${onlineLinkText}`,
      '',
      'We look forward to seeing you there.',
    ].join('\n'),
  }
}

function buildArabicEmail(
  recipientName: string,
  meeting: MeetingData,
): MeetingInvitationEmail {
  const meetingDate = formatMeetingDate(
    meeting.date,
    'ar',
  )

  const meetingTime =
    `${formatMeetingTime(meeting.startTime, 'ar')} – ` +
    formatMeetingTime(meeting.endTime, 'ar')

  const location = meeting.location || 'يحدد لاحقاً'

  const safeName = escapeHtml(recipientName)
  const safeTitle = escapeHtml(meeting.title)
  const safeDate = escapeHtml(meetingDate)
  const safeTime = escapeHtml(meetingTime)
  const safeLocation = escapeHtml(location)
  const safeMeetLink = escapeHtml(meeting.meetLink)

  const onlineLinkHtml = meeting.meetLink
    ? `
      <p style="margin: 4px 0; font-size: 14px;">
        <strong>رابط الاجتماع عبر الإنترنت:</strong>
        <a
          href="${safeMeetLink}"
          style="color: #8b1e1e; font-weight: 700; word-break: break-all;"
        >
          ${safeMeetLink}
        </a>
      </p>
    `
    : ''

  const onlineLinkText = meeting.meetLink
    ? `\nرابط الاجتماع عبر الإنترنت: ${meeting.meetLink}`
    : ''

  return {
    subject: `دعوة لاجتماع: ${meeting.title}`,

    htmlContent: `
      <!doctype html>
      <html lang="ar" dir="rtl">
        <body style="margin: 0; padding: 24px; background: #f5f4f0;">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f4f0; border-radius: 22px; text-align: right;">
            <div style="background: #8b1e1e; color: white; padding: 16px; border-radius: 14px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 20px;">
                دعوة لاجتماع LINC
              </h1>
            </div>

            <p style="color: #333; font-size: 15px;">
              مرحباً ${safeName}،
            </p>

            <p style="color: #555; font-size: 14px;">
              تمت دعوتك لحضور الاجتماع التالي:
            </p>

            <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid #e5e5e5; margin-bottom: 16px;">
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>الاجتماع:</strong> ${safeTitle}
              </p>

              <p style="margin: 4px 0; font-size: 14px;">
                <strong>التاريخ:</strong> ${safeDate}
              </p>

              <p style="margin: 4px 0; font-size: 14px;">
                <strong>الوقت:</strong> ${safeTime}
              </p>

              <p style="margin: 4px 0; font-size: 14px;">
                <strong>المكان:</strong> ${safeLocation}
              </p>

              ${onlineLinkHtml}
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              نتطلع إلى رؤيتك هناك.
            </p>
          </div>
        </body>
      </html>
    `.trim(),

    textContent: [
      `مرحباً ${recipientName}،`,
      '',
      'تمت دعوتك لحضور الاجتماع التالي:',
      '',
      `الاجتماع: ${meeting.title}`,
      `التاريخ: ${meetingDate}`,
      `الوقت: ${meetingTime}`,
      `المكان: ${location}${onlineLinkText}`,
      '',
      'نتطلع إلى رؤيتك هناك.',
    ].join('\n'),
  }
}

export function buildMeetingInvitationEmail(
  locale: InvitationLocale,
  recipientName: string,
  meeting: MeetingData,
): MeetingInvitationEmail {
  return locale === 'ar'
    ? buildArabicEmail(recipientName, meeting)
    : buildEnglishEmail(recipientName, meeting)
}