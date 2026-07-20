import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
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
type SurveyBinaryAnswer = '' | 'A' | 'B';
type SurveyRatingAnswer = '' | 1 | 2 | 3 | 4 | 5;
type BinarySurveyQuestionId =
  | 'questionAnnouncement'
  | 'postSessionMaterials'
  | 'categoryStructure'
  | 'subtopicStructure'
  | 'sessionBalance'
  | 'answerDepth'
  | 'questionSelection'
  | 'summaryLength';
type RatingSurveyQuestionId = 'pastorClarity' | 'pastorDepth' | 'pastorEngagement';

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

interface SurveyAnswers {
  questionAnnouncement: SurveyBinaryAnswer;
  postSessionMaterials: SurveyBinaryAnswer;
  categoryStructure: SurveyBinaryAnswer;
  subtopicStructure: SurveyBinaryAnswer;
  sessionBalance: SurveyBinaryAnswer;
  answerDepth: SurveyBinaryAnswer;
  questionSelection: SurveyBinaryAnswer;
  summaryLength: SurveyBinaryAnswer;
  pastorClarity: SurveyRatingAnswer;
  pastorDepth: SurveyRatingAnswer;
  pastorEngagement: SurveyRatingAnswer;
}

interface BinarySurveyQuestion {
  id: BinarySurveyQuestionId;
  questionEn: string;
  questionAr: string;
  optionAEn: string;
  optionAAr: string;
  optionBEn: string;
  optionBAr: string;
  noteEn?: string;
  noteAr?: string;
}

