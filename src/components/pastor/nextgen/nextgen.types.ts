export type NextGenLocale =
  | 'en'
  | 'ar';

export type NextGenRegistrationStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type NextGenRegistrationStatusFilter =
  | 'all'
  | NextGenRegistrationStatus;

export interface NextGenRegistration {
  userId: string;
  fullName: string;
  email: string;
  status: NextGenRegistrationStatus;
  source: string;
  createdAt: number;
  createdAtISO: string;
  createdAtEasternTime: string;
  updatedAt: number;
  updatedAtISO: string;
  reviewedAt?: number;
  reviewedAtISO?: string;
  reviewedBy?: string;
}

export interface NextGenVerse {
  reference: string;
  text: string;
}

export interface NextGenQuestion {
  id: string;
  question: string;
  category: string;
  verses: NextGenVerse[];
  notes: string;
  status: string;
  source: string;
  translation: string;
  totalUpvotes: number;
  totalDownvotes: number;
  netVotes: number;
  createdAt: number;
  updatedAt: number;
}

export type NextGenSurveyBinaryQuestionId =
  | 'questionAnnouncement'
  | 'postSessionMaterials'
  | 'categoryStructure'
  | 'subtopicStructure'
  | 'sessionBalance'
  | 'answerDepth'
  | 'questionSelection'
  | 'summaryLength';

export type NextGenSurveyRatingQuestionId =
  | 'pastorClarity'
  | 'pastorDepth'
  | 'pastorEngagement';

export type NextGenSurveyBinaryAnswer =
  | 'A'
  | 'B';

export type NextGenSurveyRatingValue =
  | 1
  | 2
  | 3
  | 4
  | 5;

export interface NextGenSurveyBinaryQuestionDefinition {
  id: NextGenSurveyBinaryQuestionId;
  questionEn: string;
  questionAr: string;
  optionAEn: string;
  optionAAr: string;
  optionBEn: string;
  optionBAr: string;
}

export interface NextGenSurveyRatingQuestionDefinition {
  id: NextGenSurveyRatingQuestionId;
  questionEn: string;
  questionAr: string;
}

export interface NextGenSurveyBinaryAggregate {
  totalResponses: number;

  counts: Record<
    NextGenSurveyBinaryAnswer,
    number
  >;
}

export interface NextGenSurveyRatingAggregate {
  totalResponses: number;

  counts: Record<
    NextGenSurveyRatingValue,
    number
  >;

  average: number;
}

export interface NextGenSurveyAggregateResults {
  totalResponses: number;

  binaryQuestions: Record<
    NextGenSurveyBinaryQuestionId,
    NextGenSurveyBinaryAggregate
  >;

  pastorQualityRatings: Record<
    NextGenSurveyRatingQuestionId,
    NextGenSurveyRatingAggregate
  >;
}

export interface UpdateNextGenRegistrationStatusParams {
  registration: NextGenRegistration;
  nextStatus: Exclude<
    NextGenRegistrationStatus,
    'pending'
  >;
  reviewedBy?: string;
}

export interface UpdateNextGenQuestionSelectionParams {
  question: NextGenQuestion;
  selected: boolean;
}

export interface NextGenQuestionsSectionProps {
  questions: NextGenQuestion[];
  expanded: boolean;
  loadingQuestionId: string | null;
  locale: NextGenLocale;
  onToggleExpanded: () => void;

  onSelectionChange: (
    question: NextGenQuestion,
    selected: boolean,
  ) => Promise<void> | void;
}

export interface NextGenRegistrationsSectionProps {
  registrations: NextGenRegistration[];
  expanded: boolean;
  searchTerm: string;
  statusFilter: NextGenRegistrationStatusFilter;
  updatingUserId: string | null;
  locale: NextGenLocale;
  onToggleExpanded: () => void;

  onSearchTermChange: (
    value: string,
  ) => void;

  onStatusFilterChange: (
    value: NextGenRegistrationStatusFilter,
  ) => void;

  onStatusChange: (
    registration: NextGenRegistration,
    nextStatus: Exclude<
      NextGenRegistrationStatus,
      'pending'
    >,
  ) => Promise<void> | void;
}

export interface NextGenSurveyResultsSectionProps {
  results: NextGenSurveyAggregateResults;
  expanded: boolean;
  loading: boolean;
  error: string;
  locale: NextGenLocale;
  onToggleExpanded: () => void;
}
