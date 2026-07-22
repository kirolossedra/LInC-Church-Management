import {
  onValue,
  push,
  ref,
  remove,
  update,
  type Unsubscribe,
} from 'firebase/database';

import { database } from '../../../firebase';

import {
  PEOPLE_DEVELOPMENT_ROOT,
} from './peopleDevelopment.constants';

import type {
  PeopleDevelopmentAttachment,
  PeopleDevelopmentEntry,
  PeopleDevelopmentMember,
  PeoplePersonalNote,
} from './peopleDevelopment.types';

import {
  normalizePeopleDevelopmentGroup,
  normalizePeoplePersonalNoteType,
} from './peopleDevelopment.utils';

type FirebaseErrorHandler = (error: Error) => void;

export type PeopleDevelopmentMembersByKey =
  Record<string, PeopleDevelopmentMember>;

export interface CreatePeopleDevelopmentAssignmentInput {
  group: PeopleDevelopmentEntry['group'];
  groupLabel: string;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  attachments: PeopleDevelopmentAttachment[];
  hasAttachments: boolean;
  source: string;
}

export type CreatePeoplePersonalNoteInput =
  Omit<PeoplePersonalNote, 'id'>;

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeAttachment(
  value: unknown,
): PeopleDevelopmentAttachment | null {
  const attachment = asRecord(value);
  const name = String(attachment.name || '').trim();
  const base64 = String(attachment.base64 || '').trim();

  if (!name || !base64) {
    return null;
  }

  return {
    name,
    type:
      String(attachment.type || 'application/pdf').trim() ||
      'application/pdf',
    size: normalizeNumber(attachment.size),
    encoding: 'base64',
    storage: 'realtimeDatabase',
    base64,
    uploadedAt: normalizeNumber(attachment.uploadedAt),
    uploadedAtISO: String(
      attachment.uploadedAtISO || '',
    ).trim(),
  };
}

export function subscribeToPeopleDevelopmentMembers(
  onData: (members: PeopleDevelopmentMembersByKey) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const membersRef = ref(
    database,
    `${PEOPLE_DEVELOPMENT_ROOT}/members/`,
  );

  return onValue(
    membersRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData({});
        return;
      }

      const members = Object.fromEntries(
        Object.entries(data).map(([memberKey, rawValue]) => {
          const value = asRecord(rawValue);

          const member: PeopleDevelopmentMember = {
            memberKey,
            identifier: String(value.identifier || '').trim(),
            fullName: String(
              value.fullName || value.name || '',
            ).trim(),
            email: String(value.email || '').trim(),
            group: normalizePeopleDevelopmentGroup(value.group),
            sourcePath: String(value.sourcePath || 'form').trim(),
            sourceKeys: Array.isArray(value.sourceKeys)
              ? value.sourceKeys.map(item => String(item))
              : [],
            updatedAt: normalizeNumber(value.updatedAt),
            updatedAtISO: String(value.updatedAtISO || '').trim(),
          };

          return [memberKey, member];
        }),
      );

      onData(members);
    },
    error => {
      console.error(
        'Failed to load People Development members:',
        error,
      );
      onData({});
      onError?.(error);
    },
  );
}

export function subscribeToPeopleDevelopmentAssignments(
  onData: (entries: PeopleDevelopmentEntry[]) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const assignmentsRef = ref(
    database,
    `${PEOPLE_DEVELOPMENT_ROOT}/assignments/`,
  );

  return onValue(
    assignmentsRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const entries = Object.entries(data)
        .map(([id, rawValue]) => {
          const value = asRecord(rawValue);

          const attachments = Array.isArray(value.attachments)
            ? value.attachments
                .map(normalizeAttachment)
                .filter(
                  (
                    attachment,
                  ): attachment is PeopleDevelopmentAttachment =>
                    Boolean(attachment),
                )
            : [];

          return {
            id,
            group: normalizePeopleDevelopmentGroup(value.group),
            text: String(value.text || '').trim(),
            date: String(value.date || '').trim(),
            createdAt: normalizeNumber(value.createdAt),
            createdAtISO: String(value.createdAtISO || '').trim(),
            attachments,
          };
        })
        .filter(
          (
            entry,
          ): entry is PeopleDevelopmentEntry =>
            Boolean(
              entry.group &&
                (entry.text || entry.attachments.length > 0),
            ),
        )
        .sort(
          (first, second) =>
            second.createdAt - first.createdAt,
        );

      onData(entries);
    },
    error => {
      console.error(
        'Failed to load People Development assignments:',
        error,
      );
      onData([]);
      onError?.(error);
    },
  );
}