interface RatingSurveyQuestion {
  id: RatingSurveyQuestionId;
  questionEn: string;
  questionAr: string;
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
  voterIdentifiers: string[];
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
const NEXTGEN_SURVEY_ID = 'qaSessionFeedbackFirstTwoSessionsV1';
const NEXTGEN_ID_PATTERN = /^[A-Z0-9]{4}$/;

const BINARY_SURVEY_QUESTIONS: BinarySurveyQuestion[] = [
  {
    id: 'questionAnnouncement',
    questionEn: 'For future Q&A sessions, should the questions be announced before the session or revealed during the session?',
    questionAr: 'في جلسات الأسئلة والأجوبة القادمة، هل تفضّل إعلان الأسئلة قبل الجلسة أم عرضها أثناء الجلسة؟',
    optionAEn: 'Announce the questions before the session',
    optionAAr: 'إعلان الأسئلة قبل الجلسة',
    optionBEn: 'Reveal the questions during the session',
    optionBAr: 'عرض الأسئلة أثناء الجلسة',
  },
  {
    id: 'postSessionMaterials',
    questionEn: 'After each Q&A session, what would you prefer receiving?',
    questionAr: 'بعد كل جلسة أسئلة وأجوبة، ماذا تفضّل أن يصلك؟',
    optionAEn: 'The recording only',
    optionAAr: 'التسجيل فقط',
    optionBEn: 'Both the recording and a written summary',
    optionBAr: 'التسجيل وملخص مكتوب معاً',
  },
  {
    id: 'categoryStructure',
    questionEn: 'How should future Q&A sessions be organized by category?',
    questionAr: 'كيف تفضّل تنظيم جلسات الأسئلة والأجوبة القادمة من حيث التصنيفات؟',
    optionAEn: 'Each session focuses on one main category',
    optionAAr: 'تركّز كل جلسة على تصنيف رئيسي واحد',
    optionBEn: 'Each session mixes categories such as Christian Living, Theology, and Apologetics',
    optionBAr: 'تجمع كل جلسة بين تصنيفات مثل الحياة المسيحية واللاهوت والدفاعيات',
  },
  {
    id: 'subtopicStructure',
    questionEn: 'When a session focuses on one main category, how should its subtopics be handled?',
    questionAr: 'عندما تركز الجلسة على تصنيف رئيسي واحد، كيف تفضّل تناول الموضوعات الفرعية؟',
    optionAEn: 'Explore one specific subtopic in depth',
    optionAAr: 'التعمق في موضوع فرعي واحد محدد',
    optionBEn: 'Discuss several subtopics from that category',
    optionBAr: 'مناقشة عدة موضوعات فرعية من التصنيف نفسه',
  },
  {
    id: 'sessionBalance',
    questionEn: 'During the session, where should more time be given?',
    questionAr: 'أثناء الجلسة، لأي جانب تفضّل تخصيص وقت أكبر؟',
    optionAEn: "More time for Pastor Ibrahim's explanations",
    optionAAr: 'وقت أكبر لشرح القس إبراهيم',
    optionBEn: 'More time for open discussion and participant follow-up questions',
    optionBAr: 'وقت أكبر للنقاش المفتوح وأسئلة المتابعة من المشاركين',
  },
  {
    id: 'answerDepth',
    questionEn: 'How should the number and depth of answered questions be balanced?',
    questionAr: 'كيف تفضّل الموازنة بين عدد الأسئلة وعمق الإجابات؟',
    optionAEn: 'Answer fewer questions in greater depth',
    optionAAr: 'الإجابة عن أسئلة أقل بعمق أكبر',
    optionBEn: 'Answer more questions with shorter responses',
    optionBAr: 'الإجابة عن أسئلة أكثر بإجابات أقصر',
  },
  {
    id: 'questionSelection',
    questionEn: 'How should questions be selected for each session?',
    questionAr: 'كيف تفضّل اختيار أسئلة كل جلسة؟',
    optionAEn: 'Pastor Ibrahim curates the final selection from the highest-voted questions',
    optionAAr: 'يختار القس إبراهيم التشكيلة النهائية من بين الأسئلة الأعلى تصويتاً',
    optionBEn: 'Questions are selected strictly according to the voting results',
    optionBAr: 'يتم اختيار الأسئلة حصراً وفق نتائج التصويت',
    noteEn: 'The earlier voting-integrity issue has been resolved. Each approved identifier can vote only once per question.',
    noteAr: 'تم حل مشكلة نزاهة التصويت السابقة، ويمكن لكل معرّف معتمد التصويت مرة واحدة فقط على كل سؤال.',
  },
  {
    id: 'summaryLength',
    questionEn: 'If a written summary is shared after the session, which format would you prefer?',
    questionAr: 'إذا تمت مشاركة ملخص مكتوب بعد الجلسة، فما الصيغة التي تفضّلها؟',
    optionAEn: 'A short, concise summary of the main answers',
    optionAAr: 'ملخص قصير ومختصر لأهم الإجابات',
    optionBEn: 'A detailed Bible-study document with explanations, verses, and discussion points',
    optionBAr: 'دراسة كتابية مفصلة تشمل الشرح والآيات ونقاط النقاش',
  },
];

const RATING_SURVEY_QUESTIONS: RatingSurveyQuestion[] = [
  {
    id: 'pastorClarity',
    questionEn: "How clear and easy to understand were Pastor Ibrahim's explanations?",
    questionAr: 'ما مدى وضوح وسهولة فهم شرح القس إبراهيم؟',
  },
  {
    id: 'pastorDepth',
    questionEn: 'How well did Pastor Ibrahim explore the questions in depth and support his answers with Scripture?',
    questionAr: 'ما مدى تعمق القس إبراهيم في الأسئلة ودعمه للإجابات بالكتاب المقدس؟',
  },
  {
    id: 'pastorEngagement',
    questionEn: 'How well did Pastor Ibrahim listen to participants, address their concerns, and respond to follow-up questions?',
    questionAr: 'ما مدى استماع القس إبراهيم للمشاركين ومعالجته لمخاوفهم وإجابته عن أسئلة المتابعة؟',
  },
];

const SURVEY_TOTAL_QUESTIONS = BINARY_SURVEY_QUESTIONS.length + RATING_SURVEY_QUESTIONS.length;

function createInitialSurveyAnswers(): SurveyAnswers {
  return {
    questionAnnouncement: '',
    postSessionMaterials: '',
    categoryStructure: '',
    subtopicStructure: '',
    sessionBalance: '',
    answerDepth: '',
    questionSelection: '',
    summaryLength: '',
    pastorClarity: '',
    pastorDepth: '',
    pastorEngagement: '',
  };
}

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

function extractQuestionVoterIdentifiers(value: any): string[] {
  const identifiers = new Set<string>();

  const addIdentifier = (candidate: unknown) => {
    const normalized = normalizeUserId(String(candidate || ''));
    if (NEXTGEN_ID_PATTERN.test(normalized)) identifiers.add(normalized);
  };

  const addKeys = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
    Object.keys(candidate as Record<string, unknown>).forEach(addIdentifier);
  };

