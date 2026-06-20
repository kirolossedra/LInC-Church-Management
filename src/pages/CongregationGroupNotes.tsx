
import React, { useEffect, useMemo, useState } from 'react';
import { database } from '../firebase';
import { ref, get, onValue } from 'firebase/database';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Hash,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';

const PEOPLE_DEVELOPMENT_ROOT = 'peopleDevelopment';
const SAVED_IDENTIFIER_STORAGE_KEY = 'lincPeopleDevelopmentIdentifier';

type PeopleDevelopmentGroupId = 'prophets' | 'helpers' | 'evangelists' | 'apostles';

type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

interface PeopleDevelopmentGroupConfig {
  id: PeopleDevelopmentGroupId;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  cardClass: string;
  badgeClass: string;
  accentClass: string;
}

interface MemberProfile {
  memberKey: string;
  identifier: string;
  fullName: string;
  email: string;
  primaryGift: string;
  group: PeopleDevelopmentGroupId | '';
  groupLabel: string;
  sourcePath?: string;
  sourceKeys?: string[];
}

interface GroupAssignment {
  id: string;
  group: PeopleDevelopmentGroupId;
  groupLabel: string;
  text: string;
  date: string;
  createdAt: number;
  createdAtISO: string;
  source?: string;
}

const PEOPLE_DEVELOPMENT_GROUPS: PeopleDevelopmentGroupConfig[] = [
  {
    id: 'prophets',
    labelEn: 'Prophets',
    labelAr: 'الأنبياء',
    descriptionEn: 'Discernment, direction, and spiritual clarity',
    descriptionAr: 'تمييز، توجيه، ووضوح روحي',
    cardClass: 'bg-purple-50 border-purple-200 text-purple-800',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    accentClass: 'bg-purple-700 text-white',
  },
  {
    id: 'helpers',
    labelEn: 'Helpers',
    labelAr: 'المساعدون',
    descriptionEn: 'Care, support, and practical service',
    descriptionAr: 'رعاية، دعم، وخدمة عملية',
    cardClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentClass: 'bg-emerald-700 text-white',
  },
  {
    id: 'evangelists',
    labelEn: 'Evangelists',
    labelAr: 'المبشرون',
    descriptionEn: 'Outreach, invitation, and sharing faith',
    descriptionAr: 'خدمة خارجية، دعوة، ومشاركة الإيمان',
    cardClass: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    accentClass: 'bg-amber-600 text-white',
  },
  {
    id: 'apostles',
    labelEn: 'Apostles',
    labelAr: 'الرسل',
    descriptionEn: 'Building, sending, and starting new work',
    descriptionAr: 'بناء، إرسال، وبدء أعمال جديدة',
    cardClass: 'bg-sky-50 border-sky-200 text-sky-800',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    accentClass: 'bg-sky-700 text-white',
  },
];

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function unwrapStoredValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value !== 'object' || Array.isArray(value)) return '';

  const record = value as Record<string, unknown>;

  for (const key of ['value', 'answer', 'currentValue', 'userIdentifier', 'linkedUserIdentifier', 'memberId', 'memberIdentifier', 'linkId', 'group']) {
    const nested = record[key];
    if (typeof nested === 'string' || typeof nested === 'number') return String(nested).trim();
  }

  return '';
}

