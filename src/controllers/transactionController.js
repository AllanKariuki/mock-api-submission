const { sequelize, User, Transaction } = require('../../models');
const { Op } = require('sequelize');
const { logger } = require('../services/loggingService');
const { sendTransactionNotification } = require('../services/queueingService');
// const mqService = require('../services/mqService');

// Transfer funds between accounts
const transferFunds = async ({ sender_id, recipient_id, amount, description }) => {
  // Start a database transaction
  const transaction = await sequelize.transaction();

  try {
    // Validate sender and recipient are different
    if (sender_id === recipient_id) {
      throw new Error('Sender and recipient cannot be the same');
    }

    // Find sender and recipient
    const sender = await User.findByPk(sender_id, { transaction });
    const recipient = await User.findByPk(recipient_id, { transaction });

    // Validate users exist
    if (!sender || !recipient) {
      throw new Error('Sender or recipient account not found');
    }

    // Check sufficient balance
    if (sender.account_balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Update account balances
    await sender.decrement('account_balance', { by: amount, transaction });
    await recipient.increment('account_balance', { by: amount, transaction });

    // Create transaction record
    const transactionRecord = await Transaction.create({
      sender_id,
      recipient_id,
      amount,
      description,
      status: 'COMPLETED'
    }, { transaction });

    // Commit the transaction
    await transaction.commit();

    // Log the transaction
    logger.info(`Fund transfer successful`, {
      sender_id,
      recipient_id,
      amount,
      transactionId: transactionRecord.id
    });

    // Send message to queue (optional)
    await sendTransactionNotification({
      type: 'TRANSFER',
      sender_id,
      recipient_id,
      amount
    });

    return {
      success: true,
      message: 'Fund transfer successful',
      transactionId: transactionRecord.id
    };
  } catch (error) {
    // Rollback the transaction
    await transaction.rollback();

    // Log the error
    logger.error('Fund transfer failed', {
      sender_id,
      recipient_id,
      amount,
      error: error.message
    });

    return {
      success: false,
      message: error.message
    };
  }
};

// Get account balance
const getAccountBalance = async (user_id) => {
  try {
    const user = await User.findByPk(user_id, {
      attributes: ['account_balance']
    });

    if (!user) {
      throw new Error('User not found');
    }
    logger.info(`Balance retrieved for user ${user_id}`);

    return user.account_balance;
  } catch (error) {
    logger.error('Error retrieving account balance', {
      user_id,
      error: error.message
    });
    throw error;
  }
};

// Get transaction history
const getTransactionHistory = async (user_id, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    const transactions = await Transaction.findAndCountAll({
      where: {
        [Op.or]: [
          { sender_id: user_id },
          { recipient_id: user_id }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['username', 'phone_number']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['username', 'phone_number']
        }
      ]
    });

    logger.info(`Transaction history retrieved for user ${user_id}`, {
      page,
      total: transactions.count
    });

    return transactions;
  } catch (error) {
    logger.error('Error retrieving transaction history', {
      user_id,
      error: error.message
    });
    throw error;
  }
};

// Simulate M-Pesa Transaction
const simulateMpesaTransaction = async ({ user_id, phone_number, amount, transaction_type }) => {
  const transaction = await sequelize.transaction();

  try {
    // Find user
    const user = await User.findByPk(user_id, { transaction });
    if (!user) {
      throw new Error('User not found');
    }

    // Create transaction record
    const transactionRecord = await Transaction.create({
      sender_id: user_id,
      recipient_id: null, // M-Pesa transactions might not have a direct recipient
      amount,
      description: `M-Pesa ${transaction_type} via ${phone_number}`,
      status: 'COMPLETED'
    }, { transaction });

    // Update user balance based on transaction type
    if (transaction_type === 'DEPOSIT') {
      await user.increment('account_balance', { by: amount, transaction });
    } else if (transaction_type === 'WITHDRAWAL') {
      if (user.account_balance < amount) {
        throw new Error('Insufficient funds for withdrawal');
      }
      await user.decrement('account_balance', { by: amount, transaction });
    }

    // Commit transaction
    await transaction.commit();

    // Log the simulated transaction
    logger.info(`Simulated M-Pesa ${transaction_type}`, {
      user_id,
      phone_number,
      amount,
      transactionId: transactionRecord.id
    });

    // Send message to queue
    await sendTransactionNotification({
      type: `MPESA_${transaction_type}`,
      user_id,
      phone_number,
      amount
    });

    return {
      success: true,
      message: `M-Pesa ${transaction_type} successful`,
      transactionId: transactionRecord.id
    };
  } catch (error) {
    // Rollback the transaction
    await transaction.rollback();

    // Log the error
    logger.error(`Simulated M-Pesa ${transaction_type} failed`, {
      user_id,
      phone_number,
      amount,
      error: error.message
    });

    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = {
  transferFunds,
  getAccountBalance,
  getTransactionHistory,
  simulateMpesaTransaction
};