'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { MCP_DIR, loadMcpConfig, createMcpServer } = require('./mcp-core');

const SECRET_FILE = path.join(MCP_DIR, 'mcp-secret.json');
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map(); // sessionId -> { transport, server, lastSeen }

let cachedToken = null;

function ensureHttpToken() {
  if (process.env.AI_NOTE_MCP_TOKEN && process.env.AI_NOTE_MCP_TOKEN.trim()) {
    return process.env.AI_NOTE_MCP_TOKEN.trim();
  }
  if (cachedToken) return cachedToken;
  try {
    const data = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8').replace(/^\uFEFF/, ''));
    if (data && typeof data.token === 'string' && data.token.trim().length >= 16) {
      cachedToken = data.token.trim();
      return cachedToken;
    }
  } catch {}
  const token = crypto.randomBytes(24).toString('hex');
  try {
    fs.writeFileSync(SECRET_FILE, JSON.stringify({ token }, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch (err) {
    console.error('[ai-note-mcp] Gagal menyimpan mcp-secret.json:', err.message);
  }
  cachedToken = token;
  return token;
}

function tokenMatches(req, expected) {
  const auth = String(req.headers.authorization || '');
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!m) return false;
  const a = crypto.createHash('sha256').update(m[1].trim()).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function remoteIpOf(req) {
  const ip = String((req.socket && req.socket.remoteAddress) || '');
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function ipAllowed(req, cfg) {
  const list = Array.isArray(cfg.httpAllowedIps) ? cfg.httpAllowedIps.map((x) => String(x || '').trim()).filter(Boolean) : [];
  if (!list.length) return true;
  const ip = remoteIpOf(req);
  return list.includes(ip);
}

function sendJsonErr(res, status, code, message, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }));
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [sid, s] of sessions) {
    if (now - s.lastSeen > SESSION_TTL_MS) {
      sessions.delete(sid);
      try { s.transport.close().catch(() => {}); } catch {}
      try { s.server.close().catch(() => {}); } catch {}
    }
  }
}, 5 * 60 * 1000);
if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

async function handleMcpHttp(req, res) {
  const cfg = loadMcpConfig();
  if (cfg.httpEnabled === false) {
    return sendJsonErr(res, 404, -32000, 'MCP HTTP dinonaktifkan di mcp-config.json.');
  }
  if (!ipAllowed(req, cfg)) {
    return sendJsonErr(res, 403, -32000, 'IP tidak diizinkan mengakses MCP.');
  }
  const expected = ensureHttpToken();
  if (!tokenMatches(req, expected)) {
    return sendJsonErr(res, 401, -32000, 'Unauthorized: Bearer token valid diperlukan untuk /mcp.', {
      'WWW-Authenticate': 'Bearer',
    });
  }

  const sidHeader = req.headers['mcp-session-id'];
  const sid = Array.isArray(sidHeader) ? sidHeader[0] : sidHeader;

  if (sid) {
    const existing = sessions.get(sid);
    if (!existing) {
      return sendJsonErr(res, 404, -32000, 'Session MCP tidak ditemukan atau sudah kedaluwarsa.');
    }
    existing.lastSeen = Date.now();
    try {
      await existing.transport.handleRequest(req, res);
    } catch (err) {
      console.error('[ai-note-mcp] HTTP session error:', err);
      if (!res.headersSent) sendJsonErr(res, 500, -32603, 'Internal MCP error');
    }
    return;
  }

  if (req.method !== 'POST') {
    return sendJsonErr(res, 400, -32000, 'Header Mcp-Session-Id wajib ada untuk GET/DELETE.');
  }

  const server = createMcpServer();
  let transport;
  transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (newSid) => {
      sessions.set(newSid, { transport, server, lastSeen: Date.now() });
    },
    onsessionclosed: (closedSid) => {
      sessions.delete(closedSid);
    },
  });
  transport.onclose = () => {
    if (transport.sessionId) sessions.delete(transport.sessionId);
    server.close().catch(() => {});
  };
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error('[ai-note-mcp] HTTP init error:', err);
    if (!res.headersSent) sendJsonErr(res, 500, -32603, 'Internal MCP error');
    if (transport.sessionId) sessions.delete(transport.sessionId);
    server.close().catch(() => {});
  }
}

module.exports = {
  SECRET_FILE,
  ensureHttpToken,
  handleMcpHttp,
};
