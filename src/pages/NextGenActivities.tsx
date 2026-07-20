import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  HelpCircle,
  IdCard,
  Loader2,
  LockKeyhole,
  LogOut,
  Save,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  X,
} from 'lucide-react';
import { get, onValue, push, ref, runTransaction, update } from 'firebase/database';
import { database } from '../firebase';
import { useI18n } from '../i18n';

type EntryMode = 'signup' | 'existing' | null;
type NextGenUserStatus = 'pending' | 'approved' | 'rejected';
type VoteType = 'upvote' | 'downvote';

interface QASessionForm {
  question: string;
  category: string;
  notes: string;
}

interface SignupForm {
  fullName: string;
  email: string;
  userId: string;
}

interface NextGenUserRecord {
  fullName: string;
  email: string;
  userId: string;
  normalizedUserId: string;
  status: NextGenUserStatus;
  source: string;
  createdAt: number;
  createdAtISO: string;
  createdAtEasternTime: string;
  updatedAt: number;
  updatedAtISO: string;
}

interface RegistrationReceipt {
  fullName: string;
  userId: string;
  createdAt: number;
}

interface SavedQASession {
  firebaseId: string;
  question: string;
  category: string;
  notes: string;
  status: string;
  source: string;
  totalUpvotes: number;
  totalDownvotes: number;
  netVotes: number;
  createdAt: number;
  updatedAt: number;
}

const CATEGORY_OPTIONS = [
  'Theology',
  'Apologetics',
  'Prayer',
  'Bible Study',
  'Discipleship',
  'Christian Living',
  'Church Life',
  'Youth Questions',
  'Other',
];

const NEXTGEN_USERS_PATH = 'nextGenUsers';
const NEXTGEN_ACTIVITIES_PATH = 'nextGenActivities';
const NEXTGEN_ID_PATTERN = /^[A-Z0-9]{4}$/;

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeUserId(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

function isUsableEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getEasternTime(timestamp = Date.now()): string {
  return new Date(timestamp).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function normalizeUserStatus(value: unknown): NextGenUserStatus {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'approved' || status === 'rejected') return status;
  return 'pending';
}

function normalizeUserRecord(userId: string, value: any): NextGenUserRecord {
  return {
    fullName: String(value?.fullName || '').trim(),
    email: String(value?.email || '').trim(),
    userId,
    normalizedUserId: userId,
    status: normalizeUserStatus(value?.status),
    source: String(value?.source || 'nextGenActivities').trim(),
    createdAt: normalizeNumber(value?.createdAt),
    createdAtISO: String(value?.createdAtISO || '').trim(),
    createdAtEasternTime: String(value?.createdAtEasternTime || '').trim(),
    updatedAt: normalizeNumber(value?.updatedAt),
    updatedAtISO: String(value?.updatedAtISO || '').trim(),
  };
}

function normalizeSavedSession(firebaseId: string, value: any): SavedQASession {
  const totalUpvotes = normalizeNumber(value?.totalUpvotes);
  const totalDownvotes = normalizeNumber(value?.totalDownvotes);
  const netVotes = typeof value?.netVotes === 'number'
    ? normalizeNumber(value.netVotes)
    : totalUpvotes - totalDownvotes;

  return {
    firebaseId,
    question: String(value?.question || '').trim(),
    category: String(value?.category || 'Other').trim(),
    notes: String(value?.notes || '').trim(),
    status: String(value?.status || '').trim(),
    source: String(value?.source || '').trim(),
    totalUpvotes,
    totalDownvotes,
    netVotes,
    createdAt: normalizeNumber(value?.createdAt),
    updatedAt: normalizeNumber(value?.updatedAt),
  };
}

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function mergeByteArrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
}

function createImagePdf(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number): Blob {
  const pageWidth = 842;
  const pageHeight = 595;
  const parts: Uint8Array[] = [];
  const objectOffsets: number[] = [0];
  let currentLength = 0;

  const appendBytes = (bytes: Uint8Array) => {
    parts.push(bytes);
    currentLength += bytes.length;
  };

  const appendText = (text: string) => appendBytes(encodeText(text));
  const markObject = (objectNumber: number) => {
    objectOffsets[objectNumber] = currentLength;
  };

  appendText('%PDF-1.4\n%NextGen\n');

  markObject(1);
  appendText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  markObject(2);
  appendText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  markObject(3);
  appendText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  markObject(4);
  appendText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  appendBytes(jpegBytes);
  appendText('\nendstream\nendobj\n');

  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encodeText(contentStream);

  markObject(5);
  appendText(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  appendBytes(contentBytes);
  appendText('endstream\nendobj\n');

  const xrefOffset = currentLength;
  appendText('xref\n0 6\n');
  appendText('0000000000 65535 f \n');

  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    appendText(`${String(objectOffsets[objectNumber]).padStart(10, '0')} 00000 n \n`);
  }

  appendText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const mergedBytes = mergeByteArrays(parts);
  const pdfBuffer: ArrayBuffer = new ArrayBuffer(mergedBytes.byteLength);
  new Uint8Array(pdfBuffer).set(mergedBytes);

  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      value => {
        if (value) resolve(value);
        else reject(new Error('Unable to create the certificate image.'));
      },
      'image/jpeg',
      0.96,
    );
  });

  return new Uint8Array(await blob.arrayBuffer());
}

