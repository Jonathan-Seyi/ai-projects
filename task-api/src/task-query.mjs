/** Strict, deterministic query parsing for the in-memory task collection. */
const STATUSES = new Set(['todo', 'doing', 'done']);
const ALLOWED = new Set(['status', 'limit', 'offset']);

export function parseTaskQuery(searchParams) {
  for (const key of searchParams.keys()) {
    if (!ALLOWED.has(key) || searchParams.getAll(key).length !== 1) {
      throw new RangeError(`Unknown or repeated query parameter: ${key}`);
    }
  }
  const status = searchParams.get('status');
  if (status !== null && !STATUSES.has(status)) {
    throw new RangeError('status must be todo, doing, or done');
  }
  function integer(name, fallback, max) {
    const raw = searchParams.get(name);
    if (raw === null) return fallback;
    if (!/^(0|[1-9]\d*)$/.test(raw)) throw new RangeError(`${name} must be a nonnegative integer`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value > max || (name === 'limit' && value === 0)) {
      throw new RangeError(`${name} must be between ${name === 'limit' ? 1 : 0} and ${max}`);
    }
    return value;
  }
  return { status, limit: integer('limit', 50, 100), offset: integer('offset', 0, 1_000_000) };
}

export function queryTasks(tasks, query) {
  const matching = query.status === null ? tasks : tasks.filter(task => task.status === query.status);
  return {
    tasks: matching.slice(query.offset, query.offset + query.limit),
    pagination: { total: matching.length, limit: query.limit, offset: query.offset, hasMore: query.offset + query.limit < matching.length },
  };
}
