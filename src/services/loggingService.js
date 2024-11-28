const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');

// Create log transports
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
});

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'transaction-service' },
  transports: [
    fileRotateTransport,
    consoleTransport
  ]
});

// Safe stringify function
const safeStringify = (obj) => {
  try {
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
  } catch {
    return String(obj);
  }
};

// Middleware for request logging
const requestLogger = (req, res, next) => {
  const { method, url, body } = req;
  const startTime = Date.now();

  // Log request
  logger.info(`Request: ${method} ${url}`, {
    body: body ? safeStringify(body) : 'No body',
    headers: req.headers
  });

  // Capture response
  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks = [];

  res.write = function(chunk) {
    chunks.push(chunk);
    return oldWrite.apply(res, arguments);
  };

  res.end = function(chunk) {
    if (chunk) {
      chunks.push(chunk);
    }

    // Convert chunks to string safely
    let responseBody = '';
    try {
      const buffer = Buffer.concat(chunks);
      responseBody = buffer.toString('utf8');
    } catch (error) {
      responseBody = 'Unable to parse response';
      logger.warn('Error parsing response body', { error: error.message });
    }

    // Log response
    logger.info(`Response: ${method} ${url}`, {
      status: res.statusCode,
      duration: Date.now() - startTime + 'ms',
      body: responseBody ? safeStringify(responseBody).slice(0, 1000) : 'No body'
    });

    return oldEnd.apply(res, arguments);
  };

  next();
};

module.exports = {
  logger,
  requestLogger
};