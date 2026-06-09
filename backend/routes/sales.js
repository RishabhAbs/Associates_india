const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSalesVouchers } = require('../utils/tally');
const pool = require('../utils/db');

const router = express.Router();

// GET /api/sales/vouchers — serve from MySQL
router.get('/vouchers', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM sales ORDER BY billdate DESC, id DESC'
    );
    const [[meta]] = await pool.query(
      'SELECT MAX(synced_at) AS lastSynced FROM sales'
    );
    res.json({ lastSynced: meta?.lastSynced || null, entries: rows });
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
