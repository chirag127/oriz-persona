/** IndexedDB-backed persona store via idb-keyval. Browser-only. */
import { get, del, update } from 'idb-keyval';
import type { Persona } from './persona';

const KEY = 'oriz-persona:characters';

export async function loadAll(): Promise<Persona[]> {
  const list = (await get<Persona[]>(KEY)) ?? [];
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveOne(p: Persona): Promise<void> {
  await update<Persona[]>(KEY, (cur) => {
    const list = cur ?? [];
    const i = list.findIndex((x) => x.id === p.id);
    if (i >= 0) list[i] = p;
    else list.push(p);
    return list;
  });
}

export async function removeOne(id: string): Promise<void> {
  await update<Persona[]>(KEY, (cur) => (cur ?? []).filter((x) => x.id !== id));
}

export async function clearAll(): Promise<void> {
  await del(KEY);
}

export async function exportJson(): Promise<string> {
  return JSON.stringify(await loadAll(), null, 2);
}

export async function importJson(json: string): Promise<number> {
  const parsed = JSON.parse(json);
  const arr: Persona[] = Array.isArray(parsed) ? parsed : [parsed];
  await update<Persona[]>(KEY, (cur) => {
    const list = cur ?? [];
    for (const p of arr) {
      if (!p || typeof p.name !== 'string') continue;
      const i = list.findIndex((x) => x.id === p.id);
      if (i >= 0) list[i] = p;
      else list.push(p);
    }
    return list;
  });
  return arr.length;
}
