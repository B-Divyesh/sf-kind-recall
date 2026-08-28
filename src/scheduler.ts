import type { Confidence, Word } from './types';

export const DAY = 86_400_000;
export const RETURN_AFTER = 7 * DAY;

export function nextInterval(previous: number, correct: boolean, confidence: Confidence): number {
  if (!correct) return 1;
  const first: Record<Confidence, number> = { 1: 1, 2: 2, 3: 4, 4: 7 };
  if (previous < 1) return first[confidence];
  const factor: Record<Confidence, number> = { 1: 1, 2: 1.5, 3: 2, 4: 2.5 };
  return Math.min(90, Math.max(1, Math.round(previous * factor[confidence])));
}

export function scheduleWord(word: Word, correct: boolean, confidence: Confidence, now = Date.now()): Word {
  const intervalDays = nextInterval(word.intervalDays, correct, confidence);
  return {
    ...word,
    intervalDays,
    dueAt: now + intervalDays * DAY,
    updatedAt: now,
    reviewCount: word.reviewCount + 1
  };
}

export function isReturnVisit(lastStudyAt: number | undefined, now = Date.now()): boolean {
  return Boolean(lastStudyAt && now - lastStudyAt >= RETURN_AFTER);
}

export function buildQueue(words: Word[], lastStudyAt: number | undefined, now = Date.now()): Word[] {
  const due = words.filter((word) => word.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt || a.createdAt - b.createdAt);
  return due.slice(0, isReturnVisit(lastStudyAt, now) ? 5 : 10);
}

export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().trim().replace(/[.!?¿¡,;:'“”"()]/g, '').replace(/\s+/g, ' ');
}
