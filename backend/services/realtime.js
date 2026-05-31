/**
 * Server-Sent-Events (SSE) hub for real-time admin updates.
 *
 *   • Backend emits domain events with `emit('appointments', payload)`.
 *   • Each connected admin browser opens a long-lived `GET /api/realtime/stream` connection.
 *   • Events are forwarded over SSE so the React admin updates without polling/refresh.
 *
 * Cross-process safety: events are also published via Redis pub/sub (channel
 * `vh:events:<topic>`). When Redis isn't configured the in-memory fallback is used.
 */
const redis = require('./redis');

const TOPIC_PREFIX = 'vh:events:';
const clients = new Set(); // { res, topics:Set<string> }

function _writeEvent(res, topic, payload) {
  try {
    res.write(`event: ${topic}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    // client gone — will be reaped on close
  }
}

/**
 * Emit a domain event. Persists nothing — fan-out only.
 * @param {string} topic    e.g. 'appointments', 'doctors', 'departments', 'settings'
 * @param {object} payload  arbitrary serialisable
 */
async function emit(topic, payload = {}) {
  await redis.publish(TOPIC_PREFIX + topic, payload);
}

// Subscribe once per topic on demand
const subscribed = new Set();
function _ensureTopicSubscribed(topic) {
  if (subscribed.has(topic)) return;
  subscribed.add(topic);
  redis.subscribe(TOPIC_PREFIX + topic, (payload) => {
    for (const c of clients) {
      if (c.topics.has(topic)) _writeEvent(c.res, topic, payload);
    }
  });
}

const ALL_TOPICS = ['appointments', 'doctors', 'departments', 'holidays', 'settings', 'flow-images'];

/** Express handler — opens an SSE stream. */
function streamHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders?.();

  const topicsParam = (req.query.topics || '').toString().trim();
  const topics = topicsParam ? new Set(topicsParam.split(',').map((s) => s.trim()).filter(Boolean)) : new Set(ALL_TOPICS);

  for (const t of topics) _ensureTopicSubscribed(t);

  const client = { res, topics };
  clients.add(client);

  _writeEvent(res, 'hello', { ok: true, topics: [...topics], at: Date.now() });

  // keep-alive every 25s
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    clients.delete(client);
    try {
      res.end();
    } catch {}
  });
}

module.exports = { emit, streamHandler, ALL_TOPICS };
