export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function httpError(status, code, message, details = undefined) {
  return new HttpError(status, code, message, details);
}

export function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function sendError(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const status = error instanceof HttpError ? error.status : 500;
  const code = error instanceof HttpError ? error.code : 'internal_error';
  const message =
    error instanceof HttpError ? error.message : 'Não foi possível concluir a operação.';

  response.status(status).json({
    error: {
      code,
      message,
      ...(error.details ? { details: error.details } : {}),
      requestId: request.requestId
    }
  });
}
