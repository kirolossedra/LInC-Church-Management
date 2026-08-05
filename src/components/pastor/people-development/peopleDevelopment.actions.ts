import {
  assignPeopleDevelopmentMember,
  createPeopleDevelopmentAssignment,
  createPeopleDevelopmentMeetingSchedule,
  createPeoplePersonalNote,
  deletePeopleDevelopmentAssignment,
  deletePeopleDevelopmentMeetingSchedule,
  deletePeoplePersonalNote,
  updatePeopleDevelopmentMeetingSchedule,
} from '../../../services/peopleDevelopment';

import type {
  PeopleDevelopmentAttachment,
  PeopleDevelopmentGroupId,
  PeopleDevelopmentMeetingSchedule,
  PeopleDevelopmentMeetingScheduleDraft,
  PeoplePersonalNote,
  PeoplePersonalNoteType,
} from './peopleDevelopment.types';

export interface PeopleDevelopmentPersonInput {
  memberKey: string;
  identifier: string;
  fullName: string;
  email: string;
  primaryGift?: string;
  sourcePath?: string;
  sourceKeys?: string[];
}

export interface AssignPersonToPeopleDevelopmentGroupParams {
  person: PeopleDevelopmentPersonInput;
  group: PeopleDevelopmentGroupId | '';
  groupLabel: string;
  timestamp?: number;
}

export interface SavePeoplePersonalNoteParams {
  person: PeopleDevelopmentPersonInput;
  group: PeopleDevelopmentGroupId | '';
  groupLabel: string;
  type: PeoplePersonalNoteType;
  text: string;
  source?: string;
  timestamp?: number;
}

export interface PostPeopleDevelopmentAssignmentParams {
  groups: PeopleDevelopmentGroupId[];
  groupLabel: string;
  text: string;
  attachments: PeopleDevelopmentAttachment[];
  source?: string;
  timestamp?: number;
}

export interface PostedPeopleDevelopmentAssignment {
  assignmentId: string;
  group: PeopleDevelopmentGroupId;
  groups: PeopleDevelopmentGroupId[];
  groupLabel: string;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  attachments: PeopleDevelopmentAttachment[];
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeSourceKeys(
  sourceKeys: string[] | undefined,
): string[] {
  return Array.from(
    new Set(
      (sourceKeys || [])
        .map(value =>
          String(value || '').trim(),
        )
        .filter(Boolean),
    ),
  );
}

function validatePerson(
  person: PeopleDevelopmentPersonInput,
): void {
  if (!String(person.memberKey || '').trim()) {
    throw new Error(
      'People Development member key is missing.',
    );
  }

  if (!String(person.identifier || '').trim()) {
    throw new Error(
      'People Development identifier is missing.',
    );
  }
}

export async function assignPersonToPeopleDevelopmentGroup(
  params: AssignPersonToPeopleDevelopmentGroupParams,
): Promise<void> {
  const {
    person,
    group,
    groupLabel,
  } = params;

  validatePerson(person);

  const memberKey =
    String(person.memberKey).trim();

  const identifier =
    String(person.identifier).trim();

  const sourcePath =
    String(
      person.sourcePath || 'form',
    ).trim() || 'form';

  const sourceKeys =
    normalizeSourceKeys(
      person.sourceKeys,
    );

  await assignPeopleDevelopmentMember(memberKey, {
    identifier,
    fullName: String(person.fullName || '').trim(),
    email: String(person.email || '').trim(),
    primaryGift: String(person.primaryGift || '').trim(),
    sourcePath,
    sourceKeys,
    group,
    groupLabel,
  });
}

export async function savePeoplePersonalNote(
  params: SavePeoplePersonalNoteParams,
): Promise<PeoplePersonalNote> {
  const {
    person,
    group,
    groupLabel,
    type,
  } = params;

  validatePerson(person);

  const text = String(
    params.text || '',
  ).trim();

  if (!text) {
    throw new Error(
      'People Development personal note text is missing.',
    );
  }

  const createdAt =
    params.timestamp ?? Date.now();

  const createdAtISO =
    new Date(createdAt).toISOString();

  const noteData = {
    identifier: String(
      person.identifier,
    ).trim(),

    memberKey: String(
      person.memberKey,
    ).trim(),

    fullName: String(
      person.fullName || '',
    ).trim(),

    email: String(
      person.email || '',
    ).trim(),

    group,
    groupLabel,
    type,
    text,

    date: getLocalDateKey(
      new Date(createdAt),
    ),

    createdAt,
    createdAtISO,

    source:
      String(
        params.source ||
          'pastorCalendar',
      ).trim() ||
      'pastorCalendar',
  };

  const noteId =
    await createPeoplePersonalNote(
      noteData,
    );

  return {
    id: noteId,
    ...noteData,
  };
}

export async function postPeopleDevelopmentAssignment(
  params: PostPeopleDevelopmentAssignmentParams,
): Promise<PostedPeopleDevelopmentAssignment> {
  const text = String(
    params.text || '',
  ).trim();

  const attachments =
    params.attachments || [];

  const groups = Array.from(
    new Set(params.groups),
  );

  if (groups.length === 0) {
    throw new Error(
      'At least one People Development group is required.',
    );
  }

  if (
    !text &&
    attachments.length === 0
  ) {
    throw new Error(
      'People Development assignment text or attachment is required.',
    );
  }

  const createdAt =
    params.timestamp ?? Date.now();

  const createdAtISO =
    new Date(createdAt).toISOString();

  const date = getLocalDateKey(
    new Date(createdAt),
  );

  const assignmentId =
    await createPeopleDevelopmentAssignment({
      group: groups[0],
      groups,

      groupLabel: String(
        params.groupLabel || '',
      ).trim(),

      text,
      date,
      createdAt,
      createdAtISO,
      attachments,

      hasAttachments:
        attachments.length > 0,

      source:
        String(
          params.source ||
            'pastorCalendar',
        ).trim() ||
        'pastorCalendar',
    });

  return {
    assignmentId,
    group: groups[0],
    groups,

    groupLabel: String(
      params.groupLabel || '',
    ).trim(),

    text,
    date,
    createdAt,
    createdAtISO,
    attachments,
  };
}

export async function removePeopleDevelopmentAssignment(
  assignmentId: string,
): Promise<void> {
  await deletePeopleDevelopmentAssignment(
    assignmentId,
  );
}

export async function removePeoplePersonalNote(
  noteId: string,
): Promise<void> {
  await deletePeoplePersonalNote(
    noteId,
  );
}

export interface SavePeopleDevelopmentMeetingScheduleParams {
  scheduleId?: string;
  draft: PeopleDevelopmentMeetingScheduleDraft;
  timestamp?: number;
}

function validatePeopleDevelopmentMeetingScheduleDraft(
  draft: PeopleDevelopmentMeetingScheduleDraft,
): void {
  if (
    draft.audience === 'group' &&
    !draft.group
  ) {
    throw new Error(
      'Select a People Development group for this meeting.',
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) {
    throw new Error(
      'Select a valid schedule start date.',
    );
  }

  if (
    draft.endDate &&
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate)
  ) {
    throw new Error(
      'Select a valid schedule end date.',
    );
  }

  if (
    draft.endDate &&
    draft.endDate < draft.startDate
  ) {
    throw new Error(
      'The schedule end date cannot be before its start date.',
    );
  }

  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)) {
    throw new Error(
      'Select a valid meeting time.',
    );
  }
}

