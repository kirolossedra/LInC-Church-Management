import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { database } from '../firebase';
import { ref, onValue, update, push, remove } from 'firebase/database';
import type { Meeting, MeetingRequest } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Plus, Trash2, Video, MapPin, Clock, X, ChevronLeft, ChevronRight, Send, Users, Check, ChevronDown, Calendar as CalendarIcon, CheckCircle, XCircle, Hourglass, Mail, User, Bot, ThumbsDown, ThumbsUp, Trophy, Search, UserPlus, IdCard, MessageSquare, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageTitle from './PageTitle';
import { useI18n } from '../i18n';
import OpenAI from 'openai';

const SLOT_BLOCK_START = 9;
const SLOT_BLOCK_END = 20;
const SLOT_BLOCK_DURATION = 0.5;

const EMAILJS_SERVICE_ID = 'service_v47g6or';
const EMAILJS_TEMPLATE_ID = 'template_a0iy1xy';
const EMAILJS_PUBLIC_KEY = 'x_Xx3UHe3-yE1I13_';

const MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES = 1024 * 1024;

type PeopleDevelopmentGroupId =
  | 'pastors'
  | 'prophets'
  | 'evangelists'
  | 'teachers'
  | 'apostles'
  | 'helpers'
  | 'mercy'
  | 'facilitators'
  | 'services'
  | 'giving';
type PeoplePersonalNoteType = 'strength' | 'weakness';

const PEOPLE_DEVELOPMENT_ROOT = 'peopleDevelopment';

