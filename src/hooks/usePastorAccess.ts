import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import {
  getPastorSession,
  type PastorSession,
} from '../services/pastorAuthorization';

type PastorAccessState = {
  userUid: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  session: PastorSession | null;
};

const INITIAL_STATE: PastorAccessState = {
  userUid: null,
  status: 'idle',
  session: null,
};

export function usePastorAccess(
  user: User | null | undefined,
) {
  const [state, setState] =
    useState<PastorAccessState>(INITIAL_STATE);

  useEffect(() => {
    if (!user) {
      setState(INITIAL_STATE);
      return;
    }

    const controller = new AbortController();

    setState({
      userUid: user.uid,
      status: 'loading',
      session: null,
    });

    void getPastorSession(user, controller.signal)
      .then(session => {
        setState({
          userUid: user.uid,
          status: 'ready',
          session,
        });
      })
      .catch(error => {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        console.error(
          'Unable to verify Pastor access with the backend:',
          error,
        );

        setState({
          userUid: user.uid,
          status: 'error',
          session: null,
        });
      });

    return () => controller.abort();
  }, [user]);

  const stateBelongsToUser =
    !!user && state.userUid === user.uid;

  return {
    isPastor:
      stateBelongsToUser &&
      state.status === 'ready' &&
      state.session?.authorized === true,
    loading:
      !!user &&
      (!stateBelongsToUser || state.status === 'loading'),
  };
}
