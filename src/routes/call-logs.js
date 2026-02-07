const express = require('express');
const router = express.Router();
const store = require('../services/store');

/**
 * GET /api/call-logs
 * List call logs. Admin sees all; client users see only their account's logs.
 * Supports filters: ?accountId=xxx&outcome=xxx
 */
router.get('/', (req, res) => {
  const { accountId, outcome } = req.query;

  // If user is a client, force filter to their account
  const effectiveAccountId = req.user.role === 'client' ? req.user.accountId : accountId;
  let logs = store.getCallLogs(effectiveAccountId || undefined);

  if (outcome) {
    logs = logs.filter((l) => l.variables && l.variables.call_outcome === outcome);
  }

  res.json(logs);
});

/**
 * GET /api/call-logs/:id
 * Get a single call log entry.
 */
router.get('/:id', (req, res) => {
  const log = store.getCallLogById(req.params.id);
  if (!log) return res.status(404).json({ error: 'Call log not found' });

  // Client users can only view their own account's logs
  if (req.user.role === 'client' && log.accountId !== req.user.accountId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(log);
});

/**
 * GET /api/call-logs/account/:accountId/stats
 * Aggregate call performance stats for an account.
 */
router.get('/account/:accountId/stats', (req, res) => {
  const accountId = req.params.accountId;

  // Client users can only view their own account
  if (req.user.role === 'client' && req.user.accountId !== accountId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const logs = store.getCallLogs(accountId);
  const total = logs.length;
  const outcomes = {};
  const sentiments = {};
  let totalDuration = 0;
  let durationCount = 0;

  for (const log of logs) {
    const vars = log.variables || {};
    if (vars.call_outcome) {
      outcomes[vars.call_outcome] = (outcomes[vars.call_outcome] || 0) + 1;
    }
    if (vars.caller_sentiment) {
      sentiments[vars.caller_sentiment] = (sentiments[vars.caller_sentiment] || 0) + 1;
    }
    if (vars.call_duration) {
      totalDuration += Number(vars.call_duration) || 0;
      durationCount++;
    }
  }

  res.json({
    totalCalls: total,
    outcomes,
    sentiments,
    avgDurationSeconds: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    bookingRate: total > 0 ? Math.round(((outcomes['Booked'] || 0) / total) * 100) : 0,
  });
});

/**
 * GET /api/call-logs/account/:accountId/variables
 * Get the call variable definitions for an account.
 */
router.get('/account/:accountId/variables', (req, res) => {
  const accountId = req.params.accountId;
  if (req.user.role === 'client' && req.user.accountId !== accountId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const settings = store.getAccountSettings(accountId);
  res.json(settings.callVariables || []);
});

/**
 * PUT /api/call-logs/account/:accountId/variables
 * Admin: update call variable definitions for an account.
 */
router.put('/account/:accountId/variables', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const accountId = req.params.accountId;
  const account = store.getAccountById(accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const { callVariables } = req.body;
  if (!Array.isArray(callVariables)) {
    return res.status(400).json({ error: 'callVariables must be an array' });
  }

  const settings = store.getAccountSettings(accountId);
  settings.callVariables = callVariables;
  store.saveAccountSettings(accountId, settings);

  res.json(settings.callVariables);
});

module.exports = router;
