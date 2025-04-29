/**
 * Application logger with configurable log levels and output formats
 */

// Log levels in order of severity
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Parse log level from environment or default to INFO
const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  
  switch (envLevel) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    case 'none':
      return LogLevel.NONE;
    default:
      return LogLevel.INFO;
  }
};

// Current log level from environment
const currentLogLevel = getLogLevel();

// Whether to include timestamps in logs
const includeTimestamp = process.env.LOG_TIMESTAMPS !== 'false';

// Format a log message with optional metadata
const formatMessage = (message: string, metadata?: any): string => {
  if (!metadata) {
    return message;
  }
  
  // If metadata is an error, extract useful properties
  if (metadata instanceof Error) {
    return `${message}: ${metadata.message}\n${metadata.stack || ''}`;
  }
  
  // Otherwise stringify the metadata
  try {
    return `${message} ${JSON.stringify(metadata, null, 2)}`;
  } catch (e) {
    return `${message} [Metadata cannot be serialized]`;
  }
};

// Format a timestamp for log prefixing
const timestamp = (): string => {
  if (!includeTimestamp) {
    return '';
  }
  
  return `[${new Date().toISOString()}] `;
};

// Logger implementation
const logger = {
  debug(message: string, metadata?: any): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug(`${timestamp()}DEBUG: ${formatMessage(message, metadata)}`);
    }
  },
  
  info(message: string, metadata?: any): void {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(`${timestamp()}INFO: ${formatMessage(message, metadata)}`);
    }
  },
  
  warn(message: string, metadata?: any): void {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(`${timestamp()}WARN: ${formatMessage(message, metadata)}`);
    }
  },
  
  error(message: string, metadata?: any): void {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(`${timestamp()}ERROR: ${formatMessage(message, metadata)}`);
    }
  },
  
  // Monitoring helper for important application events
  event(eventName: string, data?: any): void {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(`${timestamp()}EVENT [${eventName}]: ${data ? JSON.stringify(data) : ''}`);
    }
  },
  
  // Create a child logger with context
  child(context: string) {
    return {
      debug: (message: string, metadata?: any) => 
        logger.debug(`[${context}] ${message}`, metadata),
      info: (message: string, metadata?: any) => 
        logger.info(`[${context}] ${message}`, metadata),
      warn: (message: string, metadata?: any) => 
        logger.warn(`[${context}] ${message}`, metadata),
      error: (message: string, metadata?: any) => 
        logger.error(`[${context}] ${message}`, metadata),
      event: (eventName: string, data?: any) => 
        logger.event(`[${context}] ${eventName}`, data)
    };
  }
};

export default logger;
