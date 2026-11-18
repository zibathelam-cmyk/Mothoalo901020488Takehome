export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: { message: error.message, code: error.code },
    });
  }

  if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
    const tooLarge = error.type === 'entity.too.large';
    return res.status(error.statusCode || 400).json({
      error: {
        message: tooLarge ? 'Request body is too large.' : 'Request body is not valid JSON.',
        code: 'VALIDATION',
      },
    });
  }

  if (error?.code === '23505') {
    return res.status(409).json({
      error: { message: 'That title, ISBN or membership number is already in use.', code: 'DUPLICATE' },
    });
  }

  if (error?.code === '23503') {
    return res.status(400).json({
      error: { message: 'A linked record could not be found.', code: 'BAD_REFERENCE' },
    });
  }

  console.error('[bukahub-api]', error);
  return res.status(500).json({
    error: { message: 'Something went wrong on the server.', code: 'SERVER_ERROR' },
  });
}
