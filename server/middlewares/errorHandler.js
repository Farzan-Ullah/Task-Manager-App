/**
 * Centralized error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Handle Mongoose CastError (e.g. invalid ObjectId or cast failure)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid identifier or parameter: ${err.value}`,
      code: "INVALID_ID_FORMAT",
    });
  }

  console.error("API Error:", err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message = err.message || "An unexpected error occurred";

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
