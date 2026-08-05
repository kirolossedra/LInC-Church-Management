import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { useI18n } from '../../i18n';
import usePeopleNotesData from './usePeopleNotesData';
import usePeopleNotesMutations from './usePeopleNotesMutations';

export default function usePeopleNotes(hasPastorAccess: boolean) {
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';
  const [firebaseUser] = useAuthState(auth);
  const currentUserEmail = firebaseUser?.email?.toLowerCase().trim() || '';

  const data = usePeopleNotesData(firebaseUser, hasPastorAccess, isArabic);
  const mutations = usePeopleNotesMutations({
    firebaseUser,
    hasPastorAccess,
    isArabic,
    data,
  });

  const statusText = hasPastorAccess
    ? isArabic
      ? 'مصرح لك بالتعديل كراعٍ'
      : 'Authorized as pastor'
    : isArabic
      ? 'غير مصرح لهذا الحساب بالتعديل'
      : 'This account is not authorized to edit';

  return {
    dir,
    isArabic,
    currentUserEmail,
    statusText,
    ...data,
    ...mutations,
  };
}

export type PeopleNotesController = ReturnType<typeof usePeopleNotes>;

