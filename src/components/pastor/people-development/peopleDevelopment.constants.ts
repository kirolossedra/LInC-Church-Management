
import type { PeopleDevelopmentGroupId } from './peopleDevelopment.types';

export const PEOPLE_DEVELOPMENT_ROOT = 'peopleDevelopment';

export const MAX_PEOPLE_ASSIGNMENT_PDF_SIZE_BYTES = 1024 * 1024;

export interface PeopleDevelopmentGroupDefinition {
  id: PeopleDevelopmentGroupId;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  cardClass: string;
  softClass: string;
  buttonClass: string;
  badgeClass: string;
}

export const PEOPLE_DEVELOPMENT_GROUPS: PeopleDevelopmentGroupDefinition[] = [
  {
    id: 'pastors',
    labelEn: 'Pastors',
    labelAr: 'الرعاة',
    descriptionEn: 'Care, shepherding, and spiritual follow-up',
    descriptionAr: 'رعاية، متابعة، واهتمام روحي',
    cardClass: 'bg-rose-50 border-rose-200 text-rose-800',
    softClass: 'bg-rose-50 border-rose-100 text-rose-800',
    buttonClass: 'bg-rose-700 hover:bg-rose-800 text-white',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    id: 'prophets',
    labelEn: 'Prophets',
    labelAr: 'الأنبياء',
    descriptionEn: 'Discernment, direction, and spiritual clarity',
    descriptionAr: 'تمييز، توجيه، ووضوح روحي',
    cardClass: 'bg-purple-50 border-purple-200 text-purple-800',
    softClass: 'bg-purple-50 border-purple-100 text-purple-800',
    buttonClass: 'bg-purple-700 hover:bg-purple-800 text-white',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'evangelists',
    labelEn: 'Evangelists',
    labelAr: 'المبشرون',
    descriptionEn: 'Outreach, invitation, and sharing faith',
    descriptionAr: 'خدمة خارجية، دعوة، ومشاركة الإيمان',
    cardClass: 'bg-amber-50 border-amber-200 text-amber-800',
    softClass: 'bg-amber-50 border-amber-100 text-amber-800',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'teachers',
    labelEn: 'Teachers',
    labelAr: 'المعلمون',
    descriptionEn: 'Teaching, explaining, and grounding people in truth',
    descriptionAr: 'تعليم، شرح، وتثبيت الناس في الحق',
    cardClass: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    softClass: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    buttonClass: 'bg-indigo-700 hover:bg-indigo-800 text-white',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    id: 'apostles',
    labelEn: 'Apostles',
    labelAr: 'الرسل',
    descriptionEn: 'Building, sending, and starting new work',
    descriptionAr: 'بناء، إرسال، وبدء أعمال جديدة',
    cardClass: 'bg-sky-50 border-sky-200 text-sky-800',
    softClass: 'bg-sky-50 border-sky-100 text-sky-800',
    buttonClass: 'bg-sky-700 hover:bg-sky-800 text-white',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  {
    id: 'helpers',
    labelEn: 'Helpers',
    labelAr: 'المساعدون',
    descriptionEn: 'Care, support, and practical service',
    descriptionAr: 'رعاية، دعم، وخدمة عملية',
    cardClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    softClass: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    buttonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'mercy',
    labelEn: 'Mercy',
    labelAr: 'الرحمة',
    descriptionEn: 'Compassion, comfort, and support for hurting people',
    descriptionAr: 'رحمة، تعزية، ومساندة للمتألمين',
    cardClass: 'bg-pink-50 border-pink-200 text-pink-800',
    softClass: 'bg-pink-50 border-pink-100 text-pink-800',
    buttonClass: 'bg-pink-700 hover:bg-pink-800 text-white',
    badgeClass: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  {
    id: 'facilitators',
    labelEn: 'Facilitators',
    labelAr: 'الميسّرون',
    descriptionEn: 'Organizing, connecting, and making ministry flow',
    descriptionAr: 'تنظيم، ربط، وتسهيل سير الخدمة',
    cardClass: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    softClass: 'bg-cyan-50 border-cyan-100 text-cyan-800',
    buttonClass: 'bg-cyan-700 hover:bg-cyan-800 text-white',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  {
    id: 'services',
    labelEn: 'Services',
    labelAr: 'الخدمات',
    descriptionEn: 'Practical ministry, operations, and serving needs',
    descriptionAr: 'خدمة عملية، تشغيل، وتلبية الاحتياجات',
    cardClass: 'bg-stone-50 border-stone-200 text-stone-800',
    softClass: 'bg-stone-50 border-stone-100 text-stone-800',
    buttonClass: 'bg-stone-700 hover:bg-stone-800 text-white',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-200',
  },
  {
    id: 'giving',
    labelEn: 'Giving',
    labelAr: 'العطاء',
    descriptionEn: 'Generosity, resources, and practical contribution',
    descriptionAr: 'سخاء، موارد، ومساهمة عملية',
    cardClass: 'bg-lime-50 border-lime-200 text-lime-800',
    softClass: 'bg-lime-50 border-lime-100 text-lime-800',
    buttonClass: 'bg-lime-700 hover:bg-lime-800 text-white',
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
  },
];
