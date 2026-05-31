/**
 * Redis with in-memory fallback.
 *
 *   - When `REDIS_URL` (or REDIS_HOST) is set → ioredis client.
 *   - Otherwise → in-memory Map with TTL — same get/set/del/pubsub API.
 *
 * Used for:
 *   • caching list endpoints (GET /api/doctors, /api/departments, etc.)
 *   • cross-process pub/sub for SSE real-time admin updates
 */
const Redis = require('ioredis');

let pub = null;
let sub = null;
let mode = 'memory';

const memStore = new Map(); // key → { value, expiresAt }
const memSubs = new Map(); // channel → Set<callback>

function _now() {
  return Date.now();
}

function _connect() {
  const url = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST;
  if (!url && !host) return false;

  try {
    const opts = url
      ? url
      : {
          host,
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          retryStrategy: (times) => Math.min(times * 100, 3000),
        };
    pub = new Redis(opts);
    sub = new Redis(opts);

    pub.on('error', (err) => console.warn('[redis:pub] error:', err.message));
    sub.on('error', (err) => console.warn('[redis:sub] error:', err.message));
    pub.on('ready', () => console.log('[redis] connected'));

    mode = 'redis';
    return true;
  } catch (err) {
    console.warn('[redis] connect failed, falling back to memory:', err.message);
    pub = null;
    sub = null;
    mode = 'memory';
    return false;
  }
}

_connect();

/* ─── KV ────────────────────────────────────────────────────────────────── */

async function get(key) {
  if (mode === 'redis') {
    try {
      const v = await pub.get(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }
  const item = memStore.get(key);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt < _now()) {
    memStore.delete(key);
    return null;
  }
  return item.value;
}

async function set(key, value, ttlSeconds = 60) {
  if (mode === 'redis') {
    try {
      const v = JSON.stringify(value);
      if (ttlSeconds > 0) await pub.set(key, v, 'EX', ttlSeconds);
      else await pub.set(key, v);
    } catch {}
    return;
  }
  memStore.set(key, {
    value,
    expiresAt: ttlSeconds > 0 ? _now() + ttlSeconds * 1000 : 0,
  });
}

async function del(...keys) {
  if (!keys.length) return;
  if (mode === 'redis') {
    try {
      await pub.del(...keys);
    } catch {}
    return;
  }
  for (const k of keys) memStore.delete(k);
}

async function delPattern(pattern) {
  if (mode === 'redis') {
    try {
      const keys = await pub.keys(pattern);
      if (keys.length) await pub.del(...keys);
    } catch {}
    return;
  }
  // crude glob → regex
  const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const k of [...memStore.keys()]) if (re.test(k)) memStore.delete(k);
}

/* ─── Pub/Sub ───────────────────────────────────────────────────────────── */

async function publish(channel, payload) {
  const msg = JSON.stringify(payload || {});
  if (mode === 'redis') {
    try {
      await pub.publish(channel, msg);
    } catch {}
    return;
  }
  const subs = memSubs.get(channel);
  if (subs) for (const cb of subs) setImmediate(() => cb(payload));
}

let redisSubInitialized = false;
function _initRedisSub() {
  if (redisSubInitialized || !sub) return;
  sub.on('message', (channel, raw) => {
    const subs = memSubs.get(channel);
    if (!subs) return;
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {}
    for (const cb of subs) setImmediate(() => cb(parsed));
  });
  redisSubInitialized = true;
}

/** Subscribe to a channel; returns an unsubscribe fn. */
function subscribe(channel, cb) {
  if (!memSubs.has(channel)) memSubs.set(channel, new Set());
  memSubs.get(channel).add(cb);

  if (mode === 'redis') {
    _initRedisSub();
    sub.subscribe(channel).catch(() => {});
  }

  return () => {
    const s = memSubs.get(channel);
    if (s) {
      s.delete(cb);
      if (!s.size) {
        memSubs.delete(channel);
        if (mode === 'redis') sub.unsubscribe(channel).catch(() => {});
      }
    }
  };
}

function getMode() {
  return mode;
}

module.exports = { get, set, del, delPattern, publish, subscribe, getMode };
