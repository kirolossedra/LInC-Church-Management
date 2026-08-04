import { useMemo } from 'react';
import type { AttendancePerson, PersonAttendanceAnalysis, WeeklyAttendanceSummary } from './attendance.types';
import {
  buildSundayDateKeysFromStart,
  formatDateKey,
  getAttendanceDays,
  getFirstSundayInMay,
  parseDateKeyToTime,
} from './attendance.utils';

interface UseAttendanceAnalyticsParams {
  people: AttendancePerson[];
  sortedPeople: AttendancePerson[];
  analysisSearchTerm: string;
  selectedAnalysisPersonId: string;
}

export default function useAttendanceAnalytics({
  people,
  sortedPeople,
  analysisSearchTerm,
  selectedAnalysisPersonId,
}: UseAttendanceAnalyticsParams) {
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

  return {
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
  };
}

