const crypto = require('crypto');
const config = require('../config');
const store = require('../services/store');

/**
 * Simple JWT-like token authentication middleware.
 * Uses HMAC-SHA256 signed tokens for stateless auth.
 *
 * Token format: base64(JSON payload).base64(HMAC signature)
 */

function createToken(payload) {
  const data = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + parseDuration(config.jwtExpiry),
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (payload.exp && payload.exp < Date.now()) return null;
  return payload;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

/**
 * Middleware: require a valid auth token.
 * Sets req.user with { id, email, role, accountId }.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

  const user = store.getUserById(payload.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is disabled' });

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountId: user.accountId,
  };
  next();
}

/**
 * Middleware: require admin role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware: require admin role OR the user belongs to the account in req.params.
 */
function requireAccountAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role === 'admin') return next();
  const paramAccountId = req.params.id || req.params.accountId;
  if (req.user.accountId === paramAccountId) return next();
  return res.status(403).json({ error: 'Access denied to this account' });
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const num = parseInt(match[1], 10);
  const unit = { d: 86400000, h: 3600000, m: 60000, s: 1000 }[match[2]];
  return num * unit;
}

module.exports = {
  createToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  requireAuth,
  requireAdmin,
  requireAccountAccess,
};
