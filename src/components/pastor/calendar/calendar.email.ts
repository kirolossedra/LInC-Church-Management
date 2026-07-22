import emailjs from '@emailjs/browser';
import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { push, ref } from 'firebase/database';

import { database } from '../../../firebase';

import type { Meeting } from '../../../types';

import { timeRangeToLabel } from './calendar.utils';

const EMAILJS_SERVICE_ID = 'service_v47g6or';
const EMAILJS_TEMPLATE_ID = 'template_a0iy1xy';
const EMAILJS_PUBLIC_KEY = 'x_Xx3UHe3-yE1I13_';

export type CalendarEmailLocale = 'en' | 'ar';

export interface MeetingConfirmationEmail {
  subject: string;
  requesterName: string;
  meetingTitle: string;
  meetingType: string;
  meetingDate: string;
  meetingTime: string;
  meetingLocation: string;
  meetingLink: string;
  fullReport: string;
  htmlBody: string;
}

export interface MeetingStatusEmail {
  subject: string;
  requesterName: string;
  htmlBody: string;
  fullReport: string;
}

export interface MeetingStatusEmailParams {
  kind: 'rejection' | 'cancellation';
  name?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  requesterLocale?: string;
}

export interface SendMeetingStatusEmailParams
  extends MeetingStatusEmailParams {
  recipientEmail: string;
  sourceId?: string;
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getMeetingRequestEmail(
  meeting: Meeting,
): string {
  return String(
    (meeting as Meeting & { requestEmail?: string })
      .requestEmail || '',
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

export function buildMeetingConfirmationEmail(
  meeting: Meeting,
  translatedMeetingTitle?: string,
): MeetingConfirmationEmail {
  const requesterLocale =
    getMeetingRequesterLocale(meeting);

  const requesterName = String(
    (
      meeting as Meeting & {
        requestName?: string;
      }
    ).requestName || '',
  ).trim();

  const displayName =
    requesterName ||
    (requesterLocale === 'ar'
      ? 'صديقنا العزيز'
      : 'Friend');

  const meetingTitle =
    translatedMeetingTitle ||
    meeting.title ||
    (requesterLocale === 'ar'
      ? 'اجتماع مع Pastor'
      : 'Meeting with Pastor');

  const meetingType =
    requesterLocale === 'ar'
      ? 'اجتماع مع Pastor'
      : 'Meeting with Pastor';

  const meetingLink = meeting.meetLink || '';

  const meetingDate = meeting.date
    ? format(
        parseISO(meeting.date),
        'EEEE, MMMM d, yyyy',
        {
          locale:
            requesterLocale === 'ar' ? ar : enUS,
        },
      )
    : '';

  const meetingTime = timeRangeToLabel(
    meeting.startTime,
    meeting.endTime,
    requesterLocale,
  );

  const meetingLocation =
    meeting.location ||
    (requesterLocale === 'ar'
      ? 'اجتماع عبر الإنترنت'
      : 'Online meeting');

  const safeName = escapeHtml(displayName);
  const safeMeetingType = escapeHtml(meetingType);
  const safeMeetingDate = escapeHtml(meetingDate);
  const safeMeetingTime = escapeHtml(meetingTime);
  const safeMeetingLocation =
    escapeHtml(meetingLocation);
  const safeMeetingLink = escapeHtml(meetingLink);

  if (requesterLocale === 'ar') {
    const fullReport = [
      'تأكيد موعد الاجتماع',
      '=========================================',
      '',
      `مرحباً ${displayName}،`,
      '',
      'نود تأكيد موعد اجتماعك مع Pastor بالتفاصيل التالية:',
      `نوع الاجتماع: ${meetingType}`,
      `التاريخ: ${meetingDate}`,
      `الوقت: ${meetingTime}`,
      `المكان: ${meetingLocation}`,
      meetingLink
        ? `رابط الانضمام: ${meetingLink}`
        : 'رابط الانضمام: سيتم إرساله لاحقاً.',
      '',
      'شكراً لك، ونتطلع إلى لقائك.',
    ].join('\n');

    const safeFullReport = escapeHtml(fullReport);

    const meetingLinkHtml = meetingLink
      ? `
        <a
          href="${safeMeetingLink}"
          style="color: #8b1e1e; font-weight: 700; word-break: break-all;"
        >
          ${safeMeetingLink}
        </a>
      `
      : `
        <span style="color: #666666; font-weight: 700;">
          سيتم إرساله لاحقاً
        </span>
      `;

    const htmlBody = `
<div
  style="
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #242424;
    line-height: 1.6;
    max-width: 680px;
    margin: 0 auto;
    direction: rtl;
    text-align: right;
  "
>
  <div
    style="
      padding: 18px 20px;
      background-color: #8b1e1e;
      color: #ffffff;
      border-radius: 12px 12px 0 0;
    "
  >
    <h2 style="margin: 0; font-size: 20px;">
      تأكيد موعد الاجتماع
    </h2>

    <div style="margin-top: 6px; font-size: 13px;">
      اجتماع مع Pastor
    </div>
  </div>

  <div
    style="
      padding: 20px;
      border: 1px solid #dddddd;
      border-top: 0;
      border-radius: 0 0 12px 12px;
      background-color: #ffffff;
    "
  >
    <table
      role="presentation"
      style="
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 18px;
      "
    >
      <tr>
        <td
          style="
            padding: 8px 0;
            width: 190px;
            color: #666666;
            font-weight: 700;
          "
        >
          الاسم
        </td>

        <td style="padding: 8px 0;">
          ${safeName}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          نوع الاجتماع
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingType}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          التاريخ
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingDate}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          الوقت
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingTime}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          المكان
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingLocation}
        </td>
      </tr>
    </table>

    <div
      style="
        margin: 20px 0;
        padding: 16px;
        background-color: #f8eeee;
        border-right: 5px solid #8b1e1e;
        border-radius: 10px;
      "
    >
      <h3
        style="
          margin: 0 0 10px;
          color: #5e1010;
          font-size: 17px;
        "
      >
        رابط الانضمام
      </h3>

      <div style="margin-bottom: 8px;">
        ${meetingLinkHtml}
      </div>
    </div>

    <div style="margin-top: 22px;">
      <h3
        style="
          margin: 0 0 10px;
          color: #8b1e1e;
          font-size: 17px;
        "
      >
        تأكيد موعد الاجتماع
      </h3>

      <div
        style="
          white-space: pre-wrap;
          padding: 16px;
          background-color: #fafafa;
          border: 1px solid #dddddd;
          border-radius: 10px;
          font-size: 14px;
        "
      >${safeFullReport}</div>
    </div>

    <div
      style="
        margin-top: 22px;
        color: #777777;
        font-size: 12px;
      "
    >
      تم إرسال هذا البريد تلقائياً لتأكيد موعد اجتماعك مع Pastor.
    </div>
  </div>
</div>
    `.trim();

    return {
      subject: `تأكيد موعد اجتماع LINC - ${displayName}`,
      requesterName: displayName,
      meetingTitle,
      meetingType,
      meetingDate,
      meetingTime,
      meetingLocation,
      meetingLink,
      fullReport,
      htmlBody,
    };
  }

  const fullReport = [
    'Meeting Confirmation',
    '=========================================',
    '',
    `Hi ${displayName},`,
    '',
    'We would like to confirm your meeting with Pastor using the details below:',
    `Meeting Type: ${meetingType}`,
    `Date: ${meetingDate}`,
    `Time: ${meetingTime}`,
    `Location: ${meetingLocation}`,
    meetingLink
      ? `Joining Link: ${meetingLink}`
      : 'Joining Link: The joining link will be sent later.',
    '',
    'Thank you, and we look forward to meeting with you.',
  ].join('\n');

  const safeFullReport = escapeHtml(fullReport);

  const meetingLinkHtml = meetingLink
    ? `
      <a
        href="${safeMeetingLink}"
        style="color: #8b1e1e; font-weight: 700; word-break: break-all;"
      >
        ${safeMeetingLink}
      </a>
    `
    : `
      <span style="color: #666666; font-weight: 700;">
        The joining link will be sent later.
      </span>
    `;

  const htmlBody = `
<div
  style="
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #242424;
    line-height: 1.6;
    max-width: 680px;
    margin: 0 auto;
  "
>
  <div
    style="
      padding: 18px 20px;
      background-color: #8b1e1e;
      color: #ffffff;
      border-radius: 12px 12px 0 0;
    "
  >
    <h2 style="margin: 0; font-size: 20px;">
      Meeting Confirmation
    </h2>

    <div style="margin-top: 6px; font-size: 13px;">
      Meeting with Pastor
    </div>
  </div>

  <div
    style="
      padding: 20px;
      border: 1px solid #dddddd;
      border-top: 0;
      border-radius: 0 0 12px 12px;
      background-color: #ffffff;
    "
  >
    <table
      role="presentation"
      style="
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 18px;
      "
    >
      <tr>
        <td
          style="
            padding: 8px 0;
            width: 190px;
            color: #666666;
            font-weight: 700;
          "
        >
          Name
        </td>

        <td style="padding: 8px 0;">
          ${safeName}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          Meeting Type
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingType}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          Date
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingDate}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          Time
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingTime}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          Location
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingLocation}
        </td>
      </tr>
    </table>

    <div
      style="
        margin: 20px 0;
        padding: 16px;
        background-color: #f8eeee;
        border-left: 5px solid #8b1e1e;
        border-radius: 10px;
      "
    >
      <h3
        style="
          margin: 0 0 10px;
          color: #5e1010;
          font-size: 17px;
        "
      >
        Joining Link
      </h3>

      <div style="margin-bottom: 8px;">
        ${meetingLinkHtml}
      </div>
    </div>

    <div style="margin-top: 22px;">
      <h3
        style="
          margin: 0 0 10px;
          color: #8b1e1e;
          font-size: 17px;
        "
      >
        Meeting Confirmation
      </h3>

      <div
        style="
          white-space: pre-wrap;
          padding: 16px;
          background-color: #fafafa;
          border: 1px solid #dddddd;
          border-radius: 10px;
          font-size: 14px;
        "
      >${safeFullReport}</div>
    </div>

    <div
      style="
        margin-top: 22px;
        color: #777777;
        font-size: 12px;
      "
    >
      This email was automatically generated to confirm your meeting with Pastor.
    </div>
  </div>
</div>
  `.trim();

  return {
    subject: `LINC Meeting Confirmation - ${displayName}`,
    requesterName: displayName,
    meetingTitle,
    meetingType,
    meetingDate,
    meetingTime,
    meetingLocation,
    meetingLink,
    fullReport,
    htmlBody,
  };
}

export function buildMeetingStatusEmail(
  params: MeetingStatusEmailParams,
): MeetingStatusEmail {
  const requesterLocale: CalendarEmailLocale =
    params.requesterLocale === 'ar' ? 'ar' : 'en';

  const displayName =
    params.name ||
    (requesterLocale === 'ar'
      ? 'صديقنا العزيز'
      : 'Friend');

  const meetingDate = params.date
    ? format(
        parseISO(params.date),
        'EEEE, MMMM d, yyyy',
        {
          locale:
            requesterLocale === 'ar' ? ar : enUS,
        },
      )
    : '';

  const meetingTime = timeRangeToLabel(
    params.startTime,
    params.endTime,
    requesterLocale,
  );

  const meetingLocation =
    params.location ||
    (requesterLocale === 'ar'
      ? 'اجتماع عبر الإنترنت'
      : 'Online meeting');

  const isCancellation =
    params.kind === 'cancellation';

  const safeName = escapeHtml(displayName);
  const safeMeetingDate = escapeHtml(meetingDate);
  const safeMeetingTime = escapeHtml(meetingTime);
  const safeMeetingLocation =
    escapeHtml(meetingLocation);

  if (requesterLocale === 'ar') {
    const title = isCancellation
      ? 'إلغاء موعد الاجتماع'
      : 'تحديث بخصوص طلب الاجتماع';

    const intro = isCancellation
      ? 'نود إعلامك بأنه تم إلغاء موعد اجتماعك مع Pastor.'
      : 'نشكرك على طلب الاجتماع مع Pastor. نعتذر، لن نتمكن من تأكيد هذا الموعد حالياً.';

    const closing = isCancellation
      ? 'نعتذر عن أي إزعاج، ويمكنك حجز موعد آخر من خلال صفحة الحجز عند توفر موعد مناسب.'
      : 'يمكنك حجز موعد آخر من خلال صفحة الحجز عند توفر موعد مناسب.';

    const subject = isCancellation
      ? `إلغاء موعد اجتماع LINC - ${displayName}`
      : `تحديث طلب اجتماع LINC - ${displayName}`;

    const fullReport = [
      title,
      '=========================================',
      '',
      `مرحباً ${displayName}،`,
      '',
      intro,
      '',
      `التاريخ: ${meetingDate}`,
      `الوقت: ${meetingTime}`,
      `المكان: ${meetingLocation}`,
      '',
      closing,
      '',
      'شكراً لتفهمك.',
    ].join('\n');

    const safeFullReport = escapeHtml(fullReport);

    const htmlBody = `
<div
  style="
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #242424;
    line-height: 1.6;
    max-width: 680px;
    margin: 0 auto;
    direction: rtl;
    text-align: right;
  "
>
  <div
    style="
      padding: 18px 20px;
      background-color: #8b1e1e;
      color: #ffffff;
      border-radius: 12px 12px 0 0;
    "
  >
    <h2 style="margin: 0; font-size: 20px;">
      ${escapeHtml(title)}
    </h2>

    <div style="margin-top: 6px; font-size: 13px;">
      اجتماع مع Pastor
    </div>
  </div>

  <div
    style="
      padding: 20px;
      border: 1px solid #dddddd;
      border-top: 0;
      border-radius: 0 0 12px 12px;
      background-color: #ffffff;
    "
  >
    <p style="margin: 0 0 14px;">
      مرحباً ${safeName}،
    </p>

    <p style="margin: 0 0 18px;">
      ${escapeHtml(intro)}
    </p>

    <table
      role="presentation"
      style="
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 18px;
      "
    >
      <tr>
        <td
          style="
            padding: 8px 0;
            width: 160px;
            color: #666666;
            font-weight: 700;
          "
        >
          التاريخ
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingDate}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          الوقت
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingTime}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          المكان
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingLocation}
        </td>
      </tr>
    </table>

    <div
      style="
        white-space: pre-wrap;
        padding: 16px;
        background-color: #fafafa;
        border: 1px solid #dddddd;
        border-radius: 10px;
        font-size: 14px;
      "
    >${safeFullReport}</div>

    <div
      style="
        margin-top: 22px;
        color: #777777;
        font-size: 12px;
      "
    >
      تم إرسال هذا البريد تلقائياً بخصوص طلب اجتماعك مع Pastor.
    </div>
  </div>
</div>
    `.trim();

    return {
      subject,
      requesterName: displayName,
      htmlBody,
      fullReport,
    };
  }

  const title = isCancellation
    ? 'Meeting Cancelled'
    : 'Meeting Request Update';

  const intro = isCancellation
    ? 'We would like to let you know that your meeting with Pastor has been cancelled.'
    : 'Thank you for requesting a meeting with Pastor. Unfortunately, we are not able to confirm this time right now.';

  const closing = isCancellation
    ? 'We apologize for any inconvenience. You may book another meeting through the booking page when another suitable time is available.'
    : 'You may book another meeting through the booking page when another suitable time is available.';

  const subject = isCancellation
    ? `LINC Meeting Cancelled - ${displayName}`
    : `LINC Meeting Request Update - ${displayName}`;

  const fullReport = [
    title,
    '=========================================',
    '',
    `Hi ${displayName},`,
    '',
    intro,
    '',
    `Date: ${meetingDate}`,
    `Time: ${meetingTime}`,
    `Location: ${meetingLocation}`,
    '',
    closing,
    '',
    'Thank you for your understanding.',
  ].join('\n');

  const safeFullReport = escapeHtml(fullReport);

  const htmlBody = `
<div
  style="
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #242424;
    line-height: 1.6;
    max-width: 680px;
    margin: 0 auto;
  "
>
  <div
    style="
      padding: 18px 20px;
      background-color: #8b1e1e;
      color: #ffffff;
      border-radius: 12px 12px 0 0;
    "
  >
    <h2 style="margin: 0; font-size: 20px;">
      ${escapeHtml(title)}
    </h2>

    <div style="margin-top: 6px; font-size: 13px;">
      Meeting with Pastor
    </div>
  </div>

  <div
    style="
      padding: 20px;
      border: 1px solid #dddddd;
      border-top: 0;
      border-radius: 0 0 12px 12px;
      background-color: #ffffff;
    "
  >
    <p style="margin: 0 0 14px;">
      Hi ${safeName},
    </p>

    <p style="margin: 0 0 18px;">
      ${escapeHtml(intro)}
    </p>

    <table
      role="presentation"
      style="
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 18px;
      "
    >
      <tr>
        <td
          style="
            padding: 8px 0;
            width: 160px;
            color: #666666;
            font-weight: 700;
          "
        >
          Date
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingDate}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          Time
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingTime}
        </td>
      </tr>

      <tr>
        <td
          style="
            padding: 8px 0;
            color: #666666;
            font-weight: 700;
          "
        >
          Location
        </td>

        <td style="padding: 8px 0;">
          ${safeMeetingLocation}
        </td>
      </tr>
    </table>

    <div
      style="
        white-space: pre-wrap;
        padding: 16px;
        background-color: #fafafa;
        border: 1px solid #dddddd;
        border-radius: 10px;
        font-size: 14px;
      "
    >${safeFullReport}</div>

    <div
      style="
        margin-top: 22px;
        color: #777777;
        font-size: 12px;
      "
    >
      This email was automatically generated regarding your meeting request with Pastor.
    </div>
  </div>
</div>
  `.trim();

  return {
    subject,
    requesterName: displayName,
    htmlBody,
    fullReport,
  };
}

export async function sendMeetingConfirmationViaEmailJs(
  meeting: Meeting,
  translatedMeetingTitle?: string,
) {
  const recipientEmail =
    getMeetingRequestEmail(meeting);

  if (!recipientEmail) {
    throw new Error(
      'Meeting requester email is missing.',
    );
  }

  const confirmationEmail =
    buildMeetingConfirmationEmail(
      meeting,
      translatedMeetingTitle,
    );

  const response = await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: recipientEmail,
      subject: confirmationEmail.subject,
      fullName: confirmationEmail.requesterName,
      message_html: confirmationEmail.htmlBody,
      reply_to: recipientEmail,
    },
    EMAILJS_PUBLIC_KEY,
  );

  await push(ref(database, 'emailJsSendLogs/'), {
    recipientEmail,
    subject: confirmationEmail.subject,
    fullName: confirmationEmail.requesterName,
    sentUsing: 'EmailJS',
    serviceId: EMAILJS_SERVICE_ID,
    templateId: EMAILJS_TEMPLATE_ID,
    source: 'calendarMeetingConfirmation',
    meetingDate: meeting.date || '',
    meetingStartTime: meeting.startTime || '',
    meetingEndTime: meeting.endTime || '',
    sentAt: Date.now(),
    sentAtISO: new Date().toISOString(),
    emailJsResponse: {
      status: response.status,
      text: response.text,
    },
  });

  return response;
}

export async function sendMeetingStatusEmailViaEmailJs(
  params: SendMeetingStatusEmailParams,
) {
  if (!params.recipientEmail) {
    throw new Error(
      'Recipient email is missing.',
    );
  }

  const statusEmail =
    buildMeetingStatusEmail(params);

  const response = await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: params.recipientEmail,
      subject: statusEmail.subject,
      fullName: statusEmail.requesterName,
      message_html: statusEmail.htmlBody,
      reply_to: params.recipientEmail,
    },
    EMAILJS_PUBLIC_KEY,
  );

  await push(ref(database, 'emailJsSendLogs/'), {
    recipientEmail: params.recipientEmail,
    subject: statusEmail.subject,
    fullName: statusEmail.requesterName,
    sentUsing: 'EmailJS',
    serviceId: EMAILJS_SERVICE_ID,
    templateId: EMAILJS_TEMPLATE_ID,
    source:
      params.kind === 'cancellation'
        ? 'calendarMeetingCancellation'
        : 'calendarMeetingRejection',
    sourceId: params.sourceId || '',
    meetingDate: params.date || '',
    meetingStartTime: params.startTime || '',
    meetingEndTime: params.endTime || '',
    requesterLocale:
      params.requesterLocale === 'ar'
        ? 'ar'
        : 'en',
    sentAt: Date.now(),
    sentAtISO: new Date().toISOString(),
    emailJsResponse: {
      status: response.status,
      text: response.text,
    },
  });

  return response;
}
