const jwt = require('jsonwebtoken');
const { logger } = require('../services/loggingService');

module.exports = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    logger.warn('No token, authorization denied');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Add user from payload
    req.user = decoded;
    // Log authentication
    logger.info(`User authenticated: ${decoded.userId}`);

    next();
  } catch (error) {
    logger.error('Token is not valid', { error });
    res.status(401).json({ message: 'Token is not valid' });
  }
};