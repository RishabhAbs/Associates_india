const bcrypt = require('bcryptjs');

const ALL_TRUE = {
  dashboard: { view: true, create: true, edit: true, delete: true },
  users:     { view: true, create: true, edit: true, delete: true },
  master:    { view: true, create: true, edit: true, delete: true },
  ledger:    { view: true, create: true, edit: true, delete: true },
  reports:   { view: true, create: true, edit: true, delete: true },
  orders:    { view: true, create: true, edit: true, delete: true },
  sales:     { view: true, create: true, edit: true, delete: true },
};

const users = [
  {
    id: 1,
    name: 'Super Admin',
    username: 'admin',
    email: 'admin@abstechnologies.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'Super Admin',
    phone: '+91 98765 43210',
    department: 'Administration',
    joinedDate: '2023-01-15',
    permissions: ALL_TRUE,
  },
];

module.exports = { users };
