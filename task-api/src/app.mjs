import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { parseTaskQuery, queryTasks } from './task-query.mjs';

const MAX_BODY_BYTES = 16 * 1024;
const STATUSES = new Set(['todo', 'doing', 'done']);

export function createTaskStore() {
  const tasks = new Map();
  return {
    list() { return [...tasks.values()].map(task => ({ ...task })); },
    get(id) { const task = tasks.get(id); return task && { ...task }; },
    create(input) {
      const now = new Date().toISOString();
      const task = { id: randomUUID(), title: input.title, status: input.status ?? 'todo', createdAt: now, updatedAt: now };
      tasks.set(task.id, task);
      return { ...task };
    },
    update(id, input) {
      const previous = tasks.get(id);
      if (!previous) return null;
      const task = { ...previous, ...input, updatedAt: new Date().toISOString() };
      tasks.set(id, task);
      return { ...task };
    },
    remove(id) { return tasks.delete(id); },
  };
}

function send(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(body);
}

function validateTask(value, partial = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Expected a JSON object';
  const keys = Object.keys(value);
  if (keys.some(key => !['title', 'status'].includes(key))) return 'Unknown field';
  if (partial && !keys.length) return 'Provide at least one field';
  if ((!partial || 'title' in value) && (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 120)) {
    return 'title must be 1-120 nonblank characters';
  }
  if ('status' in value && !STATUSES.has(value.status)) return 'status must be todo, doing, or done';
  return null;
}

async function readJson(req) {
  const type = req.headers['content-type'] ?? '';
  if (!/^application\/json(?:\s*;|$)/i.test(type)) throw { status: 415, message: 'Content-Type must be application/json' };
  let bytes = 0;
  let oversized = false;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      oversized = true;
      continue; // Drain the request before responding to avoid a connection reset.
    }
    chunks.push(chunk);
  }
  if (oversized) throw { status: 413, message: 'Request body too large' };
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw { status: 400, message: 'Malformed JSON' }; }
}

export function createApp(store = createTaskStore()) {
  return createServer(async (req, res) => {
    const method = req.method;
    let path;
    let url;
    try { url = new URL(req.url, 'http://localhost'); path = url.pathname; }
    catch { return send(res, 400, { error: 'Invalid URL' }); }
    try {
      if (path === '/health' && method === 'GET') return send(res, 200, { status: 'ok' });
      if (path === '/tasks') {
        if (method === 'GET') {
          if (!url.search) return send(res, 200, { tasks: store.list() });
          let query;
          try { query = parseTaskQuery(url.searchParams); }
          catch (error) { return send(res, 400, { error: error.message }); }
          return send(res, 200, queryTasks(store.list(), query));
        }
        if (method === 'POST') {
          const input = await readJson(req);
          const error = validateTask(input);
          if (error) return send(res, 422, { error });
          const task = store.create({ title: input.title.trim(), status: input.status });
          return send(res, 201, { task }, { location: '/tasks/' + task.id });
        }
        return send(res, 405, { error: 'Method not allowed' }, { allow: 'GET, POST' });
      }
      const match = /^\/tasks\/([a-f0-9-]{36})$/.exec(path);
      if (match) {
        const id = match[1];
        if (method === 'GET') {
          const task = store.get(id);
          return task ? send(res, 200, { task }) : send(res, 404, { error: 'Task not found' });
        }
        if (method === 'PATCH') {
          const input = await readJson(req);
          const error = validateTask(input, true);
          if (error) return send(res, 422, { error });
          const task = store.update(id, { ...input, ...('title' in input ? { title: input.title.trim() } : {}) });
          return task ? send(res, 200, { task }) : send(res, 404, { error: 'Task not found' });
        }
        if (method === 'DELETE') {
          return store.remove(id) ? send(res, 200, { deleted: true }) : send(res, 404, { error: 'Task not found' });
        }
        return send(res, 405, { error: 'Method not allowed' }, { allow: 'GET, PATCH, DELETE' });
      }
      return send(res, 404, { error: 'Route not found' });
    } catch (error) {
      if (error?.status) return send(res, error.status, { error: error.message });
      console.error('Unexpected server error:', error);
      return send(res, 500, { error: 'Internal server error' });
    }
  });
}
