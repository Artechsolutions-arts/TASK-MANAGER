export type PrefEntityType = 'project' | 'task' | 'team';

export interface PrefItem {
  id: string;
  label: string;
  path: string;
  updated_at: number; // ms
}

const MAX_ITEMS = 25;

function key(type: 'starred' | 'recent', entity: PrefEntityType, userId?: string | null) {
  return `taskfyi:${type}:${entity}:${userId || 'anon'}`;
}

function readList(k: string): PrefItem[] {
  try {
    const raw = localStorage.getItem(k);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(k: string, items: PrefItem[]) {
  try {
    localStorage.setItem(k, JSON.stringify(items.slice(0, MAX_ITEMS)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('prefs:changed'));
    }
  } catch {
    // ignore
  }
}

export function getStarred(entity: PrefEntityType, userId?: string | null): PrefItem[] {
  return readList(key('starred', entity, userId));
}

export function isStarred(entity: PrefEntityType, userId: string | null | undefined, id: string): boolean {
  return getStarred(entity, userId).some((x) => x.id === id);
}

export function toggleStarred(entity: PrefEntityType, userId: string | null | undefined, item: Omit<PrefItem, 'updated_at'>) {
  const k = key('starred', entity, userId);
  const list = readList(k);
  const exists = list.some((x) => x.id === item.id);
  const now = Date.now();
  const next = exists
    ? list.filter((x) => x.id !== item.id)
    : [{ ...item, updated_at: now }, ...list.filter((x) => x.id !== item.id).map((x) => ({ ...x }))];
  writeList(k, next);
  return !exists;
}

export function getRecent(entity: PrefEntityType, userId?: string | null): PrefItem[] {
  return readList(key('recent', entity, userId));
}

export function pushRecent(entity: PrefEntityType, userId: string | null | undefined, item: Omit<PrefItem, 'updated_at'>) {
  const k = key('recent', entity, userId);
  const list = readList(k);
  const now = Date.now();
  const next = [{ ...item, updated_at: now }, ...list.filter((x) => x.id !== item.id)];
  writeList(k, next);
}

