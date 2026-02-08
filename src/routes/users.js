const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const store = require('../services/store');
const { createToken, hashPassword, verifyPassword, requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * POST /api/users/login
 * Authenticate and return a token. Public endpoint.
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = store.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is disabled' });
  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = createToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountId: user.accountId,
    },
  });
});

/**
 * POST /api/users/setup
 * First-time setup: create the initial admin user.
 * Only works when no users exist yet.
 */
router.post('/setup', (req, res) => {
  const existing = store.getUsers();
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Setup already completed. Admin user exists.' });
  }

  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = {
    id: uuidv4(),
    email,
    name: name || 'Admin',
    role: 'admin',
    accountId: null,
    passwordHash: hashPassword(password),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.addUser(user);
  const token = createToken({ userId: user.id, role: user.role });

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

/**
 * GET /api/users/me
 * Get current authenticated user's info.
 */
router.get('/me', requireAuth, (req, res) => {
  const user = store.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountId: user.accountId,
    status: user.status,
    createdAt: user.createdAt,
  });
});

/**
 * PUT /api/users/me
 * Update own profile (name, password).
 */
router.put('/me', requireAuth, (req, res) => {
  const { name, password, currentPassword } = req.body;
  const user = store.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updates = {};
  if (name) updates.name = name;
  if (password) {
    if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    updates.passwordHash = hashPassword(password);
  }

  const updated = store.updateUser(req.user.id, updates);
  res.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role });
});

/**
 * GET /api/users
 * Admin: list all users.
 */
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const { accountId } = req.query;
  let users = accountId ? store.getUsersByAccountId(accountId) : store.getUsers();

  // Never expose password hashes
  users = users.map(({ passwordHash, ...u }) => u);
  res.json(users);
});

/**
 * POST /api/users/invite
 * Admin: invite a user to an account (creates user with temporary password).
 */
router.post('/invite', requireAuth, requireAdmin, (req, res) => {
  const { email, name, role, accountId, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const existing = store.getUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

  const userRole = role === 'admin' ? 'admin' : 'client';
  if (userRole === 'client' && !accountId) {
    return res.status(400).json({ error: 'accountId is required for client users' });
  }

  if (accountId) {
    const account = store.getAccountById(accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
  }

  // Generate a temporary password if none provided
  const tempPassword = password || uuidv4().slice(0, 12);

  const user = {
    id: uuidv4(),
    email,
    name: name || email.split('@')[0],
    role: userRole,
    accountId: userRole === 'admin' ? null : accountId,
    passwordHash: hashPassword(tempPassword),
    status: 'active',
    invitedBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.addUser(user);

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, accountId: user.accountId },
    temporaryPassword: tempPassword,
    message: `User created. Share these credentials with them: email=${email}, password=${tempPassword}`,
  });
});

/**
 * PUT /api/users/:id
 * Admin: update a user.
 */
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const { name, email, role, status, accountId, password } = req.body;
  const user = store.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;
  if (accountId !== undefined) updates.accountId = accountId;
  if (password) updates.passwordHash = hashPassword(password);

  const updated = store.updateUser(req.params.id, updates);
  const { passwordHash, ...safe } = updated;
  res.json(safe);
});

/**
 * DELETE /api/users/:id
 * Admin: delete a user.
 */
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const removed = store.deleteUser(req.params.id);
  if (!removed) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;
