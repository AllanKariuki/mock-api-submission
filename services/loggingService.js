const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');

// Configure transports
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

// Middleware for request logging
const requestLogger = (req, res, next) => {
  const { method, url, body } = req;

  logger.info(`Request: ${method} ${url}`, {
    body: body ? JSON.stringify(body) : 'No body',
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
    if (chunk) chunks.push(chunk);

    const body = Buffer.concat(chunks).toString('utf8');
    logger.info(`Response: ${method} ${url}`, {
      status: res.statusCode,
      body: body
    });

    oldEnd.apply(res, arguments);
  };

  next();
};

module.exports = {
  logger,
  requestLogger
};