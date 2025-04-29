/**
 * Error handling middleware and custom error classes
 */

import logger from '../utils/logger';

// Base application error class
export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    
    // This captures the proper stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
  }
}

// HTTP 400 Bad Request error
export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

// HTTP 401 Unauthorized error
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: any) {
    super(message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

// HTTP 403 Forbidden error
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: any) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

// HTTP 404 Not Found error
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

// HTTP 409 Conflict error
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

// HTTP 422 Unprocessable Entity error
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, details);
    this.name = 'ValidationError';
  }
}

// HTTP 429 Too Many Requests error
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details?: any) {
    super(message, 429, details);
    this.name = 'RateLimitError';
  }
}

// HTTP 500 Internal Server Error (for unexpected errors)
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: any) {
    super(message, 500, details);
    this.name = 'InternalServerError';
  }
}

// Error middleware for Express
export const errorMiddleware = (err: any, req: any, res: any, next: any) => {
  // Default to 500 internal server error if status code is not present
  const statusCode = err.statusCode || 500;
  
  // Create standardized error response
  const errorResponse = {
    success: false,
    error: {
      code: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred',
    },
  };
  
  // Only include details in development environment
  if (process.env.NODE_ENV !== 'production' && err.details) {
    (errorResponse.error as any).details = err.details;
  }
  
  // Log server errors but not client errors
  if (statusCode >= 500) {
    logger.error(`Server error: ${err.message}`, {
      error: err,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn(`Client error (${statusCode}): ${err.message}`, {
      path: req.path,
      method: req.method,
      user: req.user?.id,
    });
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

export default errorMiddleware;
