import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useI18n } from '../../../i18n';
import {
  createAttendancePerson,
  getAttendancePeople,
  updateAttendanceDate,
  updateAttendancePerson,
} from '../../../services/administrator';
import { MAX_IMAGE_SIZE_BYTES } from '../admin.constants';
import { fileToDataUrl } from '../admin.utils';
import { getAttendanceText } from './attendance.copy';
import useAttendanceAnalytics from './useAttendanceAnalytics';
import type {
  AttendancePerson,
  AttendancePersonForm,
  CalendarDay,
} from './attendance.types';
import {
  buildCalendarDays,
  EMPTY_PERSON_FORM,
  formatDateKey,
  getAttendanceDays,
} from './attendance.utils';

export default function useAttendanceManagement() {
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';

  const [activePanel, setActivePanel] = useState<'people' | 'attendance' | 'analysis'>('attendance');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const [people, setPeople] = useState<AttendancePerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [personForm, setPersonForm] = useState<AttendancePersonForm>(EMPTY_PERSON_FORM);
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [isReadingPersonPhoto, setIsReadingPersonPhoto] = useState(false);
  const [isPersonEditModalOpen, setIsPersonEditModalOpen] = useState(false);
  const [isPersonCameraOpen, setIsPersonCameraOpen] = useState(false);
  const [isStartingPersonCamera, setIsStartingPersonCamera] = useState(false);
  const [personCameraError, setPersonCameraError] = useState('');
  const [personCameraFacingMode, setPersonCameraFacingMode] = useState<'user' | 'environment'>('environment');

  const personPhotoInputRef = useRef<HTMLInputElement>(null);
  const personCameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const personCameraVideoRef = useRef<HTMLVideoElement>(null);
  const personCameraStreamRef = useRef<MediaStream | null>(null);
  const personEditModalRef = useRef<HTMLDivElement>(null);
  const isSavingPersonRef = useRef(false);

  const [calendarMonthDate, setCalendarMonthDate] = useState(latestSunday);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => formatDateKey(latestSunday()));
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
  const [isSavingAttendanceForId, setIsSavingAttendanceForId] = useState('');
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState('');
  const [selectedAnalysisPersonId, setSelectedAnalysisPersonId] = useState('');

  const text = useMemo(() => getAttendanceText(isArabic), [isArabic]);

  const weekDayLabels = isArabic
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthLabel = calendarMonthDate.toLocaleDateString(isArabic ? 'ar' : 'en', {
    month: 'long',
    year: 'numeric',
  });

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonthDate), [calendarMonthDate]);

  const showNotice = useCallback((tone: 'success' | 'error', message: string) => {
    setNotice({ tone, message });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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

  const analytics = useAttendanceAnalytics({ people, sortedPeople, analysisSearchTerm, selectedAnalysisPersonId });
  const {
    analysisStartDateKey,
    sundayDateKeysSinceStart,
    personAttendanceAnalysis,
    filteredPersonAttendanceAnalysis,
    selectedPersonAttendanceAnalysis,
    selectedPersonMissedDates,
    selectedPersonTimeline,
    attendanceCountHistogram,
    attendanceRateHistogram,
    maxAttendanceCountHistogramPeople,
    maxAttendanceRateHistogramPeople,
    weeklyAttendanceSummary,
    maxWeeklyAttendanceCount,
    topAttendanceAnalysis,
    maxPersonAttendanceCount,
    averageAttendancePerSunday,
  } = analytics;

  useEffect(() => {
    let active = true;
    void getAttendancePeople()
      .then(({ people: loadedPeople }) => {
        if (!active) return;
        setPeople(loadedPeople);
        setPeopleError('');
      })
      .catch(error => {
        if (!active) return;
        console.error('Failed to load attendance people:', error);
        setPeopleError(error instanceof Error ? error.message : text.failedLoadPeople);
      })
      .finally(() => {
        if (active) setIsLoadingPeople(false);
      });
    return () => { active = false; };
  }, [text.failedLoadPeople]);

  const stopPersonCameraStream = useCallback(() => {
    personCameraStreamRef.current?.getTracks().forEach(track => track.stop());
    personCameraStreamRef.current = null;

    if (personCameraVideoRef.current) {
      personCameraVideoRef.current.srcObject = null;
    }
  }, []);

  const resetPersonForm = useCallback(() => {
    stopPersonCameraStream();
    setIsPersonCameraOpen(false);
    setPersonCameraError('');
    setSelectedPersonId('');
    setPersonForm(EMPTY_PERSON_FORM);
    setIsPersonEditModalOpen(false);
  }, [stopPersonCameraStream]);

  const closePersonEditor = () => {
    if (isSavingPerson) return;
    resetPersonForm();
  };

  const openNewPersonEditor = () => {
    stopPersonCameraStream();
    setIsPersonCameraOpen(false);
    setPersonCameraError('');
    setSelectedPersonId('');
    setPersonForm(EMPTY_PERSON_FORM);
    setIsPersonEditModalOpen(true);

    window.requestAnimationFrame(() => {
      personEditModalRef.current?.focus();
    });
  };

  const handleSelectPerson = (person: AttendancePerson) => {
    stopPersonCameraStream();
    setIsPersonCameraOpen(false);
    setPersonCameraError('');
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
    setIsPersonEditModalOpen(true);

    window.requestAnimationFrame(() => {
      personEditModalRef.current?.focus();
    });
  };

  const handlePersonPhotoSelected = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      showNotice('error', text.invalidPhotoType);
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      showNotice('error', text.photoTooLarge);
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
      showNotice('error', text.failedReadPhoto);
    } finally {
      setIsReadingPersonPhoto(false);
    }
  };

  const openPersonCamera = () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setPersonCameraError(text.cameraUnavailable);
      return;
    }

    setPersonCameraError('');
    setIsPersonCameraOpen(true);
  };

  const closePersonCamera = () => {
    stopPersonCameraStream();
    setIsPersonCameraOpen(false);
    setIsStartingPersonCamera(false);
    setPersonCameraError('');
  };

  const switchPersonCamera = () => {
    setPersonCameraFacingMode(previous =>
      previous === 'environment' ? 'user' : 'environment'
    );
  };

  const capturePersonPhotoFromLiveCamera = () => {
    const video = personCameraVideoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setPersonCameraError(text.cameraNotReady);
      return;
    }

    const maximumDimension = 1200;
    const scale = Math.min(
      1,
      maximumDimension / Math.max(video.videoWidth, video.videoHeight)
    );
    const canvas = document.createElement('canvas');

    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const context = canvas.getContext('2d');

    if (!context) {
      setPersonCameraError(text.failedReadPhoto);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    let photoDataUrl = canvas.toDataURL('image/jpeg', 0.86);
    const encodedPhoto = photoDataUrl.split(',')[1] || '';
    const estimatedPhotoBytes = Math.ceil((encodedPhoto.length * 3) / 4);

    if (estimatedPhotoBytes > MAX_IMAGE_SIZE_BYTES) {
      photoDataUrl = canvas.toDataURL('image/jpeg', 0.68);
    }

    const compressedPhoto = photoDataUrl.split(',')[1] || '';
    const compressedPhotoBytes = Math.ceil((compressedPhoto.length * 3) / 4);

    if (compressedPhotoBytes > MAX_IMAGE_SIZE_BYTES) {
      setPersonCameraError(text.photoTooLarge);
      return;
    }

    setPersonForm(previous => ({
      ...previous,
      photoBase64: photoDataUrl,
    }));

    closePersonCamera();
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
      showNotice('error', text.missingRequired);
      return;
    }

    setIsSavingPerson(true);

    try {
      const payload = {
        firstName: cleanedFirstName,
        lastName: cleanedLastName,
        arabicFirstName: cleanedArabicFirstName,
        arabicLastName: cleanedArabicLastName,
        phoneNumber: cleanedPhoneNumber,
        email: cleanedEmail,
        photoBase64: personForm.photoBase64,
      };

      const { person: savedPerson } = selectedPersonId
        ? await updateAttendancePerson(selectedPersonId, payload)
        : await createAttendancePerson(payload);

      setPeople(current => selectedPersonId
        ? current.map(person => person.firebaseId === savedPerson.firebaseId ? savedPerson : person)
        : [...current, savedPerson]);

      showNotice('success', text.savedSuccessfully);
      resetPersonForm();
    } catch (err) {
      console.error('Failed to save attendance person:', err);
      showNotice('error', err instanceof Error ? err.message : text.failedSavePerson);
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

  const handleToggleAttendance = async (person: AttendancePerson) => {
    if (!selectedAttendanceDate) {
      showNotice('error', text.selectSundayBeforeMarking);
      return;
    }

    setIsSavingAttendanceForId(person.firebaseId);

    try {
      const wasAttended = hasPersonAttendedSelectedDate(person);
      const { person: savedPerson } = await updateAttendanceDate(
        person.firebaseId,
        selectedAttendanceDate,
        !wasAttended,
      );
      setPeople(current => current.map(item => item.firebaseId === savedPerson.firebaseId ? savedPerson : item));

      showNotice('success', wasAttended ? text.removedAttendance : text.savedAttendance);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      showNotice('error', err instanceof Error ? err.message : text.failedSaveAttendance);
    } finally {
      setIsSavingAttendanceForId('');
    }
  };

  useEffect(() => {
    isSavingPersonRef.current = isSavingPerson;
  }, [isSavingPerson]);

  useEffect(() => {
    if (!isPersonEditModalOpen) return;

    const scrollPosition = window.scrollY;
    const body = document.body;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollPosition}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingPersonRef.current) {
        resetPersonForm();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      window.scrollTo(0, scrollPosition);
    };
  }, [isPersonEditModalOpen, resetPersonForm]);

  useEffect(() => {
    if (!isPersonCameraOpen) return;

    let isCancelled = false;

    const startCamera = async () => {
      setIsStartingPersonCamera(true);
      setPersonCameraError('');
      stopPersonCameraStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: personCameraFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        personCameraStreamRef.current = stream;

        const video = personCameraVideoRef.current;

        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch (error) {
        console.error('Failed to start person camera:', error);

        if (!isCancelled) {
          setPersonCameraError(text.cameraPermissionError);
        }
      } finally {
        if (!isCancelled) {
          setIsStartingPersonCamera(false);
        }
      }
    };

    void startCamera();

    return () => {
      isCancelled = true;
      stopPersonCameraStream();
    };
  }, [
    isPersonCameraOpen,
    personCameraFacingMode,
    text.cameraPermissionError,
    stopPersonCameraStream,
  ]);

  return {
    dir,
    isArabic,
    activePanel,
    setActivePanel,
    notice,
    dismissNotice: () => setNotice(null),
    people,
    isLoadingPeople,
    peopleError,
    searchTerm,
    setSearchTerm,
    selectedPersonId,
    personForm,
    setPersonForm,
    isSavingPerson,
    isReadingPersonPhoto,
    isPersonEditModalOpen,
    isPersonCameraOpen,
    isStartingPersonCamera,
    personCameraError,
    personCameraFacingMode,
    personPhotoInputRef,
    personCameraCaptureInputRef,
    personCameraVideoRef,
    personEditModalRef,
    calendarMonthDate,
    selectedAttendanceDate,
    attendanceSearchTerm,
    setAttendanceSearchTerm,
    isSavingAttendanceForId,
    analysisSearchTerm,
    setAnalysisSearchTerm,
    selectedAnalysisPersonId,
    setSelectedAnalysisPersonId,
    text,
    weekDayLabels,
    monthLabel,
    calendarDays,
    filteredPeople,
    filteredAttendancePeople,
    analysisStartDateKey,
    sundayDateKeysSinceStart,
    personAttendanceAnalysis,
    filteredPersonAttendanceAnalysis,
    selectedPersonAttendanceAnalysis,
    selectedPersonMissedDates,
    selectedPersonTimeline,
    attendanceCountHistogram,
    attendanceRateHistogram,
    maxAttendanceCountHistogramPeople,
    maxAttendanceRateHistogramPeople,
    weeklyAttendanceSummary,
    maxWeeklyAttendanceCount,
    topAttendanceAnalysis,
    maxPersonAttendanceCount,
    averageAttendancePerSunday,
    resetPersonForm,
    closePersonEditor,
    openNewPersonEditor,
    handleSelectPerson,
    handlePersonPhotoSelected,
    openPersonCamera,
    closePersonCamera,
    switchPersonCamera,
    capturePersonPhotoFromLiveCamera,
    removePersonPhoto,
    handleSavePerson,
    moveCalendarMonth,
    handleSelectAttendanceDate,
    hasPersonAttendedSelectedDate,
    handleToggleAttendance,
  };
}

export type AttendanceController = ReturnType<typeof useAttendanceManagement>;

function latestSunday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}