  addKeys(value?.votesByIdentifier);
  addKeys(value?.voterIdentifiers);
  addKeys(value?.votedIdentifiers);

  if (Array.isArray(value?.voterIdentifiers)) {
    value.voterIdentifiers.forEach(addIdentifier);
  }

  if (Array.isArray(value?.votedIdentifiers)) {
    value.votedIdentifiers.forEach(addIdentifier);
  }

  return Array.from(identifiers);
}

function questionHasIdentifierVote(value: any, userId: string): boolean {
  const normalizedUserId = normalizeUserId(userId);
  if (!NEXTGEN_ID_PATTERN.test(normalizedUserId)) return false;
  return extractQuestionVoterIdentifiers(value).includes(normalizedUserId);
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
    voterIdentifiers: extractQuestionVoterIdentifiers(value),
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
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswers>(() => createInitialSurveyAnswers());
  const [isSurveyCompleted, setIsSurveyCompleted] = useState(false);
  const [isLoadingSurveyStatus, setIsLoadingSurveyStatus] = useState(false);
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [surveyError, setSurveyError] = useState('');
  const [surveyMessage, setSurveyMessage] = useState('');

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

  const surveyAnsweredCount = useMemo(() => {
    const binaryAnswered = BINARY_SURVEY_QUESTIONS.filter(
      question => surveyAnswers[question.id] === 'A' || surveyAnswers[question.id] === 'B',
    ).length;
    const ratingAnswered = RATING_SURVEY_QUESTIONS.filter(
      question => typeof surveyAnswers[question.id] === 'number',
    ).length;
    return binaryAnswered + ratingAnswered;
  }, [surveyAnswers]);

  const isSurveyFormComplete = surveyAnsweredCount === SURVEY_TOTAL_QUESTIONS;

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

        const votedQuestionIds = new Set(
          loadedSessions
            .filter(session => session.voterIdentifiers.includes(activeUser.userId))
            .map(session => session.firebaseId),
        );

        setSavedSessions(loadedSessions);
        setReviewedSessionIds(votedQuestionIds);
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

  useEffect(() => {
    if (!activeUser) {
      setIsSurveyCompleted(false);
      setIsLoadingSurveyStatus(false);
      setSurveyAnswers(createInitialSurveyAnswers());
      return undefined;
    }

    setIsLoadingSurveyStatus(true);
    setSurveyError('');

    const surveyResponseRef = ref(
      database,
      `${NEXTGEN_ACTIVITIES_PATH}/surveys/${NEXTGEN_SURVEY_ID}/responsesByIdentifier/${activeUser.userId}`,
    );

    const unsubscribe = onValue(
      surveyResponseRef,
      snapshot => {
        setIsSurveyCompleted(snapshot.exists());
        setIsLoadingSurveyStatus(false);
      },
      error => {
        console.error('Failed to load NextGen survey completion status:', error);
        setSurveyError(
          isArabic
            ? 'تعذر التحقق من حالة الاستبيان.'
            : 'Unable to verify the survey completion status.',
        );
        setIsLoadingSurveyStatus(false);
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

      const [questionsSnapshot, participationSnapshot] = await Promise.all([
        get(ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions`)),
        get(ref(database, `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/peerReviewVotes`)),
      ]);

      const rawQuestions = questionsSnapshot.val() as Record<string, any> | null;
      const legacyParticipationVotes = participationSnapshot.val() as Record<string, any> | null;
      const votedQuestionIds = new Set<string>();
      const legacyVoteMigrations: Promise<void>[] = [];

      Object.entries(rawQuestions || {}).forEach(([questionId, questionValue]) => {
        if (questionHasIdentifierVote(questionValue, userId)) {
          votedQuestionIds.add(questionId);
        }
      });

      Object.entries(legacyParticipationVotes || {}).forEach(([questionId, voteValue]) => {
        votedQuestionIds.add(questionId);

        const questionValue = rawQuestions?.[questionId];
        if (!questionValue || questionHasIdentifierVote(questionValue, userId)) return;

        const legacyVoteType: VoteType = voteValue?.voteType === 'downvote' ? 'downvote' : 'upvote';
        const completedAt = normalizeNumber(voteValue?.completedAt) || Date.now();
        const completedAtISO = String(voteValue?.completedAtISO || new Date(completedAt).toISOString());

        legacyVoteMigrations.push(
          update(
            ref(database, `${NEXTGEN_ACTIVITIES_PATH}/qaSessions/${questionId}`),
            {
              [`votesByIdentifier/${userId}`]: {
                identifier: userId,
                voteType: legacyVoteType,
                completedAt,
                completedAtISO,
                migratedFromParticipationHistory: true,
              },
              [`voterIdentifiers/${userId}`]: true,
            },
          ),
        );
      });

      if (legacyVoteMigrations.length > 0) {
        const migrationResults = await Promise.allSettled(legacyVoteMigrations);
        migrationResults.forEach(result => {
          if (result.status === 'rejected') {
            console.warn('Could not migrate a legacy NextGen vote marker:', result.reason);
          }
        });
      }

      setReviewedSessionIds(votedQuestionIds);
      setActiveUser(user);
      setExistingUserId('');
      setEntryMode(null);
      setAccessMessage('');
      setIsQASessionOpen(false);
      setIsPeerReviewOpen(false);
      setIsSurveyOpen(false);
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
    setIsSurveyOpen(false);
    setSurveyAnswers(createInitialSurveyAnswers());
    setIsSurveyCompleted(false);
    setSurveyError('');
    setSurveyMessage('');
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
        voterIdentifiers: {},
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
    if (!activeUser || isSubmittingPeerVote) return;

    const userId = normalizeUserId(activeUser.userId);
    if (!NEXTGEN_ID_PATTERN.test(userId)) return;

    setIsSubmittingPeerVote(true);
    setSubmittingVoteSessionId(sessionId);
    setPeerReviewError('');

    try {
      const questionReference = ref(
        database,
        `${NEXTGEN_ACTIVITIES_PATH}/qaSessions/${sessionId}`,
      );

      // Always read the question itself before attempting the vote. The question's
      // voter lists are the source of truth. The legacy participation record is
      // checked only to protect votes created before question-level tracking existed.
      const [currentQuestionSnapshot, legacyVoteSnapshot] = await Promise.all([
        get(questionReference),
        get(
          ref(
            database,
            `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/peerReviewVotes/${sessionId}`,
          ),
        ),
      ]);

      if (!currentQuestionSnapshot.exists()) {
        setPeerReviewError(
          isArabic
            ? 'هذا السؤال لم يعد موجوداً.'
            : 'This question no longer exists.',
        );
        return;
      }

      const questionAlreadyContainsVote = questionHasIdentifierVote(
        currentQuestionSnapshot.val(),
        userId,
      );
      const legacyVoteAlreadyExists = legacyVoteSnapshot.exists();

      if (questionAlreadyContainsVote || legacyVoteAlreadyExists) {
        if (!questionAlreadyContainsVote && legacyVoteAlreadyExists) {
          const legacyValue = legacyVoteSnapshot.val() as Record<string, any> | null;
          const legacyVoteType: VoteType = legacyValue?.voteType === 'downvote' ? 'downvote' : 'upvote';
          const completedAt = normalizeNumber(legacyValue?.completedAt) || Date.now();
          const completedAtISO = String(
            legacyValue?.completedAtISO || new Date(completedAt).toISOString(),
          );

          try {
            await update(questionReference, {
              [`votesByIdentifier/${userId}`]: {
                identifier: userId,
                voteType: legacyVoteType,
                completedAt,
                completedAtISO,
                migratedFromParticipationHistory: true,
              },
              [`voterIdentifiers/${userId}`]: true,
            });
          } catch (migrationError) {
            console.warn('Could not migrate legacy vote marker to the question:', migrationError);
          }
        }

        setReviewedSessionIds(previous => {
          const next = new Set(previous);
          next.add(sessionId);
          return next;
        });
        setPeerReviewError(
          isArabic
            ? 'هذا المعرّف صوّت بالفعل على هذا السؤال.'
            : 'This identifier has already voted on this question.',
        );
        return;
      }

      const now = Date.now();
      const nowISO = new Date(now).toISOString();

      // The transaction runs on the individual question. It checks the stored
      // identifier list again and writes the identifier and totals atomically.
      const transactionResult = await runTransaction(
        questionReference,
        currentQuestion => {
          if (!currentQuestion || typeof currentQuestion !== 'object') {
            return undefined;
          }

          if (questionHasIdentifierVote(currentQuestion, userId)) {
            return undefined;
          }

          const currentUpvotes = normalizeNumber(currentQuestion.totalUpvotes);
          const currentDownvotes = normalizeNumber(currentQuestion.totalDownvotes);
          const nextUpvotes = voteType === 'upvote' ? currentUpvotes + 1 : currentUpvotes;
          const nextDownvotes = voteType === 'downvote' ? currentDownvotes + 1 : currentDownvotes;

          const currentVotesByIdentifier =
            currentQuestion.votesByIdentifier &&
            typeof currentQuestion.votesByIdentifier === 'object' &&
            !Array.isArray(currentQuestion.votesByIdentifier)
              ? currentQuestion.votesByIdentifier as Record<string, unknown>
              : {};

          const currentVoterIdentifiers =
            currentQuestion.voterIdentifiers &&
            typeof currentQuestion.voterIdentifiers === 'object' &&
            !Array.isArray(currentQuestion.voterIdentifiers)
              ? currentQuestion.voterIdentifiers as Record<string, unknown>
              : Object.fromEntries(
                  extractQuestionVoterIdentifiers(currentQuestion).map(identifier => [identifier, true]),
                );

          return {
            ...currentQuestion,
            totalUpvotes: nextUpvotes,
            totalDownvotes: nextDownvotes,
            netVotes: nextUpvotes - nextDownvotes,
            updatedAt: now,
            updatedAtISO: nowISO,
            votesByIdentifier: {
              ...currentVotesByIdentifier,
              [userId]: {
                identifier: userId,
                voteType,
                completedAt: now,
                completedAtISO: nowISO,
              },
            },
            voterIdentifiers: {
              ...currentVoterIdentifiers,
              [userId]: true,
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
            ? 'هذا المعرّف صوّت بالفعل على هذا السؤال.'
            : 'This identifier has already voted on this question.',
        );
        return;
      }

      const committedQuestion = transactionResult.snapshot.val();
      if (!questionHasIdentifierVote(committedQuestion, userId)) {
        throw new Error('The vote transaction committed without storing the identifier.');
      }

      setReviewedSessionIds(previous => {
        const next = new Set(previous);
        next.add(sessionId);
        return next;
      });

      // Keep the per-user activity history for reporting. A failure here does not
      // undo or invalidate the authoritative vote already stored on the question.
      try {
        await update(
          ref(
            database,
            `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/peerReviewVotes/${sessionId}`,
          ),
          {
            activityType: 'peerReviewVote',
            activityId: sessionId,
            fillingStatus: 'completed',
            identifier: userId,
            voteType,
            completedAt: now,
            completedAtISO: nowISO,
          },
        );
      } catch (historyError) {
        console.warn('Vote was saved, but the participation history could not be updated:', historyError);
      }
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


  const setBinarySurveyAnswer = (questionId: BinarySurveyQuestionId, answer: 'A' | 'B') => {
    if (isSurveyCompleted) return;
    setSurveyAnswers(previous => ({ ...previous, [questionId]: answer }));
    setSurveyError('');
    setSurveyMessage('');
  };

  const setRatingSurveyAnswer = (questionId: RatingSurveyQuestionId, answer: 1 | 2 | 3 | 4 | 5) => {
    if (isSurveyCompleted) return;
    setSurveyAnswers(previous => ({ ...previous, [questionId]: answer }));
    setSurveyError('');
    setSurveyMessage('');
  };

  const handleSurveySubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeUser || isSubmittingSurvey || isSurveyCompleted) return;

    setSurveyError('');
    setSurveyMessage('');

    if (!isSurveyFormComplete) {
      setSurveyError(
        isArabic
          ? `يجب الإجابة عن جميع الأسئلة. تمت الإجابة عن ${surveyAnsweredCount} من ${SURVEY_TOTAL_QUESTIONS}.`
          : `All questions are required. You answered ${surveyAnsweredCount} of ${SURVEY_TOTAL_QUESTIONS}.`,
      );
      return;
    }

    const userId = normalizeUserId(activeUser.userId);
    if (!NEXTGEN_ID_PATTERN.test(userId)) return;

    setIsSubmittingSurvey(true);

    try {
      const now = Date.now();
      const nowISO = new Date(now).toISOString();
      const responseRef = ref(
        database,
        `${NEXTGEN_ACTIVITIES_PATH}/surveys/${NEXTGEN_SURVEY_ID}/responsesByIdentifier/${userId}`,
      );

      const binaryAnswerDetails = Object.fromEntries(
        BINARY_SURVEY_QUESTIONS.map(question => {
          const selectedAnswer = surveyAnswers[question.id] as 'A' | 'B';
          return [
            question.id,
            {
              questionEnglish: question.questionEn,
              questionArabic: question.questionAr,
              answer: selectedAnswer,
              selectedOptionEnglish: selectedAnswer === 'A' ? question.optionAEn : question.optionBEn,
              selectedOptionArabic: selectedAnswer === 'A' ? question.optionAAr : question.optionBAr,
            },
          ];
        }),
      );

      const ratingAnswerDetails = Object.fromEntries(
        RATING_SURVEY_QUESTIONS.map(question => [
          question.id,
          {
            questionEnglish: question.questionEn,
            questionArabic: question.questionAr,
            rating: surveyAnswers[question.id],
            minimumRating: 1,
            maximumRating: 5,
          },
        ]),
      );

      const responsePayload = {
        surveyId: NEXTGEN_SURVEY_ID,
        surveyVersion: 1,
        surveyTitle: 'NextGen Q&A Session Feedback — First Two Sessions',
        identifier: userId,
        participantName: activeUser.fullName,
        participantEmail: activeUser.email,
        interfaceLanguageUsed: isArabic ? 'Arabic' : 'English',
        completionStatus: 'completed',
        allQuestionsRequired: true,
        totalQuestions: SURVEY_TOTAL_QUESTIONS,
        answeredQuestions: SURVEY_TOTAL_QUESTIONS,
        answers: surveyAnswers,
        answerDetails: {
          binaryQuestions: binaryAnswerDetails,
          pastorQualityRatings: ratingAnswerDetails,
        },
        completedAt: now,
        completedAtISO: nowISO,
        completedAtEasternTime: getEasternTime(now),
        source: 'nextGenActivities',
      };

      const transactionResult = await runTransaction(
        responseRef,
        currentValue => {
          if (currentValue !== null) return undefined;
          return responsePayload;
        },
        { applyLocally: false },
      );

      if (!transactionResult.committed) {
        setIsSurveyCompleted(true);
        setSurveyError(
          isArabic
            ? 'هذا المعرّف أكمل الاستبيان بالفعل، ولا يمكن إرساله مرة أخرى.'
            : 'This identifier has already completed the survey and cannot submit it again.',
        );
        return;
      }

      setIsSurveyCompleted(true);
      setSurveyMessage(
        isArabic
          ? 'تم إرسال الاستبيان بنجاح. شكراً لمشاركتك.'
          : 'Survey submitted successfully. Thank you for your feedback.',
      );

      try {
        await update(
          ref(
            database,
            `${NEXTGEN_ACTIVITIES_PATH}/participationByIdentifier/${userId}/surveys/${NEXTGEN_SURVEY_ID}`,
          ),
          {
            activityType: 'feedbackSurvey',
            activityId: NEXTGEN_SURVEY_ID,
            fillingStatus: 'completed',
            completedAt: now,
            completedAtISO: nowISO,
          },
        );
      } catch (historyError) {
        console.warn('Survey response was saved, but participation history could not be updated:', historyError);
      }
    } catch (error) {
      console.error('Failed to submit NextGen survey:', error);
      setSurveyError(
        isArabic
          ? 'تعذر إرسال الاستبيان. حاول مرة أخرى.'
          : 'Unable to submit the survey. Try again.',
      );
    } finally {
      setIsSubmittingSurvey(false);
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
                    setIsSurveyOpen(false);
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
                    setIsSurveyOpen(false);
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

                <motion.button
                  type="button"
                  onClick={() => {
                    setIsSurveyOpen(true);
                    setIsQASessionOpen(false);
                    setIsPeerReviewOpen(false);
                    setSurveyError('');
                    setSurveyMessage('');
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-7 rounded-[28px] border-2 transition-all shadow-sm group ${
                    isSurveyOpen
                      ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_14px_34px_rgba(139,30,30,0.22)]'
                      : 'bg-white border-[rgba(139,30,30,0.12)] text-[#641414] hover:bg-[#f8eeee] hover:border-[#8b1e1e] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(139,30,30,0.14)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 grid place-items-center rounded-2xl transition-colors ${isSurveyOpen ? 'bg-white/15 text-white' : 'bg-[#f8eeee] text-[#8b1e1e] group-hover:bg-[#8b1e1e] group-hover:text-white'}`}>
                        <ClipboardList size={26} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-bold">
                            {isArabic ? 'استبيان الجلسات' : 'Session Feedback'}
                          </h2>
                          {isSurveyCompleted && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isSurveyOpen ? 'bg-white/15 text-white' : 'bg-green-100 text-green-800'}`}>
                              {isArabic ? 'مكتمل' : 'Completed'}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${isSurveyOpen ? 'text-white/80' : 'text-[#777]'}`}>
                          {isArabic
                            ? 'استبيان مطلوب الإجابة عن جميع أسئلته، مرة واحدة لكل معرّف.'
                            : 'All questions are required, with one submission per identifier.'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={22} className={`transition-transform ${isSurveyOpen ? 'rotate-180' : ''}`} />
                  </div>
                </motion.button>
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

              {isSurveyOpen && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 bg-white rounded-[30px] border border-[rgba(139,30,30,0.10)] shadow-[0_18px_48px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 p-6 bg-[#8b1e1e] text-white">
                    <div className="flex items-center gap-3">
                      <ClipboardList size={24} />
                      <div>
                        <h2 className="text-2xl font-bold">
                          {isArabic ? 'استبيان تقييم جلسات NextGen' : 'NextGen Q&A Session Feedback Survey'}
                        </h2>
                        <p className="text-white/75 text-sm mt-1">
                          {isArabic
                            ? 'تقييم أول جلستين. جميع الأسئلة مطلوبة، ويسمح بإرسال واحد فقط لكل معرّف.'
                            : 'Feedback on the first two sessions. All questions are required, and each identifier may submit only once.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSurveyOpen(false)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <div className="p-6 md:p-8">
                    {isLoadingSurveyStatus ? (
                      <div className="flex items-center gap-2 text-gray-500 bg-stone-50 border border-gray-100 rounded-2xl p-5">
                        <Loader2 size={18} className="animate-spin" />
                        {isArabic ? 'جار التحقق من حالة الاستبيان...' : 'Checking survey completion status...'}
                      </div>
                    ) : isSurveyCompleted ? (
                      <div className="text-center bg-green-50 border border-green-200 rounded-[26px] p-10">
                        <div className="w-16 h-16 mx-auto grid place-items-center rounded-full bg-green-700 text-white mb-5">
                          <CheckCircle2 size={30} />
                        </div>
                        <h3 className="text-2xl font-bold text-green-900 mb-2">
                          {isArabic ? 'تم إكمال الاستبيان' : 'Survey Completed'}
                        </h3>
                        <p className="text-green-800 max-w-2xl mx-auto">
                          {isArabic
                            ? `أكمل المعرّف ${activeUser.userId} هذا الاستبيان بالفعل. لا يمكن إرسال إجابة ثانية.`
                            : `Identifier ${activeUser.userId} has already completed this survey. A second response cannot be submitted.`}
                        </p>
                        {surveyMessage && (
                          <div className="mt-5 rounded-xl border border-green-200 bg-white px-5 py-4 text-green-800 font-bold">
                            {surveyMessage}
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSurveySubmit} className="space-y-7">
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-900">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h3 className="font-bold">
                                {isArabic ? 'استبيان إلزامي بالكامل' : 'Completion-Based Survey'}
                              </h3>
                              <p className="text-sm mt-1 leading-relaxed">
                                {isArabic
                                  ? 'يجب الإجابة عن كل سؤال قبل الإرسال. يتم حفظ الإكمال على معرّفك لمنع تعبئة الاستبيان مرتين.'
                                  : 'Every question must be answered before submission. Completion is stored against your identifier to prevent duplicate responses.'}
                              </p>
                            </div>
                            <span className="shrink-0 px-4 py-2 rounded-full bg-white border border-amber-200 text-sm font-bold">
                              {surveyAnsweredCount}/{SURVEY_TOTAL_QUESTIONS}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-5">
                          {BINARY_SURVEY_QUESTIONS.map((question, index) => {
                            const selectedAnswer = surveyAnswers[question.id];

                            return (
                              <div key={question.id} className="rounded-[24px] border border-gray-100 bg-stone-50 p-5 md:p-6">
                                <div className="flex items-start gap-3 mb-4">
                                  <span className="shrink-0 grid place-items-center w-8 h-8 rounded-full bg-[#8b1e1e] text-white text-sm font-bold">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <h3 className="font-bold text-[#3f0f0f] text-lg leading-relaxed">
                                      {isArabic ? question.questionAr : question.questionEn}
                                      <span className="text-[#8b1e1e]"> *</span>
                                    </h3>
                                    {(question.noteEn || question.noteAr) && (
                                      <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                                        {isArabic ? question.noteAr : question.noteEn}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {(['A', 'B'] as const).map(answer => {
                                    const isSelected = selectedAnswer === answer;
                                    const optionLabel = answer === 'A'
                                      ? (isArabic ? question.optionAAr : question.optionAEn)
                                      : (isArabic ? question.optionBAr : question.optionBEn);

                                    return (
                                      <button
                                        key={answer}
                                        type="button"
                                        onClick={() => setBinarySurveyAnswer(question.id, answer)}
                                        className={`text-start min-h-[76px] px-5 py-4 rounded-2xl border-2 font-bold transition-all ${
                                          isSelected
                                            ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_8px_20px_rgba(139,30,30,0.18)]'
                                            : 'bg-white border-gray-200 text-[#641414] hover:border-[#8b1e1e] hover:bg-[#fffafa]'
                                        }`}
                                      >
                                        <span className={`inline-grid place-items-center w-7 h-7 rounded-full me-2 text-sm ${isSelected ? 'bg-white/20' : 'bg-[#f8eeee]'}`}>
                                          {answer}
                                        </span>
                                        {optionLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="rounded-[24px] border border-[rgba(139,30,30,0.12)] bg-[#fffafa] p-5 md:p-6">
                          <h3 className="text-xl font-bold text-[#8b1e1e] mb-2">
                            {isArabic ? 'تقييم جودة القس إبراهيم' : "Pastor Ibrahim's Session Quality"}
                          </h3>
                          <p className="text-sm text-gray-600 mb-5">
                            {isArabic ? 'قيّم كل بند من 1 (ضعيف جداً) إلى 5 (ممتاز).' : 'Rate each item from 1 (Very poor) to 5 (Excellent).'}
                          </p>

                          <div className="space-y-5">
                            {RATING_SURVEY_QUESTIONS.map((question, index) => (
                              <div key={question.id} className="rounded-2xl border border-gray-100 bg-white p-5">
                                <div className="flex items-start gap-3 mb-4">
                                  <span className="shrink-0 grid place-items-center w-8 h-8 rounded-full bg-[#8b1e1e] text-white text-sm font-bold">
                                    {BINARY_SURVEY_QUESTIONS.length + index + 1}
                                  </span>
                                  <h4 className="font-bold text-[#3f0f0f] text-lg leading-relaxed">
                                    {isArabic ? question.questionAr : question.questionEn}
                                    <span className="text-[#8b1e1e]"> *</span>
                                  </h4>
                                </div>

                                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                                  {([1, 2, 3, 4, 5] as const).map(rating => {
                                    const isSelected = surveyAnswers[question.id] === rating;
                                    return (
                                      <button
                                        key={rating}
                                        type="button"
                                        onClick={() => setRatingSurveyAnswer(question.id, rating)}
                                        className={`min-h-[52px] rounded-xl border-2 font-black text-lg transition-all ${
                                          isSelected
                                            ? 'bg-[#8b1e1e] border-[#8b1e1e] text-white shadow-[0_6px_16px_rgba(139,30,30,0.18)]'
                                            : 'bg-stone-50 border-gray-200 text-[#641414] hover:border-[#8b1e1e] hover:bg-[#fffafa]'
                                        }`}
                                      >
                                        {rating}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex justify-between mt-2 text-xs text-gray-500 font-bold">
                                  <span>{isArabic ? 'ضعيف جداً' : 'Very poor'}</span>
                                  <span>{isArabic ? 'ممتاز' : 'Excellent'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {surveyError && (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-bold">
                            {surveyError}
                          </div>
                        )}

                        {surveyMessage && (
                          <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-800 font-bold">
                            {surveyMessage}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingSurvey}
                          className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#8b1e1e] text-white rounded-2xl font-bold shadow-[0_8px_22px_rgba(139,30,30,0.22)] hover:bg-[#641414] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmittingSurvey ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
                          {isSubmittingSurvey
                            ? (isArabic ? 'جار إرسال الاستبيان...' : 'Submitting Survey...')
                            : (isArabic ? 'إرسال الاستبيان المكتمل' : 'Submit Completed Survey')}
                        </button>
                      </form>
                    )}
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
