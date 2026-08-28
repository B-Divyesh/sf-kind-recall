import type { ExportBundle, Review, Word } from './types';

const DB_NAME = 'kind-recall';
const DB_VERSION = 1;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The device database could not be read.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The device database could not be updated.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('The device database update was cancelled.'));
  });
}

let openPromise: Promise<IDBDatabase> | undefined;

export function openDatabase(): Promise<IDBDatabase> {
  if (openPromise) return openPromise;
  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('words')) db.createObjectStore('words', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reviews')) {
        const reviews = db.createObjectStore('reviews', { keyPath: 'id' });
        reviews.createIndex('wordId', 'wordId');
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'wordId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Kind Recall could not open its on-device storage.'));
  });
  return openPromise;
}

export async function getWords(): Promise<Word[]> {
  const db = await openDatabase();
  const words = await requestResult(db.transaction('words').objectStore('words').getAll() as IDBRequest<Word[]>);
  return words.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveWord(word: Word): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('words', 'readwrite');
  transaction.objectStore('words').put(word);
  await transactionDone(transaction);
}

export async function deleteWord(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(['words', 'reviews', 'recordings'], 'readwrite');
  transaction.objectStore('words').delete(id);
  transaction.objectStore('recordings').delete(id);
  const index = transaction.objectStore('reviews').index('wordId');
  const cursorRequest = index.openKeyCursor(IDBKeyRange.only(id));
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (cursor) {
      transaction.objectStore('reviews').delete(cursor.primaryKey);
      cursor.continue();
    }
  };
  await transactionDone(transaction);
}

export async function addReview(review: Review): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('reviews', 'readwrite');
  transaction.objectStore('reviews').put(review);
  await transactionDone(transaction);
}

export async function getReviews(): Promise<Review[]> {
  const db = await openDatabase();
  return requestResult(db.transaction('reviews').objectStore('reviews').getAll() as IDBRequest<Review[]>);
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  const record = await requestResult(db.transaction('settings').objectStore('settings').get(key) as IDBRequest<{ key: string; value: T } | undefined>);
  return record?.value;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('settings', 'readwrite');
  transaction.objectStore('settings').put({ key, value });
  await transactionDone(transaction);
}

export async function saveRecording(wordId: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('recordings', 'readwrite');
  transaction.objectStore('recordings').put({ wordId, blob, createdAt: Date.now() });
  await transactionDone(transaction);
}

export async function getRecording(wordId: string): Promise<Blob | undefined> {
  const db = await openDatabase();
  const record = await requestResult(db.transaction('recordings').objectStore('recordings').get(wordId) as IDBRequest<{ wordId: string; blob: Blob } | undefined>);
  return record?.blob;
}

export async function countRecordings(): Promise<number> {
  const db = await openDatabase();
  return requestResult(db.transaction('recordings').objectStore('recordings').count());
}

export async function exportBundle(): Promise<ExportBundle> {
  return {
    format: 'kind-recall',
    version: 1,
    exportedAt: new Date().toISOString(),
    words: await getWords(),
    reviews: await getReviews()
  };
}

function isWord(value: unknown): value is Word {
  if (!value || typeof value !== 'object') return false;
  const word = value as Partial<Word>;
  return typeof word.id === 'string' && typeof word.term === 'string' && typeof word.meaning === 'string' && typeof word.context === 'string' && typeof word.createdAt === 'number' && typeof word.dueAt === 'number';
}

export async function importBundle(value: unknown): Promise<number> {
  if (!value || typeof value !== 'object') throw new Error('This file is not a Kind Recall export.');
  const bundle = value as Partial<ExportBundle>;
  if (bundle.format !== 'kind-recall' || bundle.version !== 1 || !Array.isArray(bundle.words) || !bundle.words.every(isWord)) {
    throw new Error('This file is not a supported Kind Recall export. Choose the JSON file created by Export data.');
  }
  const db = await openDatabase();
  const transaction = db.transaction(['words', 'reviews'], 'readwrite');
  for (const word of bundle.words) transaction.objectStore('words').put(word);
  if (Array.isArray(bundle.reviews)) {
    for (const review of bundle.reviews) {
      if (review && typeof review === 'object' && typeof (review as Review).id === 'string') transaction.objectStore('reviews').put(review);
    }
  }
  await transactionDone(transaction);
  return bundle.words.length;
}
