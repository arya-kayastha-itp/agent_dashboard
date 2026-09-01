function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === '23505') {
    return res.status(409).json({ error: { message: 'Duplicate entry', code: 'CONFLICT' } });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: { message: 'Referenced record does not exist', code: 'FOREIGN_KEY_VIOLATION' } });
  }
  if (err.code === '23514' || err.code === '22P02') {
    return res.status(400).json({ error: { message: 'Invalid data', code: 'BAD_INPUT' } });
  }

  const status = err.status || 500;
  return res.status(status).json({ error: { message: err.message || 'Internal server error', code: err.code || 'INTERNAL_ERROR' } });
}

module.exports = { notFoundHandler, errorHandler };
