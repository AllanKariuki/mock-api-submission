const express = require('express');
const dotenv = require('dotenv');
const { sequelize } = require('../models');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const loggingService = require('./services/loggingService');
const PORT = process.env.PORT || 3000;
const { User } = require('../models');
const { Transaction } = require('../models');
dotenv.config();

User.associate({ Transaction });
Transaction.associate({ User });
const app = express();

// Middleware
app.use(express.json());
app.use(loggingService.requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Database connection
sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully');
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });