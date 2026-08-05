import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { getPeopleNotes, type PersonRecord } from '../../services/peopleNotes';
import { getErrorMessage } from './peopleNotes.utils';

export default function usePeopleNotesData(
  firebaseUser: User | null | undefined,
  hasPastorAccess: boolean,
  isArabic: boolean,
) {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  const showSuccess = useCallback((message: string) => {
    setPageError('');
    setPageSuccess(message);
  }, []);

  const showError = useCallback((message: string) => {
    setPageSuccess('');
    setPageError(message);
  }, []);

  const clearMessages = useCallback(() => {
    setPageError('');
    setPageSuccess('');
  }, []);

  const loadPeople = useCallback(
    async (signal?: AbortSignal, showLoading = false) => {
      if (!firebaseUser || !hasPastorAccess) {
        setPeople([]);
        setSelectedPersonId('');
        setLoadingPeople(false);
        return;
      }

      if (showLoading) setLoadingPeople(true);

      try {
        const loadedPeople = await getPeopleNotes(firebaseUser, signal);
        setPeople(loadedPeople);
        setSelectedPersonId(previousId => {
          if (loadedPeople.length === 0) return '';
          if (previousId && loadedPeople.some(person => person.id === previousId)) {
            return previousId;
          }
          return loadedPeople[0].id;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;

        console.error(error);
        showError(
          isArabic
            ? `فشل تحميل السجلات: ${getErrorMessage(error)}`
            : `Failed to load records: ${getErrorMessage(error)}`,
        );
      } finally {
        setLoadingPeople(false);
      }
    },
    [firebaseUser, hasPastorAccess, isArabic, showError],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialLoadTimer = window.setTimeout(() => {
      void loadPeople(controller.signal, true);
    }, 0);
    const refreshTimer = window.setInterval(() => {
      void loadPeople();
    }, 30_000);

    return () => {
      controller.abort();
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
    };
  }, [loadPeople]);

  const filteredPeople = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return people;
    return people.filter(
      person =>
        person.fullName.toLowerCase().includes(query) ||
        person.contact.toLowerCase().includes(query),
    );
  }, [people, searchText]);

  const selectedPerson = useMemo(
    () => people.find(person => person.id === selectedPersonId) || null,
    [people, selectedPersonId],
  );
  const strengths = useMemo(
    () => selectedPerson?.items.filter(item => item.type === 'strength') || [],
    [selectedPerson],
  );
  const growthAreas = useMemo(
    () => selectedPerson?.items.filter(item => item.type === 'growth') || [],
    [selectedPerson],
  );

  return {
    people,
    selectedPersonId,
    setSelectedPersonId,
    searchText,
    setSearchText,
    loadingPeople,
    pageError,
    pageSuccess,
    filteredPeople,
    selectedPerson,
    strengths,
    growthAreas,
    loadPeople,
    showSuccess,
    showError,
    clearMessages,
  };
}

export type PeopleNotesData = ReturnType<typeof usePeopleNotesData>;

