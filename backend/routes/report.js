const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getOutstandingReport } = require('../utils/tally');

const router = express.Router();

// GET /api/report/outstanding
router.get('/outstanding', authMiddleware, async (req, res) => {
  try {
    const data = await getOutstandingReport();
    res.json(data);
  } catch (err) {
    console.error('Tally report/outstanding error:', err.message);
    res.status(502).json({ message: 'Could not fetch from Tally', error: err.message });
  }
});

module.exports = router;
