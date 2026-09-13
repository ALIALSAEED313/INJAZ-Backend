function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
}
module.exports = errorHandler;