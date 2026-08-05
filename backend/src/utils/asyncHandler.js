/**
 * Wraps async route handlers so thrown errors are passed to Express error middleware.
 * Compatible with express-async-handler style.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
