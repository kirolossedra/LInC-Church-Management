import {
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import type {
  Meeting,
  MeetingRequest,
} from '../../../types';

import {
  SLOT_BLOCK_DURATION,
  buildAvailabilityDates,
  buildSlotBlockHours,
  createInitialAvailabilityForm,
  createInitialUnavailabilityForm,
  getAvailabilityBlocksForDate,
  getBlockingUnavailabilityForSlot,
  getDateString,
  getMeetingsForDate,
  getPastorSlotStatus as calculatePastorSlotStatus,
  getPastorSlotTranslationKey,
  getUnavailabilityRange,
  hourToTime,
  isPastorSlotBooked,
  isPastorSlotInsideAvailability,
  type Availability,
  type AvailabilityForm,
  type PastorSlotStatus,
  type Unavailability,
  type UnavailabilityForm,
} from '../calendar';
import {
  createPastorCalendarBlock,
  deletePastorCalendarBlock,
  updatePastorCalendarBlock,
  type PastorCalendarBlockInput,
} from '../../../services/pastorCalendar';

type TranslateFunction = (
  key: any,
) => string;

export interface UseAvailabilityParams {
  meetings: Meeting[];
  meetingRequests: MeetingRequest[];
  translate: TranslateFunction;
  availability: Availability[];
  unavailability: Unavailability[];
  refreshCalendar: () => Promise<void>;
}

export default function useAvailability({
  meetings,
  meetingRequests,
  translate,
  availability,
  unavailability,
  refreshCalendar,
}: UseAvailabilityParams) {
  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  const [
    showAvailabilityModal,
    setShowAvailabilityModal,
  ] = useState(false);

  const [
    editingAvailability,
    setEditingAvailability,
  ] = useState<Availability | null>(
    null,
  );

  const [
    availabilityForm,
    setAvailabilityForm,
  ] = useState<AvailabilityForm>(
    createInitialAvailabilityForm,
  );

  const [
    showUnavailabilityModal,
    setShowUnavailabilityModal,
  ] = useState(false);

  const [
    editingUnavailability,
    setEditingUnavailability,
  ] = useState<Unavailability | null>(
    null,
  );

  const [
    unavailabilityForm,
    setUnavailabilityForm,
  ] = useState<UnavailabilityForm>(
    createInitialUnavailabilityForm,
  );

  const [
    selectedSlotDay,
    setSelectedSlotDay,
  ] = useState<Date | null>(null);

  const [
    slotBlockingLoading,
    setSlotBlockingLoading,
  ] = useState(false);

  const createAvailability = (block: PastorCalendarBlockInput) =>
    createPastorCalendarBlock('availability', block);
  const updateAvailability = (
    id: string,
    block: PastorCalendarBlockInput,
  ) => updatePastorCalendarBlock('availability', id, block);
  const deleteAvailability = (id: string) =>
    deletePastorCalendarBlock('availability', id);
  const createUnavailability = (block: PastorCalendarBlockInput) =>
    createPastorCalendarBlock('unavailability', block);
  const updateUnavailability = (
    id: string,
    block: PastorCalendarBlockInput,
  ) => updatePastorCalendarBlock('unavailability', id, block);
  const deleteUnavailability = (id: string) =>
    deletePastorCalendarBlock('unavailability', id);

  const slotBlockHours =
    useMemo(
      () =>
        buildSlotBlockHours(),
      [],
    );

  const resetAvailabilityForm = () => {
    setAvailabilityForm(
      createInitialAvailabilityForm(),
    );
  };

  const resetUnavailabilityForm = () => {
    setUnavailabilityForm(
      createInitialUnavailabilityForm(),
    );
  };

  const openAvailabilityCreator = (
    date?: string,
  ) => {
    const nextForm =
      createInitialAvailabilityForm();

    if (date) {
      nextForm.date = date;
      nextForm.startDate = date;
      nextForm.endDate = date;
    }

    setEditingAvailability(null);
    setAvailabilityForm(nextForm);
    setShowAvailabilityModal(true);
  };

  const openAvailabilityEditor = (
    item: Availability,
  ) => {
    setEditingAvailability(item);

    setAvailabilityForm({
      mode: 'single',
      date: item.date,
      startDate: item.date,
      endDate: item.date,
      selectedWeekdays: [
        new Date(
          `${item.date}T12:00:00`,
        ).getDay(),
      ],
      startTime:
        item.startTime ||
        '09:00',
      endTime:
        item.endTime ||
        '20:00',
      reason:
        item.reason ||
        '',
      allDay:
        Boolean(item.allDay),
    });

    setShowAvailabilityModal(true);
  };

  const closeAvailabilityModal = () => {
    setShowAvailabilityModal(false);
    setEditingAvailability(null);
    resetAvailabilityForm();
  };

  const openUnavailabilityCreator = (
    date?: string,
  ) => {
    const nextForm =
      createInitialUnavailabilityForm();

    if (date) {
      nextForm.date = date;
    }

    setEditingUnavailability(null);
    setUnavailabilityForm(nextForm);
    setShowUnavailabilityModal(true);
  };

  const openUnavailabilityEditor = (
    item: Unavailability,
  ) => {
    setEditingUnavailability(item);

    setUnavailabilityForm({
      date: item.date,
      startTime:
        item.startTime ||
        '09:00',
      endTime:
        item.endTime ||
        '20:00',
      reason:
        item.reason ||
        '',
      allDay:
        Boolean(item.allDay),
    });

    setShowUnavailabilityModal(true);
  };

  const closeUnavailabilityModal = () => {
    setShowUnavailabilityModal(false);
    setEditingUnavailability(null);
    resetUnavailabilityForm();
  };

  const handleSaveAvailability = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAvailabilityLoading(true);

    try {
      const availabilityData = {
        date:
          availabilityForm.date,
        startTime:
          availabilityForm.allDay
            ? '09:00'
            : availabilityForm.startTime,
        endTime:
          availabilityForm.allDay
            ? '20:00'
            : availabilityForm.endTime,
        reason:
          availabilityForm.reason ||
          '',
        allDay:
          availabilityForm.allDay,
      };

      if (editingAvailability) {
        await updateAvailability(
          editingAvailability.id,
          availabilityData,
        );
      } else {
        const selectedDates =
          buildAvailabilityDates(
            availabilityForm,
          );

        if (
          selectedDates.length ===
          0
        ) {
          window.alert(
            translate(
              'calendar.noAvailableDatesSelected',
            ),
          );

          return;
        }

        await Promise.all(
          selectedDates.map(
            date =>
              createAvailability({
                ...availabilityData,
                date,
              }),
          ),
        );
      }

      await refreshCalendar();
      closeAvailabilityModal();
    } catch (error) {
      console.error(
        'Failed to save availability:',
        error,
      );

      window.alert(
        translate(
          'calendar.saveAvailabilityFailed',
        ),
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleDeleteAvailability = async (
    availabilityId: string,
  ) => {
    if (
      !window.confirm(
        translate(
          'calendar.removeAvailabilityConfirm',
        ),
      )
    ) {
      return;
    }

    try {
      await deleteAvailability(
        availabilityId,
      );
      await refreshCalendar();
    } catch (error) {
      console.error(
        'Failed to delete availability:',
        error,
      );

      window.alert(
        translate(
          'calendar.saveAvailabilityFailed',
        ),
      );
    }
  };

  const handleSaveUnavailability = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAvailabilityLoading(true);

    try {
      const unavailabilityData = {
        date:
          unavailabilityForm.date,
        startTime:
          unavailabilityForm.allDay
            ? '00:00'
            : unavailabilityForm.startTime,
        endTime:
          unavailabilityForm.allDay
            ? '23:59'
            : unavailabilityForm.endTime,
        reason:
          unavailabilityForm.reason ||
          '',
        allDay:
          unavailabilityForm.allDay,
      };

      if (editingUnavailability) {
        await updateUnavailability(
          editingUnavailability.id,
          unavailabilityData,
        );
      } else {
        await createUnavailability(
          unavailabilityData,
        );
      }

      await refreshCalendar();
      closeUnavailabilityModal();
    } catch (error) {
      console.error(
        'Failed to save unavailability:',
        error,
      );

      window.alert(
        translate(
          'calendar.saveUnavailabilityFailed',
        ),
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleDeleteUnavailability = async (
    unavailabilityId: string,
  ) => {
    try {
      await deleteUnavailability(
        unavailabilityId,
      );
      await refreshCalendar();
    } catch (error) {
      console.error(
        'Failed to delete unavailability:',
        error,
      );

      window.alert(
        translate(
          'calendar.saveUnavailabilityFailed',
        ),
      );
    }
  };

  const getDashboardSlotStatus = (
    day: Date,
    startHour: number,
  ): PastorSlotStatus =>
    calculatePastorSlotStatus({
      day,
      startHour,
      availability,
      unavailability,
      meetings,
      meetingRequests,
    });

  const getDashboardSlotLabel = (
    status: PastorSlotStatus,
  ): string =>
    translate(
      getPastorSlotTranslationKey(
        status,
      ) as any,
    );

  const handleToggleSlotBlock = async (
    day: Date,
    startHour: number,
  ) => {
    const dateString =
      getDateString(day);

    const endHour =
      startHour +
      SLOT_BLOCK_DURATION;

    if (
      isPastorSlotBooked(
        meetings,
        meetingRequests,
        dateString,
        startHour,
        endHour,
      )
    ) {
      return;
    }

    const existingBlock =
      getBlockingUnavailabilityForSlot(
        unavailability,
        dateString,
        startHour,
        endHour,
      );

    if (
      !isPastorSlotInsideAvailability(
        availability,
        dateString,
        startHour,
        endHour,
      ) &&
      !existingBlock
    ) {
      return;
    }

    setSlotBlockingLoading(true);

    try {
      if (!existingBlock) {
        await createUnavailability({
          date:
            dateString,
          startTime:
            hourToTime(
              startHour,
            ),
          endTime:
            hourToTime(
              endHour,
            ),
          reason:
            'Slot blocked by pastor',
          allDay: false,
        });

        await refreshCalendar();
        return;
      }

      const existingRange =
        getUnavailabilityRange(
          existingBlock,
        );

      await deleteUnavailability(
        existingBlock.id,
      );

      if (
        existingRange.start <
        startHour
      ) {
        await createUnavailability({
          date:
            dateString,
          startTime:
            hourToTime(
              existingRange.start,
            ),
          endTime:
            hourToTime(
              startHour,
            ),
          reason:
            existingBlock.reason ||
            'Slot blocked by pastor',
          allDay: false,
        });
      }

      if (
        endHour <
        existingRange.end
      ) {
        await createUnavailability({
          date:
            dateString,
          startTime:
            hourToTime(
              endHour,
            ),
          endTime:
            hourToTime(
              existingRange.end,
            ),
          reason:
            existingBlock.reason ||
            'Slot blocked by pastor',
          allDay: false,
        });
      }
      await refreshCalendar();
    } catch (error) {
      console.error(
        'Failed to toggle slot block:',
        error,
      );

      window.alert(
        translate(
          'calendar.saveUnavailabilityFailed',
        ),
      );
    } finally {
      setSlotBlockingLoading(false);
    }
  };

  const availabilityDateCount =
    buildAvailabilityDates(
      availabilityForm,
    ).length;

  const selectedSlotDateString =
    selectedSlotDay
      ? getDateString(
          selectedSlotDay,
        )
      : '';

  const selectedDayAvailabilityBlocks =
    selectedSlotDateString
      ? getAvailabilityBlocksForDate(
          availability,
          selectedSlotDateString,
        )
      : [];

  const selectedDayMeetings =
    selectedSlotDateString
      ? getMeetingsForDate(
          meetings,
          selectedSlotDateString,
        )
      : [];

  const selectedDayOpenSlotHours =
    selectedSlotDay
      ? slotBlockHours.filter(
          hour =>
            getDashboardSlotStatus(
              selectedSlotDay,
              hour,
            ) ===
            'available',
        )
      : [];

  return {
    availability,
    unavailability,
    availabilityLoading,

    showAvailabilityModal,
    setShowAvailabilityModal,
    editingAvailability,
    setEditingAvailability,
    availabilityForm,
    setAvailabilityForm,
    availabilityDateCount,

    showUnavailabilityModal,
    setShowUnavailabilityModal,
    editingUnavailability,
    setEditingUnavailability,
    unavailabilityForm,
    setUnavailabilityForm,

    selectedSlotDay,
    setSelectedSlotDay,
    selectedSlotDateString,
    selectedDayAvailabilityBlocks,
    selectedDayMeetings,
    selectedDayOpenSlotHours,

    slotBlockHours,
    slotBlockingLoading,

    resetAvailabilityForm,
    resetUnavailabilityForm,

    openAvailabilityCreator,
    openAvailabilityEditor,
    closeAvailabilityModal,

    openUnavailabilityCreator,
    openUnavailabilityEditor,
    closeUnavailabilityModal,

    handleSaveAvailability,
    handleDeleteAvailability,
    handleSaveUnavailability,
    handleDeleteUnavailability,

    getDashboardSlotStatus,
    getDashboardSlotLabel,
    handleToggleSlotBlock,
  };
}

export type UseAvailabilityResult =
  ReturnType<
    typeof useAvailability
  >;
