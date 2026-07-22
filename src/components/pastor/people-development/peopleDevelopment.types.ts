
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
