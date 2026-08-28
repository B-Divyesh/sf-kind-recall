import { describe, expect, it } from 'vitest';
import { buildQueue, DAY, isReturnVisit, nextInterval, normalizeAnswer, scheduleWord } from './scheduler';
import type { Word } from './types';

const makeWord = (id: string, dueAt = 0): Word => ({ id, term: id, meaning: 'meaning', context: 'A ___ here.', createdAt: Number(id) || 1, updatedAt: 1, dueAt, intervalDays: 0, reviewCount: 0 });

describe('forgiving scheduler', () => {
  it('starts from confidence-specific intervals', () => {
    expect(nextInterval(0, true, 1)).toBe(1);
    expect(nextInterval(0, true, 4)).toBe(7);
    expect(nextInterval(8, false, 4)).toBe(1);
  });

  it('grows established intervals and caps them', () => {
    expect(nextInterval(8, true, 3)).toBe(16);
    expect(nextInterval(60, true, 4)).toBe(90);
  });

  it('builds a five-item oldest-first return queue after a week', () => {
    const now = 20 * DAY;
    const words = Array.from({ length: 8 }, (_, index) => makeWord(String(index + 1), index * DAY));
    expect(isReturnVisit(now - 8 * DAY, now)).toBe(true);
    expect(buildQueue(words, now - 8 * DAY, now).map((word) => word.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('does not include future words', () => {
    const now = 10 * DAY;
    expect(buildQueue([makeWord('1', now - 1), makeWord('2', now + DAY)], now - DAY, now)).toHaveLength(1);
  });

  it('keeps correctness separate from confidence in scheduling', () => {
    const word = { ...makeWord('1'), intervalDays: 6, reviewCount: 2 };
    const result = scheduleWord(word, false, 4, 1000);
    expect(result.intervalDays).toBe(1);
    expect(result.reviewCount).toBe(3);
    expect(result.dueAt).toBe(1000 + DAY);
  });

  it('normalizes harmless punctuation and case', () => {
    expect(normalizeAnswer('  ¡SOBREMESA! ')).toBe('sobremesa');
  });
});
