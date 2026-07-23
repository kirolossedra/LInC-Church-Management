import { useEffect, useMemo, useRef, useState } from 'react';
import YAML from 'yaml';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  LockKeyhole,
  LogOut,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { get, onValue, push, ref, set, update } from 'firebase/database';
import { database } from '../../firebase';
import fiveServicePathwaysYaml from '../forms/five-service-pathways.yml?raw';
import spiritualGiftsDiscoveryYaml from '../forms/spiritual-gifts-discovery.yml?raw';
import { useI18n } from '../../i18n';

const ADMIN_PASSWORD = '9999';
const CAROUSEL_PATH = 'landingPage/carousel';
const ASSESSMENT_FORMS_CONTROL_PATH = 'assessmentPage/forms';
const MAX_IMAGE_SIZE_BYTES = 3_000_000;
const MAX_CAROUSEL_PHOTOS = 12;

type AssessmentFormState = 'active' | 'disabled' | 'hidden';

interface LocalizedText {
  en?: string;
  ar?: string;
}

interface AssessmentFormDefinition {
  id: string;
  status?: string;
  card?: {
    title?: LocalizedText;
    titleKey?: string;
  };
  page?: {
    title?: LocalizedText;
    titleKey?: string;
  };
}

interface CarouselPhoto {
  id: string;
  url: string;
  altEn: string;
  altAr: string;
  order: number;
  createdAt?: number;
  updatedAt?: number;
}

interface StoredCarouselPhoto {
  url?: unknown;
  dataUrl?: unknown;
  altEn?: unknown;
  altAr?: unknown;
  order?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface PendingUpload {
  id: string;
  fileName: string;
  dataUrl: string;
  altEn: string;
  altAr: string;
}

const ASSESSMENT_FORM_DEFINITIONS = [
  fiveServicePathwaysYaml,
  spiritualGiftsDiscoveryYaml,
]
  .map((raw) => YAML.parse(raw) as AssessmentFormDefinition)
  .filter((form) => form.status !== 'disabled');

function humanizeIdentifier(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function assessmentFormTitle(
  form: AssessmentFormDefinition,
  language: 'en' | 'ar'
): string {
  const localizedTitle = form.card?.title ?? form.page?.title;

  return (
    localizedTitle?.[language] ||
    localizedTitle?.en ||
    localizedTitle?.ar ||
    humanizeIdentifier(form.id)
  );
}

function normalizeAssessmentFormState(value: unknown): AssessmentFormState {
  if (typeof value === 'string') {
    if (value === 'disabled' || value === 'hidden') return value;
    return 'active';
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'active';
  }

  const record = value as Record<string, unknown>;
  const configuredState = record.state ?? record.status;

  if (configuredState === 'disabled' || configuredState === 'hidden') {
    return configuredState;
  }

  return 'active';
}

function normalizeStoredPhoto(
  id: string,
  value: StoredCarouselPhoto | string,
  fallbackOrder: number
): CarouselPhoto | null {
  if (typeof value === 'string') {
    if (!value.trim()) return null;

    return {
      id,
      url: value,
      altEn: '',
      altAr: '',
      order: fallbackOrder,
    };
  }

  if (!value || typeof value !== 'object') return null;

  const possibleUrl =
    typeof value.url === 'string'
      ? value.url
      : typeof value.dataUrl === 'string'
        ? value.dataUrl
        : '';

  if (!possibleUrl.trim()) return null;

  return {
    id,
    url: possibleUrl,
    altEn: typeof value.altEn === 'string' ? value.altEn : '',
    altAr: typeof value.altAr === 'string' ? value.altAr : '',
    order:
      typeof value.order === 'number' && Number.isFinite(value.order)
        ? value.order
        : fallbackOrder,
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : undefined,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : undefined,
  };
}

function parsePhotos(rawPhotos: unknown): CarouselPhoto[] {
  if (!rawPhotos) return [];

  if (Array.isArray(rawPhotos)) {
    return rawPhotos
      .map((value, index) =>
        normalizeStoredPhoto(String(index), value as StoredCarouselPhoto | string, index)
      )
      .filter((photo): photo is CarouselPhoto => photo !== null)
      .sort((a, b) => a.order - b.order);
  }

  if (typeof rawPhotos !== 'object') return [];

  return Object.entries(rawPhotos as Record<string, StoredCarouselPhoto | string>)
    .map(([id, value], index) => normalizeStoredPhoto(id, value, index))
    .filter((photo): photo is CarouselPhoto => photo !== null)
    .sort((a, b) => a.order - b.order);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('The selected image could not be read.'));
    };

    reader.onerror = () => {
      reject(new Error('The selected image could not be read.'));
    };

    reader.readAsDataURL(file);
  });
}

function createPhotoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface AttendancePerson {
  firebaseId: string;
  firstName: string;
  lastName: string;
  arabicFirstName: string;
  arabicLastName: string;
  phoneNumber: string;
  email: string;
  photoBase64: string;
  daysOfAttendance: string;
  createdAt: number;
  updatedAt: number;
}

interface AttendancePersonForm {
  firstName: string;
  lastName: string;
  arabicFirstName: string;
  arabicLastName: string;
  phoneNumber: string;
  email: string;
  photoBase64: string;
}

interface CalendarDay {
  key: string;
  dayNumber: number;
  date: Date;
  isCurrentMonth: boolean;
  isSunday: boolean;
}

interface WeeklyAttendanceSummary {
  dateKey: string;
  attendedCount: number;
}

interface PersonAttendanceAnalysis {
  person: AttendancePerson;
  attendedDates: string[];
  attendanceCount: number;
  attendanceRate: number;
}

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizePersonPhotoSource(value: unknown): string {
  if (typeof value !== 'string') return '';

  const source = value.trim();
  if (!source) return '';

  if (
    /^data:image\/[a-z0-9.+-]+;base64,/i.test(source) ||
    /^(https?:|blob:|\/)/i.test(source)
  ) {
    return source;
  }

  const compactBase64 = source.replace(/\s/g, '');

  if (
    compactBase64.length >= 32 &&
    /^[a-z0-9+/]+={0,2}$/i.test(compactBase64)
  ) {
    return `data:image/jpeg;base64,${compactBase64}`;
  }

  return '';
}

function normalizePerson(firebaseId: string, value: any): AttendancePerson {
  return {
    firebaseId,
    firstName: String(value?.firstName || '').trim(),
    lastName: String(value?.lastName || '').trim(),
    arabicFirstName: String(value?.arabicFirstName || '').trim(),
    arabicLastName: String(value?.arabicLastName || '').trim(),
    phoneNumber: String(value?.phoneNumber || '').trim(),
    email: String(value?.email || '').trim(),
    photoBase64: normalizePersonPhotoSource(
      value?.photoBase64 ?? value?.photoDataUrl ?? value?.photoUrl ?? value?.photo
    ),
    daysOfAttendance: String(value?.daysOfAttendance || '').trim(),
    createdAt: normalizeNumber(value?.createdAt),
    updatedAt: normalizeNumber(value?.updatedAt),
  };
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getAttendanceDays(daysOfAttendance: string): string[] {
  return daysOfAttendance
    .split(',')
    .map(day => day.trim())
    .filter(Boolean);
}

function buildDaysOfAttendance(existingDays: string, selectedDateKey: string): string {
  const attendanceDays = getAttendanceDays(existingDays);

  if (attendanceDays.includes(selectedDateKey)) {
    return attendanceDays.join(', ');
  }

  return [...attendanceDays, selectedDateKey].sort().join(', ');
}

function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      key: formatDateKey(date),
      dayNumber: date.getDate(),
      date,
      isCurrentMonth: date.getMonth() === month,
      isSunday: date.getDay() === 0,
    };
  });
}

function getFirstSundayInMay(year: number): Date {
  const mayFirst = new Date(year, 4, 1);
  const firstSunday = new Date(mayFirst);
  const daysUntilSunday = (7 - mayFirst.getDay()) % 7;

  firstSunday.setDate(mayFirst.getDate() + daysUntilSunday);

  return firstSunday;
}

