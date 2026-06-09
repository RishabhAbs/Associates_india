const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, (req, res) => {
  res.json({
    status: {
      label: 'Active',
      description: 'System is running smoothly',
      isOnline: true,
    },
    pendingTasks: {
      count: 3,
      description: 'Approvals and Rate audits left',
    },
    notifications: {
      count: 3,
      description: 'Backup database scheduled successfully',
    },
    deliveries: {
      count: 0,
      description: 'Pending deliveries',
    },
  });
});

module.exports = router;
