import type { PeopleDevelopmentAttachment } from '../people-development/peopleDevelopment.types';

import {
  formatFileSize,
  truncateEmailText,
} from '../people-development/peopleDevelopment.utils';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildPeopleDevelopmentAssignmentNotificationEmailHtml(params: {
  recipientName: string;
  groupLabelEn: string;
  groupLabelAr: string;
  noteText: string;
  attachments: PeopleDevelopmentAttachment[];
  postedAtLabel: string;
  appUrl: string;
}): string {
  const displayName = params.recipientName || 'Friend';
  const hasNote = Boolean(params.noteText.trim());
  const hasAttachments = params.attachments.length > 0;

  const notePreview = hasNote
    ? truncateEmailText(params.noteText)
    : 'Pastor uploaded a resource for your group.';

  const arabicNotePreview = hasNote
    ? truncateEmailText(params.noteText)
    : 'قام Pastor برفع ملف أو مورد جديد لمجموعتك.';

  const attachmentRowsEn = hasAttachments
    ? params.attachments
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
    : '<li style="margin: 4px 0; color: #777777;">No PDF attachment included.</li>';

  const attachmentRowsAr = hasAttachments
    ? params.attachments
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
    : '<li style="margin: 4px 0; color: #777777;">لا يوجد ملف PDF مرفق.</li>';

  const appLinkEn = params.appUrl
    ? `
      <p style="margin: 12px 0 0;">
        Open the LinC app and log in with your personal identifier to view the full note/resource.
      </p>
      <p style="margin: 8px 0 0;">
        <a
          href="${escapeHtml(params.appUrl)}"
          style="color: #8b1e1e; font-weight: 800; word-break: break-all;"
        >
          ${escapeHtml(params.appUrl)}
        </a>
      </p>
    `
    : `
      <p style="margin: 12px 0 0;">
        Open the LinC app and log in with your personal identifier to view the full note/resource.
      </p>
    `;

  const appLinkAr = params.appUrl
    ? `
      <p style="margin: 12px 0 0;">
        افتح تطبيق LinC وسجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض الملاحظة أو الملف كاملاً.
      </p>
      <p style="margin: 8px 0 0;">
        <a
          href="${escapeHtml(params.appUrl)}"
          style="color: #8b1e1e; font-weight: 800; word-break: break-all;"
        >
          ${escapeHtml(params.appUrl)}
        </a>
      </p>
    `
    : `
      <p style="margin: 12px 0 0;">
        افتح تطبيق LinC وسجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض الملاحظة أو الملف كاملاً.
      </p>
    `;

  return `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #242424; line-height: 1.6; max-width: 720px; margin: 0 auto;">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">
      LinC People Development Update
    </h2>

    <div style="margin-top: 6px; font-size: 13px;">
      تحديث جديد في برنامج نمو الأشخاص
    </div>
  </div>

  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <div dir="ltr" style="text-align: left;">
      <p style="margin: 0 0 12px; font-weight: 800;">
        Hi ${escapeHtml(displayName)},
      </p>

      <p style="margin: 0 0 12px;">
        Pastor has posted a new note or assignment for your group.
      </p>

      <table
        role="presentation"
        style="width: 100%; border-collapse: collapse; margin: 12px 0 16px;"
      >
        <tr>
          <td style="padding: 8px 0; width: 150px; color: #666666; font-weight: 800;">
            Group
          </td>

          <td style="padding: 8px 0;">
            ${escapeHtml(params.groupLabelEn)}
          </td>
        </tr>

        <tr>
          <td style="padding: 8px 0; color: #666666; font-weight: 800;">
            Posted
          </td>

          <td style="padding: 8px 0;">
            ${escapeHtml(params.postedAtLabel)}
          </td>
        </tr>
      </table>

      <div style="margin: 14px 0; padding: 14px; background-color: #fffafa; border-left: 5px solid #8b1e1e; border-radius: 10px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">
          Preview
        </div>

        <div style="white-space: pre-wrap;">
          ${escapeHtml(notePreview)}
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">
          Files
        </div>

        <ul style="margin-top: 0; padding-left: 22px;">
          ${attachmentRowsEn}
        </ul>
      </div>

      ${appLinkEn}
    </div>

    <hr style="border: 0; border-top: 1px solid #ead1d1; margin: 24px 0;" />

    <div dir="rtl" style="text-align: right;">
      <p style="margin: 0 0 12px; font-weight: 800;">
        مرحباً ${escapeHtml(displayName)}،
      </p>

      <p style="margin: 0 0 12px;">
        قام Pastor بنشر ملاحظة أو تكليف جديد لمجموعتك.
      </p>

      <table
        role="presentation"
        style="width: 100%; border-collapse: collapse; margin: 12px 0 16px;"
      >
        <tr>
          <td style="padding: 8px 0; width: 150px; color: #666666; font-weight: 800;">
            المجموعة
          </td>

          <td style="padding: 8px 0;">
            ${escapeHtml(params.groupLabelAr)}
          </td>
        </tr>

        <tr>
          <td style="padding: 8px 0; color: #666666; font-weight: 800;">
            وقت النشر
          </td>

          <td style="padding: 8px 0;">
            ${escapeHtml(params.postedAtLabel)}
          </td>
        </tr>
      </table>

      <div style="margin: 14px 0; padding: 14px; background-color: #fffafa; border-right: 5px solid #8b1e1e; border-radius: 10px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">
          معاينة
        </div>

        <div style="white-space: pre-wrap;">
          ${escapeHtml(arabicNotePreview)}
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">
          الملفات
        </div>

        <ul style="margin-top: 0; padding-right: 22px;">
          ${attachmentRowsAr}
        </ul>
      </div>

      ${appLinkAr}
    </div>

    <div style="margin-top: 22px; color: #777777; font-size: 12px; text-align: center;">
      This email was sent automatically by the LinC People Development system.
      <br />
      تم إرسال هذا البريد تلقائياً من نظام نمو الأشخاص في LinC.
    </div>
  </div>
</div>
  `.trim();
}
