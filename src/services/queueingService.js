const amqp = require('amqplib');
const { logger } = require('./loggingService');

// Constants
const TRANSACTION_QUEUE = 'transaction_notifications';

// Establish connection to RabbitMQ
const connect = async () => {
  try {
    // Reuse existing connection if possible
    if (connect.connection) {
      return connect.channel;
    }

    // Establish new connection
    connect.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    connect.channel = await connect.connection.createChannel();

    // Ensure queue exists
    await connect.channel.assertQueue(TRANSACTION_QUEUE, { durable: true });

    logger.info('Connected to RabbitMQ');
    return connect.channel;
  } catch (error) {
    logger.error('RabbitMQ connection error', { error: error.message });
    throw error;
  }
};

// Attach static properties to the function
connect.connection = null;
connect.channel = null;

// Send transaction notification to queue
const sendTransactionNotification = async (transactionData) => {
  try {
    // Ensure connection
    const channel = await connect();

    // Send message to queue
    channel.sendToQueue(
      TRANSACTION_QUEUE,
      Buffer.from(JSON.stringify(transactionData)),
      { persistent: true }
    );

    logger.info('Transaction notification sent to queue', {
      type: transactionData.type
    });
  } catch (error) {
    logger.error('Error sending transaction notification', {
      error: error.message,
      data: transactionData
    });
  }
};

// Consume messages from queue (for notification service)
const consumeTransactionNotifications = async (callback) => {
  try {
    const channel = await connect();

    // Consume messages
    channel.consume(TRANSACTION_QUEUE, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing transaction notification', {
            error: error.message
          });
          channel.nack(msg, false, false);
        }
      }
    });

    logger.info('Started consuming transaction notifications');
  } catch (error) {
    logger.error('Error setting up message consumption', { error: error.message });
  }
};

// Close connection (optional, for cleanup)
const closeConnection = async () => {
  try {
    if (connect.connection) {
      await connect.connection.close();
      connect.connection = null;
      connect.channel = null;
      logger.info('RabbitMQ connection closed');
    }
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', { error: error.message });
  }
};

module.exports = {
  connect,
  sendTransactionNotification,
  consumeTransactionNotifications,
  closeConnection
};