function buildSundayDateKeysFromStart(startDate: Date, endDate: Date): string[] {
  const sundayDateKeys: string[] = [];
  const cursor = new Date(startDate);

  cursor.setHours(0, 0, 0, 0);

  const cleanEndDate = new Date(endDate);
  cleanEndDate.setHours(0, 0, 0, 0);

  while (cursor <= cleanEndDate) {
    sundayDateKeys.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return sundayDateKeys;
}

function parseDateKeyToTime(dateKey: string): number {
  const parsedDate = new Date(`${dateKey}T00:00:00`);

  return parsedDate.getTime();
}

const emptyPersonForm: AttendancePersonForm = {
  firstName: '',
  lastName: '',
  arabicFirstName: '',
  arabicLastName: '',
  phoneNumber: '',
  email: '',
  photoBase64: '',
};


const attendanceResponsiveStyles = `
  .attendance-page-root,
  .attendance-page-root * {
    box-sizing: border-box;
    min-width: 0;
  }

  .attendance-page-root {
    max-width: 100vw;
    overflow-x: hidden;
  }

  .attendance-page-root div,
  .attendance-page-root span,
  .attendance-page-root p,
  .attendance-page-root button {
    overflow-wrap: anywhere;
  }

  .attendance-page-root input,
  .attendance-page-root button {
    max-width: 100%;
  }

  .attendance-page-root svg {
    flex-shrink: 0;
    max-width: 100%;
  }

  @media (max-width: 640px) {
    html,
    body {
      max-width: 100%;
      overflow-x: hidden;
    }

    body {
      margin: 0;
    }

    .attendance-page-root {
      padding: 12px !important;
    }

    .attendance-page-root > div {
      max-width: 100% !important;
    }

    .attendance-access-card,
    .attendance-main-card,
    .attendance-page-root section {
      border-radius: 20px !important;
      padding: 18px 14px !important;
    }

    .attendance-page-root h1 {
      font-size: 24px !important;
      line-height: 1.2 !important;
    }

    .attendance-page-root h2 {
      font-size: 21px !important;
      line-height: 1.25 !important;
      flex-wrap: wrap;
    }

    .attendance-page-root h3 {
      font-size: 17px !important;
      line-height: 1.25 !important;
      flex-wrap: wrap;
    }

    .attendance-page-root p {
      font-size: 14px !important;
    }

    .attendance-page-root button {
      white-space: normal !important;
    }

    .attendance-section-header {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
      margin-bottom: 20px !important;
    }

    .attendance-calendar-card {
      border-radius: 18px !important;
      padding: 12px !important;
    }

    .attendance-calendar-header {
      gap: 8px !important;
      margin-bottom: 12px !important;
    }

    .attendance-calendar-header button {
      width: 38px !important;
      height: 38px !important;
      min-height: 38px !important;
      padding: 0 !important;
      flex: 0 0 38px;
    }

    .attendance-month-label {
      font-size: 18px !important;
      line-height: 1.2 !important;
    }

    .attendance-weekday-grid,
    .attendance-calendar-grid {
      gap: 4px !important;
    }

    .attendance-weekday-grid div {
      font-size: 11px !important;
      padding: 6px 0 !important;
    }

    .attendance-calendar-grid button {
      min-height: 42px !important;
      border-radius: 12px !important;
      font-size: 16px !important;
      padding: 0 !important;
    }

    .attendance-person-grid-row {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    .attendance-person-action,
    .attendance-analysis-stat-card {
      width: 100% !important;
      min-width: 0 !important;
    }

    .attendance-person-identity {
      align-items: center !important;
      gap: 12px !important;
    }

    .attendance-person-photo {
      width: 68px !important;
      height: 68px !important;
      flex-basis: 68px !important;
    }

    .attendance-photo-editor {
      align-items: center !important;
      flex-direction: column !important;
      text-align: center !important;
    }

    .attendance-photo-preview {
      width: 132px !important;
      height: 132px !important;
    }

    .attendance-modal-overlay {
      padding: 10px !important;
    }

    .attendance-modal-card {
      width: 100% !important;
      max-width: 100% !important;
      max-height: calc(100vh - 20px) !important;
      border-radius: 20px !important;
      padding: 18px 14px !important;
    }

    .attendance-page-root svg[width="360"],
    .attendance-page-root svg[width="520"] {
      width: 100% !important;
      height: auto !important;
    }
  }
`;

function AttendanceManagement() {
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';

  const [activePanel, setActivePanel] = useState<'menu' | 'people' | 'attendance' | 'analysis'>('menu');

  const [people, setPeople] = useState<AttendancePerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [personForm, setPersonForm] = useState<AttendancePersonForm>(emptyPersonForm);
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [isReadingPersonPhoto, setIsReadingPersonPhoto] = useState(false);
  const personPhotoInputRef = useRef<HTMLInputElement>(null);

  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState('');
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
  const [isSavingAttendanceForId, setIsSavingAttendanceForId] = useState('');
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState('');
  const [selectedAnalysisPersonId, setSelectedAnalysisPersonId] = useState('');

  const text = {
    accessTitle: isArabic ? 'الدخول إلى الحضور' : 'Attendance Access',
    accessDescription: isArabic
      ? 'أدخل رمز حضور اليوم للمتابعة.'
      : "Enter today's attendance passcode to continue.",
    passcodePlaceholder: isArabic ? 'رمز من 4 أرقام' : '4-digit code',
    incorrectPasscode: isArabic
      ? 'رمز غير صحيح. حاول مرة أخرى.'
      : 'Incorrect passcode. Please try again.',
    proceed: isArabic ? 'متابعة' : 'Proceed',

    pageTitle: isArabic ? 'صفحة الحضور' : 'Attendance Page',
    pageDescription: isArabic
      ? 'اختر الإجراء الذي تريد تنفيذه.'
      : 'Choose the action you want to perform.',
    addModifyPerson: isArabic ? 'إضافة أو تعديل شخص' : 'Add / Modify Person',
    takeAttendance: isArabic ? 'تسجيل الحضور' : 'Take Attendance',

    peopleTitle: isArabic ? 'إضافة أو تعديل الأشخاص' : 'Add or Modify People',
    peopleDescription: isArabic
      ? 'أضف شخصاً جديداً أو ابحث عن شخص موجود لتعديل بياناته.'
      : 'Add a new person or search for an existing person to modify their details.',
    englishNameSection: isArabic ? 'الاسم بالإنجليزية' : 'English Name',
    arabicNameSection: isArabic ? 'الاسم بالعربية' : 'Arabic Name',
    firstName: isArabic ? 'الاسم الأول' : 'First Name',
    lastName: isArabic ? 'اسم العائلة' : 'Last Name',
    arabicFirstName: isArabic ? 'الاسم الأول بالعربية' : 'Arabic First Name',
    arabicLastName: isArabic ? 'اسم العائلة بالعربية' : 'Arabic Last Name',
    phoneNumber: isArabic ? 'رقم الهاتف' : 'Phone Number',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    personPhoto: isArabic ? 'صورة الشخص' : 'Person Photo',
    photoDescription: isArabic
      ? 'اختياري. يتم حفظ الصورة بصيغة Base64 داخل سجل الشخص.'
      : 'Optional. The image is stored as Base64 inside the person record.',
    selectPhoto: isArabic ? 'اختيار صورة' : 'Select Photo',
    replacePhoto: isArabic ? 'استبدال الصورة' : 'Replace Photo',
    removePhoto: isArabic ? 'حذف الصورة' : 'Remove Photo',
    readingPhoto: isArabic ? 'جار تجهيز الصورة...' : 'Preparing photo...',
    invalidPhotoType: isArabic
      ? 'اختر ملف صورة صالحاً.'
      : 'Choose a valid image file.',
    photoTooLarge: isArabic
      ? `يجب ألا يتجاوز حجم الصورة ${(MAX_IMAGE_SIZE_BYTES / 1_000_000).toFixed(1)} ميجابايت.`
      : `The image must not exceed ${(MAX_IMAGE_SIZE_BYTES / 1_000_000).toFixed(1)} MB.`,
    failedReadPhoto: isArabic
      ? 'تعذر قراءة الصورة المختارة.'
      : 'The selected photo could not be read.',
    daysOfAttendance: isArabic ? 'أيام الحضور' : 'Days of Attendance',
    daysStoredOnly: isArabic
      ? 'يتم حفظ هذا الحقل تلقائياً ولا يتم إدخاله عند إضافة الشخص.'
      : 'This field is stored automatically and is not entered when adding a person.',
    searchPlaceholder: isArabic
      ? 'ابحث بالاسم العربي أو الإنجليزي أو الهاتف أو البريد الإلكتروني...'
      : 'Search by Arabic name, English name, phone, or email...',
    newPerson: isArabic ? 'شخص جديد' : 'New Person',
    savePerson: isArabic ? 'حفظ الشخص' : 'Save Person',
    updatePerson: isArabic ? 'تحديث الشخص' : 'Update Person',
    saving: isArabic ? 'جار الحفظ...' : 'Saving...',
    reset: isArabic ? 'إعادة ضبط' : 'Reset',
    backToMenu: isArabic ? 'العودة للقائمة' : 'Back to Menu',
    existingPeople: isArabic ? 'الأشخاص المسجلون' : 'Existing People',
    noPeople: isArabic ? 'لا يوجد أشخاص مسجلون بعد.' : 'No people saved yet.',
    noSearchResults: isArabic ? 'لا توجد نتائج مطابقة.' : 'No matching results.',
    loadingPeople: isArabic ? 'جار تحميل الأشخاص...' : 'Loading people...',
    failedLoadPeople: isArabic ? 'فشل تحميل الأشخاص.' : 'Failed to load people.',
    missingRequired: isArabic
      ? 'الاسم الأول واسم العائلة بالإنجليزية مطلوبان.'
      : 'English first name and English last name are required.',
    savedSuccessfully: isArabic ? 'تم حفظ الشخص بنجاح.' : 'Person saved successfully.',
    failedSavePerson: isArabic
      ? 'فشل حفظ الشخص في قاعدة البيانات.'
      : 'Failed to save person to the database.',

    attendanceTitle: isArabic ? 'تسجيل حضور الأحد' : 'Sunday Attendance',
    attendanceDescription: isArabic
      ? 'اختر يوم الأحد مرة واحدة، ثم ابحث عن الأشخاص واضغط زر الحضور لكل شخص.'
      : 'Select the Sunday once, then search for people and mark each person as attended.',
    selectSunday: isArabic ? 'اختر يوم الأحد' : 'Select Sunday',
    selectedDay: isArabic ? 'اليوم المختار' : 'Selected Day',
    noSelectedDay: isArabic ? 'اختر يوم أحد أولاً.' : 'Select a Sunday first.',
    sundayOnly: isArabic ? 'الأحد فقط قابل للاختيار.' : 'Only Sundays are selectable.',
    previousMonth: isArabic ? 'الشهر السابق' : 'Previous Month',
    nextMonth: isArabic ? 'الشهر التالي' : 'Next Month',
    attendanceSearchPlaceholder: isArabic
      ? 'ابحث عن شخص لتسجيل حضوره...'
      : 'Search for a person to mark attendance...',
    attended: isArabic ? 'حضر' : 'Attended',
    markAttended: isArabic ? 'تسجيل الحضور' : 'Mark Attended',
    alreadyAttended: isArabic ? 'مسجل بالفعل لهذا اليوم' : 'Already marked for this day',
    selectSundayBeforeMarking: isArabic
      ? 'اختر يوم الأحد قبل تسجيل الحضور.'
      : 'Select a Sunday before marking attendance.',
    savedAttendance: isArabic ? 'تم تسجيل الحضور.' : 'Attendance saved.',
    failedSaveAttendance: isArabic
      ? 'فشل تسجيل الحضور في قاعدة البيانات.'
      : 'Failed to save attendance to the database.',
    noAttendanceSearchResults: isArabic
      ? 'لا يوجد أشخاص مطابقون للبحث.'
      : 'No matching people found.',

    analysis: isArabic ? 'التحليل' : 'Analysis',
    analysisTitle: isArabic ? 'تحليل الحضور' : 'Attendance Analysis',
    analysisDescription: isArabic
      ? 'ابحث عن الأشخاص وشاهد عدد مرات حضورهم منذ أول أحد في شهر مايو، مع رسوم بسيطة للتحليل.'
      : 'Search people and see how many Sundays they attended since the first Sunday in May, with simple analysis plots.',
    analysisStartDate: isArabic ? 'تاريخ بداية التحليل' : 'Analysis Start Date',
    totalSundays: isArabic ? 'عدد أيام الأحد منذ البداية' : 'Total Sundays Since Start',
    totalPeople: isArabic ? 'إجمالي الأشخاص' : 'Total People',
    averageAttendance: isArabic ? 'متوسط الحضور لكل أحد' : 'Average Attendance per Sunday',
    analysisSearchPlaceholder: isArabic
      ? 'ابحث عن شخص لتحليل حضوره...'
      : 'Search for a person to analyze attendance...',
    attendanceCount: isArabic ? 'عدد مرات الحضور' : 'Attendance Count',
    attendanceRate: isArabic ? 'نسبة الحضور' : 'Attendance Rate',
    weeklyAttendancePlot: isArabic ? 'رسم الحضور حسب الأحد' : 'Weekly Attendance Plot',
    topAttendeesPlot: isArabic ? 'رسم أكثر الأشخاص حضوراً' : 'Top Attendees Plot',
    noAttendanceData: isArabic
      ? 'لا توجد بيانات حضور منذ بداية التحليل.'
      : 'No attendance data since the analysis start date.',
    noAnalysisResults: isArabic
      ? 'لا توجد نتائج تحليل مطابقة للبحث.'
      : 'No matching analysis results.',
    viewFullStats: isArabic ? 'عرض التحليل الكامل' : 'View Full Stats',
    close: isArabic ? 'إغلاق' : 'Close',
    personalAnalysis: isArabic ? 'تحليل شخصي كامل' : 'Full Personal Analysis',
    attendedSundays: isArabic ? 'أيام الأحد التي حضرها' : 'Attended Sundays',
    missedSundays: isArabic ? 'أيام الأحد التي لم يحضرها' : 'Missed Sundays',
    missedCount: isArabic ? 'عدد مرات الغياب' : 'Missed Count',
    attendanceTimeline: isArabic ? 'الخط الزمني للحضور' : 'Attendance Timeline',
    cumulativeAttendanceLine: isArabic ? 'خط الحضور التراكمي' : 'Cumulative Attendance Line',
    weeklyAttendanceLine: isArabic ? 'خط الحضور الأسبوعي العام' : 'Overall Weekly Attendance Line',
    attendanceHistogram: isArabic ? 'هيستوجرام عدد مرات الحضور' : 'Attendance Count Histogram',
    attendanceRateHistogram: isArabic ? 'هيستوجرام نسب الحضور' : 'Attendance Rate Histogram',
    distributionAnalytics: isArabic ? 'تحليل التوزيعات' : 'Distribution Analytics',
    present: isArabic ? 'حاضر' : 'Present',
    absent: isArabic ? 'غائب' : 'Absent',
    attendedLabel: isArabic ? 'حضور' : 'Attended',
    missedLabel: isArabic ? 'غياب' : 'Missed',
    dateAttendanceLine: isArabic ? 'خط التاريخ مقابل الحضور (0/1)' : 'Date vs Attendance (0/1) Line Plot',
    attendanceDonut: isArabic ? 'مخطط دائري للحضور مقابل الغياب' : 'Attendance vs Missed Donut Chart',
    presentValue: isArabic ? 'قيمة الحضور = 1' : 'Present = 1',
    absentValue: isArabic ? 'قيمة الغياب = 0' : 'Absent = 0',
    attendedPercent: isArabic ? 'نسبة الحضور' : 'Attended Percent',
    missedPercent: isArabic ? 'نسبة الغياب' : 'Missed Percent',
  };

  const weekDayLabels = isArabic
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthLabel = calendarMonthDate.toLocaleDateString(isArabic ? 'ar' : 'en', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonthDate), [calendarMonthDate]);

  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      const aName = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
      const bName = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [people]);

  const filteredPeople = useMemo(() => {
    const cleanedSearch = searchTerm.trim().toLowerCase();

    if (!cleanedSearch) return sortedPeople;

    return sortedPeople.filter(person => {
      const searchableText = [
        person.firstName,
        person.lastName,
        person.arabicFirstName,
        person.arabicLastName,
        person.phoneNumber,
        person.email,
        person.daysOfAttendance,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(cleanedSearch);
    });
  }, [searchTerm, sortedPeople]);

  const filteredAttendancePeople = useMemo(() => {
    const cleanedSearch = attendanceSearchTerm.trim().toLowerCase();

    if (!cleanedSearch) return sortedPeople;

    return sortedPeople.filter(person => {
      const searchableText = [
        person.firstName,
        person.lastName,
        person.arabicFirstName,
        person.arabicLastName,
        person.phoneNumber,
        person.email,
        person.daysOfAttendance,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(cleanedSearch);
    });
  }, [attendanceSearchTerm, sortedPeople]);

  const analysisStartDate = useMemo(() => getFirstSundayInMay(new Date().getFullYear()), []);

  const analysisStartDateKey = useMemo(() => formatDateKey(analysisStartDate), [analysisStartDate]);

  const sundayDateKeysSinceStart = useMemo(() => {
    return buildSundayDateKeysFromStart(analysisStartDate, new Date());
  }, [analysisStartDate]);

  const personAttendanceAnalysis = useMemo<PersonAttendanceAnalysis[]>(() => {
    const startTime = analysisStartDate.getTime();
    const totalSundays = Math.max(1, sundayDateKeysSinceStart.length);

    return sortedPeople.map(person => {
      const attendedDates = getAttendanceDays(person.daysOfAttendance)
        .filter(dateKey => parseDateKeyToTime(dateKey) >= startTime)
        .sort();

      return {
        person,
        attendedDates,
        attendanceCount: attendedDates.length,
        attendanceRate: Math.round((attendedDates.length / totalSundays) * 100),
      };
    });
  }, [analysisStartDate, sortedPeople, sundayDateKeysSinceStart.length]);

  const filteredPersonAttendanceAnalysis = useMemo(() => {
    const cleanedSearch = analysisSearchTerm.trim().toLowerCase();

    if (!cleanedSearch) return personAttendanceAnalysis;

    return personAttendanceAnalysis.filter(item => {
      const person = item.person;
      const searchableText = [
        person.firstName,
        person.lastName,
        person.arabicFirstName,
        person.arabicLastName,
        person.phoneNumber,
        person.email,
        person.daysOfAttendance,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(cleanedSearch);
    });
  }, [analysisSearchTerm, personAttendanceAnalysis]);


  const selectedPersonAttendanceAnalysis = useMemo(() => {
    if (!selectedAnalysisPersonId) return null;

    return personAttendanceAnalysis.find(item => item.person.firebaseId === selectedAnalysisPersonId) || null;
  }, [personAttendanceAnalysis, selectedAnalysisPersonId]);

  const selectedPersonMissedDates = useMemo(() => {
    if (!selectedPersonAttendanceAnalysis) return [];

    const attendedDateSet = new Set(selectedPersonAttendanceAnalysis.attendedDates);
    return sundayDateKeysSinceStart.filter(dateKey => !attendedDateSet.has(dateKey));
  }, [selectedPersonAttendanceAnalysis, sundayDateKeysSinceStart]);

  const selectedPersonTimeline = useMemo(() => {
    if (!selectedPersonAttendanceAnalysis) return [];

    const attendedDateSet = new Set(selectedPersonAttendanceAnalysis.attendedDates);
    let cumulativeAttendance = 0;

    return sundayDateKeysSinceStart.map((dateKey, index) => {
      const attended = attendedDateSet.has(dateKey);
      if (attended) cumulativeAttendance += 1;

      return {
        dateKey,
        index: index + 1,
        attended,
        cumulativeAttendance,
      };
    });
  }, [selectedPersonAttendanceAnalysis, sundayDateKeysSinceStart]);

  const attendanceCountHistogram = useMemo(() => {
    const histogram = new Map<number, number>();

    personAttendanceAnalysis.forEach(item => {
      histogram.set(item.attendanceCount, (histogram.get(item.attendanceCount) || 0) + 1);
    });

    return Array.from(histogram.entries())
      .map(([attendanceCount, peopleCount]) => ({ attendanceCount, peopleCount }))
      .sort((a, b) => a.attendanceCount - b.attendanceCount);
  }, [personAttendanceAnalysis]);

  const attendanceRateHistogram = useMemo(() => {
    const buckets = [
      { label: '0–20%', min: 0, max: 20, peopleCount: 0 },
      { label: '21–40%', min: 21, max: 40, peopleCount: 0 },
      { label: '41–60%', min: 41, max: 60, peopleCount: 0 },
      { label: '61–80%', min: 61, max: 80, peopleCount: 0 },
      { label: '81–100%', min: 81, max: 100, peopleCount: 0 },
    ];

    personAttendanceAnalysis.forEach(item => {
      const bucket = buckets.find(currentBucket => item.attendanceRate >= currentBucket.min && item.attendanceRate <= currentBucket.max);
      if (bucket) bucket.peopleCount += 1;
    });

    return buckets;
  }, [personAttendanceAnalysis]);

  const maxAttendanceCountHistogramPeople = useMemo(() => {
    return Math.max(1, ...attendanceCountHistogram.map(item => item.peopleCount));
  }, [attendanceCountHistogram]);

  const maxAttendanceRateHistogramPeople = useMemo(() => {
    return Math.max(1, ...attendanceRateHistogram.map(item => item.peopleCount));
  }, [attendanceRateHistogram]);

  const weeklyAttendanceSummary = useMemo<WeeklyAttendanceSummary[]>(() => {
    return sundayDateKeysSinceStart.map(dateKey => ({
      dateKey,
      attendedCount: people.filter(person => getAttendanceDays(person.daysOfAttendance).includes(dateKey)).length,
    }));
  }, [people, sundayDateKeysSinceStart]);

  const maxWeeklyAttendanceCount = useMemo(() => {
    return Math.max(1, ...weeklyAttendanceSummary.map(item => item.attendedCount));
  }, [weeklyAttendanceSummary]);

  const topAttendanceAnalysis = useMemo(() => {
    return [...personAttendanceAnalysis]
      .sort((a, b) => {
        if (b.attendanceCount !== a.attendanceCount) return b.attendanceCount - a.attendanceCount;

        const aName = `${a.person.firstName} ${a.person.lastName}`.trim();
        const bName = `${b.person.firstName} ${b.person.lastName}`.trim();

        return aName.localeCompare(bName);
      })
      .slice(0, 10);
  }, [personAttendanceAnalysis]);

  const maxPersonAttendanceCount = useMemo(() => {
    return Math.max(1, ...topAttendanceAnalysis.map(item => item.attendanceCount));
  }, [topAttendanceAnalysis]);

  const totalRecordedAttendanceSinceStart = useMemo(() => {
    return personAttendanceAnalysis.reduce((total, item) => total + item.attendanceCount, 0);
  }, [personAttendanceAnalysis]);

  const averageAttendancePerSunday = useMemo(() => {
    if (!sundayDateKeysSinceStart.length) return 0;

    return Math.round((totalRecordedAttendanceSinceStart / sundayDateKeysSinceStart.length) * 10) / 10;
  }, [sundayDateKeysSinceStart.length, totalRecordedAttendanceSinceStart]);

  useEffect(() => {
    setIsLoadingPeople(true);
    setPeopleError('');

    const peopleRef = ref(database, 'attendance/people/');

    const unsubscribe = onValue(
      peopleRef,
      snapshot => {
        const rawPeople = snapshot.val() as Record<string, any> | null;

        const loadedPeople = Object.entries(rawPeople || {})
          .map(([firebaseId, value]) => normalizePerson(firebaseId, value))
          .filter(person => (
            person.firstName ||
            person.lastName ||
            person.arabicFirstName ||
            person.arabicLastName ||
            person.email ||
            person.phoneNumber
          ));

        setPeople(loadedPeople);
        setIsLoadingPeople(false);
      },
      error => {
        console.error('Failed to load attendance people:', error);
        setPeopleError(text.failedLoadPeople);
        setIsLoadingPeople(false);
      }
    );

    return () => unsubscribe();
  }, [text.failedLoadPeople]);

  const resetPersonForm = () => {
    setSelectedPersonId('');
    setPersonForm(emptyPersonForm);
  };

  const handleSelectPerson = (person: AttendancePerson) => {
    setSelectedPersonId(person.firebaseId);
    setPersonForm({
      firstName: person.firstName,
      lastName: person.lastName,
      arabicFirstName: person.arabicFirstName,
      arabicLastName: person.arabicLastName,
      phoneNumber: person.phoneNumber,
      email: person.email,
      photoBase64: person.photoBase64,
    });
  };

  const handlePersonPhotoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      alert(text.invalidPhotoType);
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      alert(text.photoTooLarge);
      return;
    }

    setIsReadingPersonPhoto(true);

    try {
      const dataUrl = await fileToDataUrl(selectedFile);

      setPersonForm((previous) => ({
        ...previous,
        photoBase64: dataUrl,
      }));
    } catch (error) {
      console.error('Failed to read attendance person photo:', error);
      alert(text.failedReadPhoto);
    } finally {
      setIsReadingPersonPhoto(false);
    }
  };

  const removePersonPhoto = () => {
    setPersonForm((previous) => ({
      ...previous,
      photoBase64: '',
    }));
  };

  const handleSavePerson = async () => {
    const cleanedFirstName = personForm.firstName.trim();
    const cleanedLastName = personForm.lastName.trim();
    const cleanedArabicFirstName = personForm.arabicFirstName.trim();
    const cleanedArabicLastName = personForm.arabicLastName.trim();
    const cleanedPhoneNumber = personForm.phoneNumber.trim();
    const cleanedEmail = personForm.email.trim();

    if (!cleanedFirstName || !cleanedLastName) {
      alert(text.missingRequired);
      return;
    }

    setIsSavingPerson(true);

    try {
      const now = Date.now();
      const existingPerson = selectedPersonId
        ? people.find(person => person.firebaseId === selectedPersonId)
        : null;

      const payload = {
        firstName: cleanedFirstName,
        lastName: cleanedLastName,
        arabicFirstName: cleanedArabicFirstName,
        arabicLastName: cleanedArabicLastName,
        phoneNumber: cleanedPhoneNumber,
        email: cleanedEmail,
        photoBase64: personForm.photoBase64,
        daysOfAttendance: existingPerson?.daysOfAttendance || '',
        createdAt: existingPerson?.createdAt || now,
        updatedAt: now,
      };

      if (selectedPersonId) {
        await set(ref(database, `attendance/people/${selectedPersonId}`), payload);
      } else {
        await push(ref(database, 'attendance/people/'), payload);
      }

      alert(text.savedSuccessfully);
      resetPersonForm();
    } catch (err) {
      console.error('Failed to save attendance person:', err);
      alert(text.failedSavePerson);
    } finally {
      setIsSavingPerson(false);
    }
  };

  const moveCalendarMonth = (direction: 'previous' | 'next') => {
    setCalendarMonthDate(prev => {
      const nextDate = new Date(prev);
      nextDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return nextDate;
    });
  };

  const handleSelectAttendanceDate = (calendarDay: CalendarDay) => {
    if (!calendarDay.isCurrentMonth || !calendarDay.isSunday) return;

    setSelectedAttendanceDate(calendarDay.key);
  };

  const hasPersonAttendedSelectedDate = (person: AttendancePerson): boolean => {
    if (!selectedAttendanceDate) return false;

    return getAttendanceDays(person.daysOfAttendance).includes(selectedAttendanceDate);
  };

  const handleMarkAttendance = async (person: AttendancePerson) => {
    if (!selectedAttendanceDate) {
      alert(text.selectSundayBeforeMarking);
      return;
    }

    if (hasPersonAttendedSelectedDate(person)) return;

    setIsSavingAttendanceForId(person.firebaseId);

    try {
      const now = Date.now();
      const updatedDaysOfAttendance = buildDaysOfAttendance(person.daysOfAttendance, selectedAttendanceDate);

      await set(ref(database, `attendance/people/${person.firebaseId}`), {
        firstName: person.firstName,
        lastName: person.lastName,
        arabicFirstName: person.arabicFirstName,
        arabicLastName: person.arabicLastName,
        phoneNumber: person.phoneNumber,
        email: person.email,
        photoBase64: person.photoBase64,
        daysOfAttendance: updatedDaysOfAttendance,
        createdAt: person.createdAt || now,
        updatedAt: now,
      });

      alert(text.savedAttendance);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert(text.failedSaveAttendance);
    } finally {
      setIsSavingAttendanceForId('');
    }
  };

  return (
    <div
      dir={dir}
      className="attendance-page-root"
      style={{
        minHeight: 'auto',
        padding: '0',
        fontFamily: 'Arial, sans-serif',
        background: 'transparent',
      }}
    >
      <style>{attendanceResponsiveStyles}</style>
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          margin: '0 auto',
        }}
      >
        <div
          className="attendance-main-card"
          style={{
            background: 'white',
            borderRadius: '28px',
            padding: '40px',
            boxShadow: '0 12px 35px rgba(139, 30, 30, 0.14)',
            border: '1px solid rgba(139, 30, 30, 0.12)',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              margin: '0 0 12px',
              color: '#8b1e1e',
              fontSize: '32px',
              fontWeight: 800,
            }}
          >
            {text.pageTitle}
          </h1>

          <p
            style={{
              margin: '0 0 32px',
              color: '#666',
              fontSize: '17px',
              lineHeight: 1.6,
            }}
          >
            {text.pageDescription}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '520px',
              margin: '0 auto',
            }}
          >
            <button
              type="button"
              onClick={() => setActivePanel('people')}
              style={{
                width: '100%',
                minHeight: '58px',
                border: '2px solid #8b1e1e',
                borderRadius: '999px',
                background: activePanel === 'people' ? '#8b1e1e' : 'white',
                color: activePanel === 'people' ? 'white' : '#8b1e1e',
                fontSize: '18px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: activePanel === 'people' ? '0 8px 24px rgba(139, 30, 30, 0.22)' : 'none',
              }}
            >
              <UserPlus size={20} />
              {text.addModifyPerson}
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('attendance')}
              style={{
                width: '100%',
                minHeight: '58px',
                border: '2px solid #8b1e1e',
                borderRadius: '999px',
                background: activePanel === 'attendance' ? '#8b1e1e' : 'white',
                color: activePanel === 'attendance' ? 'white' : '#8b1e1e',
                fontSize: '18px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: activePanel === 'attendance' ? '0 8px 24px rgba(139, 30, 30, 0.22)' : 'none',
              }}
            >
              <ClipboardList size={20} />
              {text.takeAttendance}
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('analysis')}
              style={{
                width: '100%',
                minHeight: '58px',
                border: '2px solid #8b1e1e',
                borderRadius: '999px',
                background: activePanel === 'analysis' ? '#8b1e1e' : 'white',
                color: activePanel === 'analysis' ? 'white' : '#8b1e1e',
                fontSize: '18px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: activePanel === 'analysis' ? '0 8px 24px rgba(139, 30, 30, 0.22)' : 'none',
              }}
            >
              <BarChart3 size={20} />
              {text.analysis}
            </button>
          </div>
        </div>

        {activePanel === 'people' && (
          <section
            style={{
              marginTop: '28px',
              background: 'white',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 12px 35px rgba(139, 30, 30, 0.10)',
              border: '1px solid rgba(139, 30, 30, 0.10)',
            }}
          >
            <div
              className="attendance-section-header"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: '0 0 8px',
                    color: '#8b1e1e',
                    fontSize: '26px',
                    fontWeight: 800,
                  }}
                >
                  {text.peopleTitle}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    lineHeight: 1.6,
                  }}
                >
                  {text.peopleDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePanel('menu')}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  background: '#f5f4f0',
                  color: '#641414',
                  padding: '12px 18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {text.backToMenu}
              </button>
            </div>

            <div
              className="attendance-photo-editor"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '22px',
                marginBottom: '28px',
                padding: '20px',
                borderRadius: '22px',
                border: '1px solid rgba(139, 30, 30, 0.12)',
                background: '#fffafa',
              }}
            >
              <div
                className="attendance-photo-preview"
                style={{
                  width: '150px',
                  height: '150px',
                  flex: '0 0 150px',
                  overflow: 'hidden',
                  borderRadius: '24px',
                  border: personForm.photoBase64
                    ? '2px solid rgba(139, 30, 30, 0.22)'
                    : '2px dashed rgba(139, 30, 30, 0.24)',
                  background: personForm.photoBase64 ? '#f5f4f0' : '#f8eeee',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {personForm.photoBase64 ? (
                  <img
                    src={personForm.photoBase64}
                    alt={text.personPhoto}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <UserPlus size={42} color="#8b1e1e" />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: '0 0 8px',
                    color: '#641414',
                    fontSize: '18px',
                    fontWeight: 800,
                  }}
                >
                  {text.personPhoto}
                </h3>

                <p
                  style={{
                    margin: '0 0 14px',
                    color: '#666',
                    fontSize: '14px',
                    lineHeight: 1.6,
                  }}
                >
                  {text.photoDescription}
                </p>

                <input
                  ref={personPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePersonPhotoSelected}
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => personPhotoInputRef.current?.click()}
                    disabled={isReadingPersonPhoto}
                    style={{
                      minHeight: '44px',
                      border: 'none',
                      borderRadius: '999px',
                      background: '#8b1e1e',
                      color: 'white',
                      padding: '0 18px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isReadingPersonPhoto ? 'not-allowed' : 'pointer',
                      opacity: isReadingPersonPhoto ? 0.65 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isReadingPersonPhoto ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <ImagePlus size={17} />
                    )}
                    {isReadingPersonPhoto
                      ? text.readingPhoto
                      : personForm.photoBase64
                        ? text.replacePhoto
                        : text.selectPhoto}
                  </button>

                  {personForm.photoBase64 && (
                    <button
                      type="button"
                      onClick={removePersonPhoto}
                      disabled={isReadingPersonPhoto}
                      style={{
                        minHeight: '44px',
                        border: '1px solid #fecaca',
                        borderRadius: '999px',
                        background: '#fff1f2',
                        color: '#b91c1c',
                        padding: '0 18px',
                        fontSize: '14px',
                        fontWeight: 800,
                        cursor: isReadingPersonPhoto ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <Trash2 size={17} />
                      {text.removePhoto}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <h3
              style={{
                margin: '0 0 16px',
                color: '#641414',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              {text.englishNameSection}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.firstName}
                </label>
                <input
                  type="text"
                  value={personForm.firstName}
                  onChange={e => setPersonForm(prev => ({ ...prev, firstName: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.lastName}
                </label>
                <input
                  type="text"
                  value={personForm.lastName}
                  onChange={e => setPersonForm(prev => ({ ...prev, lastName: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>

            <h3
              style={{
                margin: '0 0 16px',
                color: '#641414',
                fontSize: '18px',
                fontWeight: 800,
              }}
            >
              {text.arabicNameSection}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.arabicFirstName}
                </label>
                <input
                  type="text"
                  value={personForm.arabicFirstName}
                  onChange={e => setPersonForm(prev => ({ ...prev, arabicFirstName: e.target.value }))}
                  dir="rtl"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                    textAlign: 'right',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.arabicLastName}
                </label>
                <input
                  type="text"
                  value={personForm.arabicLastName}
                  onChange={e => setPersonForm(prev => ({ ...prev, arabicLastName: e.target.value }))}
                  dir="rtl"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                    textAlign: 'right',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.phoneNumber}
                </label>
                <input
                  type="tel"
                  value={personForm.phoneNumber}
                  onChange={e => setPersonForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#777', fontWeight: 800, fontSize: '13px' }}>
                  {text.email}
                </label>
                <input
                  type="email"
                  value={personForm.email}
                  onChange={e => setPersonForm(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: '#f8eeee',
                color: '#641414',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {text.daysOfAttendance}: {text.daysStoredOnly}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '22px',
              }}
            >
              <button
                type="button"
                onClick={handleSavePerson}
                disabled={isSavingPerson}
                style={{
                  width: '100%',
                  minHeight: '54px',
                  border: 'none',
                  borderRadius: '999px',
                  background: '#8b1e1e',
                  color: 'white',
                  fontSize: '17px',
                  fontWeight: 800,
                  cursor: isSavingPerson ? 'not-allowed' : 'pointer',
                  opacity: isSavingPerson ? 0.65 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 24px rgba(139, 30, 30, 0.22)',
                }}
              >
                {isSavingPerson ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSavingPerson
                  ? text.saving
                  : selectedPersonId
                    ? text.updatePerson
                    : text.savePerson}
              </button>

              <button
                type="button"
                onClick={resetPersonForm}
                style={{
                  width: '100%',
                  minHeight: '50px',
                  border: '2px solid #8b1e1e',
                  borderRadius: '999px',
                  background: 'white',
                  color: '#8b1e1e',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {selectedPersonId ? text.newPerson : text.reset}
              </button>
            </div>

            <div
              style={{
                marginTop: '34px',
                borderTop: '1px solid #eee',
                paddingTop: '28px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  color: '#8b1e1e',
                  fontSize: '22px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Users size={22} />
                {text.existingPeople}
              </h3>

              <div
                style={{
                  position: 'relative',
                  marginBottom: '18px',
                }}
              >
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: dir === 'rtl' ? 'auto' : '16px',
                    right: dir === 'rtl' ? '16px' : 'auto',
                    color: '#8b1e1e',
                  }}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={text.searchPlaceholder}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: dir === 'rtl' ? '14px 46px 14px 16px' : '14px 16px 14px 46px',
                    borderRadius: '999px',
                    border: '1px solid #e5e0da',
                    outline: 'none',
                    fontSize: '15px',
                  }}
                />
              </div>

              {isLoadingPeople && (
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '18px',
                    background: '#f5f4f0',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Loader2 size={18} className="animate-spin" />
                  {text.loadingPeople}
                </div>
              )}

              {peopleError && (
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '18px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 800,
                  }}
                >
                  {peopleError}
                </div>
              )}

              {!isLoadingPeople && !peopleError && people.length === 0 && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '18px',
                    background: '#f5f4f0',
                    color: '#666',
                    textAlign: 'center',
                  }}
                >
                  {text.noPeople}
                </div>
              )}

              {!isLoadingPeople && !peopleError && people.length > 0 && filteredPeople.length === 0 && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '18px',
                    background: '#f5f4f0',
                    color: '#666',
                    textAlign: 'center',
                  }}
                >
                  {text.noSearchResults}
                </div>
              )}

              {!isLoadingPeople && !peopleError && filteredPeople.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  {filteredPeople.map(person => (
                    <button
                      key={person.firebaseId}
                      type="button"
                      onClick={() => handleSelectPerson(person)}
                      style={{
                        width: '100%',
                        textAlign: dir === 'rtl' ? 'right' : 'left',
                        border: selectedPersonId === person.firebaseId ? '2px solid #8b1e1e' : '1px solid #eee',
                        borderRadius: '18px',
                        padding: '16px',
                        background: selectedPersonId === person.firebaseId ? '#f8eeee' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        {person.photoBase64 && (
                          <img
                            src={person.photoBase64}
                            alt={`${person.firstName} ${person.lastName}`}
                            style={{
                              width: '54px',
                              height: '54px',
                              flex: '0 0 54px',
                              objectFit: 'cover',
                              borderRadius: '16px',
                              border: '1px solid rgba(139, 30, 30, 0.16)',
                              background: '#f5f4f0',
                            }}
                          />
                        )}

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: '#641414',
                              fontSize: '17px',
                              fontWeight: 800,
                              marginBottom: '6px',
                            }}
                          >
                            {person.firstName} {person.lastName}
                          </div>

                          {(person.arabicFirstName || person.arabicLastName) && (
                            <div
                              dir="rtl"
                              style={{
                                color: '#8b1e1e',
                                fontSize: '16px',
                                fontWeight: 800,
                                marginBottom: '6px',
                                textAlign: 'right',
                              }}
                            >
                              {person.arabicFirstName} {person.arabicLastName}
                            </div>
                          )}
                        </div>
                      </div>

                      {(person.arabicFirstName || person.arabicLastName) && (
                        <div
                          dir="rtl"
                          style={{
                            color: '#8b1e1e',
                            fontSize: '16px',
                            fontWeight: 800,
                            marginBottom: '6px',
                            textAlign: 'right',
                          }}
                        >
                          {person.arabicFirstName} {person.arabicLastName}
                        </div>
                      )}

                      <div
                        style={{
                          color: '#777',
                          fontSize: '14px',
                          lineHeight: 1.6,
                        }}
                      >
                        {person.phoneNumber || '—'} · {person.email || '—'}
                      </div>

                      <div
                        style={{
                          color: '#8b1e1e',
                          fontSize: '13px',
                          fontWeight: 700,
                          marginTop: '6px',
                        }}
                      >
                        {text.daysOfAttendance}: {person.daysOfAttendance || '—'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activePanel === 'attendance' && (
          <section
            style={{
              marginTop: '28px',
              background: 'white',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 12px 35px rgba(139, 30, 30, 0.10)',
              border: '1px solid rgba(139, 30, 30, 0.10)',
            }}
          >
            <div
              className="attendance-section-header"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: '0 0 8px',
                    color: '#8b1e1e',
                    fontSize: '26px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <ClipboardList size={28} />
                  {text.attendanceTitle}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    lineHeight: 1.6,
                  }}
                >
                  {text.attendanceDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePanel('menu')}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  background: '#f5f4f0',
                  color: '#641414',
                  padding: '12px 18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {text.backToMenu}
              </button>
            </div>

            <div
              className="attendance-calendar-card"
              style={{
                border: '1px solid rgba(139, 30, 30, 0.10)',
                borderRadius: '24px',
                padding: '22px',
                background: '#fffaf7',
                marginBottom: '28px',
              }}
            >
              <div
                className="attendance-calendar-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  marginBottom: '18px',
                }}
              >
                <button
                  type="button"
                  onClick={() => moveCalendarMonth('previous')}
                  aria-label={text.previousMonth}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid rgba(139, 30, 30, 0.16)',
                    background: 'white',
                    color: '#8b1e1e',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {isArabic ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div
                    className="attendance-month-label"
                    style={{
                      color: '#8b1e1e',
                      fontSize: '24px',
                      fontWeight: 900,
                    }}
                  >
                    {monthLabel}
                  </div>
                  <div
                    style={{
                      color: '#777',
                      fontSize: '13px',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    {text.sundayOnly}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => moveCalendarMonth('next')}
                  aria-label={text.nextMonth}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid rgba(139, 30, 30, 0.16)',
                    background: 'white',
                    color: '#8b1e1e',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {isArabic ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
              </div>

              <div
                className="attendance-weekday-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                {weekDayLabels.map(day => (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      color: '#641414',
                      fontSize: '13px',
                      fontWeight: 900,
                      padding: '8px 4px',
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div
                className="attendance-calendar-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '8px',
                }}
              >
                {calendarDays.map(calendarDay => {
                  const isSelected = selectedAttendanceDate === calendarDay.key;
                  const isSelectable = calendarDay.isCurrentMonth && calendarDay.isSunday;

                  return (
                    <button
                      key={calendarDay.key}
                      type="button"
                      onClick={() => handleSelectAttendanceDate(calendarDay)}
                      disabled={!isSelectable}
                      style={{
                        minHeight: '72px',
                        borderRadius: '18px',
                        border: isSelected
                          ? '2px solid #8b1e1e'
                          : isSelectable
                            ? '1px solid rgba(139, 30, 30, 0.22)'
                            : '1px solid #eee',
                        background: isSelected
                          ? '#8b1e1e'
                          : isSelectable
                            ? 'white'
                            : '#f5f4f0',
                        color: isSelected
                          ? 'white'
                          : isSelectable
                            ? '#8b1e1e'
                            : '#aaa',
                        cursor: isSelectable ? 'pointer' : 'not-allowed',
                        fontSize: '20px',
                        fontWeight: 900,
                        opacity: calendarDay.isCurrentMonth ? 1 : 0.35,
                        boxShadow: isSelected ? '0 8px 24px rgba(139, 30, 30, 0.20)' : 'none',
                      }}
                    >
                      {calendarDay.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: '16px 18px',
                borderRadius: '18px',
                background: selectedAttendanceDate ? '#f8eeee' : '#f5f4f0',
                color: selectedAttendanceDate ? '#641414' : '#666',
                fontWeight: 800,
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                textAlign: 'center',
              }}
            >
              <CalendarDays size={20} />
              {selectedAttendanceDate
                ? `${text.selectedDay}: ${selectedAttendanceDate}`
                : text.noSelectedDay}
            </div>

            <div
              style={{
                position: 'relative',
                marginBottom: '18px',
              }}
            >
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: dir === 'rtl' ? 'auto' : '16px',
                  right: dir === 'rtl' ? '16px' : 'auto',
                  color: '#8b1e1e',
                }}
              />
              <input
                type="text"
                value={attendanceSearchTerm}
                onChange={e => setAttendanceSearchTerm(e.target.value)}
                placeholder={text.attendanceSearchPlaceholder}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: dir === 'rtl' ? '14px 46px 14px 16px' : '14px 16px 14px 46px',
                  borderRadius: '999px',
                  border: '1px solid #e5e0da',
                  outline: 'none',
                  fontSize: '15px',
                }}
              />
            </div>

            {isLoadingPeople && (
              <div
                style={{
                  padding: '18px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Loader2 size={18} className="animate-spin" />
                {text.loadingPeople}
              </div>
            )}

            {peopleError && (
              <div
                style={{
                  padding: '18px',
                  borderRadius: '18px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  fontWeight: 800,
                }}
              >
                {peopleError}
              </div>
            )}

            {!isLoadingPeople && !peopleError && people.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  textAlign: 'center',
                }}
              >
                {text.noPeople}
              </div>
            )}

            {!isLoadingPeople && !peopleError && people.length > 0 && filteredAttendancePeople.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  textAlign: 'center',
                }}
              >
                {text.noAttendanceSearchResults}
              </div>
            )}

            {!isLoadingPeople && !peopleError && filteredAttendancePeople.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                }}
              >
                {filteredAttendancePeople.map(person => {
                  const alreadyAttended = hasPersonAttendedSelectedDate(person);
                  const isSavingThisPerson = isSavingAttendanceForId === person.firebaseId;

                  return (
                    <div
                      key={person.firebaseId}
                      className="attendance-person-grid-row"
                      style={{
                        width: '100%',
                        border: alreadyAttended ? '2px solid #15803d' : '1px solid #eee',
                        borderRadius: '18px',
                        padding: '16px',
                        background: alreadyAttended ? '#f0fdf4' : 'white',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        gap: '16px',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        className="attendance-person-identity"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          minWidth: 0,
                        }}
                      >
                        {person.photoBase64 && (
                          <img
                            className="attendance-person-photo"
                            src={person.photoBase64}
                            alt={`${person.firstName} ${person.lastName}`}
                            style={{
                              width: '84px',
                              height: '84px',
                              flex: '0 0 84px',
                              objectFit: 'cover',
                              borderRadius: '22px',
                              border: alreadyAttended
                                ? '2px solid #15803d'
                                : '2px solid rgba(139, 30, 30, 0.16)',
                              background: '#f5f4f0',
                              boxShadow: '0 6px 18px rgba(73, 20, 20, 0.10)',
                            }}
                          />
                        )}

                        <div
                          style={{
                            minWidth: 0,
                            textAlign: dir === 'rtl' ? 'right' : 'left',
                          }}
                        >
                          <div
                            style={{
                              color: '#641414',
                              fontSize: '17px',
                              fontWeight: 800,
                              marginBottom: '6px',
                            }}
                          >
                            {person.firstName} {person.lastName}
                          </div>

                          {(person.arabicFirstName || person.arabicLastName) && (
                            <div
                              dir="rtl"
                              style={{
                                color: '#8b1e1e',
                                fontSize: '16px',
                                fontWeight: 800,
                                marginBottom: '6px',
                                textAlign: 'right',
                              }}
                            >
                              {person.arabicFirstName} {person.arabicLastName}
                            </div>
                          )}

                          <div
                            style={{
                              color: '#777',
                              fontSize: '14px',
                              lineHeight: 1.6,
                            }}
                          >
                            {person.phoneNumber || '—'} · {person.email || '—'}
                          </div>

                          <div
                            style={{
                              color: '#8b1e1e',
                              fontSize: '13px',
                              fontWeight: 700,
                              marginTop: '6px',
                            }}
                          >
                            {text.daysOfAttendance}: {person.daysOfAttendance || '—'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="attendance-person-action"
                        onClick={() => handleMarkAttendance(person)}
                        disabled={!selectedAttendanceDate || alreadyAttended || !!isSavingAttendanceForId}
                        style={{
                          minHeight: '48px',
                          borderRadius: '999px',
                          border: alreadyAttended ? '2px solid #15803d' : '2px solid #8b1e1e',
                          background: alreadyAttended ? '#15803d' : '#8b1e1e',
                          color: 'white',
                          padding: '0 18px',
                          fontSize: '14px',
                          fontWeight: 900,
                          cursor: (!selectedAttendanceDate || alreadyAttended || !!isSavingAttendanceForId)
                            ? 'not-allowed'
                            : 'pointer',
                          opacity: (!selectedAttendanceDate && !alreadyAttended) || (!!isSavingAttendanceForId && !isSavingThisPerson)
                            ? 0.55
                            : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isSavingThisPerson ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : alreadyAttended ? (
                          <CheckCircle size={16} />
                        ) : (
                          <ClipboardList size={16} />
                        )}
                        {alreadyAttended ? text.alreadyAttended : text.markAttended}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activePanel === 'analysis' && (
          <section
            style={{
              marginTop: '28px',
              background: 'white',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 12px 35px rgba(139, 30, 30, 0.10)',
              border: '1px solid rgba(139, 30, 30, 0.10)',
            }}
          >
            <div
              className="attendance-section-header"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: '0 0 8px',
                    color: '#8b1e1e',
                    fontSize: '26px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={28} />
                  {text.analysisTitle}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: '#666',
                    lineHeight: 1.6,
                  }}
                >
                  {text.analysisDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePanel('menu')}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  background: '#f5f4f0',
                  color: '#641414',
                  padding: '12px 18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {text.backToMenu}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                gap: '14px',
                marginBottom: '26px',
              }}
            >
              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.analysisStartDate}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {analysisStartDateKey}
                </div>
              </div>

              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.totalSundays}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {sundayDateKeysSinceStart.length}
                </div>
              </div>

              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.totalPeople}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {people.length}
                </div>
              </div>

              <div
                style={{
                  background: '#f8eeee',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                }}
              >
                <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                  {text.averageAttendance}
                </div>
                <div style={{ color: '#8b1e1e', fontSize: '22px', fontWeight: 900 }}>
                  {averageAttendancePerSunday}
                </div>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                marginBottom: '24px',
              }}
            >
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: dir === 'rtl' ? 'auto' : '16px',
                  right: dir === 'rtl' ? '16px' : 'auto',
                  color: '#8b1e1e',
                }}
              />
              <input
                type="text"
                value={analysisSearchTerm}
                onChange={e => setAnalysisSearchTerm(e.target.value)}
                placeholder={text.analysisSearchPlaceholder}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: dir === 'rtl' ? '14px 46px 14px 16px' : '14px 16px 14px 46px',
                  borderRadius: '999px',
                  border: '1px solid #e5e0da',
                  outline: 'none',
                  fontSize: '15px',
                }}
              />
            </div>

            {isLoadingPeople && (
              <div
                style={{
                  padding: '18px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Loader2 size={18} className="animate-spin" />
                {text.loadingPeople}
              </div>
            )}

            {peopleError && (
              <div
                style={{
                  padding: '18px',
                  borderRadius: '18px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  fontWeight: 800,
                }}
              >
                {peopleError}
              </div>
            )}

            {!isLoadingPeople && !peopleError && people.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                {text.noPeople}
              </div>
            )}

            {!isLoadingPeople && !peopleError && people.length > 0 && filteredPersonAttendanceAnalysis.length === 0 && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: '#f5f4f0',
                  color: '#666',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                {text.noAnalysisResults}
              </div>
            )}

            {!isLoadingPeople && !peopleError && filteredPersonAttendanceAnalysis.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                  marginBottom: '30px',
                }}
              >
                {filteredPersonAttendanceAnalysis.map(item => (
                  <button
                    key={item.person.firebaseId}
                    type="button"
                    className="attendance-person-grid-row"
                    onClick={() => setSelectedAnalysisPersonId(item.person.firebaseId)}
                    style={{
                      width: '100%',
                      border: '1px solid #eee',
                      borderRadius: '18px',
                      padding: '16px',
                      background: 'white',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '16px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'inherit',
                    }}
                  >
                    <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                      <div
                        style={{
                          color: '#641414',
                          fontSize: '17px',
                          fontWeight: 800,
                          marginBottom: '6px',
                        }}
                      >
                        {item.person.firstName} {item.person.lastName}
                      </div>

                      {(item.person.arabicFirstName || item.person.arabicLastName) && (
                        <div
                          dir="rtl"
                          style={{
                            color: '#8b1e1e',
                            fontSize: '16px',
                            fontWeight: 800,
                            marginBottom: '6px',
                            textAlign: 'right',
                          }}
                        >
                          {item.person.arabicFirstName} {item.person.arabicLastName}
                        </div>
                      )}

                      <div
                        style={{
                          color: '#777',
                          fontSize: '14px',
                          lineHeight: 1.6,
                        }}
                      >
                        {item.person.phoneNumber || '—'} · {item.person.email || '—'}
                      </div>

                      <div
                        style={{
                          color: '#8b1e1e',
                          fontSize: '13px',
                          fontWeight: 700,
                          marginTop: '6px',
                        }}
                      >
                        {text.daysOfAttendance}: {item.attendedDates.join(', ') || '—'}
                      </div>
                    </div>

                    <div
                      className="attendance-analysis-stat-card"
                      style={{
                        minWidth: '150px',
                        borderRadius: '18px',
                        background: '#f8eeee',
                        padding: '14px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          color: '#777',
                          fontSize: '12px',
                          fontWeight: 900,
                          marginBottom: '6px',
                        }}
                      >
                        {text.attendanceCount}
                      </div>
                      <div
                        style={{
                          color: '#8b1e1e',
                          fontSize: '28px',
                          fontWeight: 900,
                        }}
                      >
                        {item.attendanceCount}
                      </div>
                      <div
                        style={{
                          color: '#641414',
                          fontSize: '13px',
                          fontWeight: 800,
                          marginTop: '4px',
                        }}
                      >
                        {text.attendanceRate}: {item.attendanceRate}%
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          color: '#8b1e1e',
                          fontSize: '12px',
                          fontWeight: 900,
                        }}
                      >
                        {text.viewFullStats}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: '22px',
              }}
            >
              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <TrendingUp size={22} />
                  {text.weeklyAttendancePlot}
                </h3>

                {weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '18px',
                      background: '#f5f4f0',
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {text.noAttendanceData}
                  </div>
                )}

                {!weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <div
                    style={{
                      display: 'grid',
                      gap: '12px',
                    }}
                  >
                    {weeklyAttendanceSummary.map(item => (
                      <div key={item.dateKey}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '10px',
                            color: '#641414',
                            fontSize: '13px',
                            fontWeight: 800,
                            marginBottom: '6px',
                          }}
                        >
                          <span>{item.dateKey}</span>
                          <span>{item.attendedCount}</span>
                        </div>
                        <div
                          style={{
                            height: '16px',
                            borderRadius: '999px',
                            background: '#f5f4f0',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.max(4, (item.attendedCount / maxWeeklyAttendanceCount) * 100)}%`,
                              height: '100%',
                              borderRadius: '999px',
                              background: '#8b1e1e',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={22} />
                  {text.topAttendeesPlot}
                </h3>

                {topAttendanceAnalysis.every(item => item.attendanceCount === 0) && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '18px',
                      background: '#f5f4f0',
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {text.noAttendanceData}
                  </div>
                )}

                {!topAttendanceAnalysis.every(item => item.attendanceCount === 0) && (
                  <div
                    style={{
                      display: 'grid',
                      gap: '12px',
                    }}
                  >
                    {topAttendanceAnalysis.map(item => {
                      const displayName = `${item.person.firstName} ${item.person.lastName}`.trim() || '—';

                      return (
                        <div key={item.person.firebaseId}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '10px',
                              color: '#641414',
                              fontSize: '13px',
                              fontWeight: 800,
                              marginBottom: '6px',
                            }}
                          >
                            <span>{displayName}</span>
                            <span>{item.attendanceCount}</span>
                          </div>
                          <div
                            style={{
                              height: '16px',
                              borderRadius: '999px',
                              background: '#f5f4f0',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.max(4, (item.attendanceCount / maxPersonAttendanceCount) * 100)}%`,
                                height: '100%',
                                borderRadius: '999px',
                                background: '#8b1e1e',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}


              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <TrendingUp size={22} />
                  {text.weeklyAttendanceLine}
                </h3>

                {weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: '18px',
                      background: '#f5f4f0',
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {text.noAttendanceData}
                  </div>
                )}

                {!weeklyAttendanceSummary.every(item => item.attendedCount === 0) && (
                  <svg viewBox="0 0 420 220" role="img" style={{ width: '100%', minHeight: '220px' }}>
                    <line x1="38" y1="20" x2="38" y2="184" stroke="#ddd" strokeWidth="2" />
                    <line x1="38" y1="184" x2="398" y2="184" stroke="#ddd" strokeWidth="2" />
                    <polyline
                      fill="none"
                      stroke="#8b1e1e"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={weeklyAttendanceSummary.map((item, index) => {
                        const x = weeklyAttendanceSummary.length === 1
                          ? 218
                          : 38 + (index / (weeklyAttendanceSummary.length - 1)) * 360;
                        const y = 184 - (item.attendedCount / maxWeeklyAttendanceCount) * 150;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    {weeklyAttendanceSummary.map((item, index) => {
                      const x = weeklyAttendanceSummary.length === 1
                        ? 218
                        : 38 + (index / (weeklyAttendanceSummary.length - 1)) * 360;
                      const y = 184 - (item.attendedCount / maxWeeklyAttendanceCount) * 150;

                      return (
                        <g key={item.dateKey}>
                          <circle cx={x} cy={y} r="5" fill="#8b1e1e" />
                          <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fill="#641414" fontWeight="700">
                            {item.attendedCount}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>

              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={22} />
                  {text.attendanceHistogram}
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {attendanceCountHistogram.map(item => (
                    <div key={item.attendanceCount}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#641414',
                          fontSize: '13px',
                          fontWeight: 800,
                          marginBottom: '6px',
                        }}
                      >
                        <span>{item.attendanceCount} {text.attendedLabel}</span>
                        <span>{item.peopleCount}</span>
                      </div>
                      <div style={{ height: '18px', borderRadius: '999px', background: '#f5f4f0', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(4, (item.peopleCount / maxAttendanceCountHistogramPeople) * 100)}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background: '#8b1e1e',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid rgba(139, 30, 30, 0.10)',
                  borderRadius: '24px',
                  padding: '22px',
                  background: '#fffaf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 18px',
                    color: '#8b1e1e',
                    fontSize: '21px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart3 size={22} />
                  {text.attendanceRateHistogram}
                </h3>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {attendanceRateHistogram.map(item => (
                    <div key={item.label}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#641414',
                          fontSize: '13px',
                          fontWeight: 800,
                          marginBottom: '6px',
                        }}
                      >
                        <span>{item.label}</span>
                        <span>{item.peopleCount}</span>
                      </div>
                      <div style={{ height: '18px', borderRadius: '999px', background: '#f5f4f0', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.max(4, (item.peopleCount / maxAttendanceRateHistogramPeople) * 100)}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background: '#8b1e1e',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>
          </section>
        )}


        {selectedPersonAttendanceAnalysis && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setSelectedAnalysisPersonId('')}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '1040px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '30px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.30)',
                border: '1px solid rgba(139, 30, 30, 0.18)',
              }}
              onClick={event => event.stopPropagation()}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: '#8b1e1e',
                  color: 'white',
                  padding: '22px 26px',
                  borderRadius: '30px 30px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900 }}>
                    {text.personalAnalysis}
                  </h2>
                  <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.78)', fontWeight: 700 }}>
                    {selectedPersonAttendanceAnalysis.person.firstName} {selectedPersonAttendanceAnalysis.person.lastName}
                    {(selectedPersonAttendanceAnalysis.person.arabicFirstName || selectedPersonAttendanceAnalysis.person.arabicLastName)
                      ? ` — ${selectedPersonAttendanceAnalysis.person.arabicFirstName} ${selectedPersonAttendanceAnalysis.person.arabicLastName}`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAnalysisPersonId('')}
                  aria-label={text.close}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.35)',
                    background: 'rgba(255,255,255,0.12)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={22} />
                </button>
              </div>

              <div style={{ padding: '26px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
                    gap: '14px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.attendanceCount}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {selectedPersonAttendanceAnalysis.attendanceCount}
                    </div>
                  </div>

                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.missedCount}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {selectedPersonMissedDates.length}
                    </div>
                  </div>

                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.attendanceRate}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {selectedPersonAttendanceAnalysis.attendanceRate}%
                    </div>
                  </div>

                  <div style={{ background: '#f8eeee', borderRadius: '20px', padding: '18px' }}>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>
                      {text.totalSundays}
                    </div>
                    <div style={{ color: '#8b1e1e', fontSize: '30px', fontWeight: 900 }}>
                      {sundayDateKeysSinceStart.length}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                    gap: '22px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 8px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.dateAttendanceLine}
                    </h3>
                    <div style={{ color: '#777', fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>
                      {text.presentValue} · {text.absentValue}
                    </div>

                    <svg viewBox="0 0 560 260" role="img" style={{ width: '100%', minHeight: '260px' }}>
                      <line x1="58" y1="38" x2="58" y2="198" stroke="#ddd" strokeWidth="2" />
                      <line x1="58" y1="198" x2="526" y2="198" stroke="#ddd" strokeWidth="2" />
                      <line x1="58" y1="62" x2="526" y2="62" stroke="#e7d8d8" strokeWidth="1.5" strokeDasharray="6 6" />
                      <line x1="58" y1="176" x2="526" y2="176" stroke="#e7d8d8" strokeWidth="1.5" strokeDasharray="6 6" />

                      <text x="34" y="67" textAnchor="middle" fontSize="14" fill="#15803d" fontWeight="900">1</text>
                      <text x="34" y="181" textAnchor="middle" fontSize="14" fill="#b91c1c" fontWeight="900">0</text>

                      <polyline
                        fill="none"
                        stroke="#8b1e1e"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={selectedPersonTimeline.map((item, index) => {
                          const x = selectedPersonTimeline.length === 1
                            ? 292
                            : 58 + (index / (selectedPersonTimeline.length - 1)) * 468;
                          const y = item.attended ? 62 : 176;
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {selectedPersonTimeline.map((item, index) => {
                        const x = selectedPersonTimeline.length === 1
                          ? 292
                          : 58 + (index / (selectedPersonTimeline.length - 1)) * 468;
                        const y = item.attended ? 62 : 176;
                        const shouldShowDate = selectedPersonTimeline.length <= 8 || index % Math.ceil(selectedPersonTimeline.length / 8) === 0 || index === selectedPersonTimeline.length - 1;

                        return (
                          <g key={item.dateKey}>
                            <circle
                              cx={x}
                              cy={y}
                              r="7"
                              fill={item.attended ? '#15803d' : '#b91c1c'}
                              stroke="white"
                              strokeWidth="2"
                            />
                            {shouldShowDate && (
                              <text
                                x={x}
                                y="224"
                                textAnchor="middle"
                                fontSize="10"
                                fill="#641414"
                                fontWeight="800"
                                transform={`rotate(-38 ${x} 224)`}
                              >
                                {item.dateKey.slice(5)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#15803d', fontWeight: 900, fontSize: '13px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#15803d' }} />
                        {text.present}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#b91c1c', fontWeight: 900, fontSize: '13px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#b91c1c' }} />
                        {text.absent}
                      </span>
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.attendanceDonut}
                    </h3>

                    <div style={{ display: 'grid', placeItems: 'center' }}>
                      <svg viewBox="0 0 240 240" role="img" style={{ width: '100%', maxWidth: '260px' }}>
                        <circle
                          cx="120"
                          cy="120"
                          r="82"
                          fill="none"
                          stroke="#fee2e2"
                          strokeWidth="34"
                        />
                        <circle
                          cx="120"
                          cy="120"
                          r="82"
                          fill="none"
                          stroke="#15803d"
                          strokeWidth="34"
                          strokeLinecap="round"
                          pathLength="100"
                          strokeDasharray={`${selectedPersonAttendanceAnalysis.attendanceRate} ${100 - selectedPersonAttendanceAnalysis.attendanceRate}`}
                          transform="rotate(-90 120 120)"
                        />
                        <text x="120" y="112" textAnchor="middle" fontSize="34" fill="#8b1e1e" fontWeight="900">
                          {selectedPersonAttendanceAnalysis.attendanceRate}%
                        </text>
                        <text x="120" y="140" textAnchor="middle" fontSize="13" fill="#641414" fontWeight="900">
                          {text.attendanceRate}
                        </text>
                      </svg>
                    </div>

                    <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#15803d', fontWeight: 900 }}>
                        <span>{text.attendedPercent}</span>
                        <span>{selectedPersonAttendanceAnalysis.attendanceCount} / {sundayDateKeysSinceStart.length}</span>
                      </div>
                      <div style={{ height: '14px', background: '#f5f4f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${selectedPersonAttendanceAnalysis.attendanceRate}%`, height: '100%', background: '#15803d', borderRadius: '999px' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#b91c1c', fontWeight: 900 }}>
                        <span>{text.missedPercent}</span>
                        <span>{selectedPersonMissedDates.length} / {sundayDateKeysSinceStart.length}</span>
                      </div>
                      <div style={{ height: '14px', background: '#f5f4f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(0, 100 - selectedPersonAttendanceAnalysis.attendanceRate)}%`, height: '100%', background: '#b91c1c', borderRadius: '999px' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.cumulativeAttendanceLine}
                    </h3>
                    <svg viewBox="0 0 420 220" role="img" style={{ width: '100%', minHeight: '220px' }}>
                      <line x1="38" y1="20" x2="38" y2="184" stroke="#ddd" strokeWidth="2" />
                      <line x1="38" y1="184" x2="398" y2="184" stroke="#ddd" strokeWidth="2" />
                      <polyline
                        fill="none"
                        stroke="#8b1e1e"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={selectedPersonTimeline.map((item, index) => {
                          const x = selectedPersonTimeline.length === 1
                            ? 218
                            : 38 + (index / (selectedPersonTimeline.length - 1)) * 360;
                          const y = 184 - (item.cumulativeAttendance / Math.max(1, selectedPersonAttendanceAnalysis.attendanceCount)) * 150;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                      {selectedPersonTimeline.map((item, index) => {
                        const x = selectedPersonTimeline.length === 1
                          ? 218
                          : 38 + (index / (selectedPersonTimeline.length - 1)) * 360;
                        const y = 184 - (item.cumulativeAttendance / Math.max(1, selectedPersonAttendanceAnalysis.attendanceCount)) * 150;
                        return (
                          <g key={item.dateKey}>
                            <circle cx={x} cy={y} r="5" fill="#8b1e1e" />
                            <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#641414" fontWeight="800">
                              {item.cumulativeAttendance}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '24px', padding: '22px', background: '#fffaf7' }}>
                    <h3 style={{ margin: '0 0 16px', color: '#8b1e1e', fontSize: '21px', fontWeight: 900 }}>
                      {text.attendanceTimeline}
                    </h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {selectedPersonTimeline.map(item => (
                        <div key={item.dateKey}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#641414', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                            <span>{item.dateKey}</span>
                            <span>{item.attended ? text.present : text.absent}</span>
                          </div>
                          <div style={{ height: '18px', borderRadius: '999px', background: '#f5f4f0', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: item.attended ? '100%' : '18%',
                                height: '100%',
                                borderRadius: '999px',
                                background: item.attended ? '#15803d' : '#b91c1c',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: '18px',
                  }}
                >
                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '22px', padding: '18px', background: 'white' }}>
                    <h3 style={{ margin: '0 0 14px', color: '#8b1e1e', fontSize: '19px', fontWeight: 900 }}>
                      {text.attendedSundays}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(selectedPersonAttendanceAnalysis.attendedDates.length ? selectedPersonAttendanceAnalysis.attendedDates : ['—']).map(dateKey => (
                        <span key={dateKey} style={{ background: '#f0fdf4', color: '#15803d', borderRadius: '999px', padding: '8px 12px', fontSize: '13px', fontWeight: 800 }}>
                          {dateKey}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(139,30,30,0.10)', borderRadius: '22px', padding: '18px', background: 'white' }}>
                    <h3 style={{ margin: '0 0 14px', color: '#8b1e1e', fontSize: '19px', fontWeight: 900 }}>
                      {text.missedSundays}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(selectedPersonMissedDates.length ? selectedPersonMissedDates : ['—']).map(dateKey => (
                        <span key={dateKey} style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '8px 12px', fontSize: '13px', fontWeight: 800 }}>
                          {dateKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdministratorPanel() {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const [assessmentFormStates, setAssessmentFormStates] = useState<
    Record<string, AssessmentFormState>
  >({});
  const [loadingAssessmentForms, setLoadingAssessmentForms] = useState(false);
  const [savingAssessmentFormId, setSavingAssessmentFormId] = useState<
    string | null
  >(null);

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalStoredSize = useMemo(
    () => photos.reduce((total, photo) => total + photo.url.length, 0),
    [photos]
  );

  const formattedStoredSize = useMemo(() => {
    const bytes = Math.ceil((totalStoredSize * 3) / 4);

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [totalStoredSize]);

  useEffect(() => {
    if (!isUnlocked) return;

    setLoadingSettings(true);
    setErrorMessage('');

    const carouselRef = ref(database, CAROUSEL_PATH);

    const unsubscribe = onValue(
      carouselRef,
      (snapshot) => {
        const value = snapshot.val() as
          | {
              enabled?: unknown;
              photos?: unknown;
            }
          | null;

        setCarouselEnabled(value?.enabled !== false);
        setPhotos(parsePhotos(value?.photos));
        setLoadingSettings(false);
      },
      (error) => {
        console.error('Failed to load carousel settings:', error);
        setErrorMessage('The carousel settings could not be loaded from Firebase.');
        setLoadingSettings(false);
      }
    );

    return unsubscribe;
  }, [isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;

    setLoadingAssessmentForms(true);

    const controlsRef = ref(database, ASSESSMENT_FORMS_CONTROL_PATH);

    const unsubscribe = onValue(
      controlsRef,
      (snapshot) => {
        const storedControls = snapshot.val();

        const nextStates = Object.fromEntries(
          ASSESSMENT_FORM_DEFINITIONS.map((form) => {
            const storedValue =
              storedControls &&
              typeof storedControls === 'object' &&
              !Array.isArray(storedControls)
                ? (storedControls as Record<string, unknown>)[form.id]
                : undefined;

            return [form.id, normalizeAssessmentFormState(storedValue)];
          })
        );

        setAssessmentFormStates(nextStates);
        setLoadingAssessmentForms(false);
      },
      (error) => {
        console.error('Failed to load assessment-form controls:', error);

        setAssessmentFormStates(
          Object.fromEntries(
            ASSESSMENT_FORM_DEFINITIONS.map((form) => [form.id, 'active'])
          )
        );
        setErrorMessage(
          'The assessment-form controls could not be loaded from Firebase.'
        );
        setLoadingAssessmentForms(false);
      }
    );

    return unsubscribe;
  }, [isUnlocked]);

  const clearMessages = () => {
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');

    if (password === ADMIN_PASSWORD) {
      setIsUnlocked(true);
      setPassword('');
      return;
    }

    setLoginError('Incorrect administrator password.');
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    setPassword('');
    setLoginError('');
    setPhotos([]);
    setPendingUploads([]);
    setAssessmentFormStates({});
    setSavingAssessmentFormId(null);
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleAssessmentFormStateChange = async (
    formId: string,
    nextState: AssessmentFormState
  ) => {
    clearMessages();

    const previousState = assessmentFormStates[formId] || 'active';

    setAssessmentFormStates((current) => ({
      ...current,
      [formId]: nextState,
    }));
    setSavingAssessmentFormId(formId);

    try {
      await set(
        ref(database, `${ASSESSMENT_FORMS_CONTROL_PATH}/${formId}`),
        {
          state: nextState,
          updatedAt: Date.now(),
        }
      );

      const form = ASSESSMENT_FORM_DEFINITIONS.find(
        (definition) => definition.id === formId
      );
      const formName = form
        ? assessmentFormTitle(form, 'en')
        : humanizeIdentifier(formId);

      const stateDescription =
        nextState === 'active'
          ? 'visible and clickable'
          : nextState === 'disabled'
            ? 'visible but unavailable'
            : 'hidden';

      setStatusMessage(`${formName} is now ${stateDescription}.`);
    } catch (error) {
      console.error('Failed to update assessment-form state:', error);

      setAssessmentFormStates((current) => ({
        ...current,
        [formId]: previousState,
      }));
      setErrorMessage('The assessment-form state could not be updated.');
    } finally {
      setSavingAssessmentFormId(null);
    }
  };

  const handleVisibilityChange = async (enabled: boolean) => {
    clearMessages();

    const previousValue = carouselEnabled;
    setCarouselEnabled(enabled);
    setSavingVisibility(true);

    try {
      await update(ref(database, CAROUSEL_PATH), {
        enabled,
        updatedAt: Date.now(),
      });

      setStatusMessage(
        enabled
          ? 'The landing-page carousel is now visible.'
          : 'The landing-page carousel is now hidden.'
      );
    } catch (error) {
      console.error('Failed to update carousel visibility:', error);
      setCarouselEnabled(previousValue);
      setErrorMessage('The carousel visibility could not be updated.');
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    clearMessages();

    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selectedFiles.length === 0) return;

    const availableSlots =
      MAX_CAROUSEL_PHOTOS - photos.length - pendingUploads.length;

    if (availableSlots <= 0) {
      setErrorMessage(
        `The carousel already contains the maximum of ${MAX_CAROUSEL_PHOTOS} photos.`
      );
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, availableSlots);
    const rejectedMessages: string[] = [];
    const uploads: PendingUpload[] = [];

    for (const file of acceptedFiles) {
      if (!file.type.startsWith('image/')) {
        rejectedMessages.push(`${file.name}: unsupported file type.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejectedMessages.push(
          `${file.name}: larger than ${(MAX_IMAGE_SIZE_BYTES / 1_000_000).toFixed(1)} MB.`
        );
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);

        uploads.push({
          id: createPhotoId(),
          fileName: file.name,
          dataUrl,
          altEn: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          altAr: '',
        });
      } catch (error) {
        console.error(`Failed to read ${file.name}:`, error);
        rejectedMessages.push(`${file.name}: could not be read.`);
      }
    }

    if (uploads.length > 0) {
      setPendingUploads((current) => [...current, ...uploads]);
    }

    if (selectedFiles.length > availableSlots) {
      rejectedMessages.push(
        `Only ${availableSlots} more photo${availableSlots === 1 ? '' : 's'} can be added.`
      );
    }

    if (rejectedMessages.length > 0) {
      setErrorMessage(rejectedMessages.join(' '));
    }
  };

  const updatePendingUpload = (
    id: string,
    field: 'altEn' | 'altAr',
    value: string
  ) => {
    setPendingUploads((current) =>
      current.map((upload) =>
        upload.id === id ? { ...upload, [field]: value } : upload
      )
    );
  };

  const removePendingUpload = (id: string) => {
    setPendingUploads((current) =>
      current.filter((upload) => upload.id !== id)
    );
  };

  const uploadPendingPhotos = async () => {
    if (pendingUploads.length === 0) return;

    clearMessages();
    setSavingPhotos(true);

    try {
      const snapshot = await get(ref(database, `${CAROUSEL_PATH}/photos`));
      const currentPhotos = parsePhotos(snapshot.val());
      const now = Date.now();

      const photoUpdates: Record<string, CarouselPhoto> = {};

      pendingUploads.forEach((upload, index) => {
        const order = currentPhotos.length + index;

        photoUpdates[upload.id] = {
          id: upload.id,
          url: upload.dataUrl,
          altEn: upload.altEn.trim(),
          altAr: upload.altAr.trim(),
          order,
          createdAt: now,
          updatedAt: now,
        };
      });

      await update(ref(database, `${CAROUSEL_PATH}/photos`), photoUpdates);
      await update(ref(database, CAROUSEL_PATH), {
        updatedAt: now,
      });

      setPendingUploads([]);
      setStatusMessage(
        `${photoUpdates ? Object.keys(photoUpdates).length : 0} photo${
          Object.keys(photoUpdates).length === 1 ? '' : 's'
        } uploaded successfully.`
      );
    } catch (error) {
      console.error('Failed to upload carousel photos:', error);
      setErrorMessage(
        'The selected photos could not be uploaded to Firebase. Large Base64 images may exceed the database write limit.'
      );
    } finally {
      setSavingPhotos(false);
    }
  };

  const updateStoredPhotoText = (
    id: string,
    field: 'altEn' | 'altAr',
    value: string
  ) => {
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === id ? { ...photo, [field]: value } : photo
      )
    );
  };

  const saveStoredPhotoText = async (photo: CarouselPhoto) => {
    clearMessages();

    try {
      await update(ref(database, `${CAROUSEL_PATH}/photos/${photo.id}`), {
        altEn: photo.altEn.trim(),
        altAr: photo.altAr.trim(),
        updatedAt: Date.now(),
      });

      setStatusMessage('The photo description was saved.');
    } catch (error) {
      console.error('Failed to save photo text:', error);
      setErrorMessage('The photo description could not be saved.');
    }
  };

  const savePhotoOrder = async (orderedPhotos: CarouselPhoto[]) => {
    const updates: Record<string, number> = {};

    orderedPhotos.forEach((photo, index) => {
      updates[`${photo.id}/order`] = index;
    });

    await update(ref(database, `${CAROUSEL_PATH}/photos`), updates);
  };

  const movePhoto = async (photoId: string, direction: -1 | 1) => {
    clearMessages();

    const currentIndex = photos.findIndex((photo) => photo.id === photoId);
    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= photos.length
    ) {
      return;
    }

    const reordered = [...photos];
    const [movedPhoto] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedPhoto);

    const normalized = reordered.map((photo, index) => ({
      ...photo,
      order: index,
    }));

    setPhotos(normalized);

    try {
      await savePhotoOrder(normalized);
      setStatusMessage('The carousel photo order was updated.');
    } catch (error) {
      console.error('Failed to reorder photos:', error);
      setErrorMessage('The photo order could not be saved.');
    }
  };

  const deletePhoto = async (photo: CarouselPhoto) => {
    clearMessages();

    const confirmed = window.confirm(
      'Delete this photo from the landing-page carousel?'
    );

    if (!confirmed) return;

    setDeletingPhotoId(photo.id);

    try {
      await set(
        ref(database, `${CAROUSEL_PATH}/photos/${photo.id}`),
        null
      );

      const remainingPhotos = photos
        .filter((currentPhoto) => currentPhoto.id !== photo.id)
        .map((currentPhoto, index) => ({
          ...currentPhoto,
          order: index,
        }));

      if (remainingPhotos.length > 0) {
        await savePhotoOrder(remainingPhotos);
      }

      setPhotos(remainingPhotos);
      setStatusMessage('The photo was deleted.');
    } catch (error) {
      console.error('Failed to delete carousel photo:', error);
      setErrorMessage('The photo could not be deleted.');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] px-5 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
          <form
            onSubmit={handleLogin}
            className="w-full rounded-[28px] border border-[#8b1e1e]/10 bg-white p-7 shadow-[0_24px_70px_rgba(73,20,20,0.14)] sm:p-9"
          >
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[#8b1e1e] text-white shadow-[0_10px_30px_rgba(139,30,30,0.25)]">
              <LockKeyhole size={28} />
            </div>

            <div className="text-center">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#8b1e1e]/55">
                LINC Administration
              </p>
              <h1 className="text-3xl font-extrabold text-[#641414]">
                Administrator Panel
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                Enter the temporary administrator password to manage landing-page content.
              </p>
            </div>

            <div className="mt-8">
              <label
                htmlFor="administrator-password"
                className="mb-2 block text-sm font-bold text-stone-700"
              >
                Administrator password
              </label>

              <div className="relative">
                <input
                  id="administrator-password"
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 pr-12 text-lg tracking-[0.25em] text-stone-900 outline-none transition focus:border-[#8b1e1e]"
                  placeholder="••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              {loginError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-6 font-bold text-white shadow-[0_10px_25px_rgba(139,30,30,0.22)] transition hover:-translate-y-0.5 hover:bg-[#761919] active:translate-y-0 active:scale-[0.99]"
            >
              <ShieldCheck size={20} />
              Open Administrator Panel
            </button>

            <p className="mt-5 text-center text-xs leading-relaxed text-stone-400">
              Temporary client-side password protection. Replace this with Firebase Authentication before production.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0] text-stone-900">
      <header className="border-b border-[#8b1e1e]/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.22em] text-[#8b1e1e]/55">
              LINC Administration
            </p>
            <h1 className="text-3xl font-extrabold text-[#641414]">
              Administrator Panel
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Manage landing-page content, assessment forms, and attendance operations.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-[#8b1e1e]/20 bg-white px-5 text-sm font-bold text-[#8b1e1e] transition hover:bg-[#f8eeee]"
          >
            <LogOut size={17} />
            Lock Panel
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-6 sm:py-10">
        {(statusMessage || errorMessage) && (
          <div
            className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 ${
              errorMessage
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <p className="text-sm font-semibold">
              {errorMessage || statusMessage}
            </p>

            <button
              type="button"
              onClick={clearMessages}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition hover:bg-black/5"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
          <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
                  Assessment Page
                </p>
                <h2 className="text-2xl font-extrabold text-[#641414]">
                  Assessment Form Availability
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-500">
                  Choose whether each assessment is available, shown as unavailable, or completely removed from the public form-selection page.
                </p>
              </div>

              {loadingAssessmentForms && (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500">
                  <Loader2 size={17} className="animate-spin" />
                  Loading form controls
                </div>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-extrabold text-emerald-900">
                  Active
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800/75">
                  Visible and clickable.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-extrabold text-amber-900">
                  Disabled
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800/75">
                  Visible, gray, and not clickable.
                </p>
              </div>

              <div className="rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3">
                <p className="text-sm font-extrabold text-stone-800">
                  Hidden
                </p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  Completely removed from the public page.
                </p>
              </div>
            </div>

            {loadingAssessmentForms ? (
              <div className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                <div className="text-center text-stone-500">
                  <Loader2 size={30} className="mx-auto mb-3 animate-spin" />
                  <p className="font-semibold">Loading assessment forms</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {ASSESSMENT_FORM_DEFINITIONS.map((form) => {
                  const currentState =
                    assessmentFormStates[form.id] || 'active';
                  const isSaving = savingAssessmentFormId === form.id;

                  return (
                    <article
                      key={form.id}
                      className="rounded-[22px] border border-stone-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-extrabold text-[#641414]">
                            {assessmentFormTitle(form, 'en')}
                          </p>
                          <p
                            dir="rtl"
                            className="mt-1 text-sm font-bold text-stone-500"
                          >
                            {assessmentFormTitle(form, 'ar')}
                          </p>
                          <p className="mt-2 break-all text-xs font-semibold text-stone-400">
                            Firebase ID: {form.id}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-extrabold ${
                            currentState === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : currentState === 'disabled'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {currentState === 'active'
                            ? 'Active'
                            : currentState === 'disabled'
                              ? 'Disabled'
                              : 'Hidden'}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleAssessmentFormStateChange(form.id, 'active')
                          }
                          className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            currentState === 'active'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Eye size={16} />
                          )}
                          Active
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleAssessmentFormStateChange(
                              form.id,
                              'disabled'
                            )
                          }
                          className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            currentState === 'disabled'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <LockKeyhole size={16} />
                          )}
                          Disabled
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleAssessmentFormStateChange(form.id, 'hidden')
                          }
                          className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            currentState === 'hidden'
                              ? 'bg-stone-700 text-white shadow-sm'
                              : 'border border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <EyeOff size={16} />
                          )}
                          Hidden
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
          <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
                  Landing Page
                </p>
                <h2 className="text-2xl font-extrabold text-[#641414]">
                  Community Carousel
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
                  Choose whether the carousel is visible and control which photos appear inside it.
                </p>
              </div>

              {loadingSettings && (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500">
                  <Loader2 size={17} className="animate-spin" />
                  Loading settings
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_280px]">
            <div>
              <h3 className="text-lg font-extrabold text-stone-800">
                Carousel visibility
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                When disabled, the entire carousel section is removed from the public landing page.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <button
                type="button"
                disabled={savingVisibility || loadingSettings}
                onClick={() => handleVisibilityChange(!carouselEnabled)}
                className={`flex min-h-[52px] w-full items-center justify-between gap-4 rounded-xl px-4 text-left transition ${
                  carouselEnabled
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-stone-200 text-stone-700'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span>
                  <span className="block text-sm font-extrabold">
                    {carouselEnabled ? 'Carousel is visible' : 'Carousel is hidden'}
                  </span>
                  <span className="mt-0.5 block text-xs opacity-70">
                    Click to {carouselEnabled ? 'hide' : 'show'} it
                  </span>
                </span>

                {savingVisibility ? (
                  <Loader2 size={21} className="animate-spin" />
                ) : carouselEnabled ? (
                  <Eye size={21} />
                ) : (
                  <EyeOff size={21} />
                )}
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
          <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
                  Carousel Content
                </p>
                <h2 className="text-2xl font-extrabold text-[#641414]">
                  Uploaded Photos
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {photos.length} stored photo{photos.length === 1 ? '' : 's'} · Approximately {formattedStoredSize}
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  loadingSettings ||
                  photos.length + pendingUploads.length >= MAX_CAROUSEL_PHOTOS
                }
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#761919] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus size={18} />
                Select Photos
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              Images are converted to Base64 data URLs and stored directly in Firebase Realtime Database. Each image must be no larger than {(MAX_IMAGE_SIZE_BYTES / 1_000_000).toFixed(1)} MB. The current limit is {MAX_CAROUSEL_PHOTOS} photos.
            </div>

            {pendingUploads.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-stone-800">
                      Ready to upload
                    </h3>
                    <p className="text-sm text-stone-500">
                      Review the descriptions, then save these photos to Firebase.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={uploadPendingPhotos}
                    disabled={savingPhotos}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#8b1e1e] px-5 text-sm font-bold text-white transition hover:bg-[#761919] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPhotos ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                    Upload {pendingUploads.length} Photo
                    {pendingUploads.length === 1 ? '' : 's'}
                  </button>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {pendingUploads.map((upload) => (
                    <article
                      key={upload.id}
                      className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                        <img
                          src={upload.dataUrl}
                          alt={upload.altEn || upload.fileName}
                          className="h-full w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removePendingUpload(upload.id)}
                          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
                          aria-label="Remove selected photo"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="space-y-4 p-4">
                        <p className="truncate text-xs font-bold text-stone-400">
                          {upload.fileName}
                        </p>

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                            English description
                          </span>
                          <input
                            value={upload.altEn}
                            onChange={(event) =>
                              updatePendingUpload(
                                upload.id,
                                'altEn',
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                            placeholder="Describe the photo"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                            Arabic description
                          </span>
                          <input
                            dir="rtl"
                            value={upload.altAr}
                            onChange={(event) =>
                              updatePendingUpload(
                                upload.id,
                                'altAr',
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                            placeholder="وصف الصورة"
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {loadingSettings ? (
              <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50">
                <div className="text-center text-stone-500">
                  <Loader2 size={30} className="mx-auto mb-3 animate-spin" />
                  <p className="font-semibold">Loading carousel photos</p>
                </div>
              </div>
            ) : photos.length === 0 ? (
              <div className="grid min-h-[240px] place-items-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-5 text-center">
                <div>
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f8eeee] text-[#8b1e1e]">
                    <ImagePlus size={28} />
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-800">
                    No administrator photos uploaded
                  </h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-stone-500">
                    The public landing page will continue showing its existing placeholder shapes until at least one valid photo is uploaded.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {photos.map((photo, index) => (
                  <article
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                      <img
                        src={photo.url}
                        alt={photo.altEn || `Carousel photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-extrabold text-white backdrop-blur">
                        {index + 1}
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                          English description
                        </span>
                        <input
                          value={photo.altEn}
                          onChange={(event) =>
                            updateStoredPhotoText(
                              photo.id,
                              'altEn',
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                          placeholder="Describe the photo"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-stone-500">
                          Arabic description
                        </span>
                        <input
                          dir="rtl"
                          value={photo.altAr}
                          onChange={(event) =>
                            updateStoredPhotoText(
                              photo.id,
                              'altAr',
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8b1e1e]"
                          placeholder="وصف الصورة"
                        />
                      </label>

                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => movePhoto(photo.id, -1)}
                          disabled={index === 0}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-stone-200 text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Move photo earlier"
                        >
                          <ArrowUp size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => movePhoto(photo.id, 1)}
                          disabled={index === photos.length - 1}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-stone-200 text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Move photo later"
                        >
                          <ArrowDown size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => saveStoredPhotoText(photo)}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#8b1e1e] text-white transition hover:bg-[#761919]"
                          aria-label="Save photo descriptions"
                        >
                          <Save size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deletePhoto(photo)}
                          disabled={deletingPhotoId === photo.id}
                          className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Delete photo"
                        >
                          {deletingPhotoId === photo.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#8b1e1e]/10 bg-white shadow-[0_16px_45px_rgba(73,20,20,0.08)]">
          <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
            <div>
              <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b1e1e]/50">
                Administration Operations
              </p>
              <h2 className="text-2xl font-extrabold text-[#641414]">
                Attendance Management
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-500">
                The complete attendance system is available after unlocking this Administrator Panel. No additional attendance passcode is required.
              </p>
            </div>
          </div>

          <div className="bg-[#f5f4f0] p-4 sm:p-6">
            <AttendanceManagement />
          </div>
        </section>

      </main>
    </div>
  );
}
