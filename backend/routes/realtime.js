const express = require('express');
const realtime = require('../services/realtime');

const router = express.Router();

/**
 * SSE stream endpoint. The frontend opens it with:
 *
 *   const ev = new EventSource('/api/realtime/stream?token=<JWT>');
 *
 * EventSource cannot send Authorization headers, so we accept the token via
 * the `token` query param (only used for SSE auth).
 */
const jwt = require('jsonwebtoken');
router.get('/stream', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch {
    return res.status(401).end();
  }
  realtime.streamHandler(req, res);
});

module.exports = router;
