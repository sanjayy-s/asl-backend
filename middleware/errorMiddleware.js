// backend/middleware/errorMiddleware.js

// Handles requests to routes that do not exist (404 Not Found).
// This middleware should be placed after all other route definitions.
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  // Pass the error to our general error handler below.
  next(error);
};

// A general-purpose error handler that catches all errors passed to `next()`.
// This must be the last piece of middleware added to the app.
const errorHandler = (err, req, res, next) => {
  // If the status code is still 200, it means an error occurred but no specific error code was set.
  // In that case, we default to a 500 Internal Server Error.
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    // For security, only show the detailed error stack in development mode.
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
