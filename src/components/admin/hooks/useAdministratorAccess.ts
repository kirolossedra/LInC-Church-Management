import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { get, onValue, ref, runTransaction, set, update } from 'firebase/database';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { database } from '../../../firebase';
import {
  ADMIN_CHIEF_UID_PATH,
  ADMIN_USERS_PATH,
  EMPTY_ADMIN_AUTHORITY,
  FULL_ADMIN_AUTHORITY,
} from '../admin.constants';
import type {
  AdminAccount,
  AdminAuthority,
} from '../admin.types';
import {
  firebaseAuthenticationErrorMessage,
  normalizeAdminAccount,
} from '../admin.utils';

const FIREBASE_AUTH = getAuth();

interface UseAdministratorAccessOptions {
  setStatusMessage: (message: string) => void;
  setErrorMessage: (message: string) => void;
  onLogoutReset: () => void;
}

export function useAdministratorAccess({
  setStatusMessage,
  setErrorMessage,
  onLogoutReset,
}: UseAdministratorAccessOptions) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthResolving, setIsAuthResolving] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isInitializingAdmin, setIsInitializingAdmin] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [adminAccount, setAdminAccount] = useState<AdminAccount | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [authorityDrafts, setAuthorityDrafts] = useState<
    Record<string, AdminAuthority>
  >({});
  const [savingAdminUid, setSavingAdminUid] = useState<string | null>(null);

  const isChief = adminAccount?.role === 'chief';
  const isUnlocked =
    !!authUser &&
    !!adminAccount &&
    (adminAccount.role === 'chief' || adminAccount.status === 'active');
  const canManageAssessmentForms =
    isChief ||
    (adminAccount?.status === 'active' &&
      adminAccount.authority.manageAssessmentForms);
  const canManageCarousel =
    isChief ||
    (adminAccount?.status === 'active' &&
      adminAccount.authority.manageCarousel);
  const canManageAttendance =
    isChief ||
    (adminAccount?.status === 'active' &&
      adminAccount.authority.manageAttendance);

  const sortedAdminAccounts = useMemo(() => {
    return [...adminAccounts].sort((a, b) => {
      if (a.role !== b.role) return a.role === 'chief' ? -1 : 1;
      if (a.firstSignedInAt !== b.firstSignedInAt) {
        return a.firstSignedInAt - b.firstSignedInAt;
      }
      return a.email.localeCompare(b.email);
    });
  }, [adminAccounts]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      setAuthUser(user);
      setIsAuthResolving(false);

      if (!user) {
        setAdminAccount(null);
        setAdminAccounts([]);
        setAuthorityDrafts({});
        setIsInitializingAdmin(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authUser) return;

    let cancelled = false;
    let unsubscribeProfile: (() => void) | null = null;

    const initializeAdminProfile = async () => {
      setIsInitializingAdmin(true);
      setLoginError('');

      try {
        const chiefClaim = await runTransaction(
          ref(database, ADMIN_CHIEF_UID_PATH),
          (currentChiefUid) => currentChiefUid || authUser.uid,
          { applyLocally: false }
        );

        const chiefUid = String(chiefClaim.snapshot.val() || '');
        const isClaimedChief = chiefUid === authUser.uid;
        const accountRef = ref(database, `${ADMIN_USERS_PATH}/${authUser.uid}`);
        const existingSnapshot = await get(accountRef);
        const existingAccount = normalizeAdminAccount(
          authUser.uid,
          existingSnapshot.val()
        );
        const now = Date.now();
        const normalizedEmail = (authUser.email || '').trim().toLowerCase();

        if (!existingAccount) {
          await set(accountRef, {
            uid: authUser.uid,
            email: normalizedEmail,
            role: isClaimedChief ? ('chief' as const) : ('administrator' as const),
            status: isClaimedChief ? ('active' as const) : ('pending' as const),
            authority: isClaimedChief
              ? { ...FULL_ADMIN_AUTHORITY }
              : { ...EMPTY_ADMIN_AUTHORITY },
            firstSignedInAt: now,
            lastSignedInAt: now,
            updatedAt: now,
            ...(isClaimedChief
              ? {
                  approvedAt: now,
                  approvedByUid: authUser.uid,
                }
              : {}),
          });
        } else {
          const updates: Record<string, unknown> = {
            email: normalizedEmail || existingAccount.email,
            lastSignedInAt: now,
            updatedAt: now,
          };

          if (isClaimedChief) {
            updates.role = 'chief';
            updates.status = 'active';
            updates.authority = FULL_ADMIN_AUTHORITY;
            updates.approvedAt = existingAccount.approvedAt || now;
            updates.approvedByUid = authUser.uid;
          } else if (existingAccount.role === 'chief') {
            updates.role = 'administrator';
            updates.status = 'pending';
            updates.authority = EMPTY_ADMIN_AUTHORITY;
          }

          await update(accountRef, updates);
        }

        if (cancelled) return;

        unsubscribeProfile = onValue(
          accountRef,
          (snapshot) => {
            if (cancelled) return;

            setAdminAccount(
              normalizeAdminAccount(authUser.uid, snapshot.val())
            );
            setIsInitializingAdmin(false);
          },
          (error) => {
            console.error('Failed to load administrator account:', error);

            if (!cancelled) {
              setAdminAccount(null);
              setLoginError(
                'Your Firebase account signed in, but the administrator profile could not be loaded from Realtime Database.'
              );
              setIsInitializingAdmin(false);
            }
          }
        );
      } catch (error) {
        console.error('Failed to initialize administrator hierarchy:', error);

        if (!cancelled) {
          setAdminAccount(null);
          setLoginError(
            'Your Firebase account signed in, but the administrator hierarchy could not be initialized. Check the Realtime Database rules.'
          );
          setIsInitializingAdmin(false);
        }
      }
    };

    void initializeAdminProfile();

    return () => {
      cancelled = true;
      unsubscribeProfile?.();
    };
  }, [authUser]);

  useEffect(() => {
    if (!isChief) {
      setAdminAccounts([]);
      setAuthorityDrafts({});
      return;
    }

    const unsubscribe = onValue(
      ref(database, ADMIN_USERS_PATH),
      (snapshot) => {
        const rawAccounts = snapshot.val() as Record<string, unknown> | null;
        const loadedAccounts = Object.entries(rawAccounts || {})
          .map(([uid, value]) => normalizeAdminAccount(uid, value))
          .filter((account): account is AdminAccount => account !== null);

        setAdminAccounts(loadedAccounts);
        setAuthorityDrafts(
          Object.fromEntries(
            loadedAccounts.map((account) => [
              account.uid,
              { ...account.authority },
            ])
          )
        );
      },
      (error) => {
        console.error('Failed to load administrator hierarchy:', error);
        setErrorMessage('The administrator hierarchy could not be loaded.');
      }
    );

    return unsubscribe;
  }, [isChief, setErrorMessage]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setLoginError('Enter both your email and password.');
      return;
    }

    setIsSigningIn(true);

    try {
      await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        normalizedEmail,
        password
      );
      setPassword('');
    } catch (error) {
      console.error('Firebase administrator sign-in failed:', error);
      setLoginError(firebaseAuthenticationErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);
    } catch (error) {
      console.error('Firebase administrator sign-out failed:', error);
    } finally {
      setEmail('');
      setPassword('');
      setLoginError('');
      setAdminAccount(null);
      setAdminAccounts([]);
      setAuthorityDrafts({});
      setStatusMessage('');
      setErrorMessage('');
      onLogoutReset();
    }
  };

  const updateAuthorityDraft = (
    uid: string,
    field: keyof AdminAuthority,
    enabled: boolean
  ) => {
    setAuthorityDrafts((current) => ({
      ...current,
      [uid]: {
        ...(current[uid] || EMPTY_ADMIN_AUTHORITY),
        [field]: enabled,
      },
    }));
  };

  const handleSaveAdminAuthority = async (account: AdminAccount) => {
    if (!isChief || !authUser || account.role === 'chief') return;

    const authority = authorityDrafts[account.uid] || {
      ...EMPTY_ADMIN_AUTHORITY,
    };

    if (!Object.values(authority).some(Boolean)) {
      setErrorMessage(
        'Select at least one authority before activating this administrator.'
      );
      return;
    }

    setStatusMessage('');
    setErrorMessage('');
    setSavingAdminUid(account.uid);

    try {
      const now = Date.now();

      await update(ref(database, `${ADMIN_USERS_PATH}/${account.uid}`), {
        role: 'administrator',
        status: 'active',
        authority,
        approvedAt: now,
        approvedByUid: authUser.uid,
        updatedAt: now,
      });

      setStatusMessage(
        `${account.email || 'The administrator'} is active with the selected authority.`
      );
    } catch (error) {
      console.error('Failed to save administrator authority:', error);
      setErrorMessage('The administrator authority could not be saved.');
    } finally {
      setSavingAdminUid(null);
    }
  };

  const handleSuspendAdmin = async (account: AdminAccount) => {
    if (!isChief || account.role === 'chief') return;

    setStatusMessage('');
    setErrorMessage('');
    setSavingAdminUid(account.uid);

    try {
      await update(ref(database, `${ADMIN_USERS_PATH}/${account.uid}`), {
        status: 'suspended',
        authority: EMPTY_ADMIN_AUTHORITY,
        updatedAt: Date.now(),
      });

      setStatusMessage(
        `${account.email || 'The administrator'} has been suspended.`
      );
    } catch (error) {
      console.error('Failed to suspend administrator:', error);
      setErrorMessage('The administrator could not be suspended.');
    } finally {
      setSavingAdminUid(null);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loginError,
    showPassword,
    setShowPassword,
    isAuthResolving,
    isSigningIn,
    isInitializingAdmin,
    authUser,
    adminAccount,
    authorityDrafts,
    savingAdminUid,
    isChief,
    isUnlocked,
    canManageAssessmentForms,
    canManageCarousel,
    canManageAttendance,
    sortedAdminAccounts,
    handleLogin,
    handleLogout,
    updateAuthorityDraft,
    handleSaveAdminAuthority,
    handleSuspendAdmin,
  };
}
