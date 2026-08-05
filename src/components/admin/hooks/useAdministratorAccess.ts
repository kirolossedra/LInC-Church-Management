import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import {
  getAdministratorSession,
  saveAdministratorAuthority,
  suspendAdministrator,
} from '../../../services/administrator';
import { EMPTY_ADMIN_AUTHORITY } from '../admin.constants';
import type { AdminAccount, AdminAuthority } from '../admin.types';
import { firebaseAuthenticationErrorMessage } from '../admin.utils';

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
  const [authorityDrafts, setAuthorityDrafts] = useState<Record<string, AdminAuthority>>({});
  const [savingAdminUid, setSavingAdminUid] = useState<string | null>(null);

  const applySession = useCallback((session: {
    account: AdminAccount;
    adminAccounts: AdminAccount[];
  }) => {
    setAdminAccount(session.account);
    setAdminAccounts(session.adminAccounts);
    setAuthorityDrafts(Object.fromEntries(
      session.adminAccounts.map(account => [account.uid, { ...account.authority }]),
    ));
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await getAdministratorSession();
    applySession(session);
  }, [applySession]);

  useEffect(() => onAuthStateChanged(FIREBASE_AUTH, user => {
    setAuthUser(user);
    setIsAuthResolving(false);
    if (!user) {
      setAdminAccount(null);
      setAdminAccounts([]);
      setAuthorityDrafts({});
      setIsInitializingAdmin(false);
      return;
    }

    setIsInitializingAdmin(true);
    setLoginError('');
    void getAdministratorSession()
      .then(applySession)
      .catch(error => {
        console.error('Failed to initialize administrator session:', error);
        setAdminAccount(null);
        setLoginError(
          error instanceof Error
            ? error.message
            : 'The administrator profile could not be loaded.',
        );
      })
      .finally(() => setIsInitializingAdmin(false));
  }), [applySession]);

  const isChief = adminAccount?.role === 'chief';
  const isUnlocked = !!authUser && !!adminAccount &&
    (adminAccount.role === 'chief' || adminAccount.status === 'active');
  const canManageAssessmentForms = !!isChief ||
    (adminAccount?.status === 'active' && adminAccount.authority.manageAssessmentForms);
  const canManageCarousel = !!isChief ||
    (adminAccount?.status === 'active' && adminAccount.authority.manageCarousel);
  const canManageAttendance = !!isChief ||
    (adminAccount?.status === 'active' && adminAccount.authority.manageAttendance);
  const canManageArchives = !!isChief ||
    (adminAccount?.status === 'active' && adminAccount.authority.manageArchives);

  const sortedAdminAccounts = useMemo(() => [...adminAccounts].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'chief' ? -1 : 1;
    if (a.firstSignedInAt !== b.firstSignedInAt) return a.firstSignedInAt - b.firstSignedInAt;
    return a.email.localeCompare(b.email);
  }), [adminAccounts]);

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
      await signInWithEmailAndPassword(FIREBASE_AUTH, normalizedEmail, password);
      setPassword('');
    } catch (error) {
      console.error('Firebase administrator sign-in failed:', error);
      setLoginError(firebaseAuthenticationErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(FIREBASE_AUTH); }
    catch (error) { console.error('Firebase administrator sign-out failed:', error); }
    finally {
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
    enabled: boolean,
  ) => setAuthorityDrafts(current => ({
    ...current,
    [uid]: { ...(current[uid] || EMPTY_ADMIN_AUTHORITY), [field]: enabled },
  }));

  const handleSaveAdminAuthority = async (account: AdminAccount) => {
    if (!isChief || account.role === 'chief') return;
    const authority = authorityDrafts[account.uid] || { ...EMPTY_ADMIN_AUTHORITY };
    if (!Object.values(authority).some(Boolean)) {
      setErrorMessage('Select at least one authority before activating this administrator.');
      return;
    }
    setStatusMessage('');
    setErrorMessage('');
    setSavingAdminUid(account.uid);
    try {
      await saveAdministratorAuthority(account.uid, authority);
      await refreshSession();
      setStatusMessage(`${account.email || 'The administrator'} is active with the selected authority.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The administrator authority could not be saved.');
    } finally { setSavingAdminUid(null); }
  };

  const handleSuspendAdmin = async (account: AdminAccount) => {
    if (!isChief || account.role === 'chief') return;
    setStatusMessage('');
    setErrorMessage('');
    setSavingAdminUid(account.uid);
    try {
      await suspendAdministrator(account.uid);
      await refreshSession();
      setStatusMessage(`${account.email || 'The administrator'} has been suspended.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The administrator could not be suspended.');
    } finally { setSavingAdminUid(null); }
  };

  return {
    email, setEmail, password, setPassword, loginError, showPassword, setShowPassword,
    isAuthResolving, isSigningIn, isInitializingAdmin, authUser, adminAccount,
    authorityDrafts, savingAdminUid, isChief, isUnlocked, canManageAssessmentForms,
    canManageCarousel, canManageAttendance, canManageArchives, sortedAdminAccounts, handleLogin,
    handleLogout, updateAuthorityDraft, handleSaveAdminAuthority, handleSuspendAdmin,
  };
}