async function downloadNextGenCertificate(params: {
  fullName: string;
  userId: string;
  createdAt: number;
  isArabic: boolean;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available in this browser.');

  const { fullName, userId, createdAt, isArabic } = params;
  const timestamp = new Date(createdAt).toLocaleString(isArabic ? 'ar-EG' : 'en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  context.fillStyle = '#f5f4f0';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = '#8b1e1e';
  context.lineWidth = 24;
  context.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  context.strokeStyle = '#d9b7b7';
  context.lineWidth = 5;
  context.strokeRect(82, 82, canvas.width - 164, canvas.height - 164);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.direction = isArabic ? 'rtl' : 'ltr';

  context.fillStyle = '#8b1e1e';
  context.font = '700 72px Arial, sans-serif';
  context.fillText(isArabic ? 'شهادة مستخدم NextGen' : 'NEXTGEN USER CERTIFICATE', 800, 205);

  context.fillStyle = '#5f5f5f';
  context.font = '400 31px Arial, sans-serif';
  context.fillText(
    isArabic ? 'تشهد هذه الوثيقة بتقديم طلب تسجيل NextGen باسم' : 'This document confirms that a NextGen registration request was submitted for',
    800,
    305,
  );

  context.fillStyle = '#242424';
  context.font = '700 62px Arial, sans-serif';
  context.fillText(fullName, 800, 420);

  context.fillStyle = '#6b6b6b';
  context.font = '400 30px Arial, sans-serif';
  context.fillText(isArabic ? 'معرّف NextGen' : 'NEXTGEN IDENTIFIER', 800, 525);

  context.fillStyle = '#8b1e1e';
  context.font = '800 92px Arial, sans-serif';
  context.fillText(userId, 800, 625);

  context.fillStyle = '#641414';
  context.font = '700 30px Arial, sans-serif';
  context.fillText(
    isArabic ? 'حالة الطلب: في انتظار موافقة Pastor' : 'Request Status: Pending Pastor Approval',
    800,
    735,
  );

  context.fillStyle = '#666666';
  context.font = '400 27px Arial, sans-serif';
  context.fillText(`${isArabic ? 'وقت التسجيل' : 'Registration timestamp'}: ${timestamp}`, 800, 820);

  context.fillStyle = '#8b1e1e';
  context.beginPath();
  context.arc(800, 910, 18, 0, Math.PI * 2);
  context.fill();

  const jpegBytes = await canvasToJpegBytes(canvas);
  const pdfBlob = createImagePdf(jpegBytes, canvas.width, canvas.height);
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `NextGen-Certificate-${userId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

export default function NextGenActivities() {
  const navigate = useNavigate();
  const { dir, locale } = useI18n();
  const isArabic = locale === 'ar';

  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [signupForm, setSignupForm] = useState<SignupForm>({
    fullName: '',
    email: '',
    userId: '',
  });
  const [existingUserId, setExistingUserId] = useState('');
  const [activeUser, setActiveUser] = useState<NextGenUserRecord | null>(null);
  const [registrationReceipt, setRegistrationReceipt] = useState<RegistrationReceipt | null>(null);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [isVerifyingUser, setIsVerifyingUser] = useState(false);
  const [isDownloadingCertificate, setIsDownloadingCertificate] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [accessMessage, setAccessMessage] = useState('');

  const [isQASessionOpen, setIsQASessionOpen] = useState(false);
  const [isPeerReviewOpen, setIsPeerReviewOpen] = useState(false);

  const [form, setForm] = useState<QASessionForm>({
    question: '',
    category: 'Theology',
    notes: '',
  });

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedQASession[]>([]);
  const [isLoadingPeerReview, setIsLoadingPeerReview] = useState(false);
  const [peerReviewError, setPeerReviewError] = useState('');
  const [reviewedSessionIds, setReviewedSessionIds] = useState<Set<string>>(() => new Set());
  const [isSubmittingPeerVote, setIsSubmittingPeerVote] = useState(false);
  const [submittingVoteSessionId, setSubmittingVoteSessionId] = useState<string | null>(null);

  const reviewableSessions = useMemo(() => {
    return savedSessions
      .filter(session => session.question && !reviewedSessionIds.has(session.firebaseId))
      .sort((a, b) => {
        if (b.totalUpvotes !== a.totalUpvotes) return b.totalUpvotes - a.totalUpvotes;
        if (b.netVotes !== a.netVotes) return b.netVotes - a.netVotes;
        if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
        return a.question.localeCompare(b.question);
      });
  }, [savedSessions, reviewedSessionIds]);

  useEffect(() => {
    if (!activeUser) {
      setSavedSessions([]);
      setIsLoadingPeerReview(false);
      return undefined;
    }

    setIsLoadingPeerReview(true);
    setPeerReviewError('');

    const sessionsRef = ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions/`);

    const unsubscribe = onValue(
      sessionsRef,
      snapshot => {
        const rawSessions = snapshot.val() as Record<string, any> | null;

        const loadedSessions = Object.entries(rawSessions || {})
          .map(([firebaseId, value]) => normalizeSavedSession(firebaseId, value))
          .filter(session => session.question);

        setSavedSessions(loadedSessions);
        setIsLoadingPeerReview(false);
      },
      error => {
        console.error('Failed to load NextGen Q&A sessions:', error);
        setPeerReviewError(
          isArabic
            ? 'فشل تحميل الأسئلة للمراجعة.'
            : 'Failed to load questions for peer review.',
        );
        setIsLoadingPeerReview(false);
      },
    );

    return () => unsubscribe();
  }, [activeUser, isArabic]);

  const chooseEntryMode = (mode: Exclude<EntryMode, null>) => {
    setEntryMode(mode);
    setAccessError('');
    setAccessMessage('');
    setRegistrationReceipt(null);
  };

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
      setAccessError(
        isArabic
          ? 'يجب أن يتكون معرّف NextGen من 4 أحرف أو أرقام بالإنجليزية.'
          : 'The NextGen ID must contain exactly 4 English letters or numbers.',
      );
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

      const transactionResult = await runTransaction(
        ref(database, `${NEXTGEN_USERS_PATH}/${userId}`),
        currentValue => {
          if (currentValue !== null) return;
          return record;
        },
        { applyLocally: false },
      );

      if (!transactionResult.committed) {
        setAccessError(
          isArabic
            ? 'هذا المعرّف مستخدم بالفعل. اختر معرّفاً آخر من 4 أحرف أو أرقام.'
            : 'That ID is already in use. Choose another 4-character ID.',
        );
        return;
      }

      setRegistrationReceipt({ fullName, userId, createdAt: now });
      setSignupForm({ fullName: '', email: '', userId: '' });
      setAccessMessage(
        isArabic
          ? 'تم إرسال طلب NextGen. الحالة الآن في انتظار موافقة Pastor.'
          : 'Your NextGen request was submitted and is now pending Pastor approval.',
      );
    } catch (error) {
      console.error('Failed to submit NextGen registration:', error);
      setAccessError(
        isArabic
          ? 'تعذر إرسال طلب التسجيل. حاول مرة أخرى.'
          : 'Unable to submit the registration request. Try again.',
      );
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  const handleCertificateDownload = async () => {
    if (!registrationReceipt || isDownloadingCertificate) return;

    setIsDownloadingCertificate(true);
    setAccessError('');

    try {
      await downloadNextGenCertificate({
        ...registrationReceipt,
        isArabic,
      });
    } catch (error) {
      console.error('Failed to create NextGen certificate:', error);
      setAccessError(
        isArabic
          ? 'تعذر إنشاء ملف الشهادة.'
          : 'Unable to create the certificate PDF.',
      );
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
      setAccessError(
        isArabic
          ? 'أدخل معرّف NextGen صحيحاً من 4 أحرف أو أرقام.'
          : 'Enter a valid 4-character NextGen ID.',
      );
      return;
    }

    setIsVerifyingUser(true);

    try {
      const userSnapshot = await get(ref(database, `${NEXTGEN_USERS_PATH}/${userId}`));

      if (!userSnapshot.exists()) {
        setAccessError(
          isArabic
            ? 'لا يوجد طلب أو مستخدم بهذا المعرّف.'
            : 'No NextGen request or user exists with this ID.',
        );
        return;
      }

      const user = normalizeUserRecord(userId, userSnapshot.val());

      if (user.status === 'pending') {
        setAccessError(
          isArabic
            ? 'هذا الطلب ما زال في انتظار موافقة Pastor.'
            : 'This request is still pending Pastor approval.',
        );
        return;
      }

      if (user.status === 'rejected') {
        setAccessError(
          isArabic
            ? 'تم رفض طلب NextGen المرتبط بهذا المعرّف.'
            : 'The NextGen request associated with this ID was rejected.',
        );
        return;
      }

      const participationSnapshot = await get(
        ref(database, `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/peerReviewVotes`),
      );
      const existingVotes = participationSnapshot.val() as Record<string, unknown> | null;

      setReviewedSessionIds(new Set(Object.keys(existingVotes || {})));
      setActiveUser(user);
      setExistingUserId('');
      setEntryMode(null);
      setAccessMessage('');
      setIsQASessionOpen(false);
      setIsPeerReviewOpen(false);
    } catch (error) {
      console.error('Failed to verify NextGen user:', error);
      setAccessError(
        isArabic
          ? 'تعذر التحقق من المستخدم.'
          : 'Unable to verify the NextGen user.',
      );
    } finally {
      setIsVerifyingUser(false);
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    setReviewedSessionIds(new Set());
    setSavedSessions([]);
    setIsQASessionOpen(false);
    setIsPeerReviewOpen(false);
    setEntryMode(null);
    setAccessError('');
    setAccessMessage('');
  };

  const resetForm = () => {
    setForm({
      question: '',
      category: 'Theology',
      notes: '',
    });
  };

  const handleSaveDraft = async () => {
    if (!activeUser) return;

    const cleanedQuestion = form.question.trim();
    const cleanedNotes = form.notes.trim();

    if (!cleanedQuestion) {
      alert(isArabic ? 'يرجى كتابة السؤال قبل الحفظ.' : 'Please write the question before saving.');
      return;
    }

    setIsSavingDraft(true);

    try {
      const now = Date.now();
      const questionReference = push(ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions`));
      const questionId = questionReference.key;

      if (!questionId) throw new Error('Firebase did not generate a question ID.');

      const payload = {
        question: cleanedQuestion,
        category: form.category,
        notes: cleanedNotes,
        status: 'submittedForPastorReview',
        source: 'nextGenActivities',
        submittedByIdentifier: activeUser.userId,
        submittedByName: activeUser.fullName,
        verses: [],
        translation: '',
        totalUpvotes: 0,
        totalDownvotes: 0,
        netVotes: 0,
        votesByIdentifier: {},
        createdAt: now,
        createdAtISO: new Date(now).toISOString(),
        updatedAt: now,
        updatedAtISO: new Date(now).toISOString(),
      };

      await update(ref(database), {
        [`${NEXTGEN_ACTIVITIES_PATH}/qaSessions/${questionId}`]: payload,
        [`${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${activeUser.userId}/questionSubmissions/${questionId}`]: {
          activityType: 'questionSubmission',
          activityId: questionId,
          fillingStatus: 'completed',
          completedAt: now,
          completedAtISO: new Date(now).toISOString(),
        },
      });

      alert(isArabic ? 'تم حفظ السؤال ليتمكن Pastor من مراجعته.' : 'Question saved for Pastor review.');
      resetForm();
      setIsQASessionOpen(false);
    } catch (error) {
      console.error('Failed to save NextGen question:', error);
      alert(isArabic ? 'فشل حفظ السؤال في قاعدة البيانات.' : 'Failed to save the question to the database.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePeerVote = async (sessionId: string, voteType: VoteType) => {
    if (!activeUser || isSubmittingPeerVote || reviewedSessionIds.has(sessionId)) return;

    setIsSubmittingPeerVote(true);
    setSubmittingVoteSessionId(sessionId);
    setPeerReviewError('');

    try {
      const now = Date.now();
      const activitiesReference = ref(database, NEXTGEN_ACTIVITIES_PATH);

      const transactionResult = await runTransaction(
        activitiesReference,
        currentValue => {
          const currentRoot = currentValue && typeof currentValue === 'object'
            ? currentValue as Record<string, any>
            : {};
          const currentSessions = currentRoot.qaSessions && typeof currentRoot.qaSessions === 'object'
            ? currentRoot.qaSessions as Record<string, any>
            : {};
          const currentSession = currentSessions[sessionId];

          if (!currentSession) return;

          const currentParticipation = currentRoot.participationByIdentifier && typeof currentRoot.participationByIdentifier === 'object'
            ? currentRoot.participationByIdentifier as Record<string, any>
            : {};
          const currentUserParticipation = currentParticipation[activeUser.userId] && typeof currentParticipation[activeUser.userId] === 'object'
            ? currentParticipation[activeUser.userId] as Record<string, any>
            : {};
          const currentPeerReviewVotes = currentUserParticipation.peerReviewVotes && typeof currentUserParticipation.peerReviewVotes === 'object'
            ? currentUserParticipation.peerReviewVotes as Record<string, any>
            : {};
          const currentVotesByIdentifier = currentSession.votesByIdentifier && typeof currentSession.votesByIdentifier === 'object'
            ? currentSession.votesByIdentifier as Record<string, any>
            : {};

          if (currentPeerReviewVotes[sessionId] || currentVotesByIdentifier[activeUser.userId]) {
            return;
          }

          const currentUpvotes = normalizeNumber(currentSession.totalUpvotes);
          const currentDownvotes = normalizeNumber(currentSession.totalDownvotes);
          const nextUpvotes = voteType === 'upvote' ? currentUpvotes + 1 : currentUpvotes;
          const nextDownvotes = voteType === 'downvote' ? currentDownvotes + 1 : currentDownvotes;
          const voteRecord = {
            activityType: 'peerReviewVote',
            activityId: sessionId,
            fillingStatus: 'completed',
            voteType,
            completedAt: now,
            completedAtISO: new Date(now).toISOString(),
          };

          return {
            ...currentRoot,
            qaSessions: {
              ...currentSessions,
              [sessionId]: {
                ...currentSession,
                totalUpvotes: nextUpvotes,
                totalDownvotes: nextDownvotes,
                netVotes: nextUpvotes - nextDownvotes,
                updatedAt: now,
                updatedAtISO: new Date(now).toISOString(),
                votesByIdentifier: {
                  ...currentVotesByIdentifier,
                  [activeUser.userId]: {
                    voteType,
                    completedAt: now,
                    completedAtISO: new Date(now).toISOString(),
                  },
                },
              },
            },
            participationByIdentifier: {
              ...currentParticipation,
              [activeUser.userId]: {
                ...currentUserParticipation,
                peerReviewVotes: {
                  ...currentPeerReviewVotes,
                  [sessionId]: voteRecord,
                },
              },
            },
          };
        },
        { applyLocally: false },
      );

      if (!transactionResult.committed) {
        setReviewedSessionIds(previous => {
          const next = new Set(previous);
          next.add(sessionId);
          return next;
        });
        setPeerReviewError(
          isArabic
            ? 'تم تسجيل مشاركة هذا المعرّف في هذا السؤال من قبل.'
            : 'This identifier has already voted on this question.',
        );
        return;
      }

      setReviewedSessionIds(previous => {
        const next = new Set(previous);
        next.add(sessionId);
        return next;
      });
    } catch (error) {
      console.error('Failed to submit peer review vote:', error);
      setPeerReviewError(
        isArabic
          ? 'فشل حفظ التصويت. حاول مرة أخرى.'
          : 'Failed to save the vote. Try again.',
      );
    } finally {
      setIsSubmittingPeerVote(false);
      setSubmittingVoteSessionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0]" dir={dir} style={{ fontFamily: 'Arial, sans-serif' }}>
      <section className="relative overflow-hidden px-6 py-10">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle at 50% 0%, #8b1e1e, transparent 58%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-[#8b1e1e] rounded-full font-bold border border-[rgba(139,30,30,0.12)] shadow-sm hover:bg-[#f8eeee] transition-all"
          >
            <ArrowLeft size={18} className={isArabic ? 'rotate-180' : ''} />
            {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
          </button>

          <div className="text-center mt-14 mb-12">
            <div className="w-16 h-16 mx-auto grid place-items-center rounded-full bg-[#8b1e1e] text-white shadow-[0_8px_28px_rgba(139,30,30,0.24)] mb-6">
              <Sparkles size={28} />
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-[#8b1e1e] leading-tight mb-4">
              {isArabic ? 'أنشطة NextGen' : 'NextGen Activities'}
            </h1>
            <p className="max-w-2xl mx-auto text-[#666] text-lg leading-relaxed">
              {isArabic
                ? 'ابدأ كمستخدم NextGen جديد أو شارك باستخدام معرّف تمت الموافقة عليه.'
                : 'Get started as a new NextGen user or participate with an approved identifier.'}
            </p>
          </div>

          {!activeUser && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <motion.button
                  type="button"
                  onClick={() => chooseEntryMode('signup')}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                    entryMode === 'signup'
                      ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                      : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${entryMode === 'signup' ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                        <UserPlus size={26} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'ابدأ كمستخدم NextGen' : 'Get Started as a NextGen User'}
                        </h2>
                        <p className={`text-sm mt-1 ${entryMode === 'signup' ? 'text-white/80' : 'text-[#777]'}`}>
                          {isArabic ? 'أرسل طلباً بمعرّف من 4 أحرف أو أرقام.' : 'Submit a request with a 4-character ID.'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={22} className={`transition-transform ${entryMode === 'signup' ? 'rotate-180' : ''}`} />
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => chooseEntryMode('existing')}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                    entryMode === 'existing'
                      ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                      : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${entryMode === 'existing' ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                        <LockKeyhole size={26} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'شارك كمستخدم حالي' : 'Participate as an Existing User'}
                        </h2>
                        <p className={`text-sm mt-1 ${entryMode === 'existing' ? 'text-white/80' : 'text-[#777]'}`}>
                          {isArabic ? 'يتطلب معرّفاً موجوداً وتمت الموافقة عليه.' : 'Requires an existing approved ID.'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={22} className={`transition-transform ${entryMode === 'existing' ? 'rotate-180' : ''}`} />
                  </div>
                </motion.button>
              </div>

              {(accessError || accessMessage) && (
                <div className="max-w-3xl mx-auto mt-6">
                  {accessError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-bold">
                      {accessError}
                    </div>
                  )}
                  {accessMessage && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-800 font-bold">
                      {accessMessage}
                    </div>
                  )}
                </div>
              )}

              {entryMode === 'signup' && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                    <div className="flex items-center gap-3">
                      <UserPlus size={24} />
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'طلب مستخدم NextGen' : 'NextGen User Request'}
                        </h2>
                        <p className="text-white/75 text-sm mt-1">
                          {isArabic ? 'كل طلب جديد يبدأ بحالة انتظار الموافقة.' : 'Every new request begins with pending approval status.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEntryMode(null)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <form onSubmit={handleSignupSubmit} className="p-6 md:p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isArabic ? 'الاسم الكامل' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        value={signupForm.fullName}
                        onChange={event => setSignupForm(previous => ({ ...previous, fullName: event.target.value }))}
                        className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isArabic ? 'البريد الإلكتروني' : 'Email'}
                      </label>
                      <input
                        type="email"
                        value={signupForm.email}
                        onChange={event => setSignupForm(previous => ({ ...previous, email: event.target.value }))}
                        className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424]"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isArabic ? 'معرّف NextGen' : 'NextGen ID'}
                      </label>
                      <div className="relative">
                        <IdCard size={20} className={`absolute top-1/2 -translate-y-1/2 text-[#8b1e1e] ${isArabic ? 'right-4' : 'left-4'}`} />
                        <input
                          type="text"
                          inputMode="text"
                          maxLength={4}
                          value={signupForm.userId}
                          onChange={event => setSignupForm(previous => ({ ...previous, userId: normalizeUserId(event.target.value) }))}
                          placeholder="A7B2"
                          className={`w-full py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424] font-black tracking-[0.35em] uppercase ${isArabic ? 'pr-12 pl-5' : 'pl-12 pr-5'}`}
                          required
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        {isArabic
                          ? '4 أحرف أو أرقام بالإنجليزية فقط. لا يمكن استخدام معرّف موجود.'
                          : 'Exactly 4 English letters or numbers. An existing ID cannot be reused.'}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingSignup}
                      className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#8b1e1e] text-white rounded-2xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmittingSignup ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
                      {isSubmittingSignup
                        ? (isArabic ? 'جار إرسال الطلب...' : 'Submitting Request...')
                        : (isArabic ? 'إرسال طلب NextGen' : 'Submit NextGen Request')}
                    </button>

                    {registrationReceipt && (
                      <div className="rounded-[24px] border border-green-200 bg-green-50 p-5 space-y-4">
                        <div className="flex items-start gap-3 text-green-900">
                          <CheckCircle2 size={24} className="shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-bold text-lg">
                              {isArabic ? 'تم تسجيل الطلب' : 'Request Registered'}
                            </h3>
                            <p className="text-sm mt-1">
                              {isArabic
                                ? `المعرّف ${registrationReceipt.userId} محفوظ وحالته في انتظار الموافقة.`
                                : `ID ${registrationReceipt.userId} is reserved and pending approval.`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCertificateDownload}
                          disabled={isDownloadingCertificate}
                          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-800 rounded-xl font-bold border border-green-200 hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDownloadingCertificate ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                          {isDownloadingCertificate
                            ? (isArabic ? 'جار إنشاء الشهادة...' : 'Creating Certificate...')
                            : (isArabic ? 'تحميل شهادة مستخدم NextGen PDF' : 'Download NextGen User Certificate PDF')}
                        </button>
                      </div>
                    )}
                  </form>
                </motion.section>
              )}

              {entryMode === 'existing' && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                    <div className="flex items-center gap-3">
                      <LockKeyhole size={24} />
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'الدخول للمشاركة' : 'Enter to Participate'}
                        </h2>
                        <p className="text-white/75 text-sm mt-1">
                          {isArabic ? 'سيتم التحقق من وجود المعرّف وحالة الموافقة.' : 'The ID must exist and have approved status.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEntryMode(null)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <form onSubmit={handleExistingUserSubmit} className="p-6 md:p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isArabic ? 'معرّف NextGen المعتمد' : 'Approved NextGen ID'}
                      </label>
                      <div className="relative">
                        <IdCard size={20} className={`absolute top-1/2 -translate-y-1/2 text-[#8b1e1e] ${isArabic ? 'right-4' : 'left-4'}`} />
                        <input
                          type="text"
                          maxLength={4}
                          value={existingUserId}
                          onChange={event => setExistingUserId(normalizeUserId(event.target.value))}
                          placeholder="A7B2"
                          className={`w-full py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none text-[#242424] font-black tracking-[0.35em] uppercase ${isArabic ? 'pr-12 pl-5' : 'pl-12 pr-5'}`}
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingUser}
                      className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#8b1e1e] text-white rounded-2xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {isVerifyingUser ? <Loader2 size={19} className="animate-spin" /> : <CheckCircle2 size={19} />}
                      {isVerifyingUser
                        ? (isArabic ? 'جار التحقق...' : 'Verifying...')
                        : (isArabic ? 'التحقق والمتابعة' : 'Verify and Continue')}
                    </button>
                  </form>
                </motion.section>
              )}
            </>
          )}

          {activeUser && (
            <>
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[26px] border border-green-200 bg-green-50 p-5 shadow-sm">
                <div className="flex items-start gap-3 text-green-900">
                  <CheckCircle2 size={25} className="shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xl font-bold">
                      {isArabic ? `مرحباً ${activeUser.fullName}` : `Welcome, ${activeUser.fullName}`}
                    </h2>
                    <p className="text-sm mt-1">
                      {isArabic
                        ? `المعرّف المعتمد: ${activeUser.userId}. يتم تسجيل كل مشاركة بهذا المعرّف لمنع التكرار.`
                        : `Approved ID: ${activeUser.userId}. Every participation is recorded to this identifier to prevent duplicates.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-green-900 rounded-xl font-bold border border-green-200 hover:bg-green-100 transition-colors"
                >
                  <LogOut size={17} className={isArabic ? 'rotate-180' : ''} />
                  {isArabic ? 'تغيير المستخدم' : 'Change User'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <motion.button
                  type="button"
                  onClick={() => {
                    setIsQASessionOpen(true);
                    setIsPeerReviewOpen(false);
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                    isQASessionOpen
                      ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                      : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${isQASessionOpen ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                        <HelpCircle size={26} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'إضافة سؤال' : 'Add Question'}
                        </h2>
                        <p className={`text-sm mt-1 ${isQASessionOpen ? 'text-white/80' : 'text-[#777]'}`}>
                          {isArabic ? 'يُسجّل الإرسال على معرّفك.' : 'The submission is recorded to your ID.'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={22} className={`transition-transform ${isQASessionOpen ? 'rotate-180' : ''}`} />
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => {
                    setIsPeerReviewOpen(true);
                    setIsQASessionOpen(false);
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                    isPeerReviewOpen
                      ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                      : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${isPeerReviewOpen ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                        <ThumbsUp size={26} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'مراجعة الزملاء' : 'Peer Review'}
                        </h2>
                        <p className={`text-sm mt-1 ${isPeerReviewOpen ? 'text-white/80' : 'text-[#777]'}`}>
                          {isArabic ? 'تصويت واحد فقط لكل معرّف ولكل سؤال.' : 'One vote per identifier per question.'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={22} className={`transition-transform ${isPeerReviewOpen ? 'rotate-180' : ''}`} />
                  </div>
                </motion.button>

                <div className="p-7 rounded-[28px] bg-white border border-[rgba(139,30,30,0.08)] shadow-sm">
                  <h3 className="text-xl font-bold text-[#8b1e1e] mb-3">
                    {isArabic ? 'سجل المشاركة' : 'Participation Tracking'}
                  </h3>
                  <p className="text-[#666] leading-relaxed">
                    {isArabic
                      ? 'يُحفظ اكتمال كل تصويت أو نموذج ملاحظات حسب المعرّف ومعرّف النشاط لمنع الإرسال المكرر.'
                      : 'Each vote or future feedback form is recorded by user ID and activity ID, preventing duplicate submissions.'}
                  </p>
                </div>
              </div>

              {isQASessionOpen && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                    <div className="flex items-center gap-3">
                      <HelpCircle size={24} />
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'إضافة سؤال للمراجعة' : 'Create Question'}
                        </h2>
                        <p className="text-white/75 text-sm mt-1">
                          {isArabic ? 'سيتم ربط السؤال بمعرّف NextGen الخاص بك.' : 'The question will be linked to your NextGen identifier.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQASessionOpen(false)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <div className="p-6 md:p-8 space-y-7">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {isArabic ? 'السؤال' : 'Question'}
                      </label>
                      <textarea
                        value={form.question}
                        onChange={event => setForm(previous => ({ ...previous, question: event.target.value }))}
                        rows={5}
                        placeholder={isArabic ? 'اكتب السؤال هنا...' : 'Write the question here...'}
                        className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 focus:border-[#8b1e1e]/30 outline-none resize-none text-[#242424]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {isArabic ? 'التصنيف' : 'Category'}
                        </label>
                        <select
                          value={form.category}
                          onChange={event => setForm(previous => ({ ...previous, category: event.target.value }))}
                          className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none font-bold text-[#641414]"
                        >
                          {CATEGORY_OPTIONS.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {isArabic ? 'ملاحظات اختيارية' : 'Optional Notes'}
                        </label>
                        <input
                          type="text"
                          value={form.notes}
                          onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))}
                          placeholder={isArabic ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                          className="w-full px-5 py-4 bg-stone-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#8b1e1e]/20 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-6 py-3 bg-stone-100 text-[#641414] rounded-xl font-bold hover:bg-stone-200 transition-colors"
                      >
                        {isArabic ? 'إعادة ضبط' : 'Reset'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft}
                        className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#8b1e1e] text-white rounded-xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] active:bg-[#3f0f0f] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSavingDraft ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSavingDraft
                          ? (isArabic ? 'جار الحفظ...' : 'Saving...')
                          : (isArabic ? 'حفظ للمراجعة' : 'Save for Pastor Review')}
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}

              {isPeerReviewOpen && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                    <div className="flex items-center gap-3">
                      <ThumbsUp size={24} />
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'مراجعة الأسئلة' : 'Peer Review Questions'}
                        </h2>
                        <p className="text-white/75 text-sm mt-1">
                          {isArabic
                            ? 'تُخفى الأسئلة التي سبق أن صوّت عليها معرّفك.'
                            : 'Questions already voted on by your identifier are hidden.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPeerReviewOpen(false)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <div className="p-6 md:p-8 space-y-6">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-900">
                      <h3 className="font-bold mb-2">
                        {isArabic ? 'التصويت مرتبط بالمعرّف' : 'Identifier-Based Voting'}
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {isArabic
                          ? `يمكن للمعرّف ${activeUser.userId} التصويت مرة واحدة فقط على كل سؤال. يتم التحقق من ذلك داخل قاعدة البيانات، وليس فقط في هذه الجلسة.`
                          : `ID ${activeUser.userId} can vote only once on each question. This is enforced in the database, not only for the current browser session.`}
                      </p>
                    </div>

                    <div className="text-sm text-gray-500">
                      {isArabic
                        ? `الأسئلة المتاحة لهذا المعرّف: ${reviewableSessions.length}`
                        : `Questions available for this identifier: ${reviewableSessions.length}`}
                    </div>

                    {peerReviewError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
                        {peerReviewError}
                      </div>
                    )}

                    {isLoadingPeerReview && (
                      <div className="flex items-center gap-2 text-gray-500 bg-stone-50 border border-gray-100 rounded-2xl p-5">
                        <Loader2 size={18} className="animate-spin" />
                        {isArabic ? 'جار تحميل الأسئلة...' : 'Loading questions...'}
                      </div>
                    )}

                    {!isLoadingPeerReview && reviewableSessions.length === 0 && (
                      <div className="text-center bg-stone-50 border border-gray-100 rounded-3xl p-10">
                        <div className="w-14 h-14 mx-auto grid place-items-center rounded-full bg-[#f8eeee] text-[#8b1e1e] mb-4">
                          <ThumbsUp size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#8b1e1e] mb-2">
                          {isArabic ? 'لا توجد أسئلة أخرى للمراجعة' : 'No More Questions to Review'}
                        </h3>
                        <p className="text-gray-500">
                          {isArabic
                            ? 'صوّت هذا المعرّف بالفعل على كل الأسئلة المتاحة، أو لا توجد أسئلة بعد.'
                            : 'This identifier has already voted on every available question, or no questions exist yet.'}
                        </p>
                      </div>
                    )}

                    {!isLoadingPeerReview && reviewableSessions.length > 0 && (
                      <div className="space-y-4">
                        {reviewableSessions.map((session, index) => (
                          <motion.div
                            key={session.firebaseId}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.035 }}
                            className="rounded-[28px] bg-stone-50 border border-gray-100 p-6 space-y-5"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <span className="px-3 py-1 bg-[#8b1e1e] text-white rounded-full text-xs font-bold">
                                    {isArabic ? `ترتيب #${index + 1}` : `Rank #${index + 1}`}
                                  </span>
                                  <span className="px-3 py-1 bg-[#f8eeee] text-[#8b1e1e] rounded-full text-xs font-bold border border-[rgba(139,30,30,0.10)]">
                                    {session.category}
                                  </span>
                                </div>

                                <h3 className="text-2xl font-bold text-[#641414] leading-snug">
                                  {session.question}
                                </h3>

                                <p className="text-xs text-gray-400 mt-3 font-bold uppercase tracking-widest">
                                  {isArabic
                                    ? 'أرقام التصويت مخفية أثناء مراجعة الزملاء'
                                    : 'Vote totals hidden during peer review'}
                                </p>
                              </div>
                            </div>

                            {session.notes && (
                              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                  {isArabic ? 'ملاحظات' : 'Notes'}
                                </h4>
                                <p className="text-sm leading-relaxed text-[#333]">
                                  {session.notes}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => handlePeerVote(session.firebaseId, 'upvote')}
                                disabled={isSubmittingPeerVote}
                                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-700 text-white rounded-2xl font-bold hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                              >
                                {submittingVoteSessionId === session.firebaseId
                                  ? <Loader2 size={18} className="animate-spin" />
                                  : <ThumbsUp size={18} />}
                                {isArabic ? 'تصويت إيجابي' : 'Upvote'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePeerVote(session.firebaseId, 'downvote')}
                                disabled={isSubmittingPeerVote}
                                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-red-700 text-white rounded-2xl font-bold hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                              >
                                {submittingVoteSessionId === session.firebaseId
                                  ? <Loader2 size={18} className="animate-spin" />
                                  : <ThumbsDown size={18} />}
                                {isArabic ? 'تصويت سلبي' : 'Downvote'}
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.section>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
