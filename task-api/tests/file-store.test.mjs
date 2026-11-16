import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createFileTaskStore } from '../src/file-store.mjs';
import { createApp } from '../src/app.mjs';

function withStore(run) {
  const dir = mkdtempSync(join(tmpdir(), 'task-api-test-'));
  try { return run(join(dir, 'tasks.json')); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('persists create, update and delete across store restarts', () => withStore(path => {
  let store = createFileTaskStore(path);
  const task = store.create({ title: 'Keep me', status: 'doing' });
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).length, 1);
  store = createFileTaskStore(path);
  assert.equal(store.get(task.id).title, 'Keep me');
  store.update(task.id, { status: 'done' });
  store = createFileTaskStore(path);
  assert.equal(store.get(task.id).status, 'done');
  assert.equal(store.remove(task.id), true);
  assert.deepEqual(createFileTaskStore(path).list(), []);
}));

test('returns defensive copies and preserves creation order', () => withStore(path => {
  const store = createFileTaskStore(path);
  const first = store.create({ title: 'First' });
  store.create({ title: 'Second' });
  store.get(first.id).title = 'mutated';
  store.list()[0].title = 'mutated again';
  assert.deepEqual(createFileTaskStore(path).list().map(task => task.title), ['First', 'Second']);
}));

test('rejects malformed snapshots rather than silently wiping data', () => withStore(path => {
  writeFileSync(path, '{invalid json');
  assert.throws(() => createFileTaskStore(path), SyntaxError);
  writeFileSync(path, JSON.stringify([{ id: 'bad', title: 'Oops' }]));
  assert.throws(() => createFileTaskStore(path), /Invalid task snapshot/);
}));

test('does not write a file when no mutation occurs', () => withStore(path => {
  const store = createFileTaskStore(path);
  assert.equal(store.remove('missing'), false);
  assert.equal(store.update('missing', { title: 'No' }), null);
  assert.deepEqual(store.list(), []);
}));

test('HTTP-created tasks survive server replacement', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'task-api-http-'));
  const path = join(dir, 'tasks.json');
  let server;
  try {
    server = createApp(createFileTaskStore(path));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let base = 'http://127.0.0.1:' + server.address().port;
    const response = await fetch(base + '/tasks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Survive restart' }),
    });
    assert.equal(response.status, 201);
    const { task } = await response.json();
    await new Promise(resolve => server.close(resolve));
    server = createApp(createFileTaskStore(path));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
    const restored = await fetch(base + '/tasks/' + task.id);
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).task.title, 'Survive restart');
  } finally {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
