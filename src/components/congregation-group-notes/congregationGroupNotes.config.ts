import type {
  PeopleDevelopmentGroupConfig,
  PeopleDevelopmentGroupId,
} from './congregationGroupNotes.types';

export const PEOPLE_DEVELOPMENT_ROOT = 'peopleDevelopment';
export const SAVED_IDENTIFIER_STORAGE_KEY = 'lincPeopleDevelopmentIdentifier';

export const PEOPLE_DEVELOPMENT_GROUPS: PeopleDevelopmentGroupConfig[] = [
  {
    id: 'pastors',
    labelEn: 'Pastors',
    labelAr: 'الرعاة',
    descriptionEn: 'Care, shepherding, and spiritual follow-up',
    descriptionAr: 'رعاية، متابعة، واهتمام روحي',
    cardClass: 'bg-rose-50 border-rose-200 text-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    accentClass: 'bg-rose-700 text-white',
  },
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
    id: 'teachers',
    labelEn: 'Teachers',
    labelAr: 'المعلمون',
    descriptionEn: 'Teaching, explaining, and grounding people in truth',
    descriptionAr: 'تعليم، شرح، وتثبيت الناس في الحق',
    cardClass: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    accentClass: 'bg-indigo-700 text-white',
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
    id: 'mercy',
    labelEn: 'Mercy',
    labelAr: 'الرحمة',
    descriptionEn: 'Compassion, comfort, and support for hurting people',
    descriptionAr: 'رحمة، تعزية، ومساندة للمتألمين',
    cardClass: 'bg-pink-50 border-pink-200 text-pink-800',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
    accentClass: 'bg-pink-700 text-white',
  },
  {
    id: 'facilitators',
    labelEn: 'Facilitators',
    labelAr: 'الميسّرون',
    descriptionEn: 'Organizing, connecting, and making ministry flow',
    descriptionAr: 'تنظيم، ربط، وتسهيل سير الخدمة',
    cardClass: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    accentClass: 'bg-cyan-700 text-white',
  },
  {
    id: 'services',
    labelEn: 'Services',
    labelAr: 'الخدمات',
    descriptionEn: 'Practical ministry, operations, and serving needs',
    descriptionAr: 'خدمة عملية، تشغيل، وتلبية الاحتياجات',
    cardClass: 'bg-stone-50 border-stone-200 text-stone-800',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-200',
    accentClass: 'bg-stone-700 text-white',
  },
  {
    id: 'giving',
    labelEn: 'Giving',
    labelAr: 'العطاء',
    descriptionEn: 'Generosity, resources, and practical contribution',
    descriptionAr: 'سخاء، موارد، ومساهمة عملية',
    cardClass: 'bg-lime-50 border-lime-200 text-lime-800',
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
    accentClass: 'bg-lime-700 text-white',
  },
];

export function getGroupConfig(groupId: PeopleDevelopmentGroupId | ''): PeopleDevelopmentGroupConfig | null {
  if (!groupId) return null;
  return PEOPLE_DEVELOPMENT_GROUPS.find(group => group.id === groupId) || null;
}

export function getGroupLabel(groupId: PeopleDevelopmentGroupId | '', displayLocale: 'en' | 'ar'): string {
  const config = getGroupConfig(groupId);
  if (!config) return '';
  return displayLocale === 'ar' ? config.labelAr : config.labelEn;
}

export function getGroupDescription(groupId: PeopleDevelopmentGroupId | '', displayLocale: 'en' | 'ar'): string {
  const config = getGroupConfig(groupId);
  if (!config) return '';
  return displayLocale === 'ar' ? config.descriptionAr : config.descriptionEn;
}

