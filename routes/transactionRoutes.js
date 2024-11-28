const express = require('express');
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Transfer Funds (Protected Route)
router.post('/transfer', [
  authMiddleware,
  body('recipient_id').isInt().withMessage('Recipient ID must be an integer'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { recipient_id, amount, description } = req.body;
    const sender_id = req.user.userId;

    const result = await transactionController.transferFunds({
      sender_id,
      recipient_id,
      amount,
      description
    });

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during fund transfer',
      error: error.message
    });
  }
});

// Get Account Balance (Protected Route)
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const balance = await transactionController.getAccountBalance(req.user.userId);
    res.json({
      success: true,
      balance: balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving account balance',
      error: error.message
    });
  }
});

// Get Transaction History (Protected Route)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const transactions = await transactionController.getTransactionHistory(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      transactions: transactions.rows,
      total: transactions.count,
      page: parseInt(page),
      totalPages: Math.ceil(transactions.count / limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving transaction history',
      error: error.message
    });
  }
});

// Simulate M-Pesa Transaction (for testing)
router.post('/simulate-mpesa', [
  authMiddleware,
  body('phone_number').isMobilePhone(),
  body('amount').isFloat({ min: 0.01 }),
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { phone_number, amount, transaction_type } = req.body;

    const result = await transactionController.simulateMpesaTransaction({
      user_id: req.user.userId,
      phone_number,
      amount,
      transaction_type
    });

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error simulating M-Pesa transaction',
      error: error.message
    });
  }
});

module.exports = router;