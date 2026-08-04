import type { BinarySurveyQuestion, RatingSurveyQuestion } from './nextGenActivities.types';

export const CATEGORY_OPTIONS = [
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

export const NEXTGEN_USERS_PATH = 'nextGenUsers';
export const NEXTGEN_ACTIVITIES_PATH = 'nextGenActivities';
export const NEXTGEN_SURVEY_ID = 'qaSessionFeedbackFirstTwoSessionsV1';
export const NEXTGEN_ID_PATTERN = /^[A-Z0-9]{4}$/;

export const BINARY_SURVEY_QUESTIONS: BinarySurveyQuestion[] = [
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

export const RATING_SURVEY_QUESTIONS: RatingSurveyQuestion[] = [
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

export const SURVEY_TOTAL_QUESTIONS = BINARY_SURVEY_QUESTIONS.length + RATING_SURVEY_QUESTIONS.length;
