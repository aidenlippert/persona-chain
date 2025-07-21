import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.align(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define which transports to use
const transports: winston.transport[] = [];

// Always use console transport
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? format : consoleFormat,
  })
);

// In production, also log to files
if (process.env.NODE_ENV === 'production') {
  // Log all levels to combined.log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'combined.log'),
      format,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Log only errors to error.log
  transports.push(
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
      level: 'error',
      format,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream for Morgan HTTP logger
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Add request logger helper
export const logRequest = (req: any, res: any, responseTime: number) => {
  const logData = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };

  if (res.statusCode >= 400) {
    logger.warn('Request failed', logData);
  } else {
    logger.info('Request completed', logData);
  }
};

// Add error logger helper
export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

// Export log levels for use in other modules
export const logLevels = levels;