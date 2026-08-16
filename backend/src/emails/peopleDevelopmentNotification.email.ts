import type {
  PeopleDevelopmentGroupId,
  PeopleDevelopmentNotificationRequest,
} from '../schemas/peopleDevelopmentNotification.schema'

export interface PeopleDevelopmentNotificationEmail {
  subject: string
  htmlContent: string
  textContent: string
}

const GROUP_LABELS: Record<
  PeopleDevelopmentGroupId,
  { en: string; ar: string }
> = {
  pastors: { en: 'Pastors', ar: 'الرعاة' },
  prophets: { en: 'Prophets', ar: 'الأنبياء' },
  evangelists: { en: 'Evangelists', ar: 'المبشرون' },
  teachers: { en: 'Teachers', ar: 'المعلمون' },
  apostles: { en: 'Apostles', ar: 'الرسل' },
  helpers: { en: 'Helpers', ar: 'المساعدون' },
  mercy: { en: 'Mercy', ar: 'الرحمة' },
  facilitators: { en: 'Facilitators', ar: 'الميسّرون' },
  services: { en: 'Services', ar: 'الخدمات' },
  giving: { en: 'Giving', ar: 'العطاء' },
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function truncateText(
  value: string,
  maximumLength = 900,
): string {
  const normalized = value.trim()

  if (normalized.length <= maximumLength) {
    return normalized
  }

  return `${normalized.slice(0, maximumLength).trim()}…`
}

function formatFileSize(bytes: number): string {
  if (!bytes) {
    return '0 KB'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function buildPeopleDevelopmentNotificationEmail(
  request: PeopleDevelopmentNotificationRequest,
): PeopleDevelopmentNotificationEmail {
  const groupLabelsEn = request.groups
    .map(groupId => GROUP_LABELS[groupId].en)
    .join(', ')

  const groupLabelsAr = request.groups
    .map(groupId => GROUP_LABELS[groupId].ar)
    .join('، ')

  const hasText = Boolean(request.post.text)
  const previewEn = hasText
    ? truncateText(request.post.text)
    : 'Pastor uploaded a new resource for your group.'

  const previewAr = hasText
    ? truncateText(request.post.text)
    : 'قام Pastor برفع ملف أو مورد جديد لمجموعتك.'

  const fileRowsEn = request.post.attachments.length > 0
    ? request.post.attachments
        .map(
          attachment => `
            <li style="margin: 4px 0;">
              ${escapeHtml(attachment.name)}
              <span style="color: #777777;">
                (${escapeHtml(formatFileSize(attachment.size))})
              </span>
            </li>
          `,
        )
        .join('')
    : '<li style="margin: 4px 0; color: #777777;">No PDF attachment included.</li>'

  const fileRowsAr = request.post.attachments.length > 0
    ? request.post.attachments
        .map(
          attachment => `
            <li style="margin: 4px 0;">
              ${escapeHtml(attachment.name)}
              <span style="color: #777777;">
                (${escapeHtml(formatFileSize(attachment.size))})
              </span>
            </li>
          `,
        )
        .join('')
    : '<li style="margin: 4px 0; color: #777777;">لا يوجد ملف PDF مرفق.</li>'

  const appLinkEn = request.post.appUrl
    ? `
      <p style="margin: 12px 0 0;">
        Open LINC One and log in to People Notes with your Firebase email and password to view the complete post.
      </p>
      <p style="margin: 8px 0 0;">
        <a href="${escapeHtml(request.post.appUrl)}" style="color: #8b1e1e; font-weight: 800; word-break: break-all;">
          ${escapeHtml(request.post.appUrl)}
        </a>
      </p>
    `
    : '<p style="margin: 12px 0 0;">Open LINC One and log in to People Notes with your Firebase email and password to view the complete post.</p>'

  const appLinkAr = request.post.appUrl
    ? `
      <p style="margin: 12px 0 0;">
        افتح تطبيق LinC وسجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض المنشور كاملاً.
      </p>
      <p style="margin: 8px 0 0;">
        <a href="${escapeHtml(request.post.appUrl)}" style="color: #8b1e1e; font-weight: 800; word-break: break-all;">
          ${escapeHtml(request.post.appUrl)}
        </a>
      </p>
    `
    : '<p style="margin: 12px 0 0;">افتح تطبيق LinC وسجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض المنشور كاملاً.</p>'

  return {
    subject:
      `LinC People Development Update - ${groupLabelsEn} / ` +
      `تحديث نمو الأشخاص - ${groupLabelsAr}`,

    htmlContent: `
      <!doctype html>
      <html lang="en">
        <body style="margin: 0; padding: 24px; background: #f5f4f0;">
          <div style="font-family: Arial, sans-serif; font-size: 14px; color: #242424; line-height: 1.6; max-width: 720px; margin: 0 auto;">
            <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">LinC People Development Update</h1>
              <div style="margin-top: 6px; font-size: 13px;">تحديث جديد في برنامج نمو الأشخاص</div>
            </div>

            <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
              <div dir="ltr" style="text-align: left;">
                <p style="margin: 0 0 12px; font-weight: 800;">Hello,</p>
                <p style="margin: 0 0 12px;">Pastor has posted a new note or assignment for your group.</p>
                <p style="margin: 0 0 6px;"><strong>Groups:</strong> ${escapeHtml(groupLabelsEn)}</p>
                <p style="margin: 0 0 12px;"><strong>Posted:</strong> ${escapeHtml(request.post.postedAtLabel)}</p>

                <div style="margin: 14px 0; padding: 14px; background-color: #fffafa; border-left: 5px solid #8b1e1e; border-radius: 10px;">
                  <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">Preview</div>
                  <div style="white-space: pre-wrap;">${escapeHtml(previewEn)}</div>
                </div>

                <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">Files</div>
                <ul style="margin-top: 0; padding-left: 22px;">${fileRowsEn}</ul>
                ${appLinkEn}
              </div>

              <hr style="border: 0; border-top: 1px solid #ead1d1; margin: 24px 0;" />

              <div dir="rtl" style="text-align: right;">
                <p style="margin: 0 0 12px; font-weight: 800;">مرحباً،</p>
                <p style="margin: 0 0 12px;">قام Pastor بنشر ملاحظة أو تكليف جديد لمجموعتك.</p>
                <p style="margin: 0 0 6px;"><strong>المجموعات:</strong> ${escapeHtml(groupLabelsAr)}</p>
                <p style="margin: 0 0 12px;"><strong>وقت النشر:</strong> ${escapeHtml(request.post.postedAtLabel)}</p>

                <div style="margin: 14px 0; padding: 14px; background-color: #fffafa; border-right: 5px solid #8b1e1e; border-radius: 10px;">
                  <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">معاينة</div>
                  <div style="white-space: pre-wrap;">${escapeHtml(previewAr)}</div>
                </div>

                <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">الملفات</div>
                <ul style="margin-top: 0; padding-right: 22px;">${fileRowsAr}</ul>
                ${appLinkAr}
              </div>

              <div style="margin-top: 22px; color: #777777; font-size: 12px; text-align: center;">
                Recipient addresses were hidden using BCC.
                <br />
                تم إخفاء عناوين المستلمين باستخدام النسخة المخفية.
              </div>
            </div>
          </div>
        </body>
      </html>
    `.trim(),

    textContent: [
      'LinC People Development Update',
      '',
      'Hello,',
      'Pastor has posted a new note or assignment for your group.',
      `Groups: ${groupLabelsEn}`,
      `Posted: ${request.post.postedAtLabel}`,
      '',
      previewEn,
      '',
      request.post.appUrl
        ? `Open LinC: ${request.post.appUrl}`
        : 'Open LINC One and log in to People Notes with your Firebase email and password.',
      '',
      'تحديث جديد في برنامج نمو الأشخاص',
      '',
      'مرحباً،',
      'قام Pastor بنشر ملاحظة أو تكليف جديد لمجموعتك.',
      `المجموعات: ${groupLabelsAr}`,
      `وقت النشر: ${request.post.postedAtLabel}`,
      '',
      previewAr,
    ].join('\n'),
  }
}
