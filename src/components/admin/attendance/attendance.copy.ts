import { MAX_IMAGE_SIZE_BYTES } from '../admin.constants';

export function getAttendanceText(isArabic: boolean) {
  return {
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
    addModifyPerson: isArabic ? 'إدارة الأشخاص' : 'Manage People',
    takeAttendance: isArabic ? 'تسجيل الحضور' : 'Take Attendance',

    peopleTitle: isArabic ? 'إدارة الأشخاص' : 'People Management',
    peopleDescription: isArabic
      ? 'أضف شخصاً جديداً أو اضغط على شخص موجود لفتح نافذة التعديل.'
      : 'Add a new person or select an existing person to edit them in a popup.',
    addNewPerson: isArabic ? 'إضافة شخص جديد' : 'Add New Person',
    addPerson: isArabic ? 'إضافة شخص جديد' : 'Add New Person',
    addPersonDescription: isArabic
      ? 'أدخل بيانات الشخص وصورته ثم احفظه.'
      : 'Enter the person details and photo, then save the new person.',
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
    selectPhoto: isArabic ? 'رفع صورة' : 'Upload Photo',
    replacePhoto: isArabic ? 'استبدال الصورة' : 'Replace Photo',
    takePhoto: isArabic ? 'التقاط صورة' : 'Take Photo',
    openLiveCamera: isArabic ? 'فتح الكاميرا المباشرة' : 'Open Live Camera',
    capturePhoto: isArabic ? 'التقاط الآن' : 'Capture Now',
    switchCamera: isArabic ? 'تبديل الكاميرا' : 'Switch Camera',
    closeCamera: isArabic ? 'إغلاق الكاميرا' : 'Close Camera',
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
    editPerson: isArabic ? 'تعديل بيانات الشخص' : 'Edit Person',
    editPersonDescription: isArabic
      ? 'عدّل البيانات أو الصورة ثم احفظ التغييرات.'
      : 'Update the person details or photo, then save the changes.',
    cameraUnavailable: isArabic
      ? 'الكاميرا المباشرة غير متاحة في هذا المتصفح. استخدم زر التقاط صورة أو رفع صورة.'
      : 'Live camera is unavailable in this browser. Use Take Photo or Upload Photo instead.',
    cameraPermissionError: isArabic
      ? 'تعذر تشغيل الكاميرا. تأكد من منح المتصفح إذن الكاميرا، أو استخدم زر التقاط صورة.'
      : 'The camera could not start. Allow camera permission, or use the Take Photo button instead.',
    cameraNotReady: isArabic
      ? 'الكاميرا ليست جاهزة بعد. حاول مرة أخرى خلال لحظة.'
      : 'The camera is not ready yet. Try again in a moment.',
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
}

export type AttendanceText = ReturnType<typeof getAttendanceText>;

