export type EntryMode = 'signup' | 'existing' | 'mission-map' | null;
export type NextGenUserStatus = 'pending' | 'approved' | 'rejected';
export type VoteType = 'upvote' | 'downvote';
export type SurveyBinaryAnswer = '' | 'A' | 'B';
export type SurveyRatingAnswer = '' | 1 | 2 | 3 | 4 | 5;

export type BinarySurveyQuestionId =
  | 'questionAnnouncement'
  | 'postSessionMaterials'
  | 'categoryStructure'
  | 'subtopicStructure'
  | 'sessionBalance'
  | 'answerDepth'
  | 'questionSelection'
  | 'summaryLength';

export type RatingSurveyQuestionId = 'pastorClarity' | 'pastorDepth' | 'pastorEngagement';

export interface QASessionForm {
  question: string;
  category: string;
  notes: string;
}

export interface SignupForm {
  fullName: string;
  email: string;
  userId: string;
}

export interface SurveyAnswers {
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

export interface BinarySurveyQuestion {
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

export interface RatingSurveyQuestion {
  id: RatingSurveyQuestionId;
  questionEn: string;
  questionAr: string;
}

export interface NextGenUserRecord {
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

export interface RegistrationReceipt {
  fullName: string;
  userId: string;
  createdAt: number;
}

export interface SavedQASession {
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
