const express = require('express');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const { users } = require('../data/store');

const router = express.Router();

const MODULES = ['dashboard', 'users', 'master', 'ledger', 'reports', 'orders'];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

const defaultPermissions = () =>
  Object.fromEntries(MODULES.map(m => [m, Object.fromEntries(ACTIONS.map(a => [a, false]))]));

const sanitize = (u) => {
  const { password: _, ...rest } = u;
  return rest;
};

// GET /api/users
router.get('/', authMiddleware, (req, res) => {
  res.json(users.map(sanitize));
});

// POST /api/users
router.post('/', authMiddleware, async (req, res) => {
  const { name, username, email, phone, department, role, password, permissions } = req.body;
  if (!name || !email || !username || !password)
    return res.status(400).json({ message: 'Name, username, email and password are required' });

  if (users.find(u => u.email === email))
    return res.status(409).json({ message: 'Email already exists' });
  if (users.find(u => u.username === username))
    return res.status(409).json({ message: 'Username already exists' });

  const newUser = {
    id: Date.now(),
    name, username, email,
    phone: phone || '',
    department: department || '',
    role: role || 'Sales',
    password: await bcrypt.hash(password, 10),
    joinedDate: new Date().toISOString().split('T')[0],
    permissions: permissions || defaultPermissions(),
  };
  users.push(newUser);
  res.status(201).json(sanitize(newUser));
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ message: 'User not found' });

  const { name, phone, department, role, password, permissions } = req.body;
  if (name)        users[idx].name        = name;
  if (phone)       users[idx].phone       = phone;
  if (department)  users[idx].department  = department;
  if (role)        users[idx].role        = role;
  if (password)    users[idx].password    = await bcrypt.hash(password, 10);
  if (permissions) users[idx].permissions = permissions;

  res.json(sanitize(users[idx]));
});

module.exports = router;
