/**
 * Tiny SSE client that subscribes to backend `realtime` events and exposes a
 * pub/sub interface so any page can `subscribe('appointments', cb)` and
 * receive live updates without polling.
 */
import { apiBase } from './api';

let es = null;
const listeners = new Map(); // topic → Set<cb>
let openedFor = null;

export function ensureOpen() {
  const token = localStorage.getItem('vh_token');
  if (!token) return null;
  if (es && openedFor === token) return es;
  if (es) {
    try { es.close(); } catch {}
    es = null;
  }
  const url = `${apiBase}/realtime/stream?token=${encodeURIComponent(token)}`;
  es = new EventSource(url);
  openedFor = token;

  es.onerror = () => {
    // Browser auto-reconnects. If token went bad, the next ensureOpen() reopens.
  };

  for (const topic of listeners.keys()) {
    es.addEventListener(topic, (ev) => {
      let data = {};
      try { data = JSON.parse(ev.data); } catch {}
      const set = listeners.get(topic);
      if (set) for (const cb of set) cb(data);
    });
  }
  return es;
}

export function subscribe(topic, cb) {
  if (!listeners.has(topic)) {
    listeners.set(topic, new Set());
    // bind only once per topic
    if (es) {
      es.addEventListener(topic, (ev) => {
        let data = {};
        try { data = JSON.parse(ev.data); } catch {}
        const set = listeners.get(topic);
        if (set) for (const cb2 of set) cb2(data);
      });
    }
  }
  listeners.get(topic).add(cb);
  ensureOpen();
  return () => {
    const set = listeners.get(topic);
    if (set) set.delete(cb);
  };
}

export function close() {
  if (es) try { es.close(); } catch {}
  es = null;
  openedFor = null;
}
