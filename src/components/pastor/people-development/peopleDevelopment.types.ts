
export type PeopleDevelopmentGroupId =
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

export type PeoplePersonalNoteType = 'strength' | 'weakness';

export interface PeopleDevelopmentMember {
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

export interface PeopleDevelopmentAttachment {
  name: string;
  type: string;
  size: number;
  encoding: 'base64';
  storage: 'realtimeDatabase';
  base64: string;
  uploadedAt: number;
  uploadedAtISO: string;
}

export interface PeopleDevelopmentEntry {
  id: string;
  group: PeopleDevelopmentGroupId;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  attachments: PeopleDevelopmentAttachment[];
}

export interface PeoplePersonalNote {
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

export type PeopleDevelopmentMeetingAudience =
  | 'group'
  | 'shared';

export type PeopleDevelopmentMeetingOrdinal =
  | 1
  | 2
  | 3
  | 4
  | 'last';

export type PeopleDevelopmentMeetingWeekday =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

export interface PeopleDevelopmentMeetingSchedule {
  id: string;
  audience: PeopleDevelopmentMeetingAudience;
  group: PeopleDevelopmentGroupId | '';
  ordinal: PeopleDevelopmentMeetingOrdinal;
  weekday: PeopleDevelopmentMeetingWeekday;
  startTime: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: number;
  createdAtISO: string;
  updatedAt: number;
  updatedAtISO: string;
}

export interface PeopleDevelopmentMeetingScheduleDraft {
  audience: PeopleDevelopmentMeetingAudience;
  group: PeopleDevelopmentGroupId | '';
  ordinal: PeopleDevelopmentMeetingOrdinal;
  weekday: PeopleDevelopmentMeetingWeekday;
  startTime: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface PeopleDevelopmentMeetingOccurrence {
  scheduleId: string;
  date: string;
  dateValue: Date;
  startTime: string;
  audience: PeopleDevelopmentMeetingAudience;
  group: PeopleDevelopmentGroupId | '';
  title: string;
}
