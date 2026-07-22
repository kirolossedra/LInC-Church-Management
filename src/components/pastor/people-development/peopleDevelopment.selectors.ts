import {
  format,
} from 'date-fns';

import {
  PEOPLE_DEVELOPMENT_GROUPS,
} from './peopleDevelopment.constants';

import type {
  PeopleDevelopmentEntry,
  PeopleDevelopmentGroupId,
  PeopleDevelopmentMember,
  PeoplePersonalNote,
} from './peopleDevelopment.types';

import {
  isUsableEmail,
} from './peopleDevelopment.utils';

export interface PeopleDevelopmentParticipant {
  id: string;
  name: string;
  email: string;
  primaryGift: string;
  identifier: string;
  memberKey: string;
  firstName: string;
  peopleGroup?: PeopleDevelopmentGroupId | '';
  sourcePath: string;
  sourceKeys: string[];
}

export type PeopleDevelopmentMembersByKey =
  Record<string, PeopleDevelopmentMember>;

export function getPeopleDevelopmentGroupLabel(
  groupId: PeopleDevelopmentGroupId,
  locale: 'en' | 'ar',
): string {
  const group =
    PEOPLE_DEVELOPMENT_GROUPS.find(
      item => item.id === groupId,
    );

  if (!group) {
    return groupId;
  }

  return locale === 'ar'
    ? group.labelAr
    : group.labelEn;
}

export function getParticipantPeopleDevelopmentGroup(
  participant: PeopleDevelopmentParticipant,
  members: PeopleDevelopmentMembersByKey,
): PeopleDevelopmentGroupId | '' {
  return (
    members[participant.memberKey]?.group ||
    participant.peopleGroup ||
    ''
  );
}

export function getPeopleDevelopmentGroupParticipants(
  participants: PeopleDevelopmentParticipant[],
  members: PeopleDevelopmentMembersByKey,
  groupId: PeopleDevelopmentGroupId,
): PeopleDevelopmentParticipant[] {
  return participants.filter(
    participant =>
      getParticipantPeopleDevelopmentGroup(
        participant,
        members,
      ) === groupId,
  );
}

export function getPeopleDevelopmentGroupAssignments(
  entries: PeopleDevelopmentEntry[],
  groupId: PeopleDevelopmentGroupId,
): PeopleDevelopmentEntry[] {
  return entries.filter(
    entry => entry.group === groupId,
  );
}

export function getPeopleAssignmentDateKey(
  entry: PeopleDevelopmentEntry,
): string {
  try {
    const source =
      entry.date ||
      entry.createdAtISO ||
      (
        entry.createdAt
          ? new Date(
              entry.createdAt,
            ).toISOString()
          : ''
      );

    if (!source) {
      return '';
    }

    const date = source.includes('T')
      ? new Date(source)
      : new Date(
          `${source}T12:00:00`,
        );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return entry.date || '';
    }

    return format(
      date,
      'yyyy-MM-dd',
    );
  } catch {
    return entry.date || '';
  }
}

export function getPeopleAssignmentsInMonth(
  entries: PeopleDevelopmentEntry[],
  monthDate: Date,
): PeopleDevelopmentEntry[] {
  const monthKey =
    format(
      monthDate,
      'yyyy-MM',
    );

  return entries.filter(
    entry =>
      getPeopleAssignmentDateKey(
        entry,
      ).startsWith(
        monthKey,
      ),
  );
}

export function groupPeopleAssignmentsByDate(
  entries: PeopleDevelopmentEntry[],
): Record<
  string,
  PeopleDevelopmentEntry[]
> {
  return entries.reduce<
    Record<
      string,
      PeopleDevelopmentEntry[]
    >
  >(
    (
      accumulator,
      entry,
    ) => {
      const dateKey =
        getPeopleAssignmentDateKey(
          entry,
        );

      if (!dateKey) {
        return accumulator;
      }

      accumulator[dateKey] = [
        ...(
          accumulator[dateKey] ||
          []
        ),
        entry,
      ];

      return accumulator;
    },
    {},
  );
}

export function getPeoplePersonalNotesForParticipant(
  notes: PeoplePersonalNote[],
  participant: PeopleDevelopmentParticipant,
): PeoplePersonalNote[] {
  const normalizedIdentifier =
    participant.identifier
      .trim()
      .toLowerCase();

  return notes.filter(
    note =>
      note.memberKey ===
        participant.memberKey ||
      (
        Boolean(
          normalizedIdentifier,
        ) &&
        note.identifier
          .trim()
          .toLowerCase() ===
          normalizedIdentifier
      ),
  );
}

export function searchPeopleDevelopmentParticipants(
  participants: PeopleDevelopmentParticipant[],
  searchTerm: string,
): PeopleDevelopmentParticipant[] {
  const search =
    searchTerm
      .trim()
      .toLowerCase();

  if (!search) {
    return participants;
  }

  return participants.filter(
    participant =>
      participant.firstName
        .toLowerCase()
        .includes(search) ||
      participant.name
        .toLowerCase()
        .includes(search) ||
      participant.identifier
        .toLowerCase()
        .includes(search) ||
      participant.email
        .toLowerCase()
        .includes(search),
  );
}

export function getPeopleDevelopmentEmailRecipients(
  participants: PeopleDevelopmentParticipant[],
  members: PeopleDevelopmentMembersByKey,
  groupId: PeopleDevelopmentGroupId,
): PeopleDevelopmentParticipant[] {
  const peopleInGroup =
    getPeopleDevelopmentGroupParticipants(
      participants,
      members,
      groupId,
    );

  const peopleByEmail =
    new Map<
      string,
      PeopleDevelopmentParticipant
    >();

  peopleInGroup.forEach(
    participant => {
      const email =
        String(
          participant.email || '',
        ).trim();

      if (!isUsableEmail(email)) {
        return;
      }

      peopleByEmail.set(
        email.toLowerCase(),
        {
          ...participant,
          email,
        },
      );
    },
  );

  return Array.from(
    peopleByEmail.values(),
  ).sort(
    (first, second) =>
      first.name.localeCompare(
        second.name,
      ),
  );
}
