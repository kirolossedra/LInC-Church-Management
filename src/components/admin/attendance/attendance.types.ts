export interface AttendancePerson {
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

export interface AttendancePersonForm {
  firstName: string;
  lastName: string;
  arabicFirstName: string;
  arabicLastName: string;
  phoneNumber: string;
  email: string;
  photoBase64: string;
}

export interface CalendarDay {
  key: string;
  dayNumber: number;
  date: Date;
  isCurrentMonth: boolean;
  isSunday: boolean;
}

export interface WeeklyAttendanceSummary {
  dateKey: string;
  attendedCount: number;
}

export interface PersonAttendanceAnalysis {
  person: AttendancePerson;
  attendedDates: string[];
  attendanceCount: number;
  attendanceRate: number;
}
