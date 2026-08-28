export type Confidence = 1 | 2 | 3 | 4;

export interface Word {
  id: string;
  term: string;
  meaning: string;
  context: string;
  createdAt: number;
  updatedAt: number;
  dueAt: number;
  intervalDays: number;
  reviewCount: number;
}

export interface Review {
  id: string;
  wordId: string;
  createdAt: number;
  response: string;
  correct: boolean;
  confidence: Confidence;
  previousIntervalDays: number;
  nextIntervalDays: number;
}

export interface ExportBundle {
  format: 'kind-recall';
  version: 1;
  exportedAt: string;
  words: Word[];
  reviews: Review[];
}
