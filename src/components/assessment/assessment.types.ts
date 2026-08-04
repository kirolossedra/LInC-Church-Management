export type Lang = 'en' | 'ar';
export type AnswerValue = string | number;
export type Answers = Record<string, AnswerValue>;
export type LocalText = { en?: string; ar?: string };
export type CalculationValue = Record<string, number> | RankedItem[] | ResultItem | null;
export type AssessmentFormAvailability = 'active' | 'disabled' | 'hidden';

export interface FieldDef {
  id: string;
  type: string;
  required?: boolean;
  default?: string | number;
  labelKey?: string;
  label?: LocalText;
  result?: LocalText;
}

export interface GroupDef {
  id: string;
  titleKey?: string;
  title?: LocalText;
  result?: LocalText;
  fields?: FieldDef[];
}

export interface SectionDef {
  id: string;
  type: 'fields' | 'groupedRating' | 'ratingList';
  titleKey?: string;
  title?: LocalText;
  layout?: 'twoColumns' | 'singleColumn';
  guideKeys?: string[];
  guide?: LocalText;
  ratingScale?: { min?: number; max?: number };
  fields?: FieldDef[];
  groups?: GroupDef[];
}

export interface CalculationDef {
  id: string;
  type: 'sumGroups' | 'fieldScores' | 'rankGroups' | 'rankFields' | 'topGroup' | 'topField';
  sourceSection?: string;
  sourceCalculation?: string;
  order?: 'ascending' | 'descending';
  rank?: number;
}

export interface ResultCardDef {
  id: string;
  labelKey?: string;
  label?: LocalText;
  valueFrom?: string;
}

export interface ScoreBlockDef {
  id: string;
  titleKey?: string;
  title?: LocalText;
  sourceCalculation: string;
  maxScore?: number;
}

export interface FormDef {
  id: string;
  status?: string;
  firebase?: { path?: string; tableNameEquivalent?: string };
  page?: { titleKey?: string; subtitleKey?: string; confidentialKey?: string; title?: LocalText; subtitle?: LocalText };
  card?: { titleKey?: string; descriptionKey?: string; title?: LocalText; description?: LocalText };
  email?: { enabled?: boolean; recipients?: string[]; includeSubmitter?: boolean; subject?: LocalText };
  defaults?: { timezone?: string; ratingScale?: { min?: number; max?: number } };
  sections: SectionDef[];
  validation?: { errorKey?: string };
  calculations?: CalculationDef[];
  results?: {
    display?: {
      titleKey?: string;
      title?: LocalText;
      summary?: LocalText;
      cards?: ResultCardDef[];
      scoreBlocks?: ScoreBlockDef[];
      interpretation?: LocalText | { en?: string[]; ar?: string[] };
    };
  };
}

export interface RankedItem {
  id: string;
  score: number;
}

export interface ResultItem {
  id: string;
  score: number;
  result?: LocalText;
  label?: LocalText;
  labelKey?: string;
  title?: LocalText;
  titleKey?: string;
  sourceSection?: string;
  sourceType: 'group' | 'field';
}

export interface RuntimeResult {
  calculations: Record<string, CalculationValue>;
  cardValues: Record<string, string>;
  summary: string;
}


