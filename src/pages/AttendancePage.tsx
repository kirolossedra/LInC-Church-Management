// Attendance page locked by a simple date-based passcode before showing the attendance actions.
// Supports adding/modifying people in Firebase and writing Sunday attendance records to each person.

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Save,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { onValue, push, ref, set } from 'firebase/database';
import { database } from '../firebase';
import { useI18n } from '../i18n';

interface AttendancePerson {
  firebaseId: string;
  firstName: string;
  lastName: string;
  arabicFirstName: string;
  arabicLastName: string;
  phoneNumber: string;
  email: string;
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
}

interface CalendarDay {
  key: string;
  dayNumber: number;
  date: Date;
  isCurrentMonth: boolean;
  isSunday: boolean;
}

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
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

const emptyPersonForm: AttendancePersonForm = {
  firstName: '',
  lastName: '',
  arabicFirstName: '',
  arabicLastName: '',
  phoneNumber: '',
  email: '',
};

export default function AttendancePage() {
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';

  const [passcodeInput, setPasscodeInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');

  const [activePanel, setActivePanel] = useState<'menu' | 'people' | 'attendance'>('menu');

  const [people, setPeople] = useState<AttendancePerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [personForm, setPersonForm] = useState<AttendancePersonForm>(emptyPersonForm);
  const [isSavingPerson, setIsSavingPerson] = useState(false);

  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState('');
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
  const [isSavingAttendanceForId, setIsSavingAttendanceForId] = useState('');

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

  useEffect(() => {
    if (!isUnlocked) return;

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
  }, [isUnlocked, text.failedLoadPeople]);

  const getTodayPasscode = () => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const monthNumber = today.getMonth() + 1;

    const passcode = (dayOfMonth * 236 * monthNumber) % 10000;

    return passcode.toString().padStart(4, '0');
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passcodeInput.trim() === getTodayPasscode()) {
      setIsUnlocked(true);
      setPasscodeError('');
      return;
    }

    setPasscodeError(text.incorrectPasscode);
  };

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
    });
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

  if (!isUnlocked) {
    return (
      <div
        dir={dir}
        style={{
          minHeight: '100vh',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
          background: '#f5f4f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: 'white',
            borderRadius: '24px',
            padding: '36px',
            boxShadow: '0 12px 35px rgba(139, 30, 30, 0.14)',
            border: '1px solid rgba(139, 30, 30, 0.12)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#8b1e1e',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
              fontSize: '28px',
              fontWeight: 'bold',
            }}
          >
            ✓
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              color: '#8b1e1e',
              fontSize: '28px',
              fontWeight: 800,
            }}
          >
            {text.accessTitle}
          </h1>

          <p
            style={{
              margin: '0 0 28px',
              color: '#666',
              lineHeight: 1.6,
            }}
          >
            {text.accessDescription}
          </p>

          <form onSubmit={handlePasscodeSubmit}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={passcodeInput}
              onChange={e => {
                setPasscodeInput(e.target.value.replace(/\D/g, ''));
                setPasscodeError('');
              }}
              placeholder={text.passcodePlaceholder}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '16px 18px',
                borderRadius: '16px',
                border: '2px solid #e5e0da',
                outline: 'none',
                fontSize: '22px',
                textAlign: 'center',
                letterSpacing: '0.18em',
                fontWeight: 700,
                color: '#641414',
                marginBottom: '14px',
              }}
            />

            {passcodeError && (
              <p
                style={{
                  margin: '0 0 16px',
                  color: '#b91c1c',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {passcodeError}
              </p>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                minHeight: '52px',
                border: 'none',
                borderRadius: '999px',
                background: '#8b1e1e',
                color: 'white',
                fontSize: '17px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(139, 30, 30, 0.22)',
              }}
            >
              {text.proceed}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        padding: '40px',
        fontFamily: 'Arial, sans-serif',
        background: '#f5f4f0',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          margin: '0 auto',
        }}
      >
        <div
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              style={{
                border: '1px solid rgba(139, 30, 30, 0.10)',
                borderRadius: '24px',
                padding: '22px',
                background: '#fffaf7',
                marginBottom: '28px',
              }}
            >
              <div
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
                      style={{
                        width: '100%',
                        border: alreadyAttended ? '2px solid #15803d' : '1px solid #eee',
                        borderRadius: '18px',
                        padding: '16px',
                        background: alreadyAttended ? '#f0fdf4' : 'white',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '16px',
                        alignItems: 'center',
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

                      <button
                        type="button"
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
      </div>
    </div>
  );
}
