import {
  PEOPLE_DEVELOPMENT_ROOT,
} from './peopleDevelopment.constants';

import {
  createPeopleDevelopmentAssignment,
  createPeoplePersonalNote,
  deletePeopleDevelopmentAssignment,
  deletePeoplePersonalNote,
  updatePeopleDevelopmentRecords,
} from './peopleDevelopment.firebase';

import type {
  PeopleDevelopmentAttachment,
  PeopleDevelopmentGroupId,
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
  group: PeopleDevelopmentGroupId;
  groupLabel: string;
  text: string;
  attachments: PeopleDevelopmentAttachment[];
  source?: string;
  timestamp?: number;
}

export interface PostedPeopleDevelopmentAssignment {
  assignmentId: string;
  group: PeopleDevelopmentGroupId;
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

  const updatedAt =
    params.timestamp ?? Date.now();

  const updatedAtISO =
    new Date(updatedAt).toISOString();

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

  const updates: Record<
    string,
    unknown
  > = {
    [`${PEOPLE_DEVELOPMENT_ROOT}/members/${memberKey}`]: {
      memberKey,
      identifier,

      fullName: String(
        person.fullName || '',
      ).trim(),

      email: String(
        person.email || '',
      ).trim(),

      group,
      groupLabel,

      primaryGift: String(
        person.primaryGift || '',
      ).trim(),

      sourcePath,
      sourceKeys,
      updatedAt,
      updatedAtISO,
    },
  };

  sourceKeys.forEach(sourceKey => {
    updates[
      `${sourcePath}/${sourceKey}/peopleDevelopmentGroup`
    ] = group;

    updates[
      `${sourcePath}/${sourceKey}/peopleDevelopment`
    ] = {
      group,
      groupLabel,
      memberKey,
      identifier,
      updatedAt,
      updatedAtISO,
    };

    updates[
      `${sourcePath}/${sourceKey}/fields/peopleDevelopment/group`
    ] = {
      fieldEnglish:
        'People Development Group',

      fieldArabic:
        'مجموعة نمو الأشخاص',

      value: group,
      label: groupLabel,
      updatedAt,
      updatedAtISO,
    };
  });

  await updatePeopleDevelopmentRecords(
    updates,
  );
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
      group: params.group,

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
    group: params.group,

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
