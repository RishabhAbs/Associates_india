const bcrypt = require('bcryptjs');
const pool = require('../utils/db');

// ── Table definitions ─────────────────────────────────────────────────────────

const TABLES = [
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name         VARCHAR(255)  NOT NULL,
        username     VARCHAR(100)  NOT NULL UNIQUE,
        email        VARCHAR(255)  NOT NULL UNIQUE,
        password     VARCHAR(255)  NOT NULL,
        role         VARCHAR(100)  NOT NULL DEFAULT 'Sales',
        phone        VARCHAR(50)   DEFAULT '',
        department   VARCHAR(100)  DEFAULT '',
        joined_date  DATE          DEFAULT (CURDATE()),
        permissions  JSON          DEFAULT NULL,
        created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
  {
    name: 'orders',
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        customer     VARCHAR(255)  NOT NULL,
        date         DATE          NOT NULL,
        notes        TEXT          DEFAULT NULL,
        total        DECIMAL(15,2) DEFAULT 0.00,
        status       VARCHAR(50)   DEFAULT 'Draft',
        created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
  {
    name: 'order_items',
    sql: `
      CREATE TABLE IF NOT EXISTS order_items (
        id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id     BIGINT UNSIGNED NOT NULL,
        name         VARCHAR(255)  NOT NULL,
        qty          INT           DEFAULT 1,
        price        DECIMAL(15,2) DEFAULT 0.00,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
  {
    name: 'sales',
    sql: `
      CREATE TABLE IF NOT EXISTS sales (
        id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        billno        VARCHAR(100)   DEFAULT '',
        billdate      VARCHAR(20)    DEFAULT '',
        party         VARCHAR(255)   DEFAULT '',
        stockitemname VARCHAR(255)   DEFAULT '',
        rate          VARCHAR(100)   DEFAULT '',
        discount      VARCHAR(50)    DEFAULT '0',
        billedqty     VARCHAR(100)   DEFAULT '',
        amount        DECIMAL(15,2)  DEFAULT 0.00,
        totalamt      DECIMAL(15,2)  DEFAULT 0.00,
        synced_at     DATETIME       DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_entry (billno, billdate, stockitemname(100)),
        INDEX idx_party    (party),
        INDEX idx_billdate (billdate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
];

// ── Seed data (only inserted if table is empty) ───────────────────────────────

const ALL_MODULES = ['dashboard', 'users', 'master', 'ledger', 'reports', 'orders', 'sales'];
const ALL_TRUE = Object.fromEntries(
  ALL_MODULES.map(m => [m, { view: true, create: true, edit: true, delete: true }])
);

const seedUsers = async () => {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(count) > 0) return; // already seeded

  const hashed = await bcrypt.hash('admin123', 10);
  await pool.query(
    `INSERT INTO users (name, username, email, password, role, phone, department, permissions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Super Admin',
      'admin',
      'admin@abstechnologies.com',
      hashed,
      'Super Admin',
      '+91 98765 43210',
      'Administration',
      JSON.stringify(ALL_TRUE),
    ]
  );
  console.log('  → seeded default Super Admin user');
};

// ── Main init function ────────────────────────────────────────────────────────

const initDB = async () => {
  console.log('Initializing database...');
  for (const { name, sql } of TABLES) {
    await pool.query(sql);
    console.log(`  → ${name} table ready`);
  }
  await seedUsers();
  console.log('Database initialization complete.');
};

module.exports = initDB;
