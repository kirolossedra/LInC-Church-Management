
export interface Availability {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  allDay?: boolean;
}

export interface Unavailability {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  allDay?: boolean;
}

export interface AvailabilityForm {
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

export interface UnavailabilityForm {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  allDay: boolean;
}
