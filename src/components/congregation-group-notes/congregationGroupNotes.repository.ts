import { get, ref } from 'firebase/database';
import { database } from '../../firebase';
import { PEOPLE_DEVELOPMENT_ROOT } from './congregationGroupNotes.config';
import type { MemberProfile } from './congregationGroupNotes.types';
import {
  buildProfileFromFormRecord,
  buildProfileFromMemberRecord,
  extractResponseValue,
  normalizeIdentifier,
  safeFirebaseKey,
} from './congregationGroupNotes.utils';

export async function findProfileByIdentifier(identifier: string, displayLocale: 'en' | 'ar'): Promise<MemberProfile | null> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) return null;

  const directMemberKey = `identifier_${safeFirebaseKey(normalizedIdentifier)}`;
  const directMemberSnapshot = await get(ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/members/${directMemberKey}`));

  if (directMemberSnapshot.exists()) {
    return buildProfileFromMemberRecord(directMemberKey, directMemberSnapshot.val(), identifier.trim(), displayLocale);
  }

  const allMembersSnapshot = await get(ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/members/`));

  if (allMembersSnapshot.exists()) {
    const allMembers = allMembersSnapshot.val() || {};

    for (const [memberKey, memberValue] of Object.entries(allMembers)) {
      const memberIdentifier = normalizeIdentifier(extractResponseValue(memberValue, ['identifier']));
      if (memberIdentifier === normalizedIdentifier) {
        return buildProfileFromMemberRecord(String(memberKey), memberValue, identifier.trim(), displayLocale);
      }
    }
  }

  const formSnapshot = await get(ref(database, 'form/'));

  if (formSnapshot.exists()) {
    const formData = formSnapshot.val() || {};

    for (const [formId, formValue] of Object.entries(formData)) {
      const raw = formValue || {};
      const formIdentifier = extractResponseValue(raw, ['userIdentifier', 'linkedUserIdentifier', 'memberId', 'memberIdentifier', 'linkId']).trim();

      if (normalizeIdentifier(formIdentifier) === normalizedIdentifier) {
        return buildProfileFromFormRecord(String(formId), raw, formIdentifier, directMemberKey, displayLocale);
      }
    }
  }

  return null;
}
