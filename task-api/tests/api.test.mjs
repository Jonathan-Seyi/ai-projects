import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.mjs';

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function request(path, method = 'GET', value, headers = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(value === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    ...(value === undefined ? {} : { body: typeof value === 'string' ? value : JSON.stringify(value) }),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

test('health check and empty list', async () => {
  assert.deepEqual((await request('/health')).body, { status: 'ok' });
  assert.deepEqual((await request('/tasks')).body, { tasks: [] });
});

test('create, list, fetch, update, and delete a task', async () => {
  const created = await request('/tasks', 'POST', { title: '  Build API  ' });
  assert.equal(created.status, 201);
  const { id } = created.body.task;
  assert.equal(created.body.task.title, 'Build API');
  assert.equal(created.body.task.status, 'todo');
  assert.equal(created.headers.get('location'), '/tasks/' + id);
  assert.equal((await request('/tasks/' + id)).body.task.id, id);
  assert.equal((await request('/tasks')).body.tasks.length, 1);
  const updated = await request('/tasks/' + id, 'PATCH', { status: 'done' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.task.status, 'done');
  assert.equal(updated.body.task.title, 'Build API');
  assert.equal((await request('/tasks/' + id, 'DELETE')).status, 200);
  assert.equal((await request('/tasks/' + id)).status, 404);
});

test('reject invalid task titles and statuses', async () => {
  for (const input of [{}, { title: '' }, { title: ' ' }, { title: 'x'.repeat(121) }, { title: 4 }, { title: 'ok', status: 'blocked' }, { title: 'ok', extra: true }, []]) {
    assert.equal((await request('/tasks', 'POST', input)).status, 422);
  }
});

test('reject malformed JSON and incorrect media type', async () => {
  assert.equal((await request('/tasks', 'POST', '{bad')).status, 400);
  assert.equal((await request('/tasks', 'POST', 'hello', { 'content-type': 'text/plain' })).status, 415);
});

test('reject oversized payload', async () => {
  assert.equal((await request('/tasks', 'POST', { title: 'a'.repeat(17000) })).status, 413);
});

test('validate partial updates and missing IDs', async () => {
  const missing = '00000000-0000-4000-8000-000000000000';
  assert.equal((await request('/tasks/' + missing, 'PATCH', { status: 'done' })).status, 404);
  assert.equal((await request('/tasks/' + missing, 'DELETE')).status, 404);
  const created = await request('/tasks', 'POST', { title: 'Task' });
  const path = '/tasks/' + created.body.task.id;
  assert.equal((await request(path, 'PATCH', {})).status, 422);
  assert.equal((await request(path, 'PATCH', { status: 'unknown' })).status, 422);
  assert.equal((await request(path, 'PATCH', { id: 'changed' })).status, 422);
});

test('unknown routes and methods return explicit errors', async () => {
  assert.equal((await request('/unknown')).status, 404);
  assert.equal((await request('/tasks', 'PUT')).status, 405);
  assert.equal((await request('/health', 'POST')).status, 404);
});