const PEOPLE_DEVELOPMENT_GROUPS: {
  id: PeopleDevelopmentGroupId;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  cardClass: string;
  softClass: string;
  buttonClass: string;
  badgeClass: string;
}[] = [
  {
    id: 'pastors',
    labelEn: 'Pastors',
    labelAr: 'الرعاة',
    descriptionEn: 'Care, shepherding, and spiritual follow-up',
    descriptionAr: 'رعاية، متابعة، واهتمام روحي',
    cardClass: 'bg-rose-50 border-rose-200 text-rose-800',
    softClass: 'bg-rose-50 border-rose-100 text-rose-800',
    buttonClass: 'bg-rose-700 hover:bg-rose-800 text-white',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    id: 'prophets',
    labelEn: 'Prophets',
    labelAr: 'الأنبياء',
    descriptionEn: 'Discernment, direction, and spiritual clarity',
    descriptionAr: 'تمييز، توجيه، ووضوح روحي',
    cardClass: 'bg-purple-50 border-purple-200 text-purple-800',
    softClass: 'bg-purple-50 border-purple-100 text-purple-800',
    buttonClass: 'bg-purple-700 hover:bg-purple-800 text-white',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'evangelists',
    labelEn: 'Evangelists',
    labelAr: 'المبشرون',
    descriptionEn: 'Outreach, invitation, and sharing faith',
    descriptionAr: 'خدمة خارجية، دعوة، ومشاركة الإيمان',
    cardClass: 'bg-amber-50 border-amber-200 text-amber-800',
    softClass: 'bg-amber-50 border-amber-100 text-amber-800',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'teachers',
    labelEn: 'Teachers',
    labelAr: 'المعلمون',
    descriptionEn: 'Teaching, explaining, and grounding people in truth',
    descriptionAr: 'تعليم، شرح، وتثبيت الناس في الحق',
    cardClass: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    softClass: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    buttonClass: 'bg-indigo-700 hover:bg-indigo-800 text-white',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    id: 'apostles',
    labelEn: 'Apostles',
    labelAr: 'الرسل',
    descriptionEn: 'Building, sending, and starting new work',
    descriptionAr: 'بناء، إرسال، وبدء أعمال جديدة',
    cardClass: 'bg-sky-50 border-sky-200 text-sky-800',
    softClass: 'bg-sky-50 border-sky-100 text-sky-800',
    buttonClass: 'bg-sky-700 hover:bg-sky-800 text-white',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  {
    id: 'helpers',
    labelEn: 'Helpers',
    labelAr: 'المساعدون',
    descriptionEn: 'Care, support, and practical service',
    descriptionAr: 'رعاية، دعم، وخدمة عملية',
    cardClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    softClass: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    buttonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'mercy',
    labelEn: 'Mercy',
    labelAr: 'الرحمة',
    descriptionEn: 'Compassion, comfort, and support for hurting people',
    descriptionAr: 'رحمة، تعزية، ومساندة للمتألمين',
    cardClass: 'bg-pink-50 border-pink-200 text-pink-800',
    softClass: 'bg-pink-50 border-pink-100 text-pink-800',
    buttonClass: 'bg-pink-700 hover:bg-pink-800 text-white',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  {
    id: 'facilitators',
    labelEn: 'Facilitators',
    labelAr: 'الميسّرون',
    descriptionEn: 'Organizing, connecting, and making ministry flow',
    descriptionAr: 'تنظيم، ربط، وتسهيل سير الخدمة',
    cardClass: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    softClass: 'bg-cyan-50 border-cyan-100 text-cyan-800',
    buttonClass: 'bg-cyan-700 hover:bg-cyan-800 text-white',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  {
    id: 'services',
    labelEn: 'Services',
    labelAr: 'الخدمات',
    descriptionEn: 'Practical ministry, operations, and serving needs',
    descriptionAr: 'خدمة عملية، تشغيل، وتلبية الاحتياجات',
    cardClass: 'bg-stone-50 border-stone-200 text-stone-800',
    softClass: 'bg-stone-50 border-stone-100 text-stone-800',
    buttonClass: 'bg-stone-700 hover:bg-stone-800 text-white',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-200',
  },
  {
    id: 'giving',
    labelEn: 'Giving',
    labelAr: 'العطاء',
    descriptionEn: 'Generosity, resources, and practical contribution',
    descriptionAr: 'سخاء، موارد، ومساهمة عملية',
    cardClass: 'bg-lime-50 border-lime-200 text-lime-800',
    softClass: 'bg-lime-50 border-lime-100 text-lime-800',
    buttonClass: 'bg-lime-700 hover:bg-lime-800 text-white',
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
  },
];


function timeToHour(time?: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours + (minutes || 0) / 60;
}

function hourToTime(hourValue: number): string {
  const hours = Math.floor(hourValue);
  const minutes = Math.round((hourValue - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function hourToLabel(hourValue: number, locale: 'en' | 'ar'): string {
  const isAr = locale === 'ar';
  const hours = Math.floor(hourValue);
  const minutes = Math.round((hourValue - hours) * 60);
  const period = hours >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function timeToLabel(time: string | undefined, locale: 'en' | 'ar'): string {
  return hourToLabel(timeToHour(time || '00:00'), locale);
}

function timeRangeToLabel(startTime: string | undefined, endTime: string | undefined, locale: 'en' | 'ar'): string {
  return `${timeToLabel(startTime, locale)} - ${timeToLabel(endTime, locale)}`;
}


function buildTimeOptions(startHour: number, endHour: number, step: number = 0.5): { value: string; hour: number }[] {
  const options: { value: string; hour: number }[] = [];

  for (let hour = startHour; hour <= endHour; hour += step) {
    const roundedHour = Math.round(hour * 100) / 100;
    options.push({ value: hourToTime(roundedHour), hour: roundedHour });
  }

  return options;
}

const MEETING_TIME_OPTIONS = buildTimeOptions(0, 23.5);
const BOOKING_WINDOW_TIME_OPTIONS = buildTimeOptions(SLOT_BLOCK_START, SLOT_BLOCK_END);
const FULL_DAY_TIME_OPTIONS = buildTimeOptions(0, 23.5);

function slotOverlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function unwrapStoredValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value !== 'object' || Array.isArray(value)) return '';

  const record = value as Record<string, unknown>;
  for (const key of ['value', 'answer', 'currentValue', 'userIdentifier', 'linkedUserIdentifier', 'group']) {
    const nested = record[key];
    if (typeof nested === 'string' || typeof nested === 'number') return String(nested).trim();
  }

  return '';
}

function extractResponseValue(value: unknown, candidateKeys: string[]): string {
  const wantedKeys = new Set(candidateKeys.map(normalizeLookupKey));

  const visit = (current: unknown, currentKey = ''): string => {
    if (current === null || current === undefined) return '';

    if (typeof current === 'string' || typeof current === 'number') {
      return wantedKeys.has(normalizeLookupKey(currentKey)) ? String(current).trim() : '';
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        const found = visit(item, currentKey);
        if (found) return found;
      }
      return '';
    }

    if (typeof current !== 'object') return '';

    const record = current as Record<string, unknown>;

    for (const [key, nested] of Object.entries(record)) {
      if (wantedKeys.has(normalizeLookupKey(key))) {
        const directValue = unwrapStoredValue(nested);
        if (directValue) return directValue;

        const nestedValue = visit(nested, key);
        if (nestedValue) return nestedValue;
      }
    }

    for (const [key, nested] of Object.entries(record)) {
      const found = visit(nested, key);
      if (found) return found;
    }

    return '';
  };

  return visit(value);
}

function safeFirebaseKey(value: string): string {
  const safeValue = String(value || '')
    .trim()
    .replace(/[.#$/[\]]/g, '_')
    .replace(/\s+/g, '_');

  return safeValue || `unknown_${Date.now()}`;
}

function normalizePeopleDevelopmentGroup(value: unknown): PeopleDevelopmentGroupId | '' {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (normalized === 'pastor' || normalized === 'pastors' || normalized === 'pastoral') return 'pastors';
  if (normalized === 'prophet' || normalized === 'prophets' || normalized === 'prophetic') return 'prophets';
  if (normalized === 'evangelist' || normalized === 'evangelists' || normalized === 'evangelistic') return 'evangelists';
  if (normalized === 'teacher' || normalized === 'teachers' || normalized === 'teaching') return 'teachers';
  if (normalized === 'apostle' || normalized === 'apostles' || normalized === 'apostolic') return 'apostles';
  if (normalized === 'helper' || normalized === 'helpers') return 'helpers';
  if (normalized === 'mercy' || normalized === 'mercies' || normalized === 'merciful') return 'mercy';
  if (normalized === 'facilitator' || normalized === 'facilitators' || normalized === 'facilitation') return 'facilitators';
  if (normalized === 'service' || normalized === 'services' || normalized === 'serving') return 'services';
  if (normalized === 'giving' || normalized === 'giver' || normalized === 'givers') return 'giving';

  return '';
}

function normalizePeoplePersonalNoteType(value: unknown): PeoplePersonalNoteType {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'weakness' ? 'weakness' : 'strength';
}

function extractPeopleDevelopmentGroup(raw: Record<string, any>): PeopleDevelopmentGroupId | '' {
  return normalizePeopleDevelopmentGroup(
    raw.peopleDevelopmentGroup ||
    raw.peopleDevelopment?.group ||
    raw.fields?.peopleDevelopment?.group?.value ||
    raw.fields?.peopleDevelopment?.group?.answer ||
    '',
  );
}

function getFirstName(value: string): string {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = result.split(',');

      if (!base64) {
        reject(new Error('Could not read the selected file.'));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => reject(reader.error || new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function isUsableEmail(value: string): boolean {
  const trimmed = String(value || '').trim();

  return trimmed.length > 3 &&
    trimmed !== 'N/A' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function truncateEmailText(value: string, maxLength = 700): string {
  const normalized = String(value || '').trim();

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function getPeopleDevelopmentStaticGroupLabel(groupId: PeopleDevelopmentGroupId, targetLocale: 'en' | 'ar'): string {
  const group = PEOPLE_DEVELOPMENT_GROUPS.find(item => item.id === groupId);
  if (!group) return groupId;

  return targetLocale === 'ar' ? group.labelAr : group.labelEn;
}

function buildPeopleDevelopmentAssignmentNotificationEmailHtml(params: {
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
    ? params.attachments.map(attachment => `
      <li style="margin: 4px 0;">
        ${escapeHtml(attachment.name)} <span style="color: #777777;">(${escapeHtml(formatFileSize(attachment.size))})</span>
      </li>
    `).join('')
    : '<li style="margin: 4px 0; color: #777777;">No PDF attachment included.</li>';

  const attachmentRowsAr = hasAttachments
    ? params.attachments.map(attachment => `
      <li style="margin: 4px 0;">
        ${escapeHtml(attachment.name)} <span style="color: #777777;">(${escapeHtml(formatFileSize(attachment.size))})</span>
      </li>
    `).join('')
    : '<li style="margin: 4px 0; color: #777777;">لا يوجد ملف PDF مرفق.</li>';

  const appLinkEn = params.appUrl
    ? `<p style="margin: 12px 0 0;">Open the LinC app and log in with your personal identifier to view the full note/resource.</p>
       <p style="margin: 8px 0 0;"><a href="${escapeHtml(params.appUrl)}" style="color: #8b1e1e; font-weight: 800; word-break: break-all;">${escapeHtml(params.appUrl)}</a></p>`
    : '<p style="margin: 12px 0 0;">Open the LinC app and log in with your personal identifier to view the full note/resource.</p>';

  const appLinkAr = params.appUrl
    ? `<p style="margin: 12px 0 0;">افتح تطبيق LinC وسجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض الملاحظة أو الملف كاملاً.</p>
       <p style="margin: 8px 0 0;"><a href="${escapeHtml(params.appUrl)}" style="color: #8b1e1e; font-weight: 800; word-break: break-all;">${escapeHtml(params.appUrl)}</a></p>`
    : '<p style="margin: 12px 0 0;">افتح تطبيق LinC وسجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض الملاحظة أو الملف كاملاً.</p>';

  return `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #242424; line-height: 1.6; max-width: 720px; margin: 0 auto;">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">LinC People Development Update</h2>
    <div style="margin-top: 6px; font-size: 13px;">تحديث جديد في برنامج نمو الأشخاص</div>
  </div>

  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <div dir="ltr" style="text-align: left;">
      <p style="margin: 0 0 12px; font-weight: 800;">Hi ${escapeHtml(displayName)},</p>
      <p style="margin: 0 0 12px;">Pastor has posted a new note or assignment for your group.</p>

      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 12px 0 16px;">
        <tr>
          <td style="padding: 8px 0; width: 150px; color: #666666; font-weight: 800;">Group</td>
          <td style="padding: 8px 0;">${escapeHtml(params.groupLabelEn)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666; font-weight: 800;">Posted</td>
          <td style="padding: 8px 0;">${escapeHtml(params.postedAtLabel)}</td>
        </tr>
      </table>

      <div style="margin: 14px 0; padding: 14px; background-color: #fffafa; border-left: 5px solid #8b1e1e; border-radius: 10px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">Preview</div>
        <div style="white-space: pre-wrap;">${escapeHtml(notePreview)}</div>
      </div>

      <div style="margin-top: 12px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">Files</div>
        <ul style="margin-top: 0; padding-left: 22px;">${attachmentRowsEn}</ul>
      </div>

      ${appLinkEn}
    </div>

    <hr style="border: 0; border-top: 1px solid #ead1d1; margin: 24px 0;" />

    <div dir="rtl" style="text-align: right;">
      <p style="margin: 0 0 12px; font-weight: 800;">مرحباً ${escapeHtml(displayName)}،</p>
      <p style="margin: 0 0 12px;">قام Pastor بنشر ملاحظة أو تكليف جديد لمجموعتك.</p>

      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 12px 0 16px;">
        <tr>
          <td style="padding: 8px 0; width: 150px; color: #666666; font-weight: 800;">المجموعة</td>
          <td style="padding: 8px 0;">${escapeHtml(params.groupLabelAr)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666666; font-weight: 800;">وقت النشر</td>
          <td style="padding: 8px 0;">${escapeHtml(params.postedAtLabel)}</td>
        </tr>
      </table>

      <div style="margin: 14px 0; padding: 14px; background-color: #fffafa; border-right: 5px solid #8b1e1e; border-radius: 10px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">معاينة</div>
        <div style="white-space: pre-wrap;">${escapeHtml(arabicNotePreview)}</div>
      </div>

      <div style="margin-top: 12px;">
        <div style="font-weight: 800; color: #641414; margin-bottom: 6px;">الملفات</div>
        <ul style="margin-top: 0; padding-right: 22px;">${attachmentRowsAr}</ul>
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

type NextGenRegistrationStatus = 'pending' | 'approved' | 'rejected';
type NextGenRegistrationStatusFilter = 'all' | NextGenRegistrationStatus;

interface NextGenRegistration {
  userId: string;
  fullName: string;
  email: string;
  status: NextGenRegistrationStatus;
  source: string;
  createdAt: number;
  createdAtISO: string;
  createdAtEasternTime: string;
  updatedAt: number;
  updatedAtISO: string;
  reviewedAt?: number;
  reviewedAtISO?: string;
  reviewedBy?: string;
}

function normalizeNextGenRegistrationStatus(value: unknown): NextGenRegistrationStatus {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'rejected') return normalized;
  return 'pending';
}

function normalizeNextGenRegistration(userId: string, value: any): NextGenRegistration {
  return {
    userId: String(value?.userId || value?.normalizedUserId || userId).trim().toUpperCase(),
    fullName: String(value?.fullName || value?.name || '').trim(),
    email: String(value?.email || '').trim(),
    status: normalizeNextGenRegistrationStatus(value?.status),
    source: String(value?.source || 'nextGenActivities').trim(),
    createdAt: normalizeNumber(value?.createdAt),
    createdAtISO: String(value?.createdAtISO || '').trim(),
    createdAtEasternTime: String(value?.createdAtEasternTime || '').trim(),
    updatedAt: normalizeNumber(value?.updatedAt),
    updatedAtISO: String(value?.updatedAtISO || '').trim(),
    reviewedAt: normalizeNumber(value?.reviewedAt) || undefined,
    reviewedAtISO: String(value?.reviewedAtISO || '').trim() || undefined,
    reviewedBy: String(value?.reviewedBy || '').trim() || undefined,
  };
}

function normalizeDuplicateIdentityValue(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]/g, '');
}

function normalizeNextGenQuestion(id: string, value: any): NextGenQuestion {
  const totalUpvotes = normalizeNumber(value?.totalUpvotes);
  const totalDownvotes = normalizeNumber(value?.totalDownvotes);
  const netVotes = typeof value?.netVotes === 'number'
    ? normalizeNumber(value.netVotes)
    : totalUpvotes - totalDownvotes;

  const verses = Array.isArray(value?.verses)
    ? value.verses
        .map((verse: any) => ({
          reference: String(verse?.reference || '').trim(),
          text: String(verse?.text || '').trim(),
        }))
        .filter((verse: NextGenVerse) => verse.reference || verse.text)
    : [];

  return {
    id,
    question: String(value?.question || '').trim(),
    category: String(value?.category || 'Other').trim(),
    verses,
    notes: String(value?.notes || '').trim(),
    status: String(value?.status || 'submittedForPastorReview').trim(),
    source: String(value?.source || 'nextGenActivities').trim(),
    translation: String(value?.translation || 'WEB').trim(),
    totalUpvotes,
    totalDownvotes,
    netVotes,
    createdAt: normalizeNumber(value?.createdAt),
    updatedAt: normalizeNumber(value?.updatedAt),
  };
}

type NextGenSurveyBinaryQuestionId =
  | 'questionAnnouncement'
  | 'postSessionMaterials'
  | 'categoryStructure'
  | 'subtopicStructure'
  | 'sessionBalance'
  | 'answerDepth'
  | 'questionSelection'
  | 'summaryLength';

type NextGenSurveyRatingQuestionId = 'pastorClarity' | 'pastorDepth' | 'pastorEngagement';

interface NextGenSurveyBinaryQuestionDefinition {
  id: NextGenSurveyBinaryQuestionId;
  questionEn: string;
  questionAr: string;
  optionAEn: string;
  optionAAr: string;
  optionBEn: string;
  optionBAr: string;
}

interface NextGenSurveyRatingQuestionDefinition {
  id: NextGenSurveyRatingQuestionId;
  questionEn: string;
  questionAr: string;
}

interface NextGenSurveyBinaryAggregate {
  totalResponses: number;
  counts: {
    A: number;
    B: number;
  };
}

interface NextGenSurveyRatingAggregate {
  totalResponses: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  average: number;
}

interface NextGenSurveyAggregateResults {
  totalResponses: number;
  binaryQuestions: Record<NextGenSurveyBinaryQuestionId, NextGenSurveyBinaryAggregate>;
  pastorQualityRatings: Record<NextGenSurveyRatingQuestionId, NextGenSurveyRatingAggregate>;
}

const NEXTGEN_SURVEY_ID = 'qaSessionFeedbackFirstTwoSessionsV1';

const NEXTGEN_SURVEY_BINARY_QUESTIONS: NextGenSurveyBinaryQuestionDefinition[] = [
  {
    id: 'questionAnnouncement',
    questionEn: 'For future Q&A sessions, should the questions be announced before the session or revealed during the session?',
    questionAr: 'في جلسات الأسئلة والأجوبة القادمة، هل تفضّل إعلان الأسئلة قبل الجلسة أم عرضها أثناء الجلسة؟',
    optionAEn: 'Announce the questions before the session',
    optionAAr: 'إعلان الأسئلة قبل الجلسة',
    optionBEn: 'Reveal the questions during the session',
    optionBAr: 'عرض الأسئلة أثناء الجلسة',
  },
  {
    id: 'postSessionMaterials',
    questionEn: 'After each Q&A session, what would you prefer receiving?',
    questionAr: 'بعد كل جلسة أسئلة وأجوبة، ماذا تفضّل أن يصلك؟',
    optionAEn: 'The recording only',
    optionAAr: 'التسجيل فقط',
    optionBEn: 'Both the recording and a written summary',
    optionBAr: 'التسجيل وملخص مكتوب معاً',
  },
  {
    id: 'categoryStructure',
    questionEn: 'How should future Q&A sessions be organized by category?',
    questionAr: 'كيف تفضّل تنظيم جلسات الأسئلة والأجوبة القادمة من حيث التصنيفات؟',
    optionAEn: 'Each session focuses on one main category',
    optionAAr: 'تركّز كل جلسة على تصنيف رئيسي واحد',
    optionBEn: 'Each session mixes categories such as Christian Living, Theology, and Apologetics',
    optionBAr: 'تجمع كل جلسة بين تصنيفات مثل الحياة المسيحية واللاهوت والدفاعيات',
  },
  {
    id: 'subtopicStructure',
    questionEn: 'When a session focuses on one main category, how should its subtopics be handled?',
    questionAr: 'عندما تركز الجلسة على تصنيف رئيسي واحد، كيف تفضّل تناول الموضوعات الفرعية؟',
    optionAEn: 'Explore one specific subtopic in depth',
    optionAAr: 'التعمق في موضوع فرعي واحد محدد',
    optionBEn: 'Discuss several subtopics from that category',
    optionBAr: 'مناقشة عدة موضوعات فرعية من التصنيف نفسه',
  },
  {
    id: 'sessionBalance',
    questionEn: 'During the session, where should more time be given?',
    questionAr: 'أثناء الجلسة، لأي جانب تفضّل تخصيص وقت أكبر؟',
    optionAEn: "More time for Pastor Ibrahim's explanations",
    optionAAr: 'وقت أكبر لشرح القس إبراهيم',
    optionBEn: 'More time for open discussion and participant follow-up questions',
    optionBAr: 'وقت أكبر للنقاش المفتوح وأسئلة المتابعة من المشاركين',
  },
  {
    id: 'answerDepth',
    questionEn: 'How should the number and depth of answered questions be balanced?',
    questionAr: 'كيف تفضّل الموازنة بين عدد الأسئلة وعمق الإجابات؟',
    optionAEn: 'Answer fewer questions in greater depth',
    optionAAr: 'الإجابة عن أسئلة أقل بعمق أكبر',
    optionBEn: 'Answer more questions with shorter responses',
    optionBAr: 'الإجابة عن أسئلة أكثر بإجابات أقصر',
  },
  {
    id: 'questionSelection',
    questionEn: 'How should questions be selected for each session?',
    questionAr: 'كيف تفضّل اختيار أسئلة كل جلسة؟',
    optionAEn: 'Pastor Ibrahim curates the final selection from the highest-voted questions',
    optionAAr: 'يختار القس إبراهيم التشكيلة النهائية من بين الأسئلة الأعلى تصويتاً',
    optionBEn: 'Questions are selected strictly according to the voting results',
    optionBAr: 'يتم اختيار الأسئلة حصراً وفق نتائج التصويت',
  },
  {
    id: 'summaryLength',
    questionEn: 'If a written summary is shared after the session, which format would you prefer?',
    questionAr: 'إذا تمت مشاركة ملخص مكتوب بعد الجلسة، فما الصيغة التي تفضّلها؟',
    optionAEn: 'A short, concise summary of the main answers',
    optionAAr: 'ملخص قصير ومختصر لأهم الإجابات',
    optionBEn: 'A detailed Bible-study document with explanations, verses, and discussion points',
    optionBAr: 'دراسة كتابية مفصلة تشمل الشرح والآيات ونقاط النقاش',
  },
];

const NEXTGEN_SURVEY_RATING_QUESTIONS: NextGenSurveyRatingQuestionDefinition[] = [
  {
    id: 'pastorClarity',
    questionEn: "How clear and easy to understand were Pastor Ibrahim's explanations?",
    questionAr: 'ما مدى وضوح وسهولة فهم شرح القس إبراهيم؟',
  },
  {
    id: 'pastorDepth',
    questionEn: 'How well did Pastor Ibrahim explore the questions in depth and support his answers with Scripture?',
    questionAr: 'ما مدى تعمق القس إبراهيم في الأسئلة ودعمه للإجابات بالكتاب المقدس؟',
  },
  {
    id: 'pastorEngagement',
    questionEn: 'How well did Pastor Ibrahim listen to participants, address their concerns, and respond to follow-up questions?',
    questionAr: 'ما مدى استماع القس إبراهيم للمشاركين ومعالجته لمخاوفهم وإجابته عن أسئلة المتابعة؟',
  },
];

const NEXTGEN_SURVEY_RATING_VALUES = [1, 2, 3, 4, 5] as const;

function createEmptyNextGenSurveyResults(): NextGenSurveyAggregateResults {
  return {
    totalResponses: 0,
    binaryQuestions: {
      questionAnnouncement: { totalResponses: 0, counts: { A: 0, B: 0 } },
      postSessionMaterials: { totalResponses: 0, counts: { A: 0, B: 0 } },
      categoryStructure: { totalResponses: 0, counts: { A: 0, B: 0 } },
      subtopicStructure: { totalResponses: 0, counts: { A: 0, B: 0 } },
      sessionBalance: { totalResponses: 0, counts: { A: 0, B: 0 } },
      answerDepth: { totalResponses: 0, counts: { A: 0, B: 0 } },
      questionSelection: { totalResponses: 0, counts: { A: 0, B: 0 } },
      summaryLength: { totalResponses: 0, counts: { A: 0, B: 0 } },
    },
    pastorQualityRatings: {
      pastorClarity: { totalResponses: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, average: 0 },
      pastorDepth: { totalResponses: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, average: 0 },
      pastorEngagement: { totalResponses: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, average: 0 },
    },
  };
}

function normalizeSurveyBinaryAnswer(value: unknown): 'A' | 'B' | '' {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'A' || normalized === 'B' ? normalized : '';
}

function normalizeSurveyRating(value: unknown): 1 | 2 | 3 | 4 | 5 | 0 {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5) return parsed;
  return 0;
}

function buildNextGenSurveyAggregateResults(rawResponses: unknown): NextGenSurveyAggregateResults {
  const results = createEmptyNextGenSurveyResults();

  if (!rawResponses || typeof rawResponses !== 'object' || Array.isArray(rawResponses)) {
    return results;
  }

  Object.values(rawResponses as Record<string, any>).forEach(response => {
    if (!response || typeof response !== 'object' || Array.isArray(response)) return;

    const completionStatus = String(response?.completionStatus || '').trim().toLowerCase();
    if (completionStatus && completionStatus !== 'completed') return;

    results.totalResponses += 1;

    NEXTGEN_SURVEY_BINARY_QUESTIONS.forEach(question => {
      const detailedAnswer = response?.answerDetails?.binaryQuestions?.[question.id]?.answer;
      const fallbackAnswer = response?.answers?.[question.id];
      const answer = normalizeSurveyBinaryAnswer(detailedAnswer || fallbackAnswer);

      if (!answer) return;
      results.binaryQuestions[question.id].counts[answer] += 1;
      results.binaryQuestions[question.id].totalResponses += 1;
    });

    NEXTGEN_SURVEY_RATING_QUESTIONS.forEach(question => {
      const detailedRating = response?.answerDetails?.pastorQualityRatings?.[question.id]?.rating;
      const fallbackRating = response?.answers?.[question.id];
      const rating = normalizeSurveyRating(detailedRating || fallbackRating);

      if (!rating) return;
      results.pastorQualityRatings[question.id].counts[rating] += 1;
      results.pastorQualityRatings[question.id].totalResponses += 1;
    });
  });

  NEXTGEN_SURVEY_RATING_QUESTIONS.forEach(question => {
    const aggregate = results.pastorQualityRatings[question.id];
    const weightedTotal = NEXTGEN_SURVEY_RATING_VALUES.reduce(
      (sum, rating) => sum + rating * aggregate.counts[rating],
      0,
    );

    aggregate.average = aggregate.totalResponses > 0
      ? weightedTotal / aggregate.totalResponses
      : 0;
  });

  return results;
}

function getSurveyPercentage(count: number, total: number): number {
  if (total <= 0) return 0;
  return (count / total) * 100;
}

function formatSurveyPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  primaryGift: string;
  identifier: string;
  memberKey: string;
  firstName: string;
  peopleGroup?: PeopleDevelopmentGroupId | '';
  sourcePath: string;
  sourceKeys: string[];
}

interface PeopleDevelopmentMember {
  memberKey: string;
  identifier: string;
  fullName: string;
  email: string;
  group: PeopleDevelopmentGroupId | '';
  sourcePath?: string;
  sourceKeys?: string[];
  updatedAt?: number;
  updatedAtISO?: string;
}

interface PeopleDevelopmentAttachment {
  name: string;
  type: string;
  size: number;
  encoding: 'base64';
  storage: 'realtimeDatabase';
  base64: string;
  uploadedAt: number;
  uploadedAtISO: string;
}

interface PeopleDevelopmentEntry {
  id: string;
  group: PeopleDevelopmentGroupId;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  attachments: PeopleDevelopmentAttachment[];
}

interface PeoplePersonalNote {
  id: string;
  identifier: string;
  memberKey: string;
  fullName: string;
  email: string;
  group: PeopleDevelopmentGroupId | '';
  groupLabel: string;
  type: PeoplePersonalNoteType;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  source: string;
}

interface Availability {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  allDay?: boolean;
}

interface Unavailability {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  allDay?: boolean;
}

interface NextGenVerse {
  reference: string;
  text: string;
}

interface NextGenQuestion {
  id: string;
  question: string;
  category: string;
  verses: NextGenVerse[];
  notes: string;
  status: string;
  source: string;
  translation: string;
  totalUpvotes: number;
  totalDownvotes: number;
  netVotes: number;
  createdAt: number;
  updatedAt: number;
}

interface AvailabilityForm {
  mode: 'single' | 'multiple';
  date: string;
  startDate: string;
  endDate: string;
  selectedWeekdays: number[];
  startTime: string;
  endTime: string;
  reason: string;
  allDay: boolean;
}

interface UnavailabilityForm {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  allDay: boolean;
}

export default function Calendar() {
  const { t, dir, locale } = useI18n();
  const displayLocale = locale === 'ar' ? 'ar' : 'en';
  const dateLocale = displayLocale === 'ar' ? ar : enUS;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [nextGenQuestions, setNextGenQuestions] = useState<NextGenQuestion[]>([]);
  const [showNextGenQuestions, setShowNextGenQuestions] = useState(false);
  const [showNextGenSurveyResults, setShowNextGenSurveyResults] = useState(false);
  const [nextGenSurveyResults, setNextGenSurveyResults] = useState<NextGenSurveyAggregateResults>(() => createEmptyNextGenSurveyResults());
  const [nextGenSurveyResultsLoading, setNextGenSurveyResultsLoading] = useState(true);
  const [nextGenSurveyResultsError, setNextGenSurveyResultsError] = useState('');
  const [nextGenRegistrations, setNextGenRegistrations] = useState<NextGenRegistration[]>([]);
  const [showNextGenRegistrations, setShowNextGenRegistrations] = useState(false);
  const [nextGenRegistrationSearchTerm, setNextGenRegistrationSearchTerm] = useState('');
  const [nextGenRegistrationStatusFilter, setNextGenRegistrationStatusFilter] = useState<NextGenRegistrationStatusFilter>('all');
  const [nextGenRegistrationUpdatingId, setNextGenRegistrationUpdatingId] = useState<string | null>(null);
  const [showPeopleDevelopment, setShowPeopleDevelopment] = useState(false);
  const [peopleDevelopmentMembers, setPeopleDevelopmentMembers] = useState<Record<string, PeopleDevelopmentMember>>({});
  const [peopleDevelopmentEntries, setPeopleDevelopmentEntries] = useState<PeopleDevelopmentEntry[]>([]);
  const [peoplePersonalNotes, setPeoplePersonalNotes] = useState<PeoplePersonalNote[]>([]);
  const [peopleSearchTerm, setPeopleSearchTerm] = useState('');
  const [draggedPeopleMemberKey, setDraggedPeopleMemberKey] = useState<string | null>(null);
  const [peopleDevelopmentSavingKey, setPeopleDevelopmentSavingKey] = useState<string | null>(null);
  const [peopleDevelopmentPostingGroup, setPeopleDevelopmentPostingGroup] = useState<PeopleDevelopmentGroupId | null>(null);
  const [peopleDevelopmentDeletingKey, setPeopleDevelopmentDeletingKey] = useState<string | null>(null);
  const [peopleAssignmentsPopupGroup, setPeopleAssignmentsPopupGroup] = useState<PeopleDevelopmentGroupId | null>(null);
  const [peopleAssignmentsPopupMonth, setPeopleAssignmentsPopupMonth] = useState(new Date());
  const [peopleAssignmentsPopupSelectedDate, setPeopleAssignmentsPopupSelectedDate] = useState('');
  const [peopleAssignmentDrafts, setPeopleAssignmentDrafts] = useState<Record<PeopleDevelopmentGroupId, string>>({
    pastors: '',
    prophets: '',
    evangelists: '',
    teachers: '',
    apostles: '',
    helpers: '',
    mercy: '',
    facilitators: '',
    services: '',
    giving: '',
  });
  const [peopleAssignmentFiles, setPeopleAssignmentFiles] = useState<Record<PeopleDevelopmentGroupId, File | null>>({
    pastors: null,
    prophets: null,
    evangelists: null,
    teachers: null,
    apostles: null,
    helpers: null,
    mercy: null,
    facilitators: null,
    services: null,
    giving: null,
  });
  const [peopleAssignmentFileInputResetKeys, setPeopleAssignmentFileInputResetKeys] = useState<Record<PeopleDevelopmentGroupId, number>>({
    pastors: 0,
    prophets: 0,
    evangelists: 0,
    teachers: 0,
    apostles: 0,
    helpers: 0,
    mercy: 0,
    facilitators: 0,
    services: 0,
    giving: 0,
  });
  const [peopleGroupSelectDrafts, setPeopleGroupSelectDrafts] = useState<Record<PeopleDevelopmentGroupId, string>>({
    pastors: '',
    prophets: '',
    evangelists: '',
    teachers: '',
    apostles: '',
    helpers: '',
    mercy: '',
    facilitators: '',
    services: '',
    giving: '',
  });
  const [showPeopleNotePopup, setShowPeopleNotePopup] = useState(false);
  const [selectedPeopleNotePerson, setSelectedPeopleNotePerson] = useState<Participant | null>(null);
  const [peopleNoteType, setPeopleNoteType] = useState<PeoplePersonalNoteType>('strength');
  const [peopleNoteText, setPeopleNoteText] = useState('');
  const [peopleNoteSaving, setPeopleNoteSaving] = useState(false);
  const [nextGenSelectionLoadingId, setNextGenSelectionLoadingId] = useState<string | null>(null);
  const [selectedSlotDay, setSelectedSlotDay] = useState<Date | null>(null);
  const [slotBlockingLoading, setSlotBlockingLoading] = useState(false);

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);

  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>({
    mode: 'single',
    date: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    startTime: '09:00',
    endTime: '20:00',
    reason: '',
    allDay: true,
  });

  const [showUnavailabilityModal, setShowUnavailabilityModal] = useState(false);
  const [editingUnavailability, setEditingUnavailability] = useState<Unavailability | null>(null);
  const [unavailabilityForm, setUnavailabilityForm] = useState<UnavailabilityForm>({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '20:00',
    reason: '',
    allDay: true,
  });

  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string; timestamp: Date }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);


  useEffect(() => {
    const formRef = ref(database, 'form/');
    const unsubscribe = onValue(formRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setParticipants([]);
        return;
      }

      const peopleByKey = new Map<string, Participant>();

      Object.entries(data).forEach(([id, val]: [string, any]) => {
        const raw = val || {};
        const fullName = extractResponseValue(raw, ['fullName', 'full_name', 'name', 'firstName', 'lastName']);
        const email = extractResponseValue(raw, ['email', 'emailAddress', 'userEmail']);
        const userIdentifier = extractResponseValue(raw, ['userIdentifier', 'linkedUserIdentifier', 'memberId', 'memberIdentifier', 'linkId']).trim();
        const normalizedIdentifier = userIdentifier.toLowerCase();

        if (!normalizedIdentifier) {
          return;
        }

        const result = raw.results;
        const lang = raw.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
        const primaryGift = result?.[lang]?.primaryGift || '';
        const memberKey = `identifier_${safeFirebaseKey(normalizedIdentifier)}`;
        const existing = peopleByKey.get(memberKey);
        const peopleGroup = extractPeopleDevelopmentGroup(raw);

        if (existing) {
          peopleByKey.set(memberKey, {
            ...existing,
            name: existing.name !== 'N/A' && existing.name ? existing.name : fullName || existing.name,
            email: existing.email !== 'N/A' && existing.email ? existing.email : email || existing.email,
            primaryGift: existing.primaryGift || primaryGift,
            identifier: existing.identifier || userIdentifier,
            peopleGroup: existing.peopleGroup || peopleGroup,
            sourceKeys: Array.from(new Set([...existing.sourceKeys, id])),
          });
          return;
        }

        peopleByKey.set(memberKey, {
          id,
          name: fullName || 'N/A',
          email: email || 'N/A',
          primaryGift,
          identifier: userIdentifier,
          memberKey,
          firstName: getFirstName(fullName || 'N/A'),
          peopleGroup,
          sourcePath: 'form',
          sourceKeys: [id],
        });
      });

      const parsed = Array.from(peopleByKey.values())
        .filter(person => person.identifier.trim())
        .sort((a, b) => a.name.localeCompare(b.name));

      setParticipants(parsed);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const meetingsRef = ref(database, 'meetings/');
    const unsubscribe = onValue(meetingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...(val as Meeting),
        }));
        (parsed as Meeting[]).sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.localeCompare(b.date);
        });
        setMeetings(parsed);
      } else {
        setMeetings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const requestsRef = ref(database, 'meetingRequests/');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...(val as MeetingRequest),
        }));
        (parsed as MeetingRequest[]).sort((a, b) => a.createdAt - b.createdAt);
        setMeetingRequests(parsed);
      } else {
        setMeetingRequests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const nextGenQuestionsRef = ref(database, 'nextGenActivities/qaSessions/');
    const unsubscribe = onValue(nextGenQuestionsRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const parsed = Object.entries(data)
          .map(([id, val]: [string, any]) => normalizeNextGenQuestion(id, val))
          .filter(question => question.question);

        parsed.sort((a, b) => {
          if (b.netVotes !== a.netVotes) return b.netVotes - a.netVotes;
          if (b.totalUpvotes !== a.totalUpvotes) return b.totalUpvotes - a.totalUpvotes;
          if (a.totalDownvotes !== b.totalDownvotes) return a.totalDownvotes - b.totalDownvotes;
          return b.createdAt - a.createdAt;
        });

        setNextGenQuestions(parsed);
      } else {
        setNextGenQuestions([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const surveyResponsesRef = ref(
      database,
      `nextGenActivities/surveys/${NEXTGEN_SURVEY_ID}/responsesByIdentifier/`,
    );

    setNextGenSurveyResultsLoading(true);
    setNextGenSurveyResultsError('');

    const unsubscribe = onValue(
      surveyResponsesRef,
      snapshot => {
        // Only anonymous aggregate counts are kept in component state. Participant
        // identifiers and individual answer combinations are never displayed.
        setNextGenSurveyResults(buildNextGenSurveyAggregateResults(snapshot.val()));
        setNextGenSurveyResultsLoading(false);
      },
      error => {
        console.error('Failed to load NextGen survey results:', error);
        setNextGenSurveyResults(createEmptyNextGenSurveyResults());
        setNextGenSurveyResultsError(
          displayLocale === 'ar'
            ? 'تعذر تحميل نتائج الاستبيان.'
            : 'Unable to load the survey results.',
        );
        setNextGenSurveyResultsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [displayLocale]);

  useEffect(() => {
    const registrationsRef = ref(database, 'nextGenUsers/');
    const unsubscribe = onValue(registrationsRef, snapshot => {
      const data = snapshot.val();

      if (!data) {
        setNextGenRegistrations([]);
        return;
      }

      const parsed = Object.entries(data)
        .map(([userId, value]: [string, any]) => normalizeNextGenRegistration(userId, value))
        .filter(registration => registration.userId)
        .sort((a, b) => {
          if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
          return a.userId.localeCompare(b.userId);
        });

      setNextGenRegistrations(parsed);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const membersRef = ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/members/`);
    const unsubscribe = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setPeopleDevelopmentMembers({});
        return;
      }

      const parsed = Object.fromEntries(
        Object.entries(data).map(([memberKey, value]: [string, any]) => [
          memberKey,
          {
            memberKey,
            identifier: String(value?.identifier || ''),
            fullName: String(value?.fullName || value?.name || ''),
            email: String(value?.email || ''),
            group: normalizePeopleDevelopmentGroup(value?.group),
            sourcePath: String(value?.sourcePath || 'form'),
            sourceKeys: Array.isArray(value?.sourceKeys) ? value.sourceKeys.map((item: any) => String(item)) : [],
            updatedAt: normalizeNumber(value?.updatedAt),
            updatedAtISO: String(value?.updatedAtISO || ''),
          } as PeopleDevelopmentMember,
        ]),
      );

      setPeopleDevelopmentMembers(parsed);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const assignmentsRef = ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/assignments/`);
    const unsubscribe = onValue(assignmentsRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setPeopleDevelopmentEntries([]);
        return;
      }

      const parsed = Object.entries(data)
        .map(([id, value]: [string, any]) => {
          const attachments: PeopleDevelopmentAttachment[] = Array.isArray(value?.attachments)
            ? value.attachments
                .map((attachment: any) => ({
                  name: String(attachment?.name || '').trim(),
                  type: String(attachment?.type || 'application/pdf').trim() || 'application/pdf',
                  size: normalizeNumber(attachment?.size),
                  encoding: 'base64' as const,
                  storage: 'realtimeDatabase' as const,
                  base64: String(attachment?.base64 || '').trim(),
                  uploadedAt: normalizeNumber(attachment?.uploadedAt),
                  uploadedAtISO: String(attachment?.uploadedAtISO || '').trim(),
                }))
                .filter((attachment: PeopleDevelopmentAttachment) => Boolean(attachment.name && attachment.base64))
            : [];

          return {
            id,
            group: normalizePeopleDevelopmentGroup(value?.group),
            text: String(value?.text || '').trim(),
            date: String(value?.date || ''),
            createdAt: normalizeNumber(value?.createdAt),
            createdAtISO: String(value?.createdAtISO || ''),
            attachments,
          };
        })
        .filter((entry): entry is PeopleDevelopmentEntry => Boolean(entry.group && (entry.text || entry.attachments.length > 0)))
        .sort((a, b) => b.createdAt - a.createdAt);

      setPeopleDevelopmentEntries(parsed);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const personalNotesRef = ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/personalNotes/`);
    const unsubscribe = onValue(personalNotesRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setPeoplePersonalNotes([]);
        return;
      }

      const parsed = Object.entries(data)
        .map(([id, value]: [string, any]) => ({
          id,
          identifier: String(value?.identifier || '').trim(),
          memberKey: String(value?.memberKey || '').trim(),
          fullName: String(value?.fullName || value?.name || '').trim(),
          email: String(value?.email || '').trim(),
          group: normalizePeopleDevelopmentGroup(value?.group),
          groupLabel: String(value?.groupLabel || '').trim(),
          type: normalizePeoplePersonalNoteType(value?.type),
          text: String(value?.text || '').trim(),
          date: String(value?.date || '').trim(),
          createdAt: normalizeNumber(value?.createdAt),
          createdAtISO: String(value?.createdAtISO || '').trim(),
          source: String(value?.source || 'pastorCalendar').trim(),
        }))
        .filter((note): note is PeoplePersonalNote => Boolean((note.memberKey || note.identifier) && note.text))
        .sort((a, b) => b.createdAt - a.createdAt);

      setPeoplePersonalNotes(parsed);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const availabilityRef = ref(database, 'availability/');
    const unsubscribe = onValue(availabilityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([firebaseId, val]: [string, any]) => ({
          id: firebaseId,
          date: val.date,
          startTime: val.startTime,
          endTime: val.endTime,
          reason: val.reason || '',
          allDay: val.allDay || false,
        }));
        parsed.sort((a, b) => a.date.localeCompare(b.date));
        setAvailability(parsed);
      } else {
        setAvailability([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unavailabilityRef = ref(database, 'unavailability/');
    const unsubscribe = onValue(unavailabilityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.entries(data).map(([firebaseId, val]: [string, any]) => ({
          id: firebaseId,
          date: val.date,
          startTime: val.startTime,
          endTime: val.endTime,
          reason: val.reason || '',
          allDay: val.allDay || false,
        }));
        parsed.sort((a, b) => a.date.localeCompare(b.date));
        setUnavailability(parsed);
      } else {
        setUnavailability([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    meetLink: '',
    type: 'service',
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const resetAvailabilityForm = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setAvailabilityForm({
      mode: 'single',
      date: today,
      startDate: today,
      endDate: today,
      selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '09:00',
      endTime: '20:00',
      reason: '',
      allDay: true,
    });
  };

  const resetUnavailabilityForm = () => {
    setUnavailabilityForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '20:00',
      reason: '',
      allDay: true,
    });
  };

  const buildAvailabilityDates = (): string[] => {
    if (availabilityForm.mode === 'single') {
      return [availabilityForm.date];
    }

    const start = parseISO(availabilityForm.startDate);
    const end = parseISO(availabilityForm.endDate);

    if (end < start) {
      return [];
    }

    return eachDayOfInterval({ start, end })
      .filter(day => availabilityForm.selectedWeekdays.includes(day.getDay()))
      .map(day => format(day, 'yyyy-MM-dd'));
  };

  const toggleAvailabilityWeekday = (weekday: number) => {
    setAvailabilityForm(prev => {
      const alreadySelected = prev.selectedWeekdays.includes(weekday);
      const nextSelected = alreadySelected
        ? prev.selectedWeekdays.filter(d => d !== weekday)
        : [...prev.selectedWeekdays, weekday].sort((a, b) => a - b);

      return {
        ...prev,
        selectedWeekdays: nextSelected,
      };
    });
  };

  const getMeetingDisplayTitle = (meeting: Meeting): string => {
    const requestName = (meeting as any).requestName;

    if (requestName) {
      return `${t('calendar.meetingWith')} ${requestName}`;
    }

    return meeting.title || t('calendar.meeting');
  };

  const getMeetingRequestEmail = (meeting: Meeting): string => {
    return (meeting as any).requestEmail || '';
  };

  const getMeetingRequestReason = (meeting: Meeting): string => {
    return (meeting as any).requestReason || '';
  };

  const getMeetingAcknowledged = (meeting: Meeting): boolean => {
    return Boolean((meeting as any).acknowledged);
  };

  const getMeetingRequesterLocale = (meeting: Meeting): 'en' | 'ar' => {
    return (meeting as any).requesterLocale === 'ar' ? 'ar' : 'en';
  };

  const buildMeetingConfirmationEmail = (meeting: Meeting): {
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
  } => {
    const requesterLocale = getMeetingRequesterLocale(meeting);
    const requesterName = (meeting as any).requestName || '';
    const displayName = requesterName || (requesterLocale === 'ar' ? 'صديقنا العزيز' : 'Friend');
    const meetingTitle = getMeetingDisplayTitle(meeting) || t('calendar.meetingWithPastor');
    const meetingType = requesterLocale === 'ar' ? 'اجتماع مع Pastor' : 'Meeting with Pastor';
    const meetingLink = meeting.meetLink || '';
    const meetingDate = meeting.date
      ? format(parseISO(meeting.date), 'EEEE, MMMM d, yyyy', { locale: requesterLocale === 'ar' ? ar : enUS })
      : '';
    const meetingTime = timeRangeToLabel(meeting.startTime, meeting.endTime, requesterLocale);
    const meetingLocation = meeting.location || (requesterLocale === 'ar' ? 'اجتماع عبر الإنترنت' : 'Online meeting');

    const safeName = escapeHtml(displayName);
    const safeMeetingType = escapeHtml(meetingType);
    const safeMeetingDate = escapeHtml(meetingDate);
    const safeMeetingTime = escapeHtml(meetingTime);
    const safeMeetingLocation = escapeHtml(meetingLocation);
    const safeMeetLink = escapeHtml(meetingLink);

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
        meetingLink ? `رابط الانضمام: ${meetingLink}` : 'رابط الانضمام: سيتم إرساله لاحقاً.',
        '',
        'شكراً لك، ونتطلع إلى لقائك.',
      ].join('\n');

      const safeFullReport = escapeHtml(fullReport);
      const meetingLinkHtml = meetingLink
        ? `<a href="${safeMeetLink}" style="color: #8b1e1e; font-weight: 700; word-break: break-all;">${safeMeetLink}</a>`
        : '<span style="color: #666666; font-weight: 700;">سيتم إرساله لاحقاً</span>';

      const htmlBody = `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #242424; line-height: 1.6; max-width: 680px; margin: 0 auto; direction: rtl; text-align: right;">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">تأكيد موعد الاجتماع</h2>
    <div style="margin-top: 6px; font-size: 13px;">اجتماع مع Pastor</div>
  </div>

  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
      <tr>
        <td style="padding: 8px 0; width: 190px; color: #666666; font-weight: 700;">الاسم</td>
        <td style="padding: 8px 0;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">نوع الاجتماع</td>
        <td style="padding: 8px 0;">${safeMeetingType}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">التاريخ</td>
        <td style="padding: 8px 0;">${safeMeetingDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">الوقت</td>
        <td style="padding: 8px 0;">${safeMeetingTime}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">المكان</td>
        <td style="padding: 8px 0;">${safeMeetingLocation}</td>
      </tr>
    </table>

    <div style="margin: 20px 0; padding: 16px; background-color: #f8eeee; border-right: 5px solid #8b1e1e; border-radius: 10px;">
      <h3 style="margin: 0 0 10px; color: #5e1010; font-size: 17px;">رابط الانضمام</h3>
      <div style="margin-bottom: 8px;">
        ${meetingLinkHtml}
      </div>
    </div>

    <div style="margin-top: 22px;">
      <h3 style="margin: 0 0 10px; color: #8b1e1e; font-size: 17px;">تأكيد موعد الاجتماع</h3>
      <div style="white-space: pre-wrap; padding: 16px; background-color: #fafafa; border: 1px solid #dddddd; border-radius: 10px; font-size: 14px;">
${safeFullReport}
      </div>
    </div>

    <div style="margin-top: 22px; color: #777777; font-size: 12px;">
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
      meetingLink ? `Joining Link: ${meetingLink}` : 'Joining Link: The joining link will be sent later.',
      '',
      'Thank you, and we look forward to meeting with you.',
    ].join('\n');

    const safeFullReport = escapeHtml(fullReport);
    const meetingLinkHtml = meetingLink
      ? `<a href="${safeMeetLink}" style="color: #8b1e1e; font-weight: 700; word-break: break-all;">${safeMeetLink}</a>`
      : '<span style="color: #666666; font-weight: 700;">The joining link will be sent later.</span>';

    const htmlBody = `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #242424; line-height: 1.6; max-width: 680px; margin: 0 auto;">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Meeting Confirmation</h2>
    <div style="margin-top: 6px; font-size: 13px;">Meeting with Pastor</div>
  </div>

  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
      <tr>
        <td style="padding: 8px 0; width: 190px; color: #666666; font-weight: 700;">Name</td>
        <td style="padding: 8px 0;">${safeName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">Meeting Type</td>
        <td style="padding: 8px 0;">${safeMeetingType}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">Date</td>
        <td style="padding: 8px 0;">${safeMeetingDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">Time</td>
        <td style="padding: 8px 0;">${safeMeetingTime}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666666; font-weight: 700;">Location</td>
        <td style="padding: 8px 0;">${safeMeetingLocation}</td>
      </tr>
    </table>

    <div style="margin: 20px 0; padding: 16px; background-color: #f8eeee; border-left: 5px solid #8b1e1e; border-radius: 10px;">
      <h3 style="margin: 0 0 10px; color: #5e1010; font-size: 17px;">Joining Link</h3>
      <div style="margin-bottom: 8px;">
        ${meetingLinkHtml}
      </div>
    </div>

    <div style="margin-top: 22px;">
      <h3 style="margin: 0 0 10px; color: #8b1e1e; font-size: 17px;">Meeting Confirmation</h3>
      <div style="white-space: pre-wrap; padding: 16px; background-color: #fafafa; border: 1px solid #dddddd; border-radius: 10px; font-size: 14px;">
${safeFullReport}
      </div>
    </div>

    <div style="margin-top: 22px; color: #777777; font-size: 12px;">
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
  };


  const buildMeetingStatusEmail = (params: {
    kind: 'rejection' | 'cancellation';
    name?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    requesterLocale?: string;
  }): {
    subject: string;
    requesterName: string;
    htmlBody: string;
    fullReport: string;
  } => {
    const requesterLocale: 'en' | 'ar' = params.requesterLocale === 'ar' ? 'ar' : 'en';
    const displayName = params.name || (requesterLocale === 'ar' ? 'صديقنا العزيز' : 'Friend');
    const meetingDate = params.date
      ? format(parseISO(params.date), 'EEEE, MMMM d, yyyy', { locale: requesterLocale === 'ar' ? ar : enUS })
      : '';
    const meetingTime = timeRangeToLabel(params.startTime, params.endTime, requesterLocale);
    const meetingLocation = params.location || (requesterLocale === 'ar' ? 'اجتماع عبر الإنترنت' : 'Online meeting');
    const isCancellation = params.kind === 'cancellation';

    const safeName = escapeHtml(displayName);
    const safeMeetingDate = escapeHtml(meetingDate);
    const safeMeetingTime = escapeHtml(meetingTime);
    const safeMeetingLocation = escapeHtml(meetingLocation);

    if (requesterLocale === 'ar') {
      const title = isCancellation ? 'إلغاء موعد الاجتماع' : 'تحديث بخصوص طلب الاجتماع';
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
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #242424; line-height: 1.6; max-width: 680px; margin: 0 auto; direction: rtl; text-align: right;">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">${escapeHtml(title)}</h2>
    <div style="margin-top: 6px; font-size: 13px;">اجتماع مع Pastor</div>
  </div>

  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <p style="margin: 0 0 14px;">مرحباً ${safeName}،</p>
    <p style="margin: 0 0 18px;">${escapeHtml(intro)}</p>

    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
      <tr><td style="padding: 8px 0; width: 160px; color: #666666; font-weight: 700;">التاريخ</td><td style="padding: 8px 0;">${safeMeetingDate}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">الوقت</td><td style="padding: 8px 0;">${safeMeetingTime}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">المكان</td><td style="padding: 8px 0;">${safeMeetingLocation}</td></tr>
    </table>

    <div style="white-space: pre-wrap; padding: 16px; background-color: #fafafa; border: 1px solid #dddddd; border-radius: 10px; font-size: 14px;">${safeFullReport}</div>
    <div style="margin-top: 22px; color: #777777; font-size: 12px;">تم إرسال هذا البريد تلقائياً بخصوص طلب اجتماعك مع Pastor.</div>
  </div>
</div>
      `.trim();

      return { subject, requesterName: displayName, htmlBody, fullReport };
    }

    const title = isCancellation ? 'Meeting Cancelled' : 'Meeting Request Update';
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
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #242424; line-height: 1.6; max-width: 680px; margin: 0 auto;">
  <div style="padding: 18px 20px; background-color: #8b1e1e; color: #ffffff; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">${escapeHtml(title)}</h2>
    <div style="margin-top: 6px; font-size: 13px;">Meeting with Pastor</div>
  </div>

  <div style="padding: 20px; border: 1px solid #dddddd; border-top: 0; border-radius: 0 0 12px 12px; background-color: #ffffff;">
    <p style="margin: 0 0 14px;">Hi ${safeName},</p>
    <p style="margin: 0 0 18px;">${escapeHtml(intro)}</p>

    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
      <tr><td style="padding: 8px 0; width: 160px; color: #666666; font-weight: 700;">Date</td><td style="padding: 8px 0;">${safeMeetingDate}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">Time</td><td style="padding: 8px 0;">${safeMeetingTime}</td></tr>
      <tr><td style="padding: 8px 0; color: #666666; font-weight: 700;">Location</td><td style="padding: 8px 0;">${safeMeetingLocation}</td></tr>
    </table>

    <div style="white-space: pre-wrap; padding: 16px; background-color: #fafafa; border: 1px solid #dddddd; border-radius: 10px; font-size: 14px;">${safeFullReport}</div>
    <div style="margin-top: 22px; color: #777777; font-size: 12px;">This email was automatically generated regarding your meeting request with Pastor.</div>
  </div>
</div>
    `.trim();

    return { subject, requesterName: displayName, htmlBody, fullReport };
  };

  const sendMeetingStatusEmailViaEmailJs = async (params: {
    kind: 'rejection' | 'cancellation';
    recipientEmail: string;
    name?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    requesterLocale?: string;
    sourceId?: string;
  }) => {
    if (!params.recipientEmail) {
      throw new Error('Recipient email is missing.');
    }

    const statusEmail = buildMeetingStatusEmail(params);

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
      source: params.kind === 'cancellation' ? 'calendarMeetingCancellation' : 'calendarMeetingRejection',
      sourceId: params.sourceId || '',
      meetingDate: params.date || '',
      meetingStartTime: params.startTime || '',
      meetingEndTime: params.endTime || '',
      requesterLocale: params.requesterLocale === 'ar' ? 'ar' : 'en',
      sentAt: Date.now(),
      sentAtISO: new Date().toISOString(),
      emailJsResponse: {
        status: response.status,
        text: response.text,
      },
    });

    return response;
  };


  const sendMeetingConfirmationViaEmailJs = async (meeting: Meeting) => {
    const recipientEmail = getMeetingRequestEmail(meeting);
    const confirmationEmail = buildMeetingConfirmationEmail(meeting);

    if (!recipientEmail) {
      throw new Error('Meeting requester email is missing.');
    }

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
  };

  const openMeetingEditor = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setNewMeeting({ ...meeting });
    setSelectedParticipants(meeting.participantIds || []);
    setEmailSent(false);
    setIsAddOpen(true);
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const sendEmails = async (meetingData: { title: string; date: string; startTime: string; endTime: string; location: string; meetLink: string }) => {
    if (selectedParticipants.length === 0) return true;

    const selected = participants.filter(participant => selectedParticipants.includes(participant.id));
    let allSucceeded = true;

    for (const participant of selected) {
      if (!isUsableEmail(participant.email)) continue;

      const participantName = participant.name || (displayLocale === 'ar' ? 'المشارك' : 'Participant');
      const meetingDate = format(parseISO(meetingData.date), 'EEEE, MMMM d, yyyy', { locale: dateLocale });
      const meetingTime = timeRangeToLabel(meetingData.startTime, meetingData.endTime, displayLocale);
      const safeParticipantName = escapeHtml(participantName);
      const safeMeetingTitle = escapeHtml(meetingData.title);
      const safeMeetingDate = escapeHtml(meetingDate);
      const safeMeetingTime = escapeHtml(meetingTime);
      const safeMeetingLocation = escapeHtml(meetingData.location || (displayLocale === 'ar' ? 'يحدد لاحقاً' : 'TBA'));
      const safeMeetingLink = escapeHtml(meetingData.meetLink || '');
      const onlineLinkHtml = meetingData.meetLink
        ? `<p style="margin: 4px 0; font-size: 14px;"><strong>${displayLocale === 'ar' ? 'رابط الاجتماع عبر الإنترنت' : 'Online meeting link'}:</strong> <a href="${safeMeetingLink}" style="color: #8b1e1e; font-weight: 700; word-break: break-all;">${safeMeetingLink}</a></p>`
        : '';

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f4f0; border-radius: 22px;">
          <div style="background: #8b1e1e; color: white; padding: 16px; border-radius: 14px; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 20px;">${displayLocale === 'ar' ? 'دعوة لاجتماع LINC' : 'LINC Meeting Invitation'}</h1>
          </div>
          <p style="color: #333; font-size: 15px;">${displayLocale === 'ar' ? `مرحباً ${safeParticipantName}،` : `Dear ${safeParticipantName},`}</p>
          <p style="color: #555; font-size: 14px;">${displayLocale === 'ar' ? 'تمت دعوتك لحضور الاجتماع التالي:' : 'You are invited to attend the following meeting:'}</p>
          <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid #e5e5e5; margin-bottom: 16px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>${displayLocale === 'ar' ? 'الاجتماع' : 'Meeting'}:</strong> ${safeMeetingTitle}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>${displayLocale === 'ar' ? 'التاريخ' : 'Date'}:</strong> ${safeMeetingDate}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>${displayLocale === 'ar' ? 'الوقت' : 'Time'}:</strong> ${safeMeetingTime}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>${displayLocale === 'ar' ? 'المكان' : 'Location'}:</strong> ${safeMeetingLocation}</p>
            ${onlineLinkHtml}
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">${displayLocale === 'ar' ? 'نتطلع إلى رؤيتك هناك.' : 'We look forward to seeing you there.'}</p>
        </div>
      `.trim();

      try {
        const response = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: participant.email,
            subject: displayLocale === 'ar'
              ? `دعوة لاجتماع: ${meetingData.title}`
              : `Meeting Invitation: ${meetingData.title}`,
            fullName: participantName,
            message_html: htmlBody,
            reply_to: participant.email,
          },
          EMAILJS_PUBLIC_KEY,
        );

        await push(ref(database, 'emailJsSendLogs/'), {
          recipientEmail: participant.email,
          subject: displayLocale === 'ar'
            ? `دعوة لاجتماع: ${meetingData.title}`
            : `Meeting Invitation: ${meetingData.title}`,
          fullName: participantName,
          sentUsing: 'EmailJS',
          serviceId: EMAILJS_SERVICE_ID,
          templateId: EMAILJS_TEMPLATE_ID,
          source: 'calendarParticipantInvitation',
          meetingDate: meetingData.date,
          meetingStartTime: meetingData.startTime,
          meetingEndTime: meetingData.endTime,
          sentAt: Date.now(),
          sentAtISO: new Date().toISOString(),
          emailJsResponse: {
            status: response.status,
            text: response.text,
          },
        });
      } catch (error) {
        allSucceeded = false;
        console.error(`Failed to send meeting invitation to ${participant.email}:`, error);
      }
    }

    return allSucceeded;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailSent(false);

    try {
      const startHour = timeToHour(newMeeting.startTime || '00:00');
      const endHour = timeToHour(newMeeting.endTime || '00:00');

      if (endHour <= startHour) {
        alert(displayLocale === 'ar' ? 'وقت النهاية يجب أن يكون بعد وقت البداية.' : 'End time must be after start time.');
        return;
      }

      const meetingData: Record<string, any> = {
        title: newMeeting.title || '',
        date: newMeeting.date || '',
        startTime: newMeeting.startTime || '',
        endTime: newMeeting.endTime || '',
        location: newMeeting.location || '',
        meetLink: newMeeting.meetLink || '',
        type: newMeeting.type || 'service',
        participantIds: selectedParticipants,
        updatedAt: Date.now(),
      };

      if (editingMeeting) {
        const requestFieldsToPreserve = ['requestName', 'requestEmail', 'requestReason', 'sourceRequestId', 'requesterLocale', 'requesterLanguage'];

        requestFieldsToPreserve.forEach(field => {
          const value = (editingMeeting as any)[field];
          if (value !== undefined && value !== null && value !== '') {
            meetingData[field] = value;
          }
        });

        const finalizedDetailsChanged =
          (editingMeeting.date || '') !== meetingData.date ||
          (editingMeeting.startTime || '') !== meetingData.startTime ||
          (editingMeeting.endTime || '') !== meetingData.endTime ||
          (editingMeeting.meetLink || '') !== meetingData.meetLink ||
          (editingMeeting.location || '') !== meetingData.location;

        if (finalizedDetailsChanged) {
          meetingData.acknowledged = false;
          meetingData.acknowledgedAt = null;
          meetingData.acknowledgedEmail = null;
        } else {
          meetingData.acknowledged = Boolean((editingMeeting as any).acknowledged);

          const acknowledgedAt = (editingMeeting as any).acknowledgedAt;
          if (acknowledgedAt !== undefined && acknowledgedAt !== null && acknowledgedAt !== '') {
            meetingData.acknowledgedAt = acknowledgedAt;
          }

          const acknowledgedEmail = (editingMeeting as any).acknowledgedEmail;
          if (acknowledgedEmail !== undefined && acknowledgedEmail !== null && acknowledgedEmail !== '') {
            meetingData.acknowledgedEmail = acknowledgedEmail;
          }
        }

        const { update } = await import('firebase/database');
        await update(ref(database, `meetings/${editingMeeting.id}`), meetingData);

        const sourceRequestId = (editingMeeting as any).sourceRequestId;
        if (sourceRequestId) {
          await update(ref(database, `meetingRequests/${sourceRequestId}`), {
            date: meetingData.date,
            startTime: meetingData.startTime,
            endTime: meetingData.endTime,
            updatedAt: Date.now(),
          });
        }
      } else {
        const { push } = await import('firebase/database');
        await push(ref(database, 'meetings/'), {
          ...meetingData,
          acknowledged: false,
        });
      }

      const emailSuccess = await sendEmails({
        title: meetingData.title,
        date: meetingData.date,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        location: meetingData.location,
        meetLink: meetingData.meetLink,
      });
      setEmailSent(emailSuccess);

      setIsAddOpen(false);
      setEditingMeeting(null);
      setSelectedParticipants([]);
      setNewMeeting({
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '10:00',
        endTime: '11:00',
        location: '',
        meetLink: '',
        type: 'service',
      });
    } catch (err) {
      console.error(err);
      alert(t('calendar.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('calendar.confirmDelete'))) {
      setLoading(true);

      try {
        const meetingToCancel = meetings.find(meeting => meeting.id === id);

        if (meetingToCancel && getMeetingRequestEmail(meetingToCancel)) {
          await sendMeetingStatusEmailViaEmailJs({
            kind: 'cancellation',
            recipientEmail: getMeetingRequestEmail(meetingToCancel),
            name: (meetingToCancel as any).requestName || '',
            date: meetingToCancel.date,
            startTime: meetingToCancel.startTime,
            endTime: meetingToCancel.endTime,
            location: meetingToCancel.location || '',
            requesterLocale: (meetingToCancel as any).requesterLocale || 'en',
            sourceId: id,
          });
        }

        const { remove } = await import('firebase/database');
        await remove(ref(database, `meetings/${id}`));
      } catch (err) {
        console.error(err);
        alert(displayLocale === 'ar' ? 'فشل إرسال بريد الإلغاء أو حذف الاجتماع.' : 'Failed to send cancellation email or delete the meeting.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { push, update } = await import('firebase/database');

      const availabilityData = {
        date: availabilityForm.date,
        startTime: availabilityForm.allDay ? '09:00' : availabilityForm.startTime,
        endTime: availabilityForm.allDay ? '20:00' : availabilityForm.endTime,
        reason: availabilityForm.reason || '',
        allDay: availabilityForm.allDay,
        updatedAt: Date.now(),
      };

      if (editingAvailability) {
        await update(ref(database, `availability/${editingAvailability.id}`), availabilityData);
      } else {
        const selectedDates = buildAvailabilityDates();

        if (selectedDates.length === 0) {
          alert(t('calendar.noAvailableDatesSelected'));
          return;
        }

        await Promise.all(
          selectedDates.map(date =>
            push(ref(database, 'availability/'), {
              ...availabilityData,
              date,
            })
          )
        );
      }

      setShowAvailabilityModal(false);
      setEditingAvailability(null);
      resetAvailabilityForm();
    } catch (err) {
      console.error(err);
      alert(t('calendar.saveAvailabilityFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (confirm(t('calendar.removeAvailabilityConfirm'))) {
      try {
        const { remove } = await import('firebase/database');
        await remove(ref(database, `availability/${id}`));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { push, update } = await import('firebase/database');

      const unavailabilityData = {
        date: unavailabilityForm.date,
        startTime: unavailabilityForm.allDay ? '00:00' : unavailabilityForm.startTime,
        endTime: unavailabilityForm.allDay ? '23:59' : unavailabilityForm.endTime,
        reason: unavailabilityForm.reason || '',
        allDay: unavailabilityForm.allDay,
        updatedAt: Date.now(),
      };

      if (editingUnavailability) {
        await update(ref(database, `unavailability/${editingUnavailability.id}`), unavailabilityData);
      } else {
        await push(ref(database, 'unavailability/'), unavailabilityData);
      }

      setShowUnavailabilityModal(false);
      setEditingUnavailability(null);
      resetUnavailabilityForm();
    } catch (err) {
      console.error(err);
      alert(t('calendar.saveUnavailabilityFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleNextGenRegistrationStatus = async (
    registration: NextGenRegistration,
    nextStatus: NextGenRegistrationStatus,
  ) => {
    if (nextGenRegistrationUpdatingId) return;

    const confirmationMessage = nextStatus === 'approved'
      ? (displayLocale === 'ar'
          ? `هل تريد الموافقة على تسجيل ${registration.fullName || registration.userId}؟`
          : `Approve the NextGen registration for ${registration.fullName || registration.userId}?`)
      : (displayLocale === 'ar'
          ? `هل تريد رفض تسجيل ${registration.fullName || registration.userId}؟`
          : `Reject the NextGen registration for ${registration.fullName || registration.userId}?`);

    if (!window.confirm(confirmationMessage)) return;

    setNextGenRegistrationUpdatingId(registration.userId);

    try {
      const reviewedAt = Date.now();
      const reviewedAtISO = new Date(reviewedAt).toISOString();

      await update(ref(database, `nextGenUsers/${registration.userId}`), {
        status: nextStatus,
        reviewedAt,
        reviewedAtISO,
        reviewedBy: 'pastorCalendar',
        updatedAt: reviewedAt,
        updatedAtISO: reviewedAtISO,
      });

      await push(ref(database, 'nextGenActivities/registrationReviewLogs/'), {
        userId: registration.userId,
        fullName: registration.fullName,
        email: registration.email,
        previousStatus: registration.status,
        status: nextStatus,
        reviewedBy: 'pastorCalendar',
        reviewedAt,
        reviewedAtISO,
      });
    } catch (err) {
      console.error('Failed to update NextGen registration status:', err);
      alert(
        displayLocale === 'ar'
          ? 'فشل تحديث حالة تسجيل NextGen.'
          : 'Failed to update the NextGen registration status.',
      );
    } finally {
      setNextGenRegistrationUpdatingId(null);
    }
  };

  const handleNextGenQuestionSelection = async (question: NextGenQuestion, selected: boolean) => {
    setNextGenSelectionLoadingId(question.id);

    try {
      await update(ref(database, `nextGenActivities/qaSessions/${question.id}`), {
        status: selected ? 'selectedForNextGenSession' : 'submittedForPastorReview',
        selectedForNextGenSession: selected,
        selectedAt: selected ? Date.now() : null,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to update NextGen question selection:', err);
      alert(displayLocale === 'ar' ? 'فشل تحديث اختيار السؤال.' : 'Failed to update the question selection.');
    } finally {
      setNextGenSelectionLoadingId(null);
    }
  };

  const handleAiAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMessage = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setAiLoading(true);

    try {
      const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!OPENROUTER_API_KEY) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: 'AI is not configured. Please add VITE_OPENROUTER_API_KEY to your .env file.', timestamp: new Date() }]);
        return;
      }

      const calendarContext = {
        meetings: meetings.map(m => ({
          title: getMeetingDisplayTitle(m),
          date: m.date,
          startTime: m.startTime,
          endTime: m.endTime,
          requesterEmail: getMeetingRequestEmail(m),
          requestReason: getMeetingRequestReason(m),
        })),
        availability: availability.map(a => ({
          id: a.id,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          allDay: a.allDay,
          reason: a.reason,
        })),
        unavailability: unavailability.map(u => ({
          id: u.id,
          date: u.date,
          startTime: u.startTime,
          endTime: u.endTime,
          allDay: u.allDay,
          reason: u.reason,
        })),
        pendingRequests: meetingRequests.filter(r => r.status === 'pending').map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          date: r.date,
          startTime: r.startTime,
          endTime: r.endTime,
          reason: r.reason,
        })),
      };

      const systemPrompt = `You are an AI assistant for a church pastor to manage their calendar.

The database scheduling model is:
- availability/ opens bookable time.
- unavailability/ closes time and overrides availability.
- meetings/ contains confirmed meetings.
- meetingRequests/ contains pending requests.

You can help with:
1. Adding availability - say "I'm available on [date]" or "make [date] available from [time] to [time]"
2. Adding unavailability - say "I'm unavailable on [date]" or "block [date] from [time] to [time]"
3. Accepting meeting requests - say "accept request from [name]" or "accept request #[id]"
4. Rejecting meeting requests - say "reject request from [name]" or "reject request #[id]"
5. Viewing schedule - say "show my schedule" or "what's my calendar look like"

Current calendar context:
${JSON.stringify(calendarContext, null, 2)}

When the user wants to add availability, respond with: ACTION:ADD_AVAILABILITY|date|startTime|endTime|reason
When the user wants to add unavailability, respond with: ACTION:ADD_UNAVAILABILITY|date|startTime|endTime|reason
When the user wants to accept a request, respond with: ACTION:ACCEPT_REQUEST|requestId
When the user wants to reject a request, respond with: ACTION:REJECT_REQUEST|requestId

Otherwise, provide a helpful response about their calendar.`;

      const client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: OPENROUTER_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const apiResponse = await client.chat.completions.create({
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ] as any,
        reasoning: { enabled: true },
      } as any);

      const aiResponse = apiResponse.choices?.[0]?.message?.content || 'I could not process that request.';

      if (aiResponse.startsWith('ACTION:')) {
        const [action, ...params] = aiResponse.split('|');

        if (action === 'ACTION:ADD_AVAILABILITY' && params.length >= 3) {
          const [date, startTime, endTime, reason = ''] = params;
          const { push } = await import('firebase/database');
          await push(ref(database, 'availability/'), {
            date,
            startTime,
            endTime,
            reason,
            allDay: startTime === '09:00' && endTime === '20:00',
            updatedAt: Date.now(),
          });
          setAiMessages(prev => [...prev, { role: 'assistant', content: `✅ Added availability for ${date}${reason ? ` (${reason})` : ''}.`, timestamp: new Date() }]);
        } else if (action === 'ACTION:ADD_UNAVAILABILITY' && params.length >= 3) {
          const [date, startTime, endTime, reason = ''] = params;
          const { push } = await import('firebase/database');
          await push(ref(database, 'unavailability/'), {
            date,
            startTime,
            endTime,
            reason,
            allDay: startTime === '00:00' && endTime === '23:59',
            updatedAt: Date.now(),
          });
          setAiMessages(prev => [...prev, { role: 'assistant', content: `✅ Added unavailability for ${date}${reason ? ` (${reason})` : ''}.`, timestamp: new Date() }]);
        } else if (action === 'ACTION:ACCEPT_REQUEST' && params[0]) {
          const requestId = params[0];
          await handleRequestStatus(requestId, 'accepted');
          setAiMessages(prev => [...prev, { role: 'assistant', content: '✅ Meeting request accepted. A meeting has been created and the EmailJS confirmation was sent.', timestamp: new Date() }]);
        } else if (action === 'ACTION:REJECT_REQUEST' && params[0]) {
          const requestId = params[0];
          await handleRequestStatus(requestId, 'rejected');
          setAiMessages(prev => [...prev, { role: 'assistant', content: '✅ Meeting request rejected. The requester has been notified.', timestamp: new Date() }]);
        } else {
          setAiMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: new Date() }]);
        }
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: new Date() }]);
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRequestStatus = async (id: string, status: 'accepted' | 'rejected') => {
    setLoading(true);

    try {
      const req = meetingRequests.find(r => r.id === id);

      if (!req) {
        alert(t('booking.statusFailed'));
        return;
      }

      if (status === 'rejected') {
        if (req.email) {
          await sendMeetingStatusEmailViaEmailJs({
            kind: 'rejection',
            recipientEmail: req.email,
            name: req.name,
            date: req.date,
            startTime: req.startTime,
            endTime: req.endTime,
            location: '',
            requesterLocale: (req as any).requesterLocale || 'en',
            sourceId: id,
          });
        }

        await update(ref(database, `meetingRequests/${id}`), {
          status,
          rejectionEmailSent: Boolean(req.email),
          rejectionEmailSentUsing: req.email ? 'EmailJS' : null,
          rejectionEmailSentAt: req.email ? Date.now() : null,
          updatedAt: Date.now(),
        });
        return;
      }


      const confirmationTimestamp = Date.now();
      const meetingData: Record<string, any> = {
        title: t('calendar.meetingWithPastor'),
        date: req.date,
        startTime: req.startTime,
        endTime: req.endTime,
        location: '',
        meetLink: '',
        type: 'counseling',
        participantIds: [],
        requestName: req.name,
        requestEmail: req.email,
        requestReason: req.reason || '',
        requesterLocale: (req as any).requesterLocale === 'ar' ? 'ar' : 'en',
        requesterLanguage: (req as any).requesterLanguage || ((req as any).requesterLocale === 'ar' ? 'Arabic' : 'English'),
        sourceRequestId: id,
        acknowledged: true,
        acknowledgedAt: confirmationTimestamp,
        acknowledgedEmail: req.email,
        confirmationSentUsing: 'EmailJS',
        updatedAt: confirmationTimestamp,
      };

      await sendMeetingConfirmationViaEmailJs(meetingData as Meeting);

      await push(ref(database, 'meetings/'), meetingData);

      await update(ref(database, `meetingRequests/${id}`), {
        status: 'accepted',
        confirmationSent: true,
        confirmationSentUsing: 'EmailJS',
        confirmationSentAt: confirmationTimestamp,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      alert(t('booking.statusFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getDateString = (day: Date): string => format(day, 'yyyy-MM-dd');

  const getAvailabilityBlocksForDate = (dateStr: string): Availability[] => {
    return availability.filter(a => a.date === dateStr);
  };

  const getUnavailabilityBlocksForDate = (dateStr: string): Unavailability[] => {
    return unavailability.filter(u => u.date === dateStr);
  };

  const getMeetingsForDate = (dateStr: string): Meeting[] => {
    return meetings.filter(m => m.date === dateStr);
  };

  const getPendingRequestsForDate = (dateStr: string): MeetingRequest[] => {
    return meetingRequests.filter(r => r.date === dateStr && r.status === 'pending');
  };

  const getAvailabilityRange = (block: Availability): { start: number; end: number } => {
    return {
      start: timeToHour(block.startTime || '09:00'),
      end: timeToHour(block.endTime || '20:00'),
    };
  };

  const getUnavailabilityRange = (block: Unavailability): { start: number; end: number } => {
    return {
      start: timeToHour(block.startTime || '00:00'),
      end: timeToHour(block.endTime || '23:59'),
    };
  };

  const isPastorSlotInsideAvailability = (dateStr: string, startHour: number, endHour: number): boolean => {
    return getAvailabilityBlocksForDate(dateStr).some(block => {
      const range = getAvailabilityRange(block);
      return startHour >= range.start && endHour <= range.end;
    });
  };

  const getBlockingUnavailabilityForSlot = (dateStr: string, startHour: number, endHour: number): Unavailability | null => {
    return getUnavailabilityBlocksForDate(dateStr).find(block => {
      const range = getUnavailabilityRange(block);
      return slotOverlaps(startHour, endHour, range.start, range.end);
    }) || null;
  };

  const isPastorSlotBooked = (dateStr: string, startHour: number, endHour: number): boolean => {
    const meetingBooked = getMeetingsForDate(dateStr).some(meeting => {
      if (!meeting.startTime || !meeting.endTime) return false;
      return slotOverlaps(startHour, endHour, timeToHour(meeting.startTime), timeToHour(meeting.endTime));
    });

    const requestBooked = getPendingRequestsForDate(dateStr).some(request => {
      if (!request.startTime || !request.endTime) return false;
      return slotOverlaps(startHour, endHour, timeToHour(request.startTime), timeToHour(request.endTime));
    });

    return meetingBooked || requestBooked;
  };

  const getPastorSlotStatus = (day: Date, startHour: number): 'available' | 'blocked' | 'booked' | 'closed' => {
    const dateStr = getDateString(day);
    const endHour = startHour + SLOT_BLOCK_DURATION;

    if (isPastorSlotBooked(dateStr, startHour, endHour)) return 'booked';
    if (getBlockingUnavailabilityForSlot(dateStr, startHour, endHour)) return 'blocked';
    if (isPastorSlotInsideAvailability(dateStr, startHour, endHour)) return 'available';
    return 'closed';
  };

  const getPastorSlotLabel = (status: 'available' | 'blocked' | 'booked' | 'closed'): string => {
    if (status === 'available') return t('calendar.available');
    if (status === 'blocked') return t('calendar.unavailable');
    if (status === 'booked') return t('booking.booked');
    return t('calendar.noAvailabilityOpened');
  };

  const handleToggleSlotBlock = async (day: Date, startHour: number) => {
    const dateStr = getDateString(day);
    const endHour = startHour + SLOT_BLOCK_DURATION;

    if (isPastorSlotBooked(dateStr, startHour, endHour)) return;
    if (!isPastorSlotInsideAvailability(dateStr, startHour, endHour) && !getBlockingUnavailabilityForSlot(dateStr, startHour, endHour)) return;

    setSlotBlockingLoading(true);

    try {
      const { push, remove } = await import('firebase/database');
      const existingBlock = getBlockingUnavailabilityForSlot(dateStr, startHour, endHour);

      if (!existingBlock) {
        await push(ref(database, 'unavailability/'), {
          date: dateStr,
          startTime: hourToTime(startHour),
          endTime: hourToTime(endHour),
          reason: 'Slot blocked by pastor',
          allDay: false,
          updatedAt: Date.now(),
        });
        return;
      }

      const existingRange = getUnavailabilityRange(existingBlock);
      await remove(ref(database, `unavailability/${existingBlock.id}`));

      if (existingRange.start < startHour) {
        await push(ref(database, 'unavailability/'), {
          date: dateStr,
          startTime: hourToTime(existingRange.start),
          endTime: hourToTime(startHour),
          reason: existingBlock.reason || 'Slot blocked by pastor',
          allDay: false,
          updatedAt: Date.now(),
        });
      }

      if (endHour < existingRange.end) {
        await push(ref(database, 'unavailability/'), {
          date: dateStr,
          startTime: hourToTime(endHour),
          endTime: hourToTime(existingRange.end),
          reason: existingBlock.reason || 'Slot blocked by pastor',
          allDay: false,
          updatedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error(err);
      alert(t('calendar.saveUnavailabilityFailed'));
    } finally {
      setSlotBlockingLoading(false);
    }
  };

  const slotBlockHours = Array.from(
    { length: Math.floor((SLOT_BLOCK_END - SLOT_BLOCK_START) / SLOT_BLOCK_DURATION) },
    (_, index) => SLOT_BLOCK_START + index * SLOT_BLOCK_DURATION
  );

  const getPeopleDevelopmentGroupLabel = (groupId: PeopleDevelopmentGroupId): string => {
    const group = PEOPLE_DEVELOPMENT_GROUPS.find(item => item.id === groupId);
    if (!group) return groupId;
    return displayLocale === 'ar' ? group.labelAr : group.labelEn;
  };

  const getPersonGroup = (person: Participant): PeopleDevelopmentGroupId | '' => {
    return peopleDevelopmentMembers[person.memberKey]?.group || person.peopleGroup || '';
  };

  const getGroupPeople = (groupId: PeopleDevelopmentGroupId): Participant[] => {
    return participants.filter(person => getPersonGroup(person) === groupId);
  };

  const getGroupAssignments = (groupId: PeopleDevelopmentGroupId): PeopleDevelopmentEntry[] => {
    return peopleDevelopmentEntries.filter(entry => entry.group === groupId);
  };

  const getPeopleAssignmentDateKey = (entry: PeopleDevelopmentEntry): string => {
    try {
      const source = entry.date || entry.createdAtISO || (entry.createdAt ? new Date(entry.createdAt).toISOString() : '');
      if (!source) return '';

      const date = source.includes('T') ? new Date(source) : new Date(`${source}T12:00:00`);
      if (Number.isNaN(date.getTime())) return entry.date || '';

      return format(date, 'yyyy-MM-dd');
    } catch {
      return entry.date || '';
    }
  };

  const getPeopleAssignmentsInMonth = (entries: PeopleDevelopmentEntry[], monthDate: Date): PeopleDevelopmentEntry[] => {
    const monthKey = format(monthDate, 'yyyy-MM');
    return entries.filter(entry => getPeopleAssignmentDateKey(entry).startsWith(monthKey));
  };

  const openPeopleAssignmentsPopup = (groupId: PeopleDevelopmentGroupId) => {
    const monthDate = new Date();
    const monthEntries = getPeopleAssignmentsInMonth(getGroupAssignments(groupId), monthDate);
    const firstMonthEntry = monthEntries[0] || null;

    setPeopleAssignmentsPopupGroup(groupId);
    setPeopleAssignmentsPopupMonth(monthDate);
    setPeopleAssignmentsPopupSelectedDate(firstMonthEntry ? getPeopleAssignmentDateKey(firstMonthEntry) : '');
  };

  const closePeopleAssignmentsPopup = () => {
    setPeopleAssignmentsPopupGroup(null);
    setPeopleAssignmentsPopupSelectedDate('');
  };

  const changePeopleAssignmentsPopupMonth = (nextMonth: Date) => {
    const monthEntries = peopleAssignmentsPopupGroup
      ? getPeopleAssignmentsInMonth(getGroupAssignments(peopleAssignmentsPopupGroup), nextMonth)
      : [];
    const firstMonthEntry = monthEntries[0] || null;

    setPeopleAssignmentsPopupMonth(nextMonth);
    setPeopleAssignmentsPopupSelectedDate(firstMonthEntry ? getPeopleAssignmentDateKey(firstMonthEntry) : '');
  };

  const searchedPeople = participants.filter(person => {
    const search = peopleSearchTerm.trim().toLowerCase();
    if (!search) return true;

    return person.firstName.toLowerCase().includes(search) ||
      person.name.toLowerCase().includes(search) ||
      person.identifier.toLowerCase().includes(search);
  });

  const getPersonPersonalNotes = (person: Participant): PeoplePersonalNote[] => {
    const normalizedIdentifier = person.identifier.trim().toLowerCase();

    return peoplePersonalNotes.filter(note =>
      note.memberKey === person.memberKey ||
      (normalizedIdentifier && note.identifier.trim().toLowerCase() === normalizedIdentifier)
    );
  };

  const openPeopleNotePopup = (person: Participant, type: PeoplePersonalNoteType = 'strength') => {
    setSelectedPeopleNotePerson(person);
    setPeopleNoteType(type);
    setPeopleNoteText('');
    setShowPeopleNotePopup(true);
  };

  const closePeopleNotePopup = () => {
    if (peopleNoteSaving) return;
    setShowPeopleNotePopup(false);
    setSelectedPeopleNotePerson(null);
    setPeopleNoteType('strength');
    setPeopleNoteText('');
  };

  const handleSubmitPeoplePersonalNote = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedPeopleNotePerson) return;

    const text = peopleNoteText.trim();
    if (!text) {
      alert(displayLocale === 'ar' ? 'اكتب نص الملاحظة أولاً.' : 'Write the note text first.');
      return;
    }

    setPeopleNoteSaving(true);

    try {
      const createdAt = Date.now();
      const createdAtISO = new Date().toISOString();
      const date = format(new Date(), 'yyyy-MM-dd');
      const assignedGroup = getPersonGroup(selectedPeopleNotePerson);
      const groupLabel = assignedGroup ? getPeopleDevelopmentGroupLabel(assignedGroup) : '';

      await push(ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/personalNotes/`), {
        identifier: selectedPeopleNotePerson.identifier,
        memberKey: selectedPeopleNotePerson.memberKey,
        fullName: selectedPeopleNotePerson.name,
        email: selectedPeopleNotePerson.email,
        group: assignedGroup,
        groupLabel,
        type: peopleNoteType,
        text,
        date,
        createdAt,
        createdAtISO,
        source: 'pastorCalendar',
      });

      setPeopleNoteText('');
      setShowPeopleNotePopup(false);
      setSelectedPeopleNotePerson(null);
      setPeopleNoteType('strength');
    } catch (err) {
      console.error('Failed to save personal people note:', err);
      alert(displayLocale === 'ar' ? 'فشل حفظ الملاحظة الشخصية.' : 'Failed to save the personal note.');
    } finally {
      setPeopleNoteSaving(false);
    }
  };

  const handleAssignPersonToGroup = async (person: Participant, group: PeopleDevelopmentGroupId | '') => {
    const currentGroup = getPersonGroup(person);
    if (currentGroup === group) return;

    setPeopleDevelopmentSavingKey(person.memberKey);

    try {
      const updatedAt = Date.now();
      const updatedAtISO = new Date().toISOString();
      const groupLabel = group ? getPeopleDevelopmentGroupLabel(group) : '';

      const updates: Record<string, any> = {
        [`${PEOPLE_DEVELOPMENT_ROOT}/members/${person.memberKey}`]: {
          memberKey: person.memberKey,
          identifier: person.identifier,
          fullName: person.name,
          email: person.email,
          group,
          groupLabel,
          primaryGift: person.primaryGift || '',
          sourcePath: person.sourcePath || 'form',
          sourceKeys: person.sourceKeys || [],
          updatedAt,
          updatedAtISO,
        },
      };

      (person.sourceKeys || []).forEach(sourceKey => {
        const sourcePath = person.sourcePath || 'form';
        updates[`${sourcePath}/${sourceKey}/peopleDevelopmentGroup`] = group;
        updates[`${sourcePath}/${sourceKey}/peopleDevelopment`] = {
          group,
          groupLabel,
          memberKey: person.memberKey,
          identifier: person.identifier,
          updatedAt,
          updatedAtISO,
        };
        updates[`${sourcePath}/${sourceKey}/fields/peopleDevelopment/group`] = {
          fieldEnglish: 'People Development Group',
          fieldArabic: 'مجموعة نمو الأشخاص',
          value: group,
          label: groupLabel,
          updatedAt,
          updatedAtISO,
        };
      });

      await update(ref(database), updates);
    } catch (err) {
      console.error('Failed to update people development group:', err);
      alert(displayLocale === 'ar' ? 'فشل تحديث مجموعة الشخص.' : 'Failed to update the person group.');
    } finally {
      setPeopleDevelopmentSavingKey(null);
      setDraggedPeopleMemberKey(null);
    }
  };

  const handleDropPersonOnGroup = async (event: React.DragEvent<HTMLElement>, groupId: PeopleDevelopmentGroupId) => {
    event.preventDefault();
    const memberKey = event.dataTransfer.getData('text/plain') || draggedPeopleMemberKey;
    const person = participants.find(item => item.memberKey === memberKey);

    if (person) {
      await handleAssignPersonToGroup(person, groupId);
    }
  };

  const handlePeopleAssignmentFileChange = (groupId: PeopleDevelopmentGroupId, file: File | null) => {
    if (!file) {
      setPeopleAssignmentFiles(previous => ({
        ...previous,
        [groupId]: null,
      }));
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      alert(displayLocale === 'ar' ? 'يمكن رفع ملفات PDF فقط حالياً.' : 'Only PDF files can be attached for now.');
      setPeopleAssignmentFiles(previous => ({
        ...previous,
        [groupId]: null,
      }));
      setPeopleAssignmentFileInputResetKeys(previous => ({
        ...previous,
        [groupId]: (previous[groupId] || 0) + 1,
      }));
      return;
    }

    if (file.size > MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES) {
      alert(
        displayLocale === 'ar'
          ? `حجم ملف PDF يجب ألا يتجاوز ${formatFileSize(MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES)}.`
          : `PDF file size must be ${formatFileSize(MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES)} or less.`,
      );
      setPeopleAssignmentFiles(previous => ({
        ...previous,
        [groupId]: null,
      }));
      setPeopleAssignmentFileInputResetKeys(previous => ({
        ...previous,
        [groupId]: (previous[groupId] || 0) + 1,
      }));
      return;
    }

    setPeopleAssignmentFiles(previous => ({
      ...previous,
      [groupId]: file,
    }));
  };

  const clearPeopleAssignmentFile = (groupId: PeopleDevelopmentGroupId) => {
    setPeopleAssignmentFiles(previous => ({
      ...previous,
      [groupId]: null,
    }));
    setPeopleAssignmentFileInputResetKeys(previous => ({
      ...previous,
      [groupId]: (previous[groupId] || 0) + 1,
    }));
  };

  const getPeopleDevelopmentNotificationRecipients = (groupId: PeopleDevelopmentGroupId): Participant[] => {
    const peopleInGroup = getGroupPeople(groupId);
    const peopleByEmail = new Map<string, Participant>();

    peopleInGroup.forEach(person => {
      const email = String(person.email || '').trim();

      if (!isUsableEmail(email)) return;

      peopleByEmail.set(email.toLowerCase(), {
        ...person,
        email,
      });
    });

    return Array.from(peopleByEmail.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const sendPeopleDevelopmentAssignmentNotificationEmails = async (params: {
    assignmentId: string;
    groupId: PeopleDevelopmentGroupId;
    text: string;
    date: string;
    createdAt: number;
    createdAtISO: string;
    attachments: PeopleDevelopmentAttachment[];
  }): Promise<{ totalCount: number; sentCount: number; failedCount: number }> => {
    const recipients = getPeopleDevelopmentNotificationRecipients(params.groupId);
    const groupLabelEn = getPeopleDevelopmentStaticGroupLabel(params.groupId, 'en');
    const groupLabelAr = getPeopleDevelopmentStaticGroupLabel(params.groupId, 'ar');
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const postedAtLabel = params.createdAt
      ? new Date(params.createdAt).toLocaleString('en-CA', {
          timeZone: 'America/Toronto',
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : params.createdAtISO || params.date;

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const recipientEmail = String(recipient.email || '').trim();
      const recipientName = recipient.name && recipient.name !== 'N/A'
        ? recipient.name
        : recipient.firstName || 'Friend';
      const subject = `LinC People Development Update - ${groupLabelEn} / تحديث نمو الأشخاص - ${groupLabelAr}`;
      const htmlBody = buildPeopleDevelopmentAssignmentNotificationEmailHtml({
        recipientName,
        groupLabelEn,
        groupLabelAr,
        noteText: params.text,
        attachments: params.attachments,
        postedAtLabel,
        appUrl,
      });

      try {
        const response = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: recipientEmail,
            subject,
            fullName: recipientName,
            message_html: htmlBody,
            reply_to: '',
          },
          EMAILJS_PUBLIC_KEY,
        );

        sentCount += 1;

        try {
          await push(ref(database, 'emailJsSendLogs/'), {
            recipientEmail,
            subject,
            fullName: recipientName,
            sentUsing: 'EmailJS',
            serviceId: EMAILJS_SERVICE_ID,
            templateId: EMAILJS_TEMPLATE_ID,
            source: 'peopleDevelopmentAssignmentNotification',
            assignmentId: params.assignmentId,
            group: params.groupId,
            groupLabelEn,
            groupLabelAr,
            attachmentNames: params.attachments.map(attachment => attachment.name),
            sentAt: Date.now(),
            sentAtISO: new Date().toISOString(),
            emailJsResponse: {
              status: response.status,
              text: response.text,
            },
          });
        } catch (logError) {
          console.error('Failed to log People Development notification success:', logError);
        }
      } catch (error) {
        failedCount += 1;
        console.error(`Failed to send People Development assignment notification to ${recipientEmail}:`, error);

        try {
          await push(ref(database, 'emailJsSendLogs/'), {
            recipientEmail,
            subject,
            fullName: recipientName,
            sentUsing: 'EmailJS',
            serviceId: EMAILJS_SERVICE_ID,
            templateId: EMAILJS_TEMPLATE_ID,
            source: 'peopleDevelopmentAssignmentNotification',
            assignmentId: params.assignmentId,
            group: params.groupId,
            groupLabelEn,
            groupLabelAr,
            failed: true,
            errorMessage: error instanceof Error ? error.message : String(error),
            attemptedAt: Date.now(),
            attemptedAtISO: new Date().toISOString(),
          });
        } catch (logError) {
          console.error('Failed to log People Development notification failure:', logError);
        }
      }
    }

    return {
      totalCount: recipients.length,
      sentCount,
      failedCount,
    };
  };

  const handlePostPeopleDevelopmentAssignment = async (groupId: PeopleDevelopmentGroupId) => {
    const text = (peopleAssignmentDrafts[groupId] || '').trim();
    const selectedFile = peopleAssignmentFiles[groupId];

    if (!text && !selectedFile) {
      alert(displayLocale === 'ar' ? 'اكتب نص الملاحظة أو أرفق ملف PDF أولاً.' : 'Write a note or attach a PDF first.');
      return;
    }

    setPeopleDevelopmentPostingGroup(groupId);

    try {
      const createdAt = Date.now();
      const createdAtISO = new Date().toISOString();
      const date = format(new Date(), 'yyyy-MM-dd');
      const groupLabel = getPeopleDevelopmentGroupLabel(groupId);
      const attachments: PeopleDevelopmentAttachment[] = [];

      if (selectedFile) {
        const uploadedAt = Date.now();
        const uploadedAtISO = new Date(uploadedAt).toISOString();
        const base64 = await readFileAsBase64(selectedFile);

        attachments.push({
          name: selectedFile.name,
          type: selectedFile.type || 'application/pdf',
          size: selectedFile.size,
          encoding: 'base64',
          storage: 'realtimeDatabase',
          base64,
          uploadedAt,
          uploadedAtISO,
        });
      }

      const assignmentReference = await push(ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/assignments/`), {
        group: groupId,
        groupLabel,
        text,
        date,
        createdAt,
        createdAtISO,
        attachments,
        hasAttachments: attachments.length > 0,
        source: 'pastorCalendar',
      });

      const notificationResult = await sendPeopleDevelopmentAssignmentNotificationEmails({
        assignmentId: assignmentReference.key || '',
        groupId,
        text,
        date,
        createdAt,
        createdAtISO,
        attachments,
      });

      if (notificationResult.totalCount === 0) {
        alert(
          displayLocale === 'ar'
            ? 'تم حفظ الملاحظة / التكليف، لكن لا يوجد أعضاء في هذه المجموعة لديهم بريد إلكتروني صالح.'
            : 'Note / assignment saved, but no group members with valid email addresses were found.',
        );
      } else if (notificationResult.failedCount > 0) {
        alert(
          displayLocale === 'ar'
            ? `تم حفظ الملاحظة / التكليف. تم إرسال ${notificationResult.sentCount} بريد، وفشل إرسال ${notificationResult.failedCount}.`
            : `Note / assignment saved. ${notificationResult.sentCount} email(s) sent, ${notificationResult.failedCount} failed.`,
        );
      } else {
        alert(
          displayLocale === 'ar'
            ? `تم حفظ الملاحظة / التكليف وإرسال بريد إلى ${notificationResult.sentCount} عضو/أعضاء في المجموعة.`
            : `Note / assignment saved and email notifications sent to ${notificationResult.sentCount} group member(s).`,
        );
      }

      setPeopleAssignmentDrafts(previous => ({
        ...previous,
        [groupId]: '',
      }));
      clearPeopleAssignmentFile(groupId);
    } catch (err) {
      console.error('Failed to post people development assignment:', err);
      alert(displayLocale === 'ar' ? 'فشل حفظ الملاحظة أو التكليف.' : 'Failed to save the note or assignment.');
    } finally {
      setPeopleDevelopmentPostingGroup(null);
    }
  };

  const handleDeletePeopleDevelopmentPost = async (entry: PeopleDevelopmentEntry) => {
    const confirmed = window.confirm(
      displayLocale === 'ar'
        ? 'هل أنت متأكد أنك تريد حذف هذا المنشور بالكامل مع جميع ملفاته؟ لا يمكن التراجع عن هذا الإجراء.'
        : 'Delete this entire post and all of its files? This action cannot be undone.',
    );

    if (!confirmed) return;

    const deletingKey = `post:${entry.id}`;
    setPeopleDevelopmentDeletingKey(deletingKey);

    try {
      await remove(ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/assignments/${entry.id}`));
      alert(displayLocale === 'ar' ? 'تم حذف المنشور.' : 'Post deleted.');
    } catch (err) {
      console.error('Failed to delete People Development post:', err);
      alert(displayLocale === 'ar' ? 'فشل حذف المنشور.' : 'Failed to delete the post.');
    } finally {
      setPeopleDevelopmentDeletingKey(null);
    }
  };

  const handleDeletePeopleDevelopmentAttachment = async (
    entry: PeopleDevelopmentEntry,
    attachmentIndex: number,
  ) => {
    const attachment = entry.attachments[attachmentIndex];
    if (!attachment) return;

    const confirmed = window.confirm(
      displayLocale === 'ar'
        ? `هل تريد إزالة الملف "${attachment.name}" من هذا المنشور؟`
        : `Remove the file "${attachment.name}" from this post?`,
    );

    if (!confirmed) return;

    const deletingKey = `attachment:${entry.id}:${attachmentIndex}`;
    setPeopleDevelopmentDeletingKey(deletingKey);

    try {
      const remainingAttachments = entry.attachments.filter((_, index) => index !== attachmentIndex);
      const assignmentRef = ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/assignments/${entry.id}`);

      if (!entry.text.trim() && remainingAttachments.length === 0) {
        await remove(assignmentRef);
      } else {
        const updatedAt = Date.now();
        await update(assignmentRef, {
          attachments: remainingAttachments,
          hasAttachments: remainingAttachments.length > 0,
          updatedAt,
          updatedAtISO: new Date(updatedAt).toISOString(),
        });
      }

      alert(displayLocale === 'ar' ? 'تمت إزالة الملف.' : 'File removed.');
    } catch (err) {
      console.error('Failed to remove People Development attachment:', err);
      alert(displayLocale === 'ar' ? 'فشل إزالة الملف.' : 'Failed to remove the file.');
    } finally {
      setPeopleDevelopmentDeletingKey(null);
    }
  };

  const handleAddSelectedPersonToGroup = async (groupId: PeopleDevelopmentGroupId) => {
    const selectedMemberKey = peopleGroupSelectDrafts[groupId];
    const person = participants.find(item => item.memberKey === selectedMemberKey);

    if (!person) {
      alert(displayLocale === 'ar' ? 'اختر شخصاً أولاً.' : 'Select a person first.');
      return;
    }

    await handleAssignPersonToGroup(person, groupId);

    setPeopleGroupSelectDrafts(previous => ({
      ...previous,
      [groupId]: '',
    }));
  };

  const activePeopleAssignmentsPopupGroup = peopleAssignmentsPopupGroup;
  const activePeopleAssignmentsPopupGroupConfig = activePeopleAssignmentsPopupGroup
    ? PEOPLE_DEVELOPMENT_GROUPS.find(group => group.id === activePeopleAssignmentsPopupGroup) || null
    : null;
  const activePeopleAssignmentsPopupEntries = activePeopleAssignmentsPopupGroup
    ? getGroupAssignments(activePeopleAssignmentsPopupGroup)
    : [];
  const peopleAssignmentsPopupMonthDays = eachDayOfInterval({
    start: startOfMonth(peopleAssignmentsPopupMonth),
    end: endOfMonth(peopleAssignmentsPopupMonth),
  });
  const peopleAssignmentsPopupStartPadding = startOfMonth(peopleAssignmentsPopupMonth).getDay();
  const peopleAssignmentsPopupEntriesByDate = activePeopleAssignmentsPopupEntries.reduce<Record<string, PeopleDevelopmentEntry[]>>((accumulator, entry) => {
    const dateKey = getPeopleAssignmentDateKey(entry);
    if (!dateKey) return accumulator;

    accumulator[dateKey] = [...(accumulator[dateKey] || []), entry];
    return accumulator;
  }, {});
  const selectedPeopleAssignmentsPopupEntries = peopleAssignmentsPopupSelectedDate
    ? peopleAssignmentsPopupEntriesByDate[peopleAssignmentsPopupSelectedDate] || []
    : [];
  const peopleAssignmentsPopupMonthLabel = format(peopleAssignmentsPopupMonth, 'MMMM yyyy', { locale: dateLocale });
  const peopleAssignmentsPopupSelectedDateLabel = peopleAssignmentsPopupSelectedDate
    ? format(new Date(`${peopleAssignmentsPopupSelectedDate}T12:00:00`), 'EEEE, MMMM d, yyyy', { locale: dateLocale })
    : '';
  const peopleAssignmentsWeekdayLabels = displayLocale === 'ar'
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedCount = selectedParticipants.length;
  const selectedNames = participants
    .filter(p => selectedParticipants.includes(p.id))
    .map(p => p.name);

  const availabilityDateCount = buildAvailabilityDates().length;

  const nextGenRegistrationEmailCounts = nextGenRegistrations.reduce<Record<string, number>>((counts, registration) => {
    const normalizedEmail = registration.email.trim().toLowerCase();
    if (normalizedEmail) counts[normalizedEmail] = (counts[normalizedEmail] || 0) + 1;
    return counts;
  }, {});

  const nextGenRegistrationNameCounts = nextGenRegistrations.reduce<Record<string, number>>((counts, registration) => {
    const normalizedName = normalizeDuplicateIdentityValue(registration.fullName);
    if (normalizedName) counts[normalizedName] = (counts[normalizedName] || 0) + 1;
    return counts;
  }, {});

  const nextGenRegistrationHasDuplicate = (registration: NextGenRegistration): boolean => {
    const normalizedEmail = registration.email.trim().toLowerCase();
    const normalizedName = normalizeDuplicateIdentityValue(registration.fullName);

    return Boolean(
      (normalizedEmail && nextGenRegistrationEmailCounts[normalizedEmail] > 1) ||
      (normalizedName && nextGenRegistrationNameCounts[normalizedName] > 1)
    );
  };

  const pendingNextGenRegistrations = nextGenRegistrations.filter(registration => registration.status === 'pending');
  const approvedNextGenRegistrations = nextGenRegistrations.filter(registration => registration.status === 'approved');
  const rejectedNextGenRegistrations = nextGenRegistrations.filter(registration => registration.status === 'rejected');
  const duplicateNextGenRegistrations = nextGenRegistrations.filter(nextGenRegistrationHasDuplicate);
  const normalizedNextGenRegistrationSearch = nextGenRegistrationSearchTerm.trim().toLowerCase();

  const visibleNextGenRegistrations = nextGenRegistrations
    .filter(registration => {
      if (nextGenRegistrationStatusFilter !== 'all' && registration.status !== nextGenRegistrationStatusFilter) {
        return false;
      }

      if (!normalizedNextGenRegistrationSearch) return true;

      return [registration.userId, registration.fullName, registration.email, registration.status]
        .some(value => String(value || '').toLowerCase().includes(normalizedNextGenRegistrationSearch));
    })
    .sort((a, b) => {
      const duplicateDifference = Number(nextGenRegistrationHasDuplicate(b)) - Number(nextGenRegistrationHasDuplicate(a));
      if (duplicateDifference !== 0) return duplicateDifference;

      const statusOrder: Record<NextGenRegistrationStatus, number> = {
        pending: 0,
        approved: 1,
        rejected: 2,
      };
      const statusDifference = statusOrder[a.status] - statusOrder[b.status];
      if (statusDifference !== 0) return statusDifference;

      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return a.userId.localeCompare(b.userId);
    });

  const rankedNextGenQuestions = nextGenQuestions;
  const selectedNextGenQuestions = nextGenQuestions.filter(question =>
    question.status === 'selectedForNextGenSession' || Boolean((question as any).selectedForNextGenSession)
  );
  const selectableNextGenQuestions = rankedNextGenQuestions.filter(question =>
    question.status !== 'selectedForNextGenSession' && !Boolean((question as any).selectedForNextGenSession)
  );

  const peopleNotesTitle = displayLocale === 'ar' ? 'نمو الأشخاص' : 'People Development';
  const peopleNotesSubtitle = displayLocale === 'ar'
    ? 'مجموعات الخدمة، التكليفات، وتوزيع الأشخاص'
    : 'Service groups, assignments, and people placement';

  const selectedSlotDateStr = selectedSlotDay ? getDateString(selectedSlotDay) : '';
  const selectedDayAvailabilityBlocks = selectedSlotDateStr ? getAvailabilityBlocksForDate(selectedSlotDateStr) : [];
  const selectedDayMeetings = selectedSlotDateStr ? getMeetingsForDate(selectedSlotDateStr) : [];
  const selectedDayOpenSlotHours = selectedSlotDay
    ? slotBlockHours.filter(hour => getPastorSlotStatus(selectedSlotDay, hour) === 'available')
    : [];

  return (
    <>
      <style>{`
        .pastor-calendar-ui,
        .pastor-calendar-ui * {
          font-family: Arial, sans-serif !important;
          font-weight: 700 !important;
        }

        .pastor-calendar-ui {
          background: #fbf7f2;
          color: #2b1717;
        }

        .pastor-calendar-ui button,
        .pastor-calendar-ui input,
        .pastor-calendar-ui select,
        .pastor-calendar-ui textarea {
          font-size: 16px !important;
          line-height: 1.35 !important;
        }

        .pastor-calendar-ui .text-\[9px\],
        .pastor-calendar-ui .text-\[10px\],
        .pastor-calendar-ui .text-\[11px\],
        .pastor-calendar-ui .text-xs,
        .pastor-calendar-ui .text-sm {
          font-size: 16px !important;
          line-height: 1.35 !important;
        }

        .pastor-calendar-ui .text-lg {
          font-size: 20px !important;
          line-height: 1.35 !important;
        }

        .pastor-calendar-ui .text-xl {
          font-size: 24px !important;
          line-height: 1.25 !important;
        }

        .pastor-calendar-ui .text-2xl {
          font-size: 30px !important;
          line-height: 1.15 !important;
        }

        .pastor-calendar-ui .text-3xl {
          font-size: 34px !important;
          line-height: 1.1 !important;
        }

        .pastor-calendar-ui .pastor-dashboard-card {
          background: #fffdf9;
          border-color: #ead9d0;
          box-shadow: 0 16px 40px rgba(80, 24, 24, 0.06);
        }

        .pastor-calendar-ui .pastor-main-button {
          min-height: 48px;
          border-radius: 18px;
        }

        .pastor-calendar-ui .pastor-calendar-shell {
          background: #fffdf9;
          border-color: #ead9d0;
          box-shadow: 0 18px 48px rgba(80, 24, 24, 0.07);
        }

        .pastor-calendar-ui .pastor-day-card {
          min-height: 118px;
          border-radius: 28px;
          box-shadow: 0 8px 20px rgba(80, 24, 24, 0.04);
        }

        .pastor-calendar-ui .pastor-day-number {
          font-size: 24px !important;
          line-height: 1 !important;
        }

        .pastor-calendar-ui .pastor-popup-panel {
          background: #fffdf9;
          border-color: #ead9d0;
          color: #2b1717;
        }

        .pastor-calendar-ui .pastor-popup-header {
          background: #7a1717;
        }

        @media (max-width: 640px) {
          .pastor-calendar-ui {
            padding-left: 12px;
            padding-right: 12px;
          }

          .pastor-calendar-ui .pastor-calendar-shell {
            padding: 16px !important;
            border-radius: 30px !important;
          }

          .pastor-calendar-ui .pastor-calendar-title {
            text-align: center;
          }

          .pastor-calendar-ui .pastor-calendar-legend {
            display: none !important;
          }

          .pastor-calendar-ui .pastor-weekday-label {
            font-size: 16px !important;
            letter-spacing: 0.08em !important;
          }

          .pastor-calendar-ui .pastor-days-grid {
            gap: 10px !important;
          }

          .pastor-calendar-ui .pastor-day-card {
            min-height: 0 !important;
            aspect-ratio: 1 / 1;
            border-radius: 9999px !important;
            padding: 6px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .pastor-calendar-ui .pastor-day-number {
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            background: transparent !important;
            font-size: 22px !important;
          }

          .pastor-calendar-ui .pastor-day-status,
          .pastor-calendar-ui .pastor-day-detail,
          .pastor-calendar-ui .pastor-day-badge {
            display: none !important;
          }

          .pastor-calendar-ui .pastor-popup-panel {
            max-height: 92vh !important;
            border-radius: 28px !important;
          }

          .pastor-calendar-ui .pastor-popup-body {
            padding: 16px !important;
          }

          .pastor-calendar-ui .pastor-slot-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
        }
      `}</style>
      <div className="pastor-calendar-ui min-h-screen space-y-8 px-4 py-6" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }} dir={dir}>
      <PageTitle
        title={t('calendar.title')}
        subtitle={displayLocale === 'ar' ? 'إدارة الاجتماعات والإتاحة وطلبات الحجز وإشعارات المشاركين' : 'Manage meetings, availability, booking requests, and participant notifications'}
        icon={<CalendarIcon size={22} />}
      />

      <div className="pastor-dashboard-card flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-3xl border gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">{format(currentDate, 'MMMM yyyy', { locale: dateLocale })}</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {t('calendar.availabilityOpensBooking')}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-stone-50 rounded-xl p-1 border border-gray-200">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={20} /></button>
          </div>
          <button
            type="button"
            onClick={() => setShowPeopleDevelopment(!showPeopleDevelopment)}
            className={`pastor-main-button flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors border ${
              showPeopleDevelopment
                ? 'bg-[#7a1717] text-white border-[#7a1717]'
                : 'bg-[#f8eeee] hover:bg-[#efd8d8] text-[#7a1717] border-[#d8aaaa]'
            }`}
            title={peopleNotesSubtitle}
          >
            <Users size={16} />
            <span>{peopleNotesTitle}</span>
            {participants.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                showPeopleDevelopment ? 'bg-white/20 text-white' : 'bg-white text-[#7a1717]'
              }`}>
                {participants.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowNextGenRegistrations(!showNextGenRegistrations)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors text-sm border ${
              showNextGenRegistrations
                ? 'bg-indigo-700 text-white border-indigo-700'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <UserPlus size={16} />
            <span>{displayLocale === 'ar' ? 'تسجيلات NextGen' : 'NextGen Registrations'}</span>
            {pendingNextGenRegistrations.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                showNextGenRegistrations ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {pendingNextGenRegistrations.length}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${showNextGenRegistrations ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowNextGenSurveyResults(!showNextGenSurveyResults)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors text-sm border ${
              showNextGenSurveyResults
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}
          >
            <BarChart3 size={16} />
            <span>{displayLocale === 'ar' ? 'نتائج استبيان NextGen' : 'NextGen Survey Results'}</span>
            {nextGenSurveyResults.totalResponses > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                showNextGenSurveyResults ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {nextGenSurveyResults.totalResponses}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${showNextGenSurveyResults ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowNextGenQuestions(!showNextGenQuestions)}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-5 py-3 rounded-xl font-bold transition-colors text-sm border border-amber-200"
          >
            <Trophy size={16} />
            <span>{displayLocale === 'ar' ? 'أسئلة NextGen' : 'NextGen Questions'}</span>
            {nextGenQuestions.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {nextGenQuestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setIsAddOpen(true); setEditingMeeting(null); setSelectedParticipants([]); setEmailSent(false); }}
            className="pastor-main-button flex items-center gap-2 bg-[#7a1717] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#7a1717]/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            <span>{t('calendar.addEvent')}</span>
          </button>
          <button
            onClick={() => {
              setShowAvailabilityModal(true);
              setEditingAvailability(null);
              resetAvailabilityForm();
            }}
            className="pastor-main-button flex items-center gap-2 bg-[#e8faee] hover:bg-[#dcf7e5] text-[#165d30] px-5 py-3 rounded-xl font-bold transition-colors border border-[#8ad0a1]"
          >
            <CheckCircle size={16} />
            <span>{t('calendar.markAvailable')}</span>
          </button>
          <button
            onClick={() => {
              setShowUnavailabilityModal(true);
              setEditingUnavailability(null);
              resetUnavailabilityForm();
            }}
            className="pastor-main-button flex items-center gap-2 bg-[#fff1f1] hover:bg-[#f8dddd] text-[#7a1717] px-5 py-3 rounded-xl font-bold transition-colors border border-[#d8aaaa]"
          >
            <XCircle size={16} />
            <span>{t('calendar.markUnavailable')}</span>
          </button>
          <button
            onClick={() => {
              setShowAiAssistant(!showAiAssistant);
              if (!showAiAssistant && aiMessages.length === 0) {
                const pendingCount = meetingRequests.filter(r => r.status === 'pending').length;
                setAiMessages([
                  {
                    role: 'assistant',
                    content: `Hi Pastor! I'm your AI calendar assistant. You have ${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}.\n\nI can help you:\n• Add availability\n• Add unavailability\n• Accept/reject meeting requests\n• View your schedule\n\nWhat would you like to do?`,
                    timestamp: new Date(),
                  },
                ]);
              }
            }}
            className="pastor-main-button flex items-center gap-2 bg-[#f8eeee] hover:bg-[#efd8d8] text-[#7a1717] px-5 py-3 rounded-xl font-bold transition-colors border border-[#d8aaaa]"
          >
            <Bot size={16} />
            <span>{t('calendar.aiAssistant')}</span>
          </button>
        </div>
      </div>

      {showPeopleDevelopment && (
        <section className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-[#ead9d0] space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-[#7a1717] flex items-center gap-2">
                <Users size={20} />
                {displayLocale === 'ar' ? 'مجموعات نمو الأشخاص' : 'People Development Groups'}
              </h3>
              <p className="text-gray-500 mt-1">
                {displayLocale === 'ar'
                  ? 'اسحب الأشخاص إلى مجموعة، أو استخدم أزرار الإضافة والتغيير. يتم حفظ المجموعة والتكليفات في Firebase.'
                  : 'Drag people into a group, or use the compact add/change controls. Group placement and assignments are saved to Firebase.'}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8eeee] text-[#7a1717] border border-[#d8aaaa] px-4 py-3 font-black">
              {participants.length} {displayLocale === 'ar' ? 'شخص' : 'people'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PEOPLE_DEVELOPMENT_GROUPS.map(group => {
              const groupPeople = getGroupPeople(group.id);

              return (
                <button
                  key={group.id}
                  type="button"
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => handleDropPersonOnGroup(event, group.id)}
                  className={`aspect-square min-h-[138px] sm:min-h-[170px] rounded-3xl border-2 p-4 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${group.cardClass}`}
                >
                  <div className="flex h-full flex-col justify-between gap-3">
                    <div>
                      <div className="text-2xl sm:text-3xl font-black leading-none">
                        {displayLocale === 'ar' ? group.labelAr : group.labelEn}
                      </div>
                      <div className="mt-2 text-sm leading-snug opacity-80">
                        {displayLocale === 'ar' ? group.descriptionAr : group.descriptionEn}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-sm font-black ${group.badgeClass}`}>
                        {groupPeople.length} {displayLocale === 'ar' ? 'أشخاص' : 'people'}
                      </span>
                      {draggedPeopleMemberKey && (
                        <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-black">
                          {displayLocale === 'ar' ? 'أفلت هنا' : 'Drop here'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PEOPLE_DEVELOPMENT_GROUPS.map(group => {
                const groupPeople = getGroupPeople(group.id);
                const groupAssignments = getGroupAssignments(group.id);
                const latestGroupAssignment = groupAssignments[0] || null;
                const selectedMemberKey = peopleGroupSelectDrafts[group.id];

                return (
                  <div
                    key={`panel-${group.id}`}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => handleDropPersonOnGroup(event, group.id)}
                    className={`rounded-3xl border-2 p-4 space-y-4 ${group.softClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xl font-black">
                          {displayLocale === 'ar' ? group.labelAr : group.labelEn}
                        </h4>
                        <p className="mt-1 text-sm opacity-80">
                          {displayLocale === 'ar' ? 'ملاحظات وتكليفات هذه المجموعة' : 'Notes & Assignments for this group'}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-sm font-black ${group.badgeClass}`}>
                        {groupPeople.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={peopleAssignmentDrafts[group.id]}
                        onChange={event => setPeopleAssignmentDrafts(previous => ({ ...previous, [group.id]: event.target.value }))}
                        placeholder={displayLocale === 'ar' ? 'اكتب ملاحظة أو تكليف لهذه المجموعة...' : 'Write a note or assignment for this group...'}
                        className="w-full min-h-[96px] rounded-2xl border border-white/70 bg-white px-4 py-3 text-[#242424] outline-none focus:ring-2 focus:ring-[#7a1717]/20"
                      />

                      <label className="block rounded-2xl border border-dashed border-white/80 bg-white/70 p-3 text-sm font-black text-[#242424]">
                        <span className="block opacity-75">
                          {displayLocale === 'ar' ? 'إرفاق ملف PDF صغير اختياري' : 'Optional small PDF attachment'}
                        </span>
                        <span className="mt-1 block text-xs font-bold opacity-60">
                          {displayLocale === 'ar'
                            ? `الحد الأقصى ${formatFileSize(MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES)} — سيتم حفظه كـ Base64 في Realtime Database.`
                            : `Max ${formatFileSize(MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES)} — saved as Base64 in Realtime Database.`}
                        </span>
                        <input
                          key={`${group.id}-assignment-file-${peopleAssignmentFileInputResetKeys[group.id]}`}
                          type="file"
                          accept="application/pdf,.pdf"
                          disabled={peopleDevelopmentPostingGroup === group.id}
                          onChange={event => handlePeopleAssignmentFileChange(group.id, event.target.files?.[0] || null)}
                          className="mt-3 block w-full text-sm font-bold text-[#242424] file:me-3 file:rounded-xl file:border-0 file:bg-[#f8eeee] file:px-3 file:py-2 file:font-black file:text-[#7a1717] hover:file:bg-[#efd8d8]"
                        />
                      </label>

                      {peopleAssignmentFiles[group.id] && (
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-sm font-black text-[#242424] border border-white/80">
                          <div className="min-w-0">
                            <div className="truncate">{peopleAssignmentFiles[group.id]?.name}</div>
                            <div className="text-xs opacity-60">
                              {formatFileSize(peopleAssignmentFiles[group.id]?.size || 0)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => clearPeopleAssignmentFile(group.id)}
                            className="shrink-0 rounded-full bg-[#f8eeee] p-1.5 text-[#7a1717] hover:bg-[#efd8d8] transition-colors"
                            title={displayLocale === 'ar' ? 'إزالة الملف' : 'Remove file'}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePostPeopleDevelopmentAssignment(group.id)}
                        disabled={peopleDevelopmentPostingGroup === group.id}
                        className={`w-full rounded-2xl px-4 py-3 font-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${group.buttonClass}`}
                      >
                        {peopleDevelopmentPostingGroup === group.id
                          ? (displayLocale === 'ar' ? 'جار الحفظ والإرسال...' : 'Posting & emailing...')
                          : (displayLocale === 'ar' ? 'نشر وإرسال للمجموعة' : 'Post & Email Group')}
                      </button>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <select
                        value={selectedMemberKey}
                        onChange={event => setPeopleGroupSelectDrafts(previous => ({ ...previous, [group.id]: event.target.value }))}
                        className="min-w-0 rounded-2xl border border-white/70 bg-white px-3 py-3 text-[#242424] outline-none focus:ring-2 focus:ring-[#7a1717]/20"
                      >
                        <option value="">{displayLocale === 'ar' ? 'اختر شخصاً' : 'Select person'}</option>
                        {participants.map(person => (
                          <option key={`${group.id}-${person.memberKey}`} value={person.memberKey}>
                            {person.name} {getPersonGroup(person) ? `(${getPeopleDevelopmentGroupLabel(getPersonGroup(person) as PeopleDevelopmentGroupId)})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAddSelectedPersonToGroup(group.id)}
                        className={`rounded-2xl px-4 py-3 font-black ${group.buttonClass}`}
                        title={displayLocale === 'ar' ? 'إضافة للمجموعة' : 'Add to group'}
                      >
                        <UserPlus size={18} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-black uppercase tracking-widest opacity-70">
                        {displayLocale === 'ar' ? 'الأشخاص' : 'People'}
                      </div>
                      {groupPeople.length === 0 ? (
                        <div className="rounded-2xl bg-white/70 p-3 text-sm font-black opacity-70">
                          {displayLocale === 'ar' ? 'لا يوجد أشخاص في هذه المجموعة.' : 'No people assigned to this group.'}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {groupPeople.map(person => (
                            <div
                              key={`chip-${group.id}-${person.memberKey}`}
                              draggable
                              onDragStart={event => {
                                setDraggedPeopleMemberKey(person.memberKey);
                                event.dataTransfer.setData('text/plain', person.memberKey);
                              }}
                              onDragEnd={() => setDraggedPeopleMemberKey(null)}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-black shadow-sm border border-white/80"
                              title={person.identifier || person.email}
                            >
                              <span>{person.name}</span>
                              <button
                                type="button"
                                onClick={() => openPeopleNotePopup(person)}
                                className="rounded-full bg-[#f8eeee] p-1 text-[#7a1717] hover:bg-[#efd8d8] transition-colors"
                                title={displayLocale === 'ar' ? 'إضافة ملاحظة شخصية' : 'Add personal note'}
                              >
                                <MessageSquare size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-black uppercase tracking-widest opacity-70">
                        {displayLocale === 'ar' ? 'الملاحظات والتكليفات السابقة' : 'Previous Notes & Assignments'}
                      </div>
                      <button
                        type="button"
                        onClick={() => openPeopleAssignmentsPopup(group.id)}
                        className="w-full rounded-2xl border-2 border-white/80 bg-white/80 p-3 text-start transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <CalendarIcon size={18} className="shrink-0 text-[#7a1717]" />
                            <div className="min-w-0">
                              <div className="font-black text-[#7a1717]">
                                {displayLocale === 'ar' ? 'عرض التقويم الشهري' : 'Open monthly calendar'}
                              </div>
                              <div className="text-xs font-bold opacity-65">
                                {displayLocale === 'ar'
                                  ? 'افتح نافذة مستقلة لعرض الأيام التي تحتوي على منشورات.'
                                  : 'Open a focused popup with dots on days that have posts.'}
                              </div>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-black ${group.badgeClass}`}>
                            {groupAssignments.length}
                          </span>
                        </div>
                      </button>

                      {latestGroupAssignment ? (
                        <div className="rounded-2xl bg-white/70 p-3 text-sm font-black opacity-85">
                          <div className="flex flex-wrap items-center gap-2 text-xs opacity-65">
                            <Clock size={13} />
                            <span>{latestGroupAssignment.date || latestGroupAssignment.createdAtISO}</span>
                            {latestGroupAssignment.attachments.length > 0 && (
                              <span>
                                • {latestGroupAssignment.attachments.length} {displayLocale === 'ar' ? 'ملف' : 'file(s)'}
                              </span>
                            )}
                          </div>
                          {latestGroupAssignment.text && (
                            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[#242424]">{latestGroupAssignment.text}</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-white/70 p-3 text-sm font-black opacity-70">
                          {displayLocale === 'ar' ? 'لا توجد ملاحظات أو تكليفات بعد.' : 'No notes or assignments yet.'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="rounded-3xl border-2 border-[#ead9d0] bg-[#fffdf9] p-4 space-y-4">
              <div>
                <h4 className="text-xl font-black text-[#7a1717] flex items-center gap-2">
                  <Users size={19} />
                  {displayLocale === 'ar' ? 'قائمة الأشخاص' : 'People List'}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {displayLocale === 'ar'
                    ? 'ابحث بالاسم الأول، ثم اسحب أو غيّر المجموعة من القائمة.'
                    : 'Search by first name, then drag or change the group from the list.'}
                </p>
              </div>

              <div className="relative">
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={peopleSearchTerm}
                  onChange={event => setPeopleSearchTerm(event.target.value)}
                  placeholder={displayLocale === 'ar' ? 'بحث بالاسم الأول...' : 'Search first name...'}
                  className="w-full rounded-2xl border border-[#ead9d0] bg-white py-3 ps-11 pe-4 text-[#242424] outline-none focus:ring-2 focus:ring-[#7a1717]/20"
                />
              </div>

              <div className="space-y-2 max-h-[620px] overflow-y-auto pe-1">
                {searchedPeople.length === 0 ? (
                  <div className="rounded-2xl bg-stone-50 p-4 text-gray-500 font-black">
                    {displayLocale === 'ar' ? 'لا توجد نتائج.' : 'No people found.'}
                  </div>
                ) : searchedPeople.map(person => {
                  const assignedGroup = getPersonGroup(person);
                  const savingThisPerson = peopleDevelopmentSavingKey === person.memberKey;
                  const personNotes = getPersonPersonalNotes(person);
                  const latestPersonNotes = personNotes.slice(0, 2);
                  const strengthCount = personNotes.filter(note => note.type === 'strength').length;
                  const weaknessCount = personNotes.filter(note => note.type === 'weakness').length;

                  return (
                    <div
                      key={`person-${person.memberKey}`}
                      draggable
                      onDragStart={event => {
                        setDraggedPeopleMemberKey(person.memberKey);
                        event.dataTransfer.setData('text/plain', person.memberKey);
                      }}
                      onDragEnd={() => setDraggedPeopleMemberKey(null)}
                      className="rounded-2xl border border-[#ead9d0] bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[#242424] font-black">{person.name}</div>
                          <div className="truncate text-sm text-gray-500">{person.identifier || person.email}</div>
                          {person.primaryGift && (
                            <div className="mt-1 text-xs text-gray-400">
                              {person.primaryGift}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-[#f8eeee] px-2 py-1 text-xs text-[#7a1717] font-black border border-[#d8aaaa]">
                          {assignedGroup ? getPeopleDevelopmentGroupLabel(assignedGroup) : (displayLocale === 'ar' ? 'غير محدد' : 'Unassigned')}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <select
                          value={assignedGroup}
                          onChange={event => handleAssignPersonToGroup(person, event.target.value as PeopleDevelopmentGroupId | '')}
                          disabled={savingThisPerson}
                          className="min-w-0 rounded-xl border border-[#ead9d0] bg-stone-50 px-3 py-2 text-[#242424] outline-none focus:ring-2 focus:ring-[#7a1717]/20 disabled:opacity-60"
                        >
                          <option value="">{displayLocale === 'ar' ? 'بدون مجموعة' : 'Unassigned'}</option>
                          {PEOPLE_DEVELOPMENT_GROUPS.map(group => (
                            <option key={`person-select-${person.memberKey}-${group.id}`} value={group.id}>
                              {displayLocale === 'ar' ? group.labelAr : group.labelEn}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={savingThisPerson}
                          onClick={() => assignedGroup ? handleAssignPersonToGroup(person, '') : handleAssignPersonToGroup(person, 'helpers')}
                          className="rounded-xl bg-[#7a1717] px-3 py-2 text-white font-black disabled:opacity-60"
                        >
                          {savingThisPerson ? '...' : assignedGroup ? <X size={16} /> : <Plus size={16} />}
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openPeopleNotePopup(person, 'strength')}
                          className="flex items-center justify-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-green-700 font-black border border-green-100 hover:bg-green-100 transition-colors"
                        >
                          <MessageSquare size={15} />
                          {displayLocale === 'ar' ? `قوة (${strengthCount})` : `Strength (${strengthCount})`}
                        </button>
                        <button
                          type="button"
                          onClick={() => openPeopleNotePopup(person, 'weakness')}
                          className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-red-700 font-black border border-red-100 hover:bg-red-100 transition-colors"
                        >
                          <MessageSquare size={15} />
                          {displayLocale === 'ar' ? `ضعف (${weaknessCount})` : `Weakness (${weaknessCount})`}
                        </button>
                      </div>

                      {latestPersonNotes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {latestPersonNotes.map(note => (
                            <div
                              key={`latest-note-${person.memberKey}-${note.id}`}
                              className={`rounded-xl border px-3 py-2 ${
                                note.type === 'strength'
                                  ? 'bg-green-50 border-green-100 text-green-800'
                                  : 'bg-red-50 border-red-100 text-red-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-xs font-black">
                                <span>{note.type === 'strength'
                                  ? (displayLocale === 'ar' ? 'قوة' : 'Strength')
                                  : (displayLocale === 'ar' ? 'ضعف' : 'Weakness')}
                                </span>
                                <span>{note.date}</span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-[#242424]">{note.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>
      )}

      {meetingRequests.filter(r => r.status === 'pending').length > 0 && (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-amber-700">
              <Hourglass size={18} />
              {t('requests.title')}
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {meetingRequests.filter(r => r.status === 'pending').length}
              </span>
            </h3>
            <button onClick={() => setShowRequests(!showRequests)} className="text-xs text-[#7a1717] font-bold hover:underline">
              {showRequests ? t('requests.hide') : t('requests.viewAll')}
            </button>
          </div>
          {showRequests && (
            <div className="space-y-3">
              {meetingRequests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 rounded-xl border border-gray-100 gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100">
                      <User size={18} className="text-[#7a1717]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{req.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail size={11} /> {req.email}</span>
                        <span className="flex items-center gap-1"><CalendarIcon size={11} /> {req.date}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {timeRangeToLabel(req.startTime, req.endTime, displayLocale)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 italic">{req.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button onClick={() => handleRequestStatus(req.id!, 'accepted')} className="flex items-center gap-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                      <CheckCircle size={14} />
                      {t('requests.accept')}
                    </button>
                    <button onClick={() => handleRequestStatus(req.id!, 'rejected')} className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                      <XCircle size={14} />
                      {t('requests.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showNextGenRegistrations && (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-200">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5 mb-5">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-700">
                <UserPlus size={18} />
                {displayLocale === 'ar' ? 'تسجيلات NextGen' : 'NextGen Registrations'}
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {nextGenRegistrations.length}
                </span>
              </h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                {displayLocale === 'ar'
                  ? 'جميع التسجيلات ظاهرة هنا، بما في ذلك الموافق عليها والمرفوضة، للمساعدة في اكتشاف التسجيل المتكرر.'
                  : 'Every registration remains visible here, including approved and rejected accounts, to help detect repeat registrations.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 font-bold">
                {displayLocale === 'ar'
                  ? `قيد الانتظار: ${pendingNextGenRegistrations.length}`
                  : `Pending: ${pendingNextGenRegistrations.length}`}
              </span>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 font-bold">
                {displayLocale === 'ar'
                  ? `موافق عليها: ${approvedNextGenRegistrations.length}`
                  : `Approved: ${approvedNextGenRegistrations.length}`}
              </span>
              <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100 font-bold">
                {displayLocale === 'ar'
                  ? `مرفوضة: ${rejectedNextGenRegistrations.length}`
                  : `Rejected: ${rejectedNextGenRegistrations.length}`}
              </span>
              {duplicateNextGenRegistrations.length > 0 && (
                <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200 font-bold">
                  {displayLocale === 'ar'
                    ? `تسجيلات متشابهة: ${duplicateNextGenRegistrations.length}`
                    : `Possible duplicates: ${duplicateNextGenRegistrations.length}`}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-3 mb-5">
            <label className="relative block">
              <Search
                size={17}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${displayLocale === 'ar' ? 'right-4' : 'left-4'}`}
              />
              <input
                type="search"
                value={nextGenRegistrationSearchTerm}
                onChange={event => setNextGenRegistrationSearchTerm(event.target.value)}
                placeholder={displayLocale === 'ar' ? 'ابحث بالاسم أو البريد أو المعرّف...' : 'Search by name, email, or ID...'}
                className={`w-full py-3 bg-stone-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 ${
                  displayLocale === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'
                }`}
              />
            </label>

            <select
              value={nextGenRegistrationStatusFilter}
              onChange={event => setNextGenRegistrationStatusFilter(event.target.value as NextGenRegistrationStatusFilter)}
              className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">{displayLocale === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
              <option value="pending">{displayLocale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
              <option value="approved">{displayLocale === 'ar' ? 'موافق عليها' : 'Approved'}</option>
              <option value="rejected">{displayLocale === 'ar' ? 'مرفوضة' : 'Rejected'}</option>
            </select>
          </div>

          {duplicateNextGenRegistrations.length > 0 && (
            <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
              <div className="flex items-start gap-3">
                <Search size={18} className="mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold">
                    {displayLocale === 'ar' ? 'تم اكتشاف تسجيلات متشابهة' : 'Possible repeat registrations detected'}
                  </h4>
                  <p className="text-xs leading-relaxed mt-1">
                    {displayLocale === 'ar'
                      ? 'يتم وضع علامة عندما يظهر نفس البريد الإلكتروني أو نفس الاسم في أكثر من معرّف. راجع جميع الصفوف المتشابهة قبل الموافقة.'
                      : 'A warning appears when the same email or normalized name is associated with multiple IDs. Review every matching row before approving.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {nextGenRegistrations.length === 0 ? (
            <div className="p-6 bg-stone-50 rounded-2xl border border-gray-100 text-sm text-gray-500">
              {displayLocale === 'ar'
                ? 'لا توجد تسجيلات NextGen حتى الآن.'
                : 'No NextGen registrations have been submitted yet.'}
            </div>
          ) : visibleNextGenRegistrations.length === 0 ? (
            <div className="p-6 bg-stone-50 rounded-2xl border border-gray-100 text-sm text-gray-500">
              {displayLocale === 'ar'
                ? 'لا توجد تسجيلات تطابق البحث أو حالة التصفية.'
                : 'No registrations match the current search or status filter.'}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleNextGenRegistrations.map(registration => {
                const normalizedEmail = registration.email.trim().toLowerCase();
                const normalizedName = normalizeDuplicateIdentityValue(registration.fullName);
                const sameEmailCount = normalizedEmail ? nextGenRegistrationEmailCounts[normalizedEmail] || 0 : 0;
                const sameNameCount = normalizedName ? nextGenRegistrationNameCounts[normalizedName] || 0 : 0;
                const hasDuplicateEmail = sameEmailCount > 1;
                const hasDuplicateName = sameNameCount > 1;
                const isUpdating = nextGenRegistrationUpdatingId === registration.userId;
                const createdLabel = registration.createdAtEasternTime || registration.createdAtISO || (
                  registration.createdAt ? new Date(registration.createdAt).toLocaleString() : ''
                );

                const statusClasses: Record<NextGenRegistrationStatus, string> = {
                  pending: 'bg-amber-50 text-amber-700 border-amber-200',
                  approved: 'bg-green-50 text-green-700 border-green-200',
                  rejected: 'bg-red-50 text-red-700 border-red-200',
                };

                const statusLabel: Record<NextGenRegistrationStatus, string> = {
                  pending: displayLocale === 'ar' ? 'قيد الانتظار' : 'Pending',
                  approved: displayLocale === 'ar' ? 'موافق عليها' : 'Approved',
                  rejected: displayLocale === 'ar' ? 'مرفوضة' : 'Rejected',
                };

                return (
                  <div
                    key={registration.userId}
                    className={`rounded-2xl border p-5 transition-all ${
                      hasDuplicateEmail || hasDuplicateName
                        ? 'bg-orange-50/60 border-orange-200'
                        : 'bg-stone-50 border-gray-100'
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-white border border-indigo-100 text-indigo-700 grid place-items-center font-black tracking-widest">
                          {registration.userId}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold text-gray-900 break-words">
                              {registration.fullName || (displayLocale === 'ar' ? 'اسم غير متوفر' : 'Name unavailable')}
                            </h4>
                            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusClasses[registration.status]}`}>
                              {statusLabel[registration.status]}
                            </span>
                            {(hasDuplicateEmail || hasDuplicateName) && (
                              <span className="px-3 py-1 rounded-full border border-orange-200 bg-orange-100 text-orange-800 text-xs font-bold">
                                {displayLocale === 'ar' ? 'احتمال تسجيل متكرر' : 'Possible duplicate'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 mt-3">
                            <span className="flex items-center gap-1 min-w-0 break-all">
                              <Mail size={13} />
                              {registration.email || (displayLocale === 'ar' ? 'لا يوجد بريد' : 'No email')}
                            </span>
                            <span className="flex items-center gap-1">
                              <IdCard size={13} />
                              {displayLocale === 'ar' ? 'المعرّف' : 'ID'}: {registration.userId}
                            </span>
                            {createdLabel && (
                              <span className="flex items-center gap-1">
                                <Clock size={13} />
                                {createdLabel}
                              </span>
                            )}
                          </div>

                          {(hasDuplicateEmail || hasDuplicateName) && (
                            <div className="flex flex-wrap gap-2 mt-3 text-xs">
                              {hasDuplicateEmail && (
                                <span className="px-3 py-1 rounded-lg bg-white border border-orange-200 text-orange-800 font-bold">
                                  {displayLocale === 'ar'
                                    ? `نفس البريد مستخدم في ${sameEmailCount} تسجيلات`
                                    : `Same email appears in ${sameEmailCount} registrations`}
                                </span>
                              )}
                              {hasDuplicateName && (
                                <span className="px-3 py-1 rounded-lg bg-white border border-orange-200 text-orange-800 font-bold">
                                  {displayLocale === 'ar'
                                    ? `نفس الاسم ظاهر في ${sameNameCount} تسجيلات`
                                    : `Same name appears in ${sameNameCount} registrations`}
                                </span>
                              )}
                            </div>
                          )}

                          {registration.reviewedAtISO && (
                            <p className="text-[11px] text-gray-400 mt-3">
                              {displayLocale === 'ar' ? 'آخر مراجعة:' : 'Last reviewed:'} {registration.reviewedAtISO}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 xl:min-w-[250px]">
                        <button
                          type="button"
                          disabled={isUpdating || registration.status === 'approved'}
                          onClick={() => handleNextGenRegistrationStatus(registration, 'approved')}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-700 text-white text-xs font-bold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUpdating ? <Hourglass size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          {registration.status === 'approved'
                            ? (displayLocale === 'ar' ? 'تمت الموافقة' : 'Approved')
                            : (displayLocale === 'ar' ? 'موافقة' : 'Approve')}
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating || registration.status === 'rejected'}
                          onClick={() => handleNextGenRegistrationStatus(registration, 'rejected')}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUpdating ? <Hourglass size={14} className="animate-spin" /> : <XCircle size={14} />}
                          {registration.status === 'rejected'
                            ? (displayLocale === 'ar' ? 'تم الرفض' : 'Rejected')
                            : (displayLocale === 'ar' ? 'رفض' : 'Reject')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {showNextGenSurveyResults && (
        <section className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-emerald-200 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black flex items-center gap-2 text-emerald-800">
                <BarChart3 size={21} />
                {displayLocale === 'ar' ? 'النتائج الإجمالية لاستبيان NextGen' : 'Overall NextGen Survey Results'}
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-black">
                  {nextGenSurveyResults.totalResponses}
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {displayLocale === 'ar'
                  ? 'تعرض هذه الصفحة النسب المجمعة فقط. لا يتم عرض هوية المشاركين أو إجابات أي شخص بصورة منفردة.'
                  : 'Only combined percentages are shown. Participant identities and individual response combinations are not displayed.'}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-900 min-w-[190px]">
              <div className="text-xs font-black uppercase tracking-widest text-emerald-700">
                {displayLocale === 'ar' ? 'الاستجابات المكتملة' : 'Completed Responses'}
              </div>
              <div className="text-3xl font-black mt-1">
                {nextGenSurveyResults.totalResponses}
              </div>
            </div>
          </div>

          {nextGenSurveyResultsError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-bold">
              {nextGenSurveyResultsError}
            </div>
          )}

          {nextGenSurveyResultsLoading && (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-stone-50 px-5 py-5 text-gray-500">
              <Hourglass size={18} className="animate-spin" />
              {displayLocale === 'ar' ? 'جار تحميل النتائج المجمعة...' : 'Loading anonymous aggregate results...'}
            </div>
          )}

          {!nextGenSurveyResultsLoading && !nextGenSurveyResultsError && nextGenSurveyResults.totalResponses === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-stone-50 p-8 text-center">
              <div className="w-14 h-14 mx-auto grid place-items-center rounded-full bg-emerald-100 text-emerald-700 mb-4">
                <BarChart3 size={24} />
              </div>
              <h4 className="text-lg font-black text-gray-800">
                {displayLocale === 'ar' ? 'لا توجد نتائج بعد' : 'No Survey Results Yet'}
              </h4>
              <p className="text-sm text-gray-500 mt-2">
                {displayLocale === 'ar'
                  ? 'ستظهر النسب هنا بعد إرسال أول استجابة مكتملة.'
                  : 'Percentages will appear here after the first completed response is submitted.'}
              </p>
            </div>
          )}

          {!nextGenSurveyResultsLoading && !nextGenSurveyResultsError && nextGenSurveyResults.totalResponses > 0 && (
            <div className="space-y-8">
              <div>
                <div className="mb-4">
                  <h4 className="text-lg font-black text-[#7a1717]">
                    {displayLocale === 'ar' ? 'تفضيلات تنظيم الجلسات' : 'Session Format Preferences'}
                  </h4>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                    {displayLocale === 'ar' ? 'النسبة المئوية لكل اختيار' : 'Percentage selecting each option'}
                  </p>
                </div>

                <div className="space-y-4">
                  {NEXTGEN_SURVEY_BINARY_QUESTIONS.map((question, questionIndex) => {
                    const aggregate = nextGenSurveyResults.binaryQuestions[question.id];
                    const optionAPercentage = getSurveyPercentage(aggregate.counts.A, aggregate.totalResponses);
                    const optionBPercentage = getSurveyPercentage(aggregate.counts.B, aggregate.totalResponses);

                    return (
                      <div key={question.id} className="rounded-3xl border border-gray-100 bg-stone-50 p-5 sm:p-6">
                        <div className="flex items-start gap-3 mb-5">
                          <div className="w-9 h-9 shrink-0 rounded-xl bg-[#7a1717] text-white grid place-items-center text-sm font-black">
                            {questionIndex + 1}
                          </div>
                          <div>
                            <h5 className="font-black text-gray-900 leading-relaxed">
                              {displayLocale === 'ar' ? question.questionAr : question.questionEn}
                            </h5>
                            <p className="text-xs text-gray-400 mt-1">
                              {displayLocale === 'ar'
                                ? `${aggregate.totalResponses} إجابة صالحة لهذا السؤال`
                                : `${aggregate.totalResponses} valid responses for this question`}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {([
                            {
                              key: 'A' as const,
                              label: displayLocale === 'ar' ? question.optionAAr : question.optionAEn,
                              percentage: optionAPercentage,
                              barClass: 'bg-emerald-600',
                              badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                            },
                            {
                              key: 'B' as const,
                              label: displayLocale === 'ar' ? question.optionBAr : question.optionBEn,
                              percentage: optionBPercentage,
                              barClass: 'bg-indigo-600',
                              badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                            },
                          ]).map(option => (
                            <div key={`${question.id}-${option.key}`}>
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className={`shrink-0 px-2 py-0.5 rounded-lg border text-xs font-black ${option.badgeClass}`}>
                                    {option.key}
                                  </span>
                                  <span className="text-sm font-bold text-gray-700 leading-relaxed">
                                    {option.label}
                                  </span>
                                </div>
                                <span className="shrink-0 text-base font-black text-gray-900">
                                  {formatSurveyPercentage(option.percentage)}
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-white border border-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${option.barClass}`}
                                  style={{ width: `${Math.min(100, Math.max(0, option.percentage))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <h4 className="text-lg font-black text-[#7a1717]">
                    {displayLocale === 'ar' ? 'جودة تقديم Pastor Ibrahim' : "Pastor Ibrahim's Session Quality"}
                  </h4>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                    {displayLocale === 'ar' ? 'توزيع التقييمات من 1 إلى 5' : 'Percentage distribution across ratings 1–5'}
                  </p>
                </div>

                <div className="space-y-4">
                  {NEXTGEN_SURVEY_RATING_QUESTIONS.map((question, questionIndex) => {
                    const aggregate = nextGenSurveyResults.pastorQualityRatings[question.id];

                    return (
                      <div key={question.id} className="rounded-3xl border border-gray-100 bg-stone-50 p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 shrink-0 rounded-xl bg-[#7a1717] text-white grid place-items-center text-sm font-black">
                              {NEXTGEN_SURVEY_BINARY_QUESTIONS.length + questionIndex + 1}
                            </div>
                            <div>
                              <h5 className="font-black text-gray-900 leading-relaxed">
                                {displayLocale === 'ar' ? question.questionAr : question.questionEn}
                              </h5>
                              <p className="text-xs text-gray-400 mt-1">
                                {displayLocale === 'ar'
                                  ? `${aggregate.totalResponses} تقييم صالح لهذا السؤال`
                                  : `${aggregate.totalResponses} valid ratings for this question`}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 rounded-2xl bg-white border border-emerald-200 px-4 py-3 text-center">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-black">
                              {displayLocale === 'ar' ? 'المتوسط' : 'Average'}
                            </div>
                            <div className="text-2xl font-black text-emerald-800 mt-1">
                              {aggregate.average.toFixed(2)} / 5
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {NEXTGEN_SURVEY_RATING_VALUES.map(rating => {
                            const percentage = getSurveyPercentage(
                              aggregate.counts[rating],
                              aggregate.totalResponses,
                            );
                            const ratingLabel = displayLocale === 'ar'
                              ? ({ 1: 'ضعيف جداً', 2: 'ضعيف', 3: 'متوسط', 4: 'جيد', 5: 'ممتاز' } as const)[rating]
                              : ({ 1: 'Very poor', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent' } as const)[rating];

                            return (
                              <div key={`${question.id}-${rating}`} className="grid grid-cols-[minmax(105px,auto)_1fr_auto] items-center gap-3">
                                <div className="text-xs sm:text-sm font-bold text-gray-700">
                                  <span className="font-black text-[#7a1717]">{rating}</span>
                                  <span className="text-gray-400 mx-1">—</span>
                                  {ratingLabel}
                                </div>
                                <div className="h-3 rounded-full bg-white border border-gray-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                                  />
                                </div>
                                <div className="w-14 text-end text-sm font-black text-gray-900">
                                  {formatSurveyPercentage(percentage)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {showNextGenQuestions && (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-amber-700">
                <Trophy size={18} />
                {displayLocale === 'ar' ? 'أسئلة NextGen حسب التصويت' : 'NextGen Questions Ranked by Votes'}
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {rankedNextGenQuestions.length}
                </span>
              </h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                {displayLocale === 'ar'
                  ? 'الترتيب حسب صافي التصويت، ثم إجمالي التصويت الإيجابي، ثم الأقل تصويتاً سلبياً'
                  : 'Sorted by net votes, then total upvotes, then fewer downvotes'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 font-bold">
                {displayLocale === 'ar' ? `المختارة: ${selectedNextGenQuestions.length}` : `Selected: ${selectedNextGenQuestions.length}`}
              </span>
              <span className="px-3 py-1 bg-stone-50 text-gray-600 rounded-full border border-gray-100 font-bold">
                {displayLocale === 'ar' ? `غير المختارة: ${selectableNextGenQuestions.length}` : `Not selected: ${selectableNextGenQuestions.length}`}
              </span>
            </div>
          </div>

          {rankedNextGenQuestions.length === 0 ? (
            <div className="p-6 bg-stone-50 rounded-2xl border border-gray-100 text-sm text-gray-500">
              {displayLocale === 'ar'
                ? 'لا توجد أسئلة NextGen محفوظة حالياً.'
                : 'No saved NextGen questions are available yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {rankedNextGenQuestions.map((question, index) => {
                const isSelected = question.status === 'selectedForNextGenSession' || Boolean((question as any).selectedForNextGenSession);
                const isUpdating = nextGenSelectionLoadingId === question.id;

                return (
                  <div
                    key={question.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-green-50 border-green-200'
                        : 'bg-stone-50 border-gray-100'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black border ${
                          isSelected
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-white text-[#7a1717] border-gray-100'
                        }`}>
                          #{index + 1}
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 bg-white text-[#7a1717] rounded-full text-xs font-bold border border-[#7a1717]/10">
                              {question.category || 'Other'}
                            </span>
                            <span className="px-3 py-1 bg-white text-gray-500 rounded-full text-xs font-bold border border-gray-100">
                              {question.translation || 'WEB'}
                            </span>
                            {isSelected && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                {displayLocale === 'ar' ? 'مختار للجلسة' : 'Selected for session'}
                              </span>
                            )}
                          </div>

                          <h4 className="text-lg font-bold text-gray-900 leading-snug">
                            {question.question}
                          </h4>

                          {question.verses.length > 0 && (
                            <div className="space-y-2">
                              {question.verses.map((verse, verseIndex) => (
                                <div key={`${question.id}-verse-${verseIndex}`} className="bg-white border border-gray-100 rounded-xl p-3">
                                  {verse.reference && (
                                    <div className="text-xs font-bold text-[#7a1717] mb-1">
                                      {verse.reference}
                                    </div>
                                  )}
                                  {verse.text && (
                                    <p className="text-xs leading-5 text-gray-600 whitespace-pre-wrap">
                                      {verse.text}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {question.notes && (
                            <p className="text-xs text-gray-400 italic">
                              {question.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[210px]">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                            <div className="flex items-center justify-center gap-1 text-[10px] text-green-700 font-bold uppercase">
                              <ThumbsUp size={11} />
                              {displayLocale === 'ar' ? 'مؤيد' : 'Up'}
                            </div>
                            <div className="text-lg font-black text-green-700">
                              {question.totalUpvotes}
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                            <div className="flex items-center justify-center gap-1 text-[10px] text-red-700 font-bold uppercase">
                              <ThumbsDown size={11} />
                              {displayLocale === 'ar' ? 'رافض' : 'Down'}
                            </div>
                            <div className="text-lg font-black text-red-700">
                              {question.totalDownvotes}
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                            <div className="text-[10px] text-[#7a1717] font-bold uppercase">
                              {displayLocale === 'ar' ? 'الصافي' : 'Net'}
                            </div>
                            <div className="text-lg font-black text-[#7a1717]">
                              {question.netVotes}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleNextGenQuestionSelection(question, !isSelected)}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            isSelected
                              ? 'bg-white text-red-700 border border-red-100 hover:bg-red-50'
                              : 'bg-[#7a1717] text-white hover:bg-[#5e1010]'
                          }`}
                        >
                          {isUpdating ? (
                            <Hourglass size={14} className="animate-spin" />
                          ) : isSelected ? (
                            <XCircle size={14} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          {isSelected
                            ? (displayLocale === 'ar' ? 'إلغاء الاختيار' : 'Unselect')
                            : (displayLocale === 'ar' ? 'اختيار للجلسة' : 'Select for Session')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="pastor-calendar-shell p-6 rounded-3xl border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="pastor-calendar-title text-xl font-bold text-[#7a1717] flex items-center gap-2">
              <CalendarIcon size={20} />
              {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
            </h3>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
              {t('calendar.availabilityOpensBooking')}
            </p>
          </div>
          <div className="pastor-calendar-legend flex items-center gap-2 font-bold">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-green-700 border border-green-100">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              {t('calendar.available')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-red-700 border border-red-100">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              {t('calendar.unavailable')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-amber-700 border border-amber-100">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              {t('booking.booked')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-3">
          {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map(d => (
            <div key={d} className="pastor-weekday-label text-center uppercase tracking-widest text-[#6f4a4a] font-bold">{d}</div>
          ))}
        </div>

        <div className="pastor-days-grid grid grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
            <div key={`calendar-empty-${i}`} />
          ))}
          {days.map(day => {
            const dateStr = getDateString(day);
            const dayMeetings = getMeetingsForDate(dateStr);
            const pendingRequests = getPendingRequestsForDate(dateStr);
            const dayAvailability = getAvailabilityBlocksForDate(dateStr);
            const dayUnavailability = getUnavailabilityBlocksForDate(dateStr);
            const openSlotCount = slotBlockHours.filter(hour => getPastorSlotStatus(day, hour) === 'available').length;
            const blockedSlotCount = slotBlockHours.filter(hour => getPastorSlotStatus(day, hour) === 'blocked').length;
            const bookedSlotCount = slotBlockHours.filter(hour => getPastorSlotStatus(day, hour) === 'booked').length;
            const isSelected = selectedSlotDay && isSameDay(selectedSlotDay, day);
            const hasAvailability = dayAvailability.length > 0;
            const isTodayDate = isSameDay(day, new Date());

            const statusLabel = openSlotCount > 0
              ? t('calendar.available')
              : bookedSlotCount > 0
              ? t('booking.booked')
              : t('calendar.unavailable');

            const statusDetail = openSlotCount > 0
              ? `${openSlotCount} ${displayLocale === 'ar' ? 'فترة مفتوحة' : 'open slot(s)'}`
              : bookedSlotCount > 0
              ? `${bookedSlotCount} ${displayLocale === 'ar' ? 'محجوزة' : 'booked'}`
              : hasAvailability
              ? t('calendar.unavailable')
              : t('calendar.noAvailabilityOpened');

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedSlotDay(day)}
                className={`pastor-day-card min-h-[92px] sm:min-h-[112px] rounded-2xl border-2 p-2 sm:p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md font-bold ${
                  isSelected
                    ? 'border-[#7a1717] bg-[#7a1717] text-white shadow-lg shadow-[#7a1717]/20'
                    : openSlotCount > 0
                    ? 'border-green-200 bg-green-50 text-green-800 hover:border-green-300'
                    : bookedSlotCount > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300'
                    : 'border-red-100 bg-red-50/70 text-red-800 hover:border-red-200'
                }`}
              >
                <div className={`pastor-day-number mx-auto mb-2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full text-lg sm:text-xl font-black ${
                  isSelected
                    ? 'bg-white text-[#7a1717]'
                    : isTodayDate
                    ? 'bg-[#7a1717] text-white'
                    : 'bg-white/80'
                }`}>
                  {format(day, 'd', { locale: dateLocale })}
                </div>

                <div className={`pastor-day-status font-black uppercase tracking-wide ${isSelected ? 'text-white' : ''}`}>
                  {statusLabel}
                </div>
                <div className={`pastor-day-detail mt-1 hidden sm:block font-bold leading-tight ${isSelected ? 'text-white/85' : 'text-gray-500'}`}>
                  {statusDetail}
                </div>

                {(dayMeetings.length > 0 || pendingRequests.length > 0 || blockedSlotCount > 0 || dayUnavailability.length > 0) && (
                  <div className={`pastor-day-badge mt-2 mx-auto flex w-fit items-center justify-center gap-1 rounded-full px-2 py-1 font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/80 text-[#7a1717]'
                  }`}>
                    {dayMeetings.length + pendingRequests.length + blockedSlotCount + dayUnavailability.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedSlotDay && (
        <div
          className="fixed inset-0 z-[50] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={() => setSelectedSlotDay(null)}
          dir={dir}
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="pastor-popup-panel w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pastor-popup-header sticky top-0 z-10 text-white p-6">
              <button
                type="button"
                onClick={() => setSelectedSlotDay(null)}
                className="absolute top-4 end-4 rounded-full bg-white/15 p-2 hover:bg-white/25 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="pe-10">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Clock size={22} />
                  {format(selectedSlotDay, 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                </h3>
                <p className="mt-1 text-sm font-bold text-white/80 uppercase tracking-widest">
                  {t('calendar.availabilityOpensBooking')}
                </p>
              </div>
            </div>

            <div className="pastor-popup-body max-h-[calc(90vh-104px)] overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const date = getDateString(selectedSlotDay);
                    setEditingAvailability(null);
                    setAvailabilityForm({
                      mode: 'single',
                      date,
                      startDate: date,
                      endDate: date,
                      selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
                      startTime: '09:00',
                      endTime: '20:00',
                      reason: '',
                      allDay: true,
                    });
                    setShowAvailabilityModal(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-green-200 bg-green-50 px-4 py-3 text-green-700 font-black hover:bg-green-100 transition-colors"
                >
                  <CheckCircle size={18} />
                  {t('calendar.markAvailable')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const date = getDateString(selectedSlotDay);
                    setEditingUnavailability(null);
                    setUnavailabilityForm({
                      date,
                      startTime: '09:00',
                      endTime: '20:00',
                      reason: '',
                      allDay: true,
                    });
                    setShowUnavailabilityModal(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-700 font-black hover:bg-red-100 transition-colors"
                >
                  <XCircle size={18} />
                  {t('calendar.markUnavailable')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMeeting(p => ({ ...p, date: getDateString(selectedSlotDay) }));
                    setEditingMeeting(null);
                    setSelectedParticipants([]);
                    setEmailSent(false);
                    setIsAddOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#7a1717]/20 bg-[#f8eeee] px-4 py-3 text-[#7a1717] font-black hover:bg-[#f1dddd] transition-colors"
                >
                  <Plus size={18} />
                  {t('calendar.addEvent')}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border-2 border-green-100 bg-green-50/70 p-5">
                  <h4 className="font-black text-green-700 mb-4 flex items-center gap-2">
                    <CheckCircle size={18} />
                    {displayLocale === 'ar' ? 'الفترات المتاحة للحجز' : 'Available Booking Slots'}
                  </h4>

                  {selectedDayOpenSlotHours.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-green-100 p-4 text-green-700/70 font-black">
                      {displayLocale === 'ar' ? 'لا توجد فترات متاحة مفتوحة في هذا اليوم.' : 'No available booking slots opened for this day.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedDayOpenSlotHours.map(hour => (
                        <div
                          key={hour}
                          className="rounded-2xl bg-white border-2 border-green-100 p-4 text-green-800 font-black"
                        >
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            {hourToLabel(hour, displayLocale)} - {hourToLabel(hour + SLOT_BLOCK_DURATION, displayLocale)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDayAvailabilityBlocks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-[#165d30]/70 uppercase tracking-widest">
                        {displayLocale === 'ar' ? 'نوافذ الإتاحة' : 'Availability Windows'}
                      </div>
                      {selectedDayAvailabilityBlocks.map(a => (
                        <div key={a.id} className="group rounded-xl bg-white border border-green-100 p-3 text-green-800 relative">
                          <button
                            type="button"
                            onClick={() => handleDeleteAvailability(a.id)}
                            className="absolute top-2 end-2 text-green-500 hover:text-green-800 opacity-70"
                          >
                            <X size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAvailability(a);
                              setAvailabilityForm({
                                mode: 'single',
                                date: a.date,
                                startDate: a.date,
                                endDate: a.date,
                                selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
                                startTime: a.startTime || '09:00',
                                endTime: a.endTime || '20:00',
                                reason: a.reason || '',
                                allDay: a.allDay || false,
                              });
                              setShowAvailabilityModal(true);
                            }}
                            className="block w-full text-start pe-8"
                          >
                            <div>{a.allDay ? t('calendar.available') : timeRangeToLabel(a.startTime, a.endTime, displayLocale)}</div>
                            {a.reason && <div className="mt-1 text-green-600">{a.reason}</div>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border-2 border-[#ead9d0] bg-stone-50 p-5">
                  <h4 className="font-black text-[#7a1717] mb-4 flex items-center gap-2">
                    <CalendarIcon size={18} />
                    {t('calendar.meeting')}
                  </h4>
                  <div className="space-y-3">
                    {selectedDayMeetings.length === 0 ? (
                      <div className="rounded-2xl bg-white border border-[#ead9d0] p-4 text-gray-400 font-black">
                        {displayLocale === 'ar' ? 'لا توجد اجتماعات مؤكدة.' : 'No confirmed meetings.'}
                      </div>
                    ) : selectedDayMeetings.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => openMeetingEditor(m)}
                        className="block w-full rounded-2xl bg-white border-2 border-[#ead9d0] p-4 text-start font-black hover:border-[#7a1717]/30 hover:bg-[#f8eeee] transition-colors"
                      >
                        <div className="text-[#7a1717]">{getMeetingDisplayTitle(m)}</div>
                        <div className="text-gray-500 mt-1">{timeRangeToLabel(m.startTime, m.endTime, displayLocale)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <details className="rounded-2xl border-2 border-[#ead9d0] bg-white p-4">
                <summary className="cursor-pointer list-none font-black text-[#7a1717] flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Clock size={18} />
                    {displayLocale === 'ar' ? 'التحقق من كل الفترات' : 'Verify All Slots'}
                  </span>
                  <span className="text-[#7a1717]/60">
                    {displayLocale === 'ar' ? 'افتح للتفاصيل' : 'Collapsed by default'}
                  </span>
                </summary>

                <div className="mt-4 rounded-2xl bg-[#fbf7f2] border border-[#ead9d0] p-4">
                  <p className="mb-4 text-[#6b4b4b]">
                    {displayLocale === 'ar'
                      ? 'هذه المنطقة للتحقق فقط. الفترات غير المفتوحة تعتبر غير متاحة تلقائياً.'
                      : 'Verification only. Slots are unavailable by default unless availability opens them.'}
                  </p>
                  <div className="pastor-slot-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {slotBlockHours.map(hour => {
                      const status = getPastorSlotStatus(selectedSlotDay, hour);
                      const isClickable = status === 'available' || status === 'blocked';
                      const slotLabel = getPastorSlotLabel(status);

                      return (
                        <button
                          key={hour}
                          type="button"
                          disabled={!isClickable || slotBlockingLoading}
                          onClick={() => handleToggleSlotBlock(selectedSlotDay, hour)}
                          className={`p-3 rounded-xl border-2 font-black transition-all ${
                            status === 'blocked'
                              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                              : status === 'available'
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              : status === 'booked'
                              ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed opacity-80'
                              : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                          }`}
                        >
                          <div>{hourToLabel(hour, displayLocale)}</div>
                          <div className="mt-1 uppercase tracking-widest">{slotLabel}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>

            </div>
          </motion.div>
        </div>
      )}

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-[#7a1717]">
            <Clock size={20} />
            {t('calendar.upcoming')}
          </h3>
          <span className="px-5 py-3 bg-[#f8eeee] text-[#7a1717] rounded-xl text-xs font-bold border border-[#d8aaaa]">
            {displayLocale === 'ar'
              ? 'يتم إرسال التأكيد تلقائياً عند القبول'
              : 'Accept sends EmailJS confirmation automatically'}
          </span>
        </div>
        <div className="space-y-4">
          {meetings.filter(m => {
            if (!m.date) return false;
            try {
              return parseISO(m.date) >= new Date();
            } catch {
              return false;
            }
          }).map(m => {
            const meetingParticipants = (m.participantIds || []).map(id =>
              participants.find(p => p.id === id)
            ).filter(Boolean) as Participant[];

            const requestEmail = getMeetingRequestEmail(m);
            const requestReason = getMeetingRequestReason(m);
            const requestAcknowledged = getMeetingAcknowledged(m);

            return (
              <div
                key={m.id}
                onClick={() => openMeetingEditor(m)}
                className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-stone-50 rounded-2xl border border-gray-100 hover:border-[#7a1717]/20 transition-all gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400">{format(parseISO(m.date), 'MMM', { locale: dateLocale })}</span>
                    <span className="text-2xl font-bold text-[#7a1717] leading-none">{format(parseISO(m.date), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{getMeetingDisplayTitle(m)}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} /> {timeRangeToLabel(m.startTime, m.endTime, displayLocale)}</span>
                      {m.location && <span className="flex items-center gap-1"><MapPin size={12} /> {m.location}</span>}
                      {requestEmail && <span className="flex items-center gap-1"><Mail size={12} /> {requestEmail}</span>}
                      {meetingParticipants.length > 0 && (
                        <span className="flex items-center gap-1"><Users size={12} /> {meetingParticipants.map(p => p.name).join(', ')}</span>
                      )}
                    </div>
                    {requestReason && <p className="text-xs text-gray-400 mt-1 italic">{requestReason}</p>}
                    {requestEmail && (
                      <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-[10px] font-bold ${
                        requestAcknowledged
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {requestAcknowledged
                          ? (displayLocale === 'ar' ? 'تم إرسال التأكيد' : 'Confirmation sent')
                          : (displayLocale === 'ar' ? 'في انتظار التأكيد' : 'Confirmation pending')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto flex-wrap justify-end">
                  {requestEmail && !requestAcknowledged && (
                    <span className="px-4 py-3 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100">
                      {displayLocale === 'ar' ? 'لم يتم تأكيده بعد' : 'Not confirmed yet'}
                    </span>
                  )}
                  {requestEmail && requestAcknowledged && (
                    <span className="px-4 py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold border border-gray-100">
                      {displayLocale === 'ar' ? 'تم التأكيد' : 'Acknowledged'}
                    </span>
                  )}
                  {m.meetLink && (
                    <a
                      href={m.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Video size={18} />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(m.id!);
                    }}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {meetings.filter(m => {
            if (!m.date) return false;
            try { return parseISO(m.date) >= new Date(); } catch { return false; }
          }).length === 0 && (
            <div className="text-center py-12 text-gray-400 italic">{t('calendar.noUpcoming')}</div>
          )}
        </div>
      </section>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <h3 className="text-xl font-bold">{editingMeeting ? t('calendar.update') : t('calendar.create')}</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.titleField')}</label>
                <input required type="text" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.title} onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                  <input required type="date" className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.date} onChange={e => setNewMeeting(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.typeField')}</label>
                  <select className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.type} onChange={e => setNewMeeting(p => ({ ...p, type: e.target.value as any }))}>
                    <option value="service">{t('calendar.service')}</option>
                    <option value="prayer">{t('calendar.prayer')}</option>
                    <option value="counseling">{t('calendar.counseling')}</option>
                    <option value="other">{t('calendar.other')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                  <select required className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.startTime} onChange={e => setNewMeeting(p => ({ ...p, startTime: e.target.value }))}>
                    {MEETING_TIME_OPTIONS.map(option => (
                      <option key={`meeting-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                  <select required className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.endTime} onChange={e => setNewMeeting(p => ({ ...p, endTime: e.target.value }))}>
                    {MEETING_TIME_OPTIONS.map(option => (
                      <option key={`meeting-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {participants.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.participants')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowParticipantDropdown(!showParticipantDropdown)}
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl flex items-center justify-between text-left hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Users size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate text-sm">
                          {selectedCount === 0
                            ? t('calendar.selectParticipants')
                            : `${selectedCount} ${t('calendar.selected')}`
                          }
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    </button>

                    {showParticipantDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 border-b bg-stone-50 rounded-t-xl flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500 uppercase">{participants.length} {t('calendar.trainees')}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedParticipants(participants.map(p => p.id))}
                            className="text-[10px] text-[#7a1717] font-bold hover:underline"
                          >
                            {t('calendar.selectAll')}
                          </button>
                        </div>
                        {participants.map(p => (
                          <label
                            key={p.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedParticipants.includes(p.id)}
                              onChange={() => toggleParticipant(p.id)}
                              className="w-4 h-4 rounded border-gray-300 text-[#7a1717] focus:ring-[#7a1717]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 truncate">{p.email}</div>
                            </div>
                            {p.primaryGift && (
                              <span className="text-[9px] bg-stone-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">{p.primaryGift}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedNames.map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-[#f8eeee] text-[#7a1717] px-2 py-1 rounded-full">
                          {name}
                          <button type="button" onClick={() => toggleParticipant(selectedParticipants[i])} className="hover:text-red-500">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {displayLocale === 'ar' ? 'رابط الاجتماع عبر الإنترنت (اختياري)' : 'Online Meeting Link (Optional)'}
                </label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none"
                    value={newMeeting.meetLink}
                    onChange={event => setNewMeeting(previous => ({ ...previous, meetLink: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.location')}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#7a1717]/20 outline-none" value={newMeeting.location} onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>

              {emailSent && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
                  <Check size={16} />
                  <span className="text-sm font-bold">{t('calendar.meetingSaved')} ({selectedCount})!</span>
                </div>
              )}

              <button disabled={loading} type="submit" className="w-full py-4 bg-[#7a1717] text-white rounded-2xl font-bold shadow-xl shadow-[#7a1717]/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.saving')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingMeeting ? t('calendar.update') : t('calendar.create')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-green-700">{editingAvailability ? t('calendar.editAvailability') : t('calendar.markAvailable')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('calendar.availabilityDatabaseNote')}</p>
              </div>
              <button onClick={() => { setShowAvailabilityModal(false); setEditingAvailability(null); resetAvailabilityForm(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAvailability} className="p-6 space-y-4">
              {!editingAvailability && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm(p => ({ ...p, mode: 'single' }))}
                    className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                      availabilityForm.mode === 'single'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {t('calendar.singleDay')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm(p => ({ ...p, mode: 'multiple' }))}
                    className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                      availabilityForm.mode === 'multiple'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {t('calendar.multipleDays')}
                  </button>
                </div>
              )}

              {(availabilityForm.mode === 'single' || editingAvailability) && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                    value={availabilityForm.date}
                    onChange={e => setAvailabilityForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
              )}

              {availabilityForm.mode === 'multiple' && !editingAvailability && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startDate')}</label>
                      <input
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                        value={availabilityForm.startDate}
                        onChange={e => setAvailabilityForm(p => ({ ...p, startDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endDate')}</label>
                      <input
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                        value={availabilityForm.endDate}
                        onChange={e => setAvailabilityForm(p => ({ ...p, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.daysIncluded')}</label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { day: 0, label: t('calendar.sun') },
                        { day: 1, label: t('calendar.mon') },
                        { day: 2, label: t('calendar.tue') },
                        { day: 3, label: t('calendar.wed') },
                        { day: 4, label: t('calendar.thu') },
                        { day: 5, label: t('calendar.fri') },
                        { day: 6, label: t('calendar.sat') },
                      ].map(item => (
                        <button
                          key={item.day}
                          type="button"
                          onClick={() => toggleAvailabilityWeekday(item.day)}
                          className={`py-2 rounded-lg text-[10px] font-bold border transition-colors ${
                            availabilityForm.selectedWeekdays.includes(item.day)
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      {t('calendar.selectedDatesToCreate')}: {availabilityDateCount}
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDayAvailability"
                  checked={availabilityForm.allDay}
                  onChange={e => setAvailabilityForm(p => ({ ...p, allDay: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="allDayAvailability" className="text-sm font-bold text-gray-700">{t('calendar.allBookableHours')}</label>
              </div>

              {!availabilityForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                      value={availabilityForm.startTime}
                      onChange={e => setAvailabilityForm(p => ({ ...p, startTime: e.target.value }))}
                    >
                      {BOOKING_WINDOW_TIME_OPTIONS.map(option => (
                        <option key={`availability-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                      value={availabilityForm.endTime}
                      onChange={e => setAvailabilityForm(p => ({ ...p, endTime: e.target.value }))}
                    >
                      {BOOKING_WINDOW_TIME_OPTIONS.map(option => (
                        <option key={`availability-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.reasonLabelOptional')}</label>
                <input
                  type="text"
                  placeholder={t('calendar.availabilityPlaceholder')}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-green-300 outline-none"
                  value={availabilityForm.reason}
                  onChange={e => setAvailabilityForm(p => ({ ...p, reason: e.target.value }))}
                />
              </div>

              <button disabled={loading} type="submit" className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-600/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.savingPlain')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingAvailability ? t('calendar.updateAvailability') : availabilityForm.mode === 'multiple' ? `${t('calendar.markDaysAvailable')} (${availabilityDateCount})` : t('calendar.markDayAvailable')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showUnavailabilityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-stone-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-red-700">{editingUnavailability ? t('calendar.editUnavailability') : t('calendar.markUnavailable')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('calendar.unavailabilityDatabaseNote')}</p>
              </div>
              <button onClick={() => { setShowUnavailabilityModal(false); setEditingUnavailability(null); resetUnavailabilityForm(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUnavailability} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.dateField')}</label>
                <input
                  required
                  type="date"
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                  value={unavailabilityForm.date}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allDayUnavailability"
                  checked={unavailabilityForm.allDay}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, allDay: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="allDayUnavailability" className="text-sm font-bold text-gray-700">{t('calendar.allDay')}</label>
              </div>

              {!unavailabilityForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.startTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                      value={unavailabilityForm.startTime}
                      onChange={e => setUnavailabilityForm(p => ({ ...p, startTime: e.target.value }))}
                    >
                      {FULL_DAY_TIME_OPTIONS.map(option => (
                        <option key={`unavailability-start-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.endTime')}</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                      value={unavailabilityForm.endTime}
                      onChange={e => setUnavailabilityForm(p => ({ ...p, endTime: e.target.value }))}
                    >
                      {FULL_DAY_TIME_OPTIONS.map(option => (
                        <option key={`unavailability-end-${option.value}`} value={option.value}>{hourToLabel(option.hour, displayLocale)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('calendar.reasonOptional')}</label>
                <input
                  type="text"
                  placeholder={t('calendar.unavailabilityPlaceholder')}
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-red-300 outline-none"
                  value={unavailabilityForm.reason}
                  onChange={e => setUnavailabilityForm(p => ({ ...p, reason: e.target.value }))}
                />
              </div>

              <button disabled={loading} type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-600/10 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>{t('calendar.savingPlain')}</>
                ) : (
                  <>
                    <Send size={16} />
                    {editingUnavailability ? t('calendar.updateUnavailability') : t('calendar.markUnavailable')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {selectedPeopleNotePerson && showPeopleNotePopup && (
          <motion.div
            key="people-personal-note-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 backdrop-blur-md px-4 py-6"
            onClick={closePeopleNotePopup}
            dir={dir}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
          >
            <motion.div
              key="people-personal-note-popup-panel"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-xl overflow-hidden rounded-3xl bg-[#fffdf9] shadow-2xl border border-[#ead9d0] font-bold"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative bg-[#7a1717] px-6 py-5 text-white">
                <button
                  type="button"
                  disabled={peopleNoteSaving}
                  onClick={closePeopleNotePopup}
                  className="absolute top-4 end-4 rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 pe-10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <MessageSquare size={24} />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold">
                      {displayLocale === 'ar' ? 'إضافة ملاحظة شخصية' : 'Add Personal Note'}
                    </h3>
                    <p className="mt-1 text-base text-white/90">
                      {selectedPeopleNotePerson.name} • {selectedPeopleNotePerson.identifier}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitPeoplePersonalNote} className="p-6 space-y-4">
                <div>
                  <label className="text-base font-bold text-[#7a1717]/70 uppercase tracking-widest flex items-center gap-1 mb-2">
                    <MessageSquare size={12} />
                    {displayLocale === 'ar' ? 'نوع الملاحظة' : 'Note Type'}
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPeopleNoteType('strength')}
                      disabled={peopleNoteSaving}
                      className={`rounded-2xl border-2 px-4 py-3 font-black transition-all disabled:opacity-60 ${
                        peopleNoteType === 'strength'
                          ? 'bg-green-600 border-green-600 text-white shadow-md'
                          : 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {displayLocale === 'ar' ? 'قوة' : 'Strength'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPeopleNoteType('weakness')}
                      disabled={peopleNoteSaving}
                      className={`rounded-2xl border-2 px-4 py-3 font-black transition-all disabled:opacity-60 ${
                        peopleNoteType === 'weakness'
                          ? 'bg-red-600 border-red-600 text-white shadow-md'
                          : 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {displayLocale === 'ar' ? 'ضعف' : 'Weakness'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-base font-bold text-[#7a1717]/70 uppercase tracking-widest flex items-center gap-1 mb-2">
                    <User size={12} />
                    {displayLocale === 'ar' ? 'الشخص' : 'Person'}
                  </label>

                  <div className="rounded-2xl border-2 border-[#ead9d0] bg-[#fffdf9] px-4 py-3">
                    <div className="text-[#2b1717] font-black">{selectedPeopleNotePerson.name}</div>
                    <div className="mt-1 text-sm text-[#6b4b4b]">
                      {selectedPeopleNotePerson.email} • {getPersonGroup(selectedPeopleNotePerson)
                        ? getPeopleDevelopmentGroupLabel(getPersonGroup(selectedPeopleNotePerson) as PeopleDevelopmentGroupId)
                        : (displayLocale === 'ar' ? 'غير محدد' : 'Unassigned')}
                    </div>
                  </div>
                </div>

                {getPersonPersonalNotes(selectedPeopleNotePerson).length > 0 && (
                  <div className="rounded-2xl border-2 border-[#ead9d0] bg-[#fffdf9] p-4">
                    <div className="mb-3 text-base font-bold text-[#7a1717]/70 uppercase tracking-widest">
                      {displayLocale === 'ar' ? 'آخر الملاحظات الشخصية' : 'Latest Personal Notes'}
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {getPersonPersonalNotes(selectedPeopleNotePerson).slice(0, 5).map(note => (
                        <div
                          key={`popup-person-note-${note.id}`}
                          className={`rounded-xl border px-3 py-2 ${
                            note.type === 'strength'
                              ? 'bg-green-50 border-green-100 text-green-800'
                              : 'bg-red-50 border-red-100 text-red-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs font-black">
                            <span>
                              {note.type === 'strength'
                                ? (displayLocale === 'ar' ? 'قوة' : 'Strength')
                                : (displayLocale === 'ar' ? 'ضعف' : 'Weakness')}
                            </span>
                            <span>{note.date}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#242424]">{note.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-base font-bold text-[#7a1717]/70 uppercase tracking-widest flex items-center gap-1 mb-2">
                    <MessageSquare size={12} />
                    {displayLocale === 'ar' ? 'نص الملاحظة' : 'Note'}
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={peopleNoteText}
                    disabled={peopleNoteSaving}
                    onChange={event => setPeopleNoteText(event.target.value)}
                    placeholder={displayLocale === 'ar' ? 'اكتب الملاحظة هنا...' : 'Write the note here...'}
                    className="w-full px-4 py-3 bg-[#fffdf9] border-2 border-[#ead9d0] rounded-xl focus:ring-2 focus:ring-[#7a1717]/25 focus:border-[#7a1717] outline-none text-base font-bold text-[#2b1717] placeholder:text-[#9b7b7b] resize-none disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={peopleNoteSaving}
                    onClick={closePeopleNotePopup}
                    className="py-3 bg-[#f4e8e2] text-[#7a1717] rounded-xl font-bold hover:bg-[#ead9d0] transition-all text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {displayLocale === 'ar' ? 'إغلاق' : 'Close'}
                  </button>

                  <button
                    disabled={peopleNoteSaving || !peopleNoteText.trim()}
                    type="submit"
                    className="py-3 bg-[#7a1717] text-white rounded-xl font-bold shadow hover:bg-[#5e1010] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {peopleNoteSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        {displayLocale === 'ar' ? 'حفظ الملاحظة' : 'Save Note'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePeopleAssignmentsPopupGroup && activePeopleAssignmentsPopupGroupConfig && (
          <motion.div
            key="people-assignments-history-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-3 py-4 backdrop-blur-md sm:px-6"
            onClick={closePeopleAssignmentsPopup}
            dir={dir}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
          >
            <motion.div
              key="people-assignments-history-panel"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#ead9d0] bg-[#fffdf9] shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="shrink-0 bg-[#7a1717] px-4 py-4 text-white sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
                      <CalendarIcon size={16} />
                      {displayLocale === 'ar' ? 'تقويم منشورات المجموعة' : 'Group Posts Calendar'}
                    </div>
                    <h3 className="text-2xl font-black leading-tight sm:text-3xl">
                      {displayLocale === 'ar' ? activePeopleAssignmentsPopupGroupConfig.labelAr : activePeopleAssignmentsPopupGroupConfig.labelEn}
                    </h3>
                    <p className="mt-1 text-sm text-white/85">
                      {displayLocale === 'ar'
                        ? 'الخلفية مغلقة ومموّهة. مرّر داخل هذه النافذة فقط، أو أغلقها للرجوع للصفحة.'
                        : 'The page behind is blocked and blurred. Scroll inside this popup only, or close it to return.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePeopleAssignmentsPopup}
                    className="shrink-0 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
                    title={displayLocale === 'ar' ? 'إغلاق' : 'Close'}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <section className="rounded-3xl border-2 border-[#ead9d0] bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => changePeopleAssignmentsPopupMonth(subMonths(peopleAssignmentsPopupMonth, 1))}
                        className="rounded-2xl border border-[#ead9d0] bg-[#fff9f4] p-3 text-[#7a1717] transition-colors hover:bg-[#f8eeee]"
                        title={displayLocale === 'ar' ? 'الشهر السابق' : 'Previous month'}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="text-center">
                        <div className="text-xl font-black text-[#7a1717]">
                          {peopleAssignmentsPopupMonthLabel}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[#7a1717]/60">
                          {displayLocale === 'ar' ? 'النقاط تعني وجود منشورات' : 'Dots indicate posts'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => changePeopleAssignmentsPopupMonth(addMonths(peopleAssignmentsPopupMonth, 1))}
                        className="rounded-2xl border border-[#ead9d0] bg-[#fff9f4] p-3 text-[#7a1717] transition-colors hover:bg-[#f8eeee]"
                        title={displayLocale === 'ar' ? 'الشهر التالي' : 'Next month'}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-wider text-[#7a1717]/65 sm:text-xs">
                      {peopleAssignmentsWeekdayLabels.map(dayLabel => (
                        <div key={`people-history-weekday-${dayLabel}`} className="py-2">
                          {dayLabel}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {Array.from({ length: peopleAssignmentsPopupStartPadding }).map((_, index) => (
                        <div key={`people-history-empty-${index}`} className="min-h-[54px] rounded-2xl bg-stone-50/70 sm:min-h-[68px]" />
                      ))}
                      {peopleAssignmentsPopupMonthDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const postsForDay = peopleAssignmentsPopupEntriesByDate[dateKey] || [];
                        const hasPosts = postsForDay.length > 0;
                        const isSelected = peopleAssignmentsPopupSelectedDate === dateKey;
                        const isToday = dateKey === format(new Date(), 'yyyy-MM-dd');

                        return (
                          <button
                            key={`people-history-day-${dateKey}`}
                            type="button"
                            disabled={!hasPosts}
                            onClick={() => setPeopleAssignmentsPopupSelectedDate(dateKey)}
                            className={`min-h-[54px] rounded-2xl border-2 p-1 text-center transition-all sm:min-h-[68px] sm:p-2 ${
                              isSelected
                                ? 'border-[#7a1717] bg-[#7a1717] text-white shadow-lg shadow-[#7a1717]/20'
                                : hasPosts
                                  ? 'border-[#d8aaaa] bg-[#fff9f4] text-[#7a1717] hover:-translate-y-0.5 hover:bg-[#f8eeee] hover:shadow-md'
                                  : isToday
                                    ? 'border-[#ead9d0] bg-white text-[#7a1717]/55'
                                    : 'border-[#ead9d0] bg-white text-[#8f7777]/45'
                            } disabled:cursor-default disabled:opacity-75`}
                          >
                            <div className="text-sm font-black sm:text-base">{format(day, 'd')}</div>
                            {hasPosts && (
                              <div className="mt-1 flex items-center justify-center gap-1">
                                {Array.from({ length: Math.min(postsForDay.length, 3) }).map((_, dotIndex) => (
                                  <span
                                    key={`people-history-dot-${dateKey}-${dotIndex}`}
                                    className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#7a1717]'}`}
                                  />
                                ))}
                                {postsForDay.length > 3 && (
                                  <span className="ms-0.5 text-[10px] font-black">+{postsForDay.length - 3}</span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-3xl border-2 border-[#ead9d0] bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-xl font-black text-[#7a1717]">
                          {peopleAssignmentsPopupSelectedDateLabel || (displayLocale === 'ar' ? 'اختر يوماً يحتوي على نقطة' : 'Select a dotted day')}
                        </h4>
                        <p className="mt-1 text-sm font-bold text-[#6b4b4b]">
                          {displayLocale === 'ar'
                            ? `${selectedPeopleAssignmentsPopupEntries.length} منشور في اليوم المحدد`
                            : `${selectedPeopleAssignmentsPopupEntries.length} post(s) on the selected day`}
                        </p>
                      </div>
                      <span className={`w-fit rounded-full border px-3 py-1 text-sm font-black ${activePeopleAssignmentsPopupGroupConfig.badgeClass}`}>
                        {activePeopleAssignmentsPopupEntries.length} {displayLocale === 'ar' ? 'إجمالي' : 'total'}
                      </span>
                    </div>

                    {!peopleAssignmentsPopupSelectedDate ? (
                      <div className="rounded-2xl border border-[#ead9d0] bg-stone-50 p-6 text-center text-[#6b4b4b]">
                        <CalendarIcon className="mx-auto mb-2 text-[#7a1717]" size={32} />
                        {displayLocale === 'ar'
                          ? 'لا توجد منشورات في هذا الشهر أو لم يتم اختيار يوم بعد.'
                          : 'No posts in this month yet, or no day is selected.'}
                      </div>
                    ) : selectedPeopleAssignmentsPopupEntries.length === 0 ? (
                      <div className="rounded-2xl border border-[#ead9d0] bg-stone-50 p-6 text-center text-[#6b4b4b]">
                        {displayLocale === 'ar' ? 'لا توجد منشورات في هذا اليوم.' : 'No posts on this day.'}
                      </div>
                    ) : (
                      <div className="max-h-[52vh] space-y-3 overflow-y-auto pe-1">
                        {selectedPeopleAssignmentsPopupEntries.map(entry => (
                          <article key={`people-history-popup-entry-${entry.id}`} className="rounded-2xl border border-[#ead9d0] bg-[#fffdf9] p-4">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-[#7a1717]/65">
                              <span className="inline-flex items-center gap-1">
                                <Clock size={13} />
                                {entry.createdAtISO || entry.date}
                              </span>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <span>{entry.id}</span>
                                <button
                                  type="button"
                                  disabled={peopleDevelopmentDeletingKey !== null}
                                  onClick={() => handleDeletePeopleDevelopmentPost(entry)}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  title={displayLocale === 'ar' ? 'حذف المنشور بالكامل' : 'Delete entire post'}
                                >
                                  {peopleDevelopmentDeletingKey === `post:${entry.id}` ? (
                                    <Hourglass size={12} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={12} />
                                  )}
                                  <span>{displayLocale === 'ar' ? 'حذف المنشور' : 'Delete post'}</span>
                                </button>
                              </div>
                            </div>

                            {entry.text && (
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#242424] sm:text-base">
                                {entry.text}
                              </p>
                            )}

                            {entry.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs font-black uppercase tracking-widest text-[#7a1717]/65">
                                  {displayLocale === 'ar' ? 'الملفات' : 'Files'}
                                </div>
                                {entry.attachments.map((attachment, attachmentIndex) => (
                                  <div
                                    key={`people-history-popup-${entry.id}-attachment-${attachmentIndex}`}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-[#ead9d0] bg-[#fff9f4] px-3 py-2 text-xs font-black text-[#7a1717]"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate">{attachment.name}</div>
                                      <div className="mt-1 opacity-65">
                                        {formatFileSize(attachment.size)} · Base64 PDF in Realtime Database
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={peopleDevelopmentDeletingKey !== null}
                                      onClick={() => handleDeletePeopleDevelopmentAttachment(entry, attachmentIndex)}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      title={displayLocale === 'ar' ? 'إزالة هذا الملف' : 'Remove this file'}
                                    >
                                      {peopleDevelopmentDeletingKey === `attachment:${entry.id}:${attachmentIndex}` ? (
                                        <Hourglass size={12} className="animate-spin" />
                                      ) : (
                                        <Trash2 size={12} />
                                      )}
                                      <span>{displayLocale === 'ar' ? 'إزالة' : 'Remove'}</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {showAiAssistant && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{t('calendar.pastorAiAssistant')}</h3>
                  <p className="text-xs text-white/80">{t('calendar.manageCalendarNaturalLanguage')}</p>
                </div>
              </div>
              <button onClick={() => setShowAiAssistant(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1">
                        <Bot size={12} className="text-purple-500" />
                        <span className="text-xs font-bold text-purple-600">{t('calendar.aiAssistant')}</span>
                      </div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                      {format(msg.timestamp, 'h:mm a', { locale: dateLocale })}
                    </p>
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 rounded-bl-sm">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-white">
              <form onSubmit={handleAiAssistant} className="flex gap-3">
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="e.g., 'I'm available next Friday' or 'block Friday afternoon'"
                  className="flex-1 px-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  disabled={aiLoading}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiInput.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </>
  );
}
