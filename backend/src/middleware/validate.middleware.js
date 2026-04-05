export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      ...req.body,
      ...req.query,
      ...req.params,
    });
    if (!result.success) {
      const message = result.error.errors?.map((e) => e.path.join('.') + ': ' + e.message).join('; ') || 'Validation failed';
      return next({ statusCode: 400, message });
    }
    req.validated = result.data;
    next();
  };
}
