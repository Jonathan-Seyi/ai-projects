import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const STATUSES = new Set(['todo', 'doing', 'done']);

function validateSnapshot(value) {
  if (!Array.isArray(value) || value.some(task =>
    !task || typeof task !== 'object' || Array.isArray(task) ||
    typeof task.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(task.id) ||
    typeof task.title !== 'string' || !task.title.trim() || task.title.length > 120 ||
    !STATUSES.has(task.status) ||
    typeof task.createdAt !== 'string' || !Number.isFinite(Date.parse(task.createdAt)) ||
    typeof task.updatedAt !== 'string' || !Number.isFinite(Date.parse(task.updatedAt))
  )) throw new Error('Invalid task snapshot: expected an array of valid tasks');
  if (new Set(value.map(task => task.id)).size !== value.length) {
    throw new Error('Invalid task snapshot: duplicate task IDs');
  }
  return value;
}

/** Single-process JSON persistence with atomic replacement of snapshots. */
export function createFileTaskStore(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('filePath is required');
  const path = resolve(filePath);
  const initial = existsSync(path) ? validateSnapshot(JSON.parse(readFileSync(path, 'utf8'))) : [];
  const tasks = new Map(initial.map(task => [task.id, { ...task }]));

  function persist(next) {
    mkdirSync(dirname(path), { recursive: true });
    const temporary = path + '.' + process.pid + '.' + randomUUID() + '.tmp';
    try {
      writeFileSync(temporary, JSON.stringify([...next.values()], null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      renameSync(temporary, path);
    } catch (error) {
      try { unlinkSync(temporary); } catch { /* No temporary file to clean up. */ }
      throw error;
    }
  }

  function change(mutator) {
    const next = new Map(tasks);
    const result = mutator(next);
    persist(next);
    tasks.clear();
    for (const [id, task] of next) tasks.set(id, task);
    return result;
  }

  return {
    list() { return [...tasks.values()].map(task => ({ ...task })); },
    get(id) { const task = tasks.get(id); return task ? { ...task } : null; },
    create(input) {
      const now = new Date().toISOString();
      const task = { id: randomUUID(), title: input.title, status: input.status ?? 'todo', createdAt: now, updatedAt: now };
      return change(next => { next.set(task.id, task); return { ...task }; });
    },
    update(id, input) {
      const previous = tasks.get(id);
      if (!previous) return null;
      const task = { ...previous, ...input, updatedAt: new Date().toISOString() };
      return change(next => { next.set(id, task); return { ...task }; });
    },
    remove(id) {
      if (!tasks.has(id)) return false;
      return change(next => next.delete(id));
    },
  };
}