export function subscribeToPeoplePersonalNotes(
  onData: (notes: PeoplePersonalNote[]) => void,
  onError?: FirebaseErrorHandler,
): Unsubscribe {
  const personalNotesRef = ref(
    database,
    `${PEOPLE_DEVELOPMENT_ROOT}/personalNotes/`,
  );

  return onValue(
    personalNotesRef,
    snapshot => {
      const data = snapshot.val();

      if (!data) {
        onData([]);
        return;
      }

      const notes = Object.entries(data)
        .map(([id, rawValue]) => {
          const value = asRecord(rawValue);

          return {
            id,
            identifier: String(value.identifier || '').trim(),
            memberKey: String(value.memberKey || '').trim(),
            fullName: String(
              value.fullName || value.name || '',
            ).trim(),
            email: String(value.email || '').trim(),
            group: normalizePeopleDevelopmentGroup(value.group),
            groupLabel: String(value.groupLabel || '').trim(),
            type: normalizePeoplePersonalNoteType(value.type),
            text: String(value.text || '').trim(),
            date: String(value.date || '').trim(),
            createdAt: normalizeNumber(value.createdAt),
            createdAtISO: String(value.createdAtISO || '').trim(),
            source: String(
              value.source || 'pastorCalendar',
            ).trim(),
          };
        })
        .filter(
          (
            note,
          ): note is PeoplePersonalNote =>
            Boolean(
              (note.memberKey || note.identifier) && note.text,
            ),
        )
        .sort(
          (first, second) =>
            second.createdAt - first.createdAt,
        );

      onData(notes);
    },
    error => {
      console.error(
        'Failed to load People Development personal notes:',
        error,
      );
      onData([]);
      onError?.(error);
    },
  );
}

export async function createPeopleDevelopmentAssignment(
  assignment: CreatePeopleDevelopmentAssignmentInput,
): Promise<string> {
  const assignmentRef = await push(
    ref(
      database,
      `${PEOPLE_DEVELOPMENT_ROOT}/assignments/`,
    ),
    assignment,
  );

  return assignmentRef.key || '';
}

export async function deletePeopleDevelopmentAssignment(
  assignmentId: string,
): Promise<void> {
  const normalizedAssignmentId = String(
    assignmentId || '',
  ).trim();

  if (!normalizedAssignmentId) {
    throw new Error(
      'People Development assignment ID is missing.',
    );
  }

  await remove(
    ref(
      database,
      `${PEOPLE_DEVELOPMENT_ROOT}/assignments/${normalizedAssignmentId}`,
    ),
  );
}

export async function createPeoplePersonalNote(
  note: CreatePeoplePersonalNoteInput,
): Promise<string> {
  const personalNoteRef = await push(
    ref(
      database,
      `${PEOPLE_DEVELOPMENT_ROOT}/personalNotes/`,
    ),
    note,
  );

  return personalNoteRef.key || '';
}

export async function deletePeoplePersonalNote(
  noteId: string,
): Promise<void> {
  const normalizedNoteId = String(noteId || '').trim();

  if (!normalizedNoteId) {
    throw new Error(
      'People Development personal note ID is missing.',
    );
  }

  await remove(
    ref(
      database,
      `${PEOPLE_DEVELOPMENT_ROOT}/personalNotes/${normalizedNoteId}`,
    ),
  );
}

export async function updatePeopleDevelopmentRecords(
  updates: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(updates).length === 0) {
    return;
  }

  await update(ref(database), updates);
}
