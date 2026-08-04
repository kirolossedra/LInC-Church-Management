import { useState } from 'react';
import type { FormEvent } from 'react';
import { createNextGenRegistration, getNextGenUser, loadReviewedSessionIds } from './nextGenActivities.firebase';
import { NEXTGEN_ID_PATTERN } from './nextGenActivities.constants';
import { downloadNextGenCertificate } from './nextGenCertificate';
import type { EntryMode, NextGenUserRecord, RegistrationReceipt, SignupForm } from './nextGenActivities.types';
import { getEasternTime, isUsableEmail, normalizeUserId } from './nextGenActivities.utils';

export default function useNextGenIdentity(isArabic: boolean) {
  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [signupForm, setSignupForm] = useState<SignupForm>({ fullName: '', email: '', userId: '' });
  const [existingUserId, setExistingUserId] = useState('');
  const [activeUser, setActiveUser] = useState<NextGenUserRecord | null>(null);
  const [initialReviewedSessionIds, setInitialReviewedSessionIds] = useState<Set<string>>(() => new Set());
  const [registrationReceipt, setRegistrationReceipt] = useState<RegistrationReceipt | null>(null);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [isVerifyingUser, setIsVerifyingUser] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [accessMessage, setAccessMessage] = useState('');

  const chooseEntryMode = (mode: Exclude<EntryMode, null>) => {
    setEntryMode(mode);
    setAccessError('');
    setAccessMessage('');
    setRegistrationReceipt(null);
  };

  const closeEntryMode = () => setEntryMode(null);

  const handleSignupSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const fullName = signupForm.fullName.trim();
    const email = signupForm.email.trim();
    const userId = normalizeUserId(signupForm.userId);
    setAccessError('');
    setAccessMessage('');
    setRegistrationReceipt(null);

    if (!fullName) {
      setAccessError(isArabic ? 'أدخل الاسم الكامل.' : 'Enter your full name.');
      return;
    }
    if (!isUsableEmail(email)) {
      setAccessError(isArabic ? 'أدخل بريداً إلكترونياً صالحاً.' : 'Enter a valid email address.');
      return;
    }
    if (!NEXTGEN_ID_PATTERN.test(userId)) {
      setAccessError(isArabic ? 'يجب أن يتكون معرّف NextGen من 4 أحرف أو أرقام بالإنجليزية.' : 'The NextGen ID must contain exactly 4 English letters or numbers.');
      return;
    }

    setIsSubmittingSignup(true);
    try {
      const now = Date.now();
      const record: NextGenUserRecord = {
        fullName,
        email,
        userId,
        normalizedUserId: userId,
        status: 'pending',
        source: 'nextGenActivities',
        createdAt: now,
        createdAtISO: new Date(now).toISOString(),
        createdAtEasternTime: getEasternTime(now),
        updatedAt: now,
        updatedAtISO: new Date(now).toISOString(),
      };
      if (!await createNextGenRegistration(record)) {
        setAccessError(isArabic ? 'هذا المعرّف مستخدم بالفعل. اختر معرّفاً آخر من 4 أحرف أو أرقام.' : 'That ID is already in use. Choose another 4-character ID.');
        return;
      }
      setRegistrationReceipt({ fullName, userId, createdAt: now });
      setSignupForm({ fullName: '', email: '', userId: '' });
      setAccessMessage(isArabic ? 'تم إرسال طلب NextGen. الحالة الآن في انتظار موافقة Pastor.' : 'Your NextGen request was submitted and is now pending Pastor approval.');
    } catch (error) {
      console.error('Failed to submit NextGen registration:', error);
      setAccessError(isArabic ? 'تعذر إرسال طلب التسجيل. حاول مرة أخرى.' : 'Unable to submit the registration request. Try again.');
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  const handleCertificateDownload = async () => {
    if (!registrationReceipt || isDownloadingCertificate) return;
    setIsDownloadingCertificate(true);
    setAccessError('');
    try {
      await downloadNextGenCertificate({ ...registrationReceipt, isArabic });
    } catch (error) {
      console.error('Failed to create NextGen certificate:', error);
      setAccessError(isArabic ? 'تعذر إنشاء ملف الشهادة.' : 'Unable to create the certificate PDF.');
    } finally {
      setIsDownloadingCertificate(false);
    }
  };

  const handleExistingUserSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const userId = normalizeUserId(existingUserId);
    setAccessError('');
    setAccessMessage('');
    if (!NEXTGEN_ID_PATTERN.test(userId)) {
      setAccessError(isArabic ? 'أدخل معرّف NextGen صحيحاً من 4 أحرف أو أرقام.' : 'Enter a valid 4-character NextGen ID.');
      return;
    }

    setIsVerifyingUser(true);
    try {
      const user = await getNextGenUser(userId);
      if (!user) {
        setAccessError(isArabic ? 'لا يوجد طلب أو مستخدم بهذا المعرّف.' : 'No NextGen request or user exists with this ID.');
        return;
      }
      if (user.status === 'pending') {
        setAccessError(isArabic ? 'هذا الطلب ما زال في انتظار موافقة Pastor.' : 'This request is still pending Pastor approval.');
        return;
      }
      if (user.status === 'rejected') {
        setAccessError(isArabic ? 'تم رفض طلب NextGen المرتبط بهذا المعرّف.' : 'The NextGen request associated with this ID was rejected.');
        return;
      }

      setInitialReviewedSessionIds(await loadReviewedSessionIds(userId));
      setActiveUser(user);
      setExistingUserId('');
      setEntryMode(null);
      setAccessMessage('');
    } catch (error) {
      console.error('Failed to verify NextGen user:', error);
      setAccessError(isArabic ? 'تعذر التحقق من المستخدم.' : 'Unable to verify the NextGen user.');
    } finally {
      setIsVerifyingUser(false);
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    setInitialReviewedSessionIds(new Set());
    setEntryMode(null);
    setAccessError('');
    setAccessMessage('');
  };

  return {
    entryMode,
    signupForm,
    setSignupForm,
    existingUserId,
    setExistingUserId,
    activeUser,
    initialReviewedSessionIds,
    registrationReceipt,
    isSubmittingSignup,
    isVerifyingUser,
    isDownloadingCertificate,
    accessError,
    accessMessage,
    chooseEntryMode,
    closeEntryMode,
    handleSignupSubmit,
    handleCertificateDownload,
    handleExistingUserSubmit,
    handleLogout,
  };
}

export type UseNextGenIdentityResult = ReturnType<typeof useNextGenIdentity>;
