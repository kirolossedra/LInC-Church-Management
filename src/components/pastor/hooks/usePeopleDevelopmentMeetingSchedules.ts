import {
  useEffect,
  useState,
} from 'react';

import {
  getPeopleDevelopmentLocalDateKey,
  removePeopleDevelopmentMeetingSchedule,
  savePeopleDevelopmentMeetingSchedule,
  setPeopleDevelopmentMeetingScheduleActive,
  subscribeToPeopleDevelopmentMeetingSchedules,
  type PeopleDevelopmentMeetingSchedule,
  type PeopleDevelopmentMeetingScheduleDraft,
} from '../people-development';

export interface UsePeopleDevelopmentMeetingSchedulesParams {
  locale: 'en' | 'ar';
}

function createDefaultDraft(): PeopleDevelopmentMeetingScheduleDraft {
  return {
    audience: 'group',
    group: '',
    ordinal: 1,
    weekday: 6,
    startTime: '18:00',
    durationMinutes: 90,
    startDate:
      getPeopleDevelopmentLocalDateKey(
        new Date(),
      ),
    endDate: '',
    active: true,
  };
}

export default function usePeopleDevelopmentMeetingSchedules({
  locale,
}: UsePeopleDevelopmentMeetingSchedulesParams) {
  const [
    showPeopleDevelopmentMeetingSchedules,
    setShowPeopleDevelopmentMeetingSchedules,
  ] = useState(false);

  const [
    peopleDevelopmentMeetingSchedules,
    setPeopleDevelopmentMeetingSchedules,
  ] = useState<PeopleDevelopmentMeetingSchedule[]>([]);

  const [
    peopleDevelopmentMeetingSchedulesLoading,
    setPeopleDevelopmentMeetingSchedulesLoading,
  ] = useState(true);

  const [
    peopleDevelopmentMeetingScheduleSaving,
    setPeopleDevelopmentMeetingScheduleSaving,
  ] = useState(false);

  const [
    peopleDevelopmentMeetingScheduleDeletingId,
    setPeopleDevelopmentMeetingScheduleDeletingId,
  ] = useState<string | null>(null);

  const [
    peopleDevelopmentMeetingScheduleEditingId,
    setPeopleDevelopmentMeetingScheduleEditingId,
  ] = useState<string | null>(null);

  const [
    peopleDevelopmentMeetingScheduleDraft,
    setPeopleDevelopmentMeetingScheduleDraft,
  ] = useState<PeopleDevelopmentMeetingScheduleDraft>(
    createDefaultDraft,
  );

  const [
    peopleDevelopmentMeetingsCalendarMonth,
    setPeopleDevelopmentMeetingsCalendarMonth,
  ] = useState(new Date());

  useEffect(() => {
    setPeopleDevelopmentMeetingSchedulesLoading(true);

    return subscribeToPeopleDevelopmentMeetingSchedules(
      schedules => {
        setPeopleDevelopmentMeetingSchedules(schedules);
        setPeopleDevelopmentMeetingSchedulesLoading(false);
      },
      () => {
        setPeopleDevelopmentMeetingSchedulesLoading(false);
      },
    );
  }, []);

  const setPeopleDevelopmentMeetingScheduleDraftField = <
    K extends keyof PeopleDevelopmentMeetingScheduleDraft,
  >(
    field: K,
    value: PeopleDevelopmentMeetingScheduleDraft[K],
  ) => {
    setPeopleDevelopmentMeetingScheduleDraft(previous => {
      if (
        field === 'audience' &&
        value === 'shared'
      ) {
        return {
          ...previous,
          audience: 'shared',
          group: '',
        };
      }

      return {
        ...previous,
        [field]: value,
      };
    });
  };

  const startCreatingPeopleDevelopmentMeetingSchedule = () => {
    setPeopleDevelopmentMeetingScheduleEditingId(null);
    setPeopleDevelopmentMeetingScheduleDraft(
      createDefaultDraft(),
    );
  };

  const startEditingPeopleDevelopmentMeetingSchedule = (
    schedule: PeopleDevelopmentMeetingSchedule,
  ) => {
    setPeopleDevelopmentMeetingScheduleEditingId(
      schedule.id,
    );

    setPeopleDevelopmentMeetingScheduleDraft({
      audience: schedule.audience,
      group: schedule.group,
      ordinal: schedule.ordinal,
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      durationMinutes: schedule.durationMinutes || 90,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      active: schedule.active,
    });

    setShowPeopleDevelopmentMeetingSchedules(true);
  };

  const cancelEditingPeopleDevelopmentMeetingSchedule = () => {
    startCreatingPeopleDevelopmentMeetingSchedule();
  };

  const saveCurrentPeopleDevelopmentMeetingSchedule = async () => {
    setPeopleDevelopmentMeetingScheduleSaving(true);

    try {
      await savePeopleDevelopmentMeetingSchedule({
        scheduleId:
          peopleDevelopmentMeetingScheduleEditingId ||
          undefined,
        draft: peopleDevelopmentMeetingScheduleDraft,
      });

      startCreatingPeopleDevelopmentMeetingSchedule();
    } catch (error) {
      console.error(
        'Failed to save People Development meeting schedule:',
        error,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : locale === 'ar'
            ? 'تعذر حفظ جدول الاجتماع.'
            : 'Could not save the meeting schedule.',
      );
    } finally {
      setPeopleDevelopmentMeetingScheduleSaving(false);
    }
  };

  const deletePeopleDevelopmentMeetingSchedule = async (
    schedule: PeopleDevelopmentMeetingSchedule,
  ) => {
    const confirmed = window.confirm(
      locale === 'ar'
        ? 'هل تريد حذف جدول الاجتماع نهائياً؟'
        : 'Delete this meeting schedule permanently?',
    );

    if (!confirmed) {
      return;
    }

    setPeopleDevelopmentMeetingScheduleDeletingId(
      schedule.id,
    );

    try {
      await removePeopleDevelopmentMeetingSchedule(
        schedule.id,
      );

      if (
        peopleDevelopmentMeetingScheduleEditingId ===
        schedule.id
      ) {
        startCreatingPeopleDevelopmentMeetingSchedule();
      }
    } catch (error) {
      console.error(
        'Failed to delete People Development meeting schedule:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'تعذر حذف جدول الاجتماع.'
          : 'Could not delete the meeting schedule.',
      );
    } finally {
      setPeopleDevelopmentMeetingScheduleDeletingId(null);
    }
  };

  const togglePeopleDevelopmentMeetingScheduleActive = async (
    schedule: PeopleDevelopmentMeetingSchedule,
  ) => {
    try {
      await setPeopleDevelopmentMeetingScheduleActive(
        schedule.id,
        !schedule.active,
      );
    } catch (error) {
      console.error(
        'Failed to change People Development meeting schedule status:',
        error,
      );

      window.alert(
        locale === 'ar'
          ? 'تعذر تغيير حالة جدول الاجتماع.'
          : 'Could not change the meeting schedule status.',
      );
    }
  };

  return {
    showPeopleDevelopmentMeetingSchedules,
    setShowPeopleDevelopmentMeetingSchedules,

    peopleDevelopmentMeetingSchedules,
    peopleDevelopmentMeetingSchedulesLoading,
    peopleDevelopmentMeetingScheduleSaving,
    peopleDevelopmentMeetingScheduleDeletingId,
    peopleDevelopmentMeetingScheduleEditingId,
    peopleDevelopmentMeetingScheduleDraft,
    peopleDevelopmentMeetingsCalendarMonth,

    setPeopleDevelopmentMeetingsCalendarMonth,
    setPeopleDevelopmentMeetingScheduleDraftField,
    startCreatingPeopleDevelopmentMeetingSchedule,
    startEditingPeopleDevelopmentMeetingSchedule,
    cancelEditingPeopleDevelopmentMeetingSchedule,
    saveCurrentPeopleDevelopmentMeetingSchedule,
    deletePeopleDevelopmentMeetingSchedule,
    togglePeopleDevelopmentMeetingScheduleActive,
  };
}

export type UsePeopleDevelopmentMeetingSchedulesResult =
  ReturnType<
    typeof usePeopleDevelopmentMeetingSchedules
  >;
