const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  getLedgerList,
  getLedgerVouchers,
  getLedgerOutstanding,
} = require('../utils/tally');

const router = express.Router();

// GET /api/ledger/list  → array of ledger names
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const list = await getLedgerList();
    res.json(list);
  } catch (err) {
    console.error('Tally ledger/list error:', err.message);
    res.status(502).json({ message: 'Could not fetch ledger list from Tally', error: err.message });
  }
});

// GET /api/ledger/vouchers?ledger=NAME&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/vouchers', authMiddleware, async (req, res) => {
  const { ledger, from, to } = req.query;
  if (!ledger) return res.status(400).json({ message: 'ledger is required' });

  const fromDate = from || (() => {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-04-01`;
  })();
  const toDate = to || new Date().toISOString().split('T')[0];

  try {
    const data = await getLedgerVouchers(ledger, fromDate, toDate);
    res.json(data);
  } catch (err) {
    console.error('Tally ledger/vouchers error:', err.message);
    res.status(502).json({ message: 'Could not fetch vouchers from Tally', error: err.message });
  }
});

// GET /api/ledger/outstanding?ledger=NAME&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/outstanding', authMiddleware, async (req, res) => {
  const { ledger, from, to } = req.query;
  if (!ledger) return res.status(400).json({ message: 'ledger is required' });

  const fromDate = from || (() => {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}-04-01`;
  })();
  const toDate = to || new Date().toISOString().split('T')[0];

  try {
    const data = await getLedgerOutstanding(ledger, fromDate, toDate);
    res.json(data);
  } catch (err) {
    console.error('Tally ledger/outstanding error:', err.message);
    res.status(502).json({ message: 'Could not fetch outstanding from Tally', error: err.message });
  }
});

module.exports = router;
