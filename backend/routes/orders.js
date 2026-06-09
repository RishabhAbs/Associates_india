const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// In-memory orders store
const orders = [];

// GET /api/orders
router.get('/', authMiddleware, (req, res) => {
  res.json(orders);
});

// POST /api/orders
router.post('/', authMiddleware, (req, res) => {
  const { customer, date, items, notes, total } = req.body;
  if (!customer) return res.status(400).json({ message: 'Customer is required' });

  const order = {
    id: Date.now(),
    customer: typeof customer === 'object' ? customer.name || customer : customer,
    date: date || new Date().toISOString().split('T')[0],
    items: items || [],
    notes: notes || '',
    total: total || 0,
    status: 'Draft',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

module.exports = router;