function extractResponseValue(value: unknown, candidateKeys: string[]): string {
  const wantedKeys = new Set(candidateKeys.map(normalizeLookupKey));

  const visit = (current: unknown, currentKey = ''): string => {
    if (current === null || current === undefined) return '';

    if (typeof current === 'string' || typeof current === 'number') {
      return wantedKeys.has(normalizeLookupKey(currentKey)) ? String(current).trim() : '';
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        const found = visit(item, currentKey);
        if (found) return found;
      }
      return '';
    }

    if (typeof current !== 'object') return '';

    const record = current as Record<string, unknown>;

    for (const [key, nested] of Object.entries(record)) {
      if (wantedKeys.has(normalizeLookupKey(key))) {
        const directValue = unwrapStoredValue(nested);
        if (directValue) return directValue;

        const nestedValue = visit(nested, key);
        if (nestedValue) return nestedValue;
      }
    }

    for (const [key, nested] of Object.entries(record)) {
      const found = visit(nested, key);
      if (found) return found;
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

function normalizeIdentifier(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePeopleDevelopmentGroup(value: unknown): PeopleDevelopmentGroupId | '' {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'prophet' || normalized === 'prophets') return 'prophets';
  if (normalized === 'helper' || normalized === 'helpers') return 'helpers';
  if (normalized === 'evangelist' || normalized === 'evangelists') return 'evangelists';
  if (normalized === 'apostle' || normalized === 'apostles') return 'apostles';

  return '';
}

function extractPeopleDevelopmentGroup(raw: Record<string, any>): PeopleDevelopmentGroupId | '' {
  return normalizePeopleDevelopmentGroup(
    raw.peopleDevelopmentGroup ||
    raw.peopleDevelopment?.group ||
    raw.fields?.peopleDevelopment?.group?.value ||
    raw.fields?.peopleDevelopment?.group?.answer ||
    raw.fields?.peopleDevelopment?.group ||
    '',
  );
}

function getGroupConfig(groupId: PeopleDevelopmentGroupId | ''): PeopleDevelopmentGroupConfig | null {
  if (!groupId) return null;
  return PEOPLE_DEVELOPMENT_GROUPS.find(group => group.id === groupId) || null;
}

function getGroupLabel(groupId: PeopleDevelopmentGroupId | '', displayLocale: 'en' | 'ar'): string {
  const config = getGroupConfig(groupId);
  if (!config) return '';
  return displayLocale === 'ar' ? config.labelAr : config.labelEn;
}

function getGroupDescription(groupId: PeopleDevelopmentGroupId | '', displayLocale: 'en' | 'ar'): string {
  const config = getGroupConfig(groupId);
  if (!config) return '';
  return displayLocale === 'ar' ? config.descriptionAr : config.descriptionEn;
}

function formatDateLabel(dateValue: string, fallbackTimestamp: number, displayLocale: 'en' | 'ar'): string {
  const dateLocale = displayLocale === 'ar' ? ar : enUS;

  try {
    const source = dateValue || (fallbackTimestamp ? new Date(fallbackTimestamp).toISOString() : '');
    if (!source) return '';

    const date = source.includes('T') ? new Date(source) : new Date(`${source}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateValue;

    return format(date, 'EEEE, MMMM d, yyyy', { locale: dateLocale });
  } catch {
    return dateValue;
  }
}

function buildProfileFromMemberRecord(memberKey: string, value: any, fallbackIdentifier: string, displayLocale: 'en' | 'ar'): MemberProfile {
  const group = normalizePeopleDevelopmentGroup(value?.group);

  return {
    memberKey,
    identifier: String(value?.identifier || fallbackIdentifier || '').trim(),
    fullName: String(value?.fullName || value?.name || '').trim(),
    email: String(value?.email || '').trim(),
    primaryGift: String(value?.primaryGift || '').trim(),
    group,
    groupLabel: String(value?.groupLabel || getGroupLabel(group, displayLocale) || '').trim(),
    sourcePath: String(value?.sourcePath || 'peopleDevelopment/members'),
    sourceKeys: Array.isArray(value?.sourceKeys) ? value.sourceKeys.map((item: any) => String(item)) : [],
  };
}

function buildProfileFromFormRecord(formId: string, raw: any, userIdentifier: string, memberKey: string, displayLocale: 'en' | 'ar'): MemberProfile {
  const fullName = extractResponseValue(raw, ['fullName', 'full_name', 'name', 'firstName', 'lastName']);
  const email = extractResponseValue(raw, ['email', 'emailAddress', 'userEmail']);
  const group = extractPeopleDevelopmentGroup(raw);
  const lang = raw?.interfaceLanguageUsed === 'Arabic' ? 'Arabic' : 'English';
  const primaryGift = raw?.results?.[lang]?.primaryGift || '';

  return {
    memberKey,
    identifier: userIdentifier,
    fullName: fullName || '',
    email: email || '',
    primaryGift,
    group,
    groupLabel: getGroupLabel(group, displayLocale),
    sourcePath: 'form',
    sourceKeys: [formId],
  };
}

function normalizeAssignment(id: string, value: any, displayLocale: 'en' | 'ar'): GroupAssignment | null {
  const group = normalizePeopleDevelopmentGroup(value?.group);
  const text = String(value?.text || '').trim();

  if (!group || !text) return null;

  return {
    id,
    group,
    groupLabel: String(value?.groupLabel || getGroupLabel(group, displayLocale) || '').trim(),
    text,
    date: String(value?.date || '').trim(),
    createdAt: normalizeNumber(value?.createdAt),
    createdAtISO: String(value?.createdAtISO || '').trim(),
    source: String(value?.source || '').trim(),
  };
}

async function findProfileByIdentifier(identifier: string, displayLocale: 'en' | 'ar'): Promise<MemberProfile | null> {
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
      const memberIdentifier = normalizeIdentifier(String((memberValue as any)?.identifier || ''));
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

export default function CongregationGroupNotes() {
  const { dir, locale } = useI18n();
  const displayLocale: 'en' | 'ar' = locale === 'ar' ? 'ar' : 'en';
  const isAr = displayLocale === 'ar';
  const [identifierInput, setIdentifierInput] = useState('');
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');
  const [loginMessage, setLoginMessage] = useState('');
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [assignments, setAssignments] = useState<GroupAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<GroupAssignment | null>(null);

  const groupConfig = getGroupConfig(profile?.group || '');
  const groupLabel = profile?.group ? getGroupLabel(profile.group, displayLocale) : '';
  const groupDescription = profile?.group ? getGroupDescription(profile.group, displayLocale) : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedIdentifier = window.localStorage.getItem(SAVED_IDENTIFIER_STORAGE_KEY);
    if (savedIdentifier) {
      setIdentifierInput(savedIdentifier);
    }
  }, []);

  useEffect(() => {
    if (!profile?.group) {
      setAssignments([]);
      setAssignmentsLoading(false);
      return undefined;
    }

    setAssignmentsLoading(true);
    const assignmentsRef = ref(database, `${PEOPLE_DEVELOPMENT_ROOT}/assignments/`);

    const unsubscribe = onValue(
      assignmentsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setAssignments([]);
          setAssignmentsLoading(false);
          return;
        }

        const parsed = Object.entries(data)
          .map(([id, value]: [string, any]) => normalizeAssignment(id, value, displayLocale))
          .filter((assignment): assignment is GroupAssignment => Boolean(assignment && assignment.group === profile.group))
          .sort((a, b) => b.createdAt - a.createdAt);

        setAssignments(parsed);
        setAssignmentsLoading(false);
      },
      (error) => {
        console.error('Failed to load group assignments:', error);
        setAssignments([]);
        setAssignmentsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [profile?.group, displayLocale]);

  const filteredAssignments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return assignments;

    return assignments.filter(assignment =>
      assignment.text.toLowerCase().includes(search) ||
      assignment.date.toLowerCase().includes(search) ||
      assignment.createdAtISO.toLowerCase().includes(search),
    );
  }, [assignments, searchTerm]);

  const latestAssignment = assignments[0] || null;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const identifier = identifierInput.trim();

    if (!identifier) {
      setLoginStatus('error');
      setLoginMessage(isAr ? 'اكتب رمز العبور الشخصي أولاً.' : 'Enter your personal identifier first.');
      return;
    }

    setLoginStatus('loading');
    setLoginMessage('');
    setProfile(null);
    setAssignments([]);

    try {
      const foundProfile = await findProfileByIdentifier(identifier, displayLocale);

      if (!foundProfile) {
        setLoginStatus('error');
        setLoginMessage(isAr ? 'لم يتم العثور على هذا الرمز. تأكد من كتابته كما وصلك.' : 'Identifier not found. Make sure you entered it exactly as received.');
        return;
      }

      setProfile(foundProfile);
      setLoginStatus('success');
      setLoginMessage('');

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SAVED_IDENTIFIER_STORAGE_KEY, identifier);
      }
    } catch (error) {
      console.error('Identifier login failed:', error);
      setLoginStatus('error');
      setLoginMessage(isAr ? 'تعذر تسجيل الدخول الآن. حاول مرة أخرى.' : 'Could not log in right now. Please try again.');
    }
  };

  const handleLogout = () => {
    setProfile(null);
    setAssignments([]);
    setSearchTerm('');
    setSelectedAssignment(null);
    setLoginStatus('idle');
    setLoginMessage('');

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SAVED_IDENTIFIER_STORAGE_KEY);
    }
  };

  return (
    <>
      <div
        dir={dir}
        className="min-h-screen bg-[#fbf7f2] px-4 py-6 text-[#2b1717]"
        style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 sm:p-7 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8aaaa] bg-[#f8eeee] px-4 py-2 text-[#7a1717]">
                  <ShieldCheck size={18} />
                  <span>{isAr ? 'بوابة نمو الأشخاص' : 'People Development Portal'}</span>
                </div>
                <h1 className="text-3xl font-black leading-tight text-[#7a1717] sm:text-4xl">
                  {isAr ? 'ملاحظات وتكليفات مجموعتك' : 'Your Group Notes & Assignments'}
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-[#6b4b4b]">
                  {isAr
                    ? 'سجل الدخول باستخدام رمز العبور الشخصي الخاص بك لعرض ملاحظات وتكليفات المجموعة التي تم تعيينك فيها.'
                    : 'Log in with your personal identifier to view the notes and assignments for your assigned group.'}
                </p>
              </div>

              <div className="rounded-3xl border border-[#ead9d0] bg-white p-4 text-center shadow-sm md:min-w-[180px]">
                <Users className="mx-auto mb-2 text-[#7a1717]" size={32} />
                <div className="text-sm uppercase tracking-widest text-[#7a1717]/70">
                  {isAr ? 'خاص بالمخدومين' : 'Congregation Side'}
                </div>
              </div>
            </div>
          </header>

          {!profile && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7"
            >
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#7a1717] text-white">
                  <LockKeyhole size={25} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#7a1717]">
                    {isAr ? 'تسجيل الدخول بالرمز الشخصي' : 'Identifier Login'}
                  </h2>
                  <p className="mt-1 text-[#6b4b4b]">
                    {isAr
                      ? 'اكتب رمز العبور الشخصي الذي وصلك بعد تعبئة النموذج.'
                      : 'Enter the personal identifier you received after completing the form.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#7a1717]/70">
                    <Hash size={16} />
                    {isAr ? 'رمز العبور الشخصي' : 'Personal Identifier'}
                  </label>
                  <input
                    required
                    value={identifierInput}
                    onChange={event => setIdentifierInput(event.target.value)}
                    placeholder={isAr ? 'اكتب الرمز هنا...' : 'Enter your identifier...'}
                    className="w-full rounded-2xl border-2 border-[#ead9d0] bg-white px-4 py-4 text-lg font-black text-[#2b1717] outline-none placeholder:text-[#9b7b7b] focus:border-[#7a1717] focus:ring-2 focus:ring-[#7a1717]/20"
                  />
                </div>

                {loginMessage && (
                  <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <XCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{loginMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginStatus === 'loading'}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a1717] px-5 py-4 text-lg font-black text-white shadow-lg shadow-[#7a1717]/10 transition-all hover:bg-[#5e1010] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginStatus === 'loading' ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {isAr ? 'جار التحقق...' : 'Checking...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      {isAr ? 'دخول' : 'Access My Group'}
                    </>
                  )}
                </button>
              </form>
            </motion.section>
          )}

          {profile && (
            <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <section className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f8eeee] text-[#7a1717]">
                      <User size={25} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black text-[#7a1717]">
                        {profile.fullName || (isAr ? 'مرحباً' : 'Welcome')}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#ead9d0] bg-white px-3 py-1 text-sm text-[#6b4b4b]">
                          {profile.identifier}
                        </span>
                        {profile.email && (
                          <span className="rounded-full border border-[#ead9d0] bg-white px-3 py-1 text-sm text-[#6b4b4b]">
                            {profile.email}
                          </span>
                        )}
                        {profile.primaryGift && (
                          <span className="rounded-full border border-[#d8aaaa] bg-[#f8eeee] px-3 py-1 text-sm text-[#7a1717]">
                            {profile.primaryGift}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8aaaa] bg-[#f8eeee] px-5 py-3 text-[#7a1717] transition-colors hover:bg-[#efd8d8]"
                  >
                    <LogOut size={18} />
                    {isAr ? 'تسجيل خروج' : 'Log out'}
                  </button>
                </div>
              </section>

              {!profile.group && (
                <section className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                      <Clock size={28} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">
                        {isAr ? 'لم يتم تعيينك في مجموعة بعد' : 'You are not assigned to a group yet'}
                      </h3>
                      <p className="mt-2 leading-relaxed">
                        {isAr
                          ? 'تم التعرف على رمزك الشخصي، لكن لم يتم تعيينك في إحدى مجموعات نمو الأشخاص بعد. عندما يقوم Pastor بتعيينك، ستظهر ملاحظات وتكليفات مجموعتك هنا تلقائياً.'
                          : 'Your identifier was recognized, but you have not been assigned to a People Development group yet. Once Pastor assigns you, your group notes and assignments will appear here automatically.'}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {profile.group && groupConfig && (
                <>
                  <section className={`rounded-3xl border-2 p-5 shadow-sm sm:p-7 ${groupConfig.cardClass}`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-2 text-sm font-black">
                          <Users size={17} />
                          {isAr ? 'مجموعتك الحالية' : 'Your Assigned Group'}
                        </div>
                        <h3 className="text-4xl font-black leading-none">
                          {groupLabel}
                        </h3>
                        <p className="mt-3 max-w-2xl text-base leading-relaxed opacity-85">
                          {groupDescription}
                        </p>
                      </div>

                      <div className={`rounded-3xl px-5 py-4 text-center shadow-sm ${groupConfig.accentClass}`}>
                        <BookOpen className="mx-auto mb-2" size={28} />
                        <div className="text-3xl font-black">{assignments.length}</div>
                        <div className="text-sm uppercase tracking-widest opacity-90">
                          {isAr ? 'ملاحظات' : 'Notes'}
                        </div>
                      </div>
                    </div>
                  </section>

                  {latestAssignment && (
                    <section className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                      <div className="mb-3 flex items-center gap-2 text-[#7a1717]">
                        <MessageSquare size={20} />
                        <h3 className="text-xl font-black">{isAr ? 'أحدث ملاحظة أو تكليف' : 'Latest Note or Assignment'}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAssignment(latestAssignment)}
                        className="block w-full rounded-2xl border-2 border-[#ead9d0] bg-white p-4 text-start transition-colors hover:border-[#7a1717]/30 hover:bg-[#f8eeee]"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#7a1717]/70">
                          <Clock size={15} />
                          <span>{formatDateLabel(latestAssignment.date || latestAssignment.createdAtISO, latestAssignment.createdAt, displayLocale)}</span>
                        </div>
                        <p className="line-clamp-4 whitespace-pre-wrap text-[#2b1717]">
                          {latestAssignment.text}
                        </p>
                      </button>
                    </section>
                  )}

                  <section className="rounded-3xl border border-[#ead9d0] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-2xl font-black text-[#7a1717]">
                          {isAr ? 'كل ملاحظات وتكليفات المجموعة' : 'All Group Notes & Assignments'}
                        </h3>
                        <p className="mt-1 text-[#6b4b4b]">
                          {isAr
                            ? 'هذه الملاحظات مرتبطة بالمجموعة التي تم تعيينك فيها.'
                            : 'These notes are tied to the group you are currently assigned to.'}
                        </p>
                      </div>

                      <div className="relative w-full lg:w-[320px]">
                        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[#9b7b7b]" size={18} />
                        <input
                          value={searchTerm}
                          onChange={event => setSearchTerm(event.target.value)}
                          placeholder={isAr ? 'بحث في الملاحظات...' : 'Search notes...'}
                          className="w-full rounded-2xl border-2 border-[#ead9d0] bg-white py-3 ps-11 pe-4 text-[#2b1717] outline-none focus:border-[#7a1717] focus:ring-2 focus:ring-[#7a1717]/20"
                        />
                      </div>
                    </div>

                    {assignmentsLoading ? (
                      <div className="rounded-2xl border border-[#ead9d0] bg-stone-50 p-8 text-center text-[#7a1717]">
                        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#7a1717]/25 border-t-[#7a1717]" />
                        {isAr ? 'جار تحميل الملاحظات...' : 'Loading notes...'}
                      </div>
                    ) : filteredAssignments.length === 0 ? (
                      <div className="rounded-2xl border border-[#ead9d0] bg-stone-50 p-8 text-center text-[#6b4b4b]">
                        <BookOpen className="mx-auto mb-3 text-[#7a1717]" size={34} />
                        <h4 className="text-xl font-black text-[#7a1717]">
                          {searchTerm ? (isAr ? 'لا توجد نتائج' : 'No matching notes') : (isAr ? 'لا توجد ملاحظات بعد' : 'No notes yet')}
                        </h4>
                        <p className="mt-2">
                          {searchTerm
                            ? (isAr ? 'جرّب كلمة بحث مختلفة.' : 'Try a different search term.')
                            : (isAr ? 'عندما يضيف Pastor ملاحظات أو تكليفات لهذه المجموعة، ستظهر هنا.' : 'When Pastor posts notes or assignments for this group, they will appear here.')}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {filteredAssignments.map(assignment => (
                          <button
                            key={assignment.id}
                            type="button"
                            onClick={() => setSelectedAssignment(assignment)}
                            className="rounded-2xl border-2 border-[#ead9d0] bg-white p-4 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#7a1717]/30 hover:bg-[#f8eeee] hover:shadow-md"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <span className={`rounded-full border px-3 py-1 text-sm font-black ${groupConfig.badgeClass}`}>
                                {assignment.groupLabel || groupLabel}
                              </span>
                              <span className="inline-flex items-center gap-1 text-sm text-[#7a1717]/65">
                                <Clock size={14} />
                                {formatDateLabel(assignment.date || assignment.createdAtISO, assignment.createdAt, displayLocale)}
                              </span>
                            </div>
                            <p className="line-clamp-5 whitespace-pre-wrap leading-relaxed text-[#2b1717]">
                              {assignment.text}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </motion.main>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedAssignment && (
          <motion.div
            key="group-note-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md"
            onClick={() => setSelectedAssignment(null)}
            dir={dir}
            style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700 }}
          >
            <motion.div
              key="group-note-popup-panel"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[#ead9d0] bg-[#fffdf9] font-bold shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="relative bg-[#7a1717] px-6 py-5 text-white">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="absolute top-4 end-4 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 pe-10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">
                      {isAr ? 'ملاحظة أو تكليف المجموعة' : 'Group Note or Assignment'}
                    </h3>
                    <p className="mt-1 text-base text-white/90">
                      {formatDateLabel(selectedAssignment.date || selectedAssignment.createdAtISO, selectedAssignment.createdAt, displayLocale)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[62vh] overflow-y-auto p-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  {groupConfig && (
                    <span className={`rounded-full border px-3 py-1 text-sm font-black ${groupConfig.badgeClass}`}>
                      {selectedAssignment.groupLabel || groupLabel}
                    </span>
                  )}
                  <span className="rounded-full border border-[#ead9d0] bg-white px-3 py-1 text-sm text-[#6b4b4b]">
                    {selectedAssignment.id}
                  </span>
                </div>

                <div className="rounded-2xl border border-[#ead9d0] bg-white p-5">
                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-[#2b1717]">
                    {selectedAssignment.text}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="mt-5 w-full rounded-2xl bg-[#7a1717] px-5 py-3 text-white transition-colors hover:bg-[#5e1010]"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