export async function savePeopleDevelopmentMeetingSchedule(
  params: SavePeopleDevelopmentMeetingScheduleParams,
): Promise<PeopleDevelopmentMeetingSchedule> {
  validatePeopleDevelopmentMeetingScheduleDraft(
    params.draft,
  );

  const timestamp = params.timestamp ?? Date.now();
  const timestampISO = new Date(timestamp).toISOString();
  const scheduleId = String(
    params.scheduleId || '',
  ).trim();

  const normalizedDraft: PeopleDevelopmentMeetingScheduleDraft = {
    ...params.draft,
    group:
      params.draft.audience === 'shared'
        ? ''
        : params.draft.group,
  };

  if (scheduleId) {
    await updatePeopleDevelopmentMeetingSchedule(
      scheduleId,
      {
        ...normalizedDraft,
        updatedAt: timestamp,
        updatedAtISO: timestampISO,
      },
    );

    return {
      id: scheduleId,
      ...normalizedDraft,
      createdAt: 0,
      createdAtISO: '',
      updatedAt: timestamp,
      updatedAtISO: timestampISO,
    };
  }

  const createdSchedule = {
    ...normalizedDraft,
    createdAt: timestamp,
    createdAtISO: timestampISO,
    updatedAt: timestamp,
    updatedAtISO: timestampISO,
  };

  const createdScheduleId =
    await createPeopleDevelopmentMeetingSchedule(
      createdSchedule,
    );

  return {
    id: createdScheduleId,
    ...createdSchedule,
  };
}

export async function removePeopleDevelopmentMeetingSchedule(
  scheduleId: string,
): Promise<void> {
  await deletePeopleDevelopmentMeetingSchedule(
    scheduleId,
  );
}

export async function setPeopleDevelopmentMeetingScheduleActive(
  scheduleId: string,
  active: boolean,
  timestamp = Date.now(),
): Promise<void> {
  await updatePeopleDevelopmentMeetingSchedule(
    scheduleId,
    {
      active,
      updatedAt: timestamp,
      updatedAtISO: new Date(timestamp).toISOString(),
    },
  );
}
