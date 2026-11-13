import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTaskQuery, queryTasks } from '../src/task-query.mjs';

const parse = input => parseTaskQuery(new URLSearchParams(input));

test('defaults and exact limits', () => {
  assert.deepEqual(parse(''), { status: null, limit: 50, offset: 0 });
  assert.deepEqual(parse('status=done&limit=100&offset=2'), { status: 'done', limit: 100, offset: 2 });
});

test('rejects unknown, repeated and malformed parameters', () => {
  for (const query of ['status=bad', 'status=', 'limit=0', 'limit=101', 'limit=-1', 'limit=1.5', 'limit=01', 'limit=Infinity', 'limit=9007199254740993', 'offset=-1', 'offset=1000001', 'offset=1e3', 'status=done&status=todo', 'limit=2&limit=3', 'search=abc']) {
    assert.throws(() => parse(query), RangeError, query);
  }
});

test('filters, paginates and keeps insertion order', () => {
  const tasks = [{ id: 'a', status: 'done' }, { id: 'b', status: 'todo' }, { id: 'c', status: 'done' }, { id: 'd', status: 'done' }];
  assert.deepEqual(queryTasks(tasks, parse('status=done&limit=2&offset=1')), {
    tasks: [tasks[2], tasks[3]], pagination: { total: 3, limit: 2, offset: 1, hasMore: false },
  });
  assert.deepEqual(queryTasks(tasks, parse('limit=2')).pagination, { total: 4, limit: 2, offset: 0, hasMore: true });
  assert.deepEqual(queryTasks(tasks, parse('offset=99')).tasks, []);
  assert.equal(tasks.length, 4);
});
