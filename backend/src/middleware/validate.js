function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: result.error.flatten() },
      });
    }
    req.validatedBody = result.data;
    return next();
  };
}

module.exports = { validateBody };
