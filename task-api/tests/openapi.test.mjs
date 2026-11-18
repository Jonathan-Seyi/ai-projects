import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createApp } from '../src/app.mjs';

const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));

function dereference(ref) {
  assert.match(ref, /^#\//);
  return ref.slice(2).split('/').reduce((value, key) => value?.[key], spec);
}

function check(value, schema, path = '$') {
  if (schema.$ref) return check(value, dereference(schema.$ref), path);
  if (schema.oneOf) {
    const matching = schema.oneOf.filter(item => {
      try { check(value, item, path); return true; } catch { return false; }
    });
    assert.equal(matching.length, 1, path + ': exactly one schema must match');
    return;
  }
  if (schema.type === 'object') {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), path);
    for (const name of schema.required ?? []) assert.ok(Object.hasOwn(value, name), path + ': missing ' + name);
    if (schema.additionalProperties === false) {
      for (const name of Object.keys(value)) assert.ok(Object.hasOwn(schema.properties ?? {}, name), path + ': unexpected ' + name);
    }
    if (schema.minProperties) assert.ok(Object.keys(value).length >= schema.minProperties, path);
    for (const [name, item] of Object.entries(value)) {
      if (schema.properties?.[name]) check(item, schema.properties[name], path + '.' + name);
    }
  } else if (schema.type === 'array') {
    assert.ok(Array.isArray(value), path);
    value.forEach((item, index) => check(item, schema.items, path + '[' + index + ']'));
  } else if (schema.type === 'string') {
    assert.equal(typeof value, 'string', path);
    if (schema.minLength !== undefined) assert.ok(value.length >= schema.minLength, path);
    if (schema.maxLength !== undefined) assert.ok(value.length <= schema.maxLength, path);
    if (schema.format === 'uuid') assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (schema.format === 'date-time') assert.ok(Number.isFinite(Date.parse(value)), path);
  } else if (schema.type === 'integer') {
    assert.ok(Number.isInteger(value), path);
    if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, path);
    if (schema.maximum !== undefined) assert.ok(value <= schema.maximum, path);
  } else if (schema.type === 'boolean') {
    assert.equal(typeof value, 'boolean', path);
  }
  if (schema.enum) assert.ok(schema.enum.includes(value), path + ': enum mismatch');
}

function checkResponse(path, method, result) {
  const documented = spec.paths[path]?.[method]?.responses?.[result.status];
  assert.ok(documented, method + ' ' + path + ': undocumented HTTP ' + result.status);
  const response = documented.$ref ? dereference(documented.$ref) : documented;
  check(result.body, response.content['application/json'].schema);
}

test('OpenAPI describes every implemented method and local-only server', () => {
  assert.equal(spec.openapi, '3.0.3');
  assert.equal(spec.servers[0].url, 'http://127.0.0.1:3000');
  assert.deepEqual(Object.keys(spec.paths).sort(), ['/health', '/tasks', '/tasks/{id}'].sort());
  assert.deepEqual(Object.keys(spec.paths['/tasks']).sort(), ['get', 'post']);
  assert.deepEqual(Object.keys(spec.paths['/tasks/{id}']).sort(), ['delete', 'get', 'parameters', 'patch']);
});

test('all OpenAPI component references resolve', () => {
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) assert.ok(dereference(value.$ref), value.$ref);
    for (const item of Object.values(value)) visit(item);
  }
  visit(spec);
});

test('live CRUD, pagination and validation responses conform to documented schemas', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  async function request(path, method = 'GET', input) {
    const response = await fetch(base + path, {
      method,
      ...(input === undefined ? {} : {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  try {
    checkResponse('/health', 'get', await request('/health'));
    checkResponse('/tasks', 'get', await request('/tasks'));
    const created = await request('/tasks', 'POST', { title: 'Contract check', status: 'doing' });
    checkResponse('/tasks', 'post', created);
    const id = created.body.task.id;
    assert.equal(created.headers.get('location'), '/tasks/' + id);
    checkResponse('/tasks', 'get', await request('/tasks?status=doing&limit=1&offset=0'));
    checkResponse('/tasks', 'get', await request('/tasks?limit=0'));
    checkResponse('/tasks/{id}', 'get', await request('/tasks/' + id));
    checkResponse('/tasks/{id}', 'patch', await request('/tasks/' + id, 'PATCH', { status: 'done' }));
    checkResponse('/tasks', 'post', await request('/tasks', 'POST', { title: '' }));
    checkResponse('/tasks/{id}', 'delete', await request('/tasks/' + id, 'DELETE'));
    checkResponse('/tasks/{id}', 'get', await request('/tasks/' + id));
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
