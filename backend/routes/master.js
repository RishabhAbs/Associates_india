const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getLedgerMaster, getItemMaster } = require('../utils/tally');

const router = express.Router();

// GET /api/master/ledgers
router.get('/ledgers', authMiddleware, async (req, res) => {
  try {
    const ledgers = await getLedgerMaster();
    res.json(ledgers);
  } catch (err) {
    console.error('Tally master/ledgers error:', err.message);
    res.status(502).json({ message: 'Could not fetch from Tally', error: err.message });
  }
});

// GET /api/master/items
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const items = await getItemMaster();
    res.json(items);
  } catch (err) {
    console.error('Tally master/items error:', err.message);
    res.status(502).json({ message: 'Could not fetch from Tally', error: err.message });
  }
});

module.exports = router;
