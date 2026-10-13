function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Expected client errors (wrong password, validation, 404s…) get one line;
  // only real failures need the stack.
  if (err.status && err.status < 500) {
    console.warn(`${req.method} ${req.originalUrl} → ${err.status} ${err.code || ''} ${err.message}`);
  } else {
    console.error(err);
  }

  if (err.code === 'FK_VIOLATION') {
    return res.status(400).json({ error: { message: err.message || 'Referenced record does not exist', code: 'FOREIGN_KEY_VIOLATION' } });
  }

  const status = err.status || 500;
  return res.status(status).json({ error: { message: err.message || 'Internal server error', code: err.code || 'INTERNAL_ERROR' } });
}

module.exports = { notFoundHandler, errorHandler };
