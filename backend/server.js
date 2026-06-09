require('dotenv').config();
const express = require('express');
const cors = require('cors');
const initDB = require('./db/init');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const ledgerRoutes = require('./routes/ledger');
const masterRoutes = require('./routes/master');
const reportRoutes = require('./routes/report');
const userRoutes   = require('./routes/users');
const orderRoutes  = require('./routes/orders');
const salesRoutes  = require('./routes/sales');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => { res.setTimeout(300000); next(); });

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/users',  userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales',  salesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'ABS Technologies API running' }));

initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://127.0.0.1:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database init failed:', err.message || err.code || err);
    console.error(err);
    process.exit(1);
  });
