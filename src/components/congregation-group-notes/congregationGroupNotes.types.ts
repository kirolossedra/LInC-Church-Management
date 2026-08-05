import type {
  PeopleDevelopmentMeetingOccurrence,
  PeopleDevelopmentMeetingSchedule,
} from '../pastor/people-development';

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

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PeopleDevelopmentGroupConfig {
  id: PeopleDevelopmentGroupId;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  cardClass: string;
  badgeClass: string;
  accentClass: string;
}

export interface MemberProfile {
  memberKey: string;
  identifier: string;
  fullName: string;
  email: string;
  primaryGift: string;
  group: PeopleDevelopmentGroupId | '';
  groupLabel: string;
  sourcePath?: string;
  sourceKeys?: string[];
}

export interface GroupAssignmentAttachment {
  name: string;
  type: string;
  size: number;
  encoding: string;
  storage: string;
  base64: string;
  uploadedAt: number;
  uploadedAtISO: string;
}

export interface GroupAssignment {
  id: string;
  group: PeopleDevelopmentGroupId;
  groups: PeopleDevelopmentGroupId[];
  groupLabel: string;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  source?: string;
  attachments: GroupAssignmentAttachment[];
}

export interface NextMeetingSummary {
  schedule: PeopleDevelopmentMeetingSchedule;
  occurrence: PeopleDevelopmentMeetingOccurrence;
}


