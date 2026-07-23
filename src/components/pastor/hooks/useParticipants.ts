import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';

import { database } from '../../../firebase';

import {
  extractPeopleDevelopmentGroup,
  type PeopleDevelopmentParticipant,
} from '../people-development';

type UnknownRecord = Record<string, unknown>;

export interface UseParticipantsResult {
  participants: PeopleDevelopmentParticipant[];
  loading: boolean;
  error: Error | null;
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as UnknownRecord;
}

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function unwrapStoredValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  const record = value as UnknownRecord;

  for (const key of [
    'value',
    'answer',
    'currentValue',
    'userIdentifier',
    'linkedUserIdentifier',
    'group',
  ]) {
    const nestedValue = record[key];

    if (typeof nestedValue === 'string' || typeof nestedValue === 'number') {
      return String(nestedValue).trim();
    }
  }

  return '';
}

function extractResponseValue(
  value: unknown,
  candidateKeys: string[],
): string {
  const wantedKeys = new Set(candidateKeys.map(normalizeLookupKey));

  const visit = (current: unknown, currentKey = ''): string => {
    if (current === null || current === undefined) {
      return '';
    }

    if (typeof current === 'string' || typeof current === 'number') {
      return wantedKeys.has(normalizeLookupKey(currentKey))
        ? String(current).trim()
        : '';
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        const found = visit(item, currentKey);

        if (found) {
          return found;
        }
      }

      return '';
    }

    if (typeof current !== 'object') {
      return '';
    }

    const record = current as UnknownRecord;

    for (const [key, nestedValue] of Object.entries(record)) {
      if (!wantedKeys.has(normalizeLookupKey(key))) {
        continue;
      }

      const directValue = unwrapStoredValue(nestedValue);

      if (directValue) {
        return directValue;
      }

      const nestedResult = visit(nestedValue, key);

      if (nestedResult) {
        return nestedResult;
      }
    }

    for (const [key, nestedValue] of Object.entries(record)) {
      const found = visit(nestedValue, key);

      if (found) {
        return found;
      }
    }

    return '';
  };

  return visit(value);
}

function safeFirebaseKey(value: string): string {
  const safeValue = String(value || '')
    .trim()
    .replace(/[.#$/[\]]/g, '_')
    .replace(/\s+/g, '_');

  return safeValue || `unknown_${Date.now()}`;
}

function getFirstName(value: string): string {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function getPrimaryGift(raw: UnknownRecord): string {
  const results = asRecord(raw.results);
  const language =
    raw.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
  const localizedResults = asRecord(results[language]);

  return String(localizedResults.primaryGift || '').trim();
}

function parseParticipants(value: unknown): PeopleDevelopmentParticipant[] {
  const data = asRecord(value);
  const peopleByKey = new Map<string, PeopleDevelopmentParticipant>();

  Object.entries(data).forEach(([id, storedValue]) => {
    const raw = asRecord(storedValue);

    const fullName = extractResponseValue(raw, [
      'fullName',
      'full_name',
      'name',
      'firstName',
      'lastName',
    ]);

    const email = extractResponseValue(raw, [
      'email',
      'emailAddress',
      'userEmail',
    ]);

    const userIdentifier = extractResponseValue(raw, [
      'userIdentifier',
      'linkedUserIdentifier',
      'memberId',
      'memberIdentifier',
      'linkId',
    ]).trim();

    const normalizedIdentifier = userIdentifier.toLowerCase();

    if (!normalizedIdentifier) {
      return;
    }

    const primaryGift = getPrimaryGift(raw);
    const memberKey = `identifier_${safeFirebaseKey(normalizedIdentifier)}`;
    const existing = peopleByKey.get(memberKey);
    const peopleGroup = extractPeopleDevelopmentGroup(raw);

    if (existing) {
      peopleByKey.set(memberKey, {
        ...existing,
        name:
          existing.name !== 'N/A' && existing.name
            ? existing.name
            : fullName || existing.name,
        email:
          existing.email !== 'N/A' && existing.email
            ? existing.email
            : email || existing.email,
        primaryGift: existing.primaryGift || primaryGift,
        identifier: existing.identifier || userIdentifier,
        peopleGroup: existing.peopleGroup || peopleGroup,
        sourceKeys: Array.from(new Set([...existing.sourceKeys, id])),
      });

      return;
    }

    peopleByKey.set(memberKey, {
      id,
      name: fullName || 'N/A',
      email: email || 'N/A',
      primaryGift,
      identifier: userIdentifier,
      memberKey,
      firstName: getFirstName(fullName || 'N/A'),
      peopleGroup,
      sourcePath: 'form',
      sourceKeys: [id],
    });
  });

  return Array.from(peopleByKey.values())
    .filter(participant => participant.identifier.trim())
    .sort((first, second) => first.name.localeCompare(second.name));
}

export default function useParticipants(): UseParticipantsResult {
  const [participants, setParticipants] = useState<
    PeopleDevelopmentParticipant[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const formRef = ref(database, 'form/');

    return onValue(
      formRef,
      snapshot => {
        setParticipants(parseParticipants(snapshot.val()));
        setLoading(false);
      },
      subscriptionError => {
        console.error('Failed to load participants:', subscriptionError);
        setParticipants([]);
        setError(subscriptionError);
        setLoading(false);
      },
    );
  }, []);

  return {
    participants,
    loading,
    error,
  };
}
