const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSalesVouchers } = require('../utils/tally');
const pool = require('../utils/db');

const router = express.Router();

// GET /api/sales/vouchers — server-side paginated + searchable
router.get('/vouchers', authMiddleware, async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page  || '1'));
    const limit    = Math.min(200, Math.max(1, parseInt(req.query.limit || '50')));
    const search   = (req.query.search || '').trim();
    const sortField = ['billno','billdate','party','stockitemname','rate','billedqty','discount','totalamt'].includes(req.query.sort)
      ? req.query.sort : 'billdate';
    const sortDir  = req.query.dir === 'asc' ? 'ASC' : 'DESC';
    const offset   = (page - 1) * limit;

    let where = '';
    const params = [];
    if (search) {
      where = 'WHERE party LIKE ? OR billno LIKE ? OR stockitemname LIKE ?';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM sales ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT * FROM sales ${where} ORDER BY ${sortField} ${sortDir}, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[meta]] = await pool.query('SELECT MAX(synced_at) AS lastSynced FROM sales');

    res.json({
      lastSynced: meta?.lastSynced || null,
      entries: rows,
      total: parseInt(total),
      page,
      limit,
    });
  } catch (err) {
    console.error('sales/vouchers DB error:', err.message);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// POST /api/sales/sync — fetch from Tally via backend, save to MySQL in batches of 100
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const entries = await getSalesVouchers();
    const syncedAt = new Date();
    const BATCH = 100;
    let inserted = 0;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < entries.length; i += BATCH) {
        const batch = entries.slice(i, i + BATCH);
        const values = batch.map(e => [
          e.billno || '', e.billdate || '', e.party || '',
          e.stockitemname || '', e.rate || '', e.discount || '0',
          e.billedqty || '', parseFloat(e.amount) || 0,
          parseFloat(e.totalamt) || 0, syncedAt,
        ]);
        const [result] = await conn.query(
          `INSERT IGNORE INTO sales
            (billno, billdate, party, stockitemname, rate, discount, billedqty, amount, totalamt, synced_at)
           VALUES ?`, [values]
        );
        inserted += result.affectedRows;
      }
      await conn.commit();
      console.log(`[sales/sync] Saved ${inserted} new rows (${entries.length} total from Tally)`);
    } catch (err) { await conn.rollback(); throw err; }
    finally { conn.release(); }

    const [rows] = await pool.query('SELECT * FROM sales ORDER BY billdate DESC, id DESC');
    res.json({ lastSynced: syncedAt.toISOString(), entries: rows, inserted });
  } catch (err) {
    console.error('Tally sales/sync error:', err.message);
    res.status(502).json({ message: 'Could not sync from Tally', error: err.message });
  }
});

// POST /api/sales/save — receive entries from browser, save to MySQL
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ message: 'entries array required' });

    const syncedAt = new Date();
    const BATCH = 100;
    let inserted = 0;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < entries.length; i += BATCH) {
        const batch = entries.slice(i, i + BATCH);
        const values = batch.map(e => [
          e.billno        || '',
          e.billdate      || '',
          e.party         || '',
          e.stockitemname || '',
          e.rate          || '',
          e.discount      || '0',
          e.billedqty     || '',
          parseFloat(e.amount)   || 0,
          parseFloat(e.totalamt) || 0,
          syncedAt,
        ]);
        const [result] = await conn.query(
          `INSERT IGNORE INTO sales
            (billno, billdate, party, stockitemname, rate, discount, billedqty, amount, totalamt, synced_at)
           VALUES ?`,
          [values]
        );
        inserted += result.affectedRows;
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [rows] = await pool.query('SELECT * FROM sales ORDER BY billdate DESC, id DESC');
    res.json({ lastSynced: syncedAt.toISOString(), entries: rows });
  } catch (err) {
    console.error('sales/save error:', err.message);
    res.status(500).json({ message: 'Could not save sales data', error: err.message });
  }
});

module.exports = router;
