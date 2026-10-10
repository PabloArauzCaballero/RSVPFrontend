export type ApiErrorCode = 401 | 403 | 409 | 422;

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly problem?: ProblemDetails;
  public readonly correlationId: string;

  public constructor(status: number, correlationId: string, problem?: ProblemDetails) {
    super(problem?.title ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.correlationId = correlationId;
  }
}

export class UnauthorizedError extends ApiError { public constructor(id: string, p?: ProblemDetails) { super(401, id, p); this.name = "UnauthorizedError"; } }
export class ForbiddenError extends ApiError { public constructor(id: string, p?: ProblemDetails) { super(403, id, p); this.name = "ForbiddenError"; } }
export class ConflictError extends ApiError { public constructor(id: string, p?: ProblemDetails) { super(409, id, p); this.name = "ConflictError"; } }
export class ValidationError extends ApiError { public constructor(id: string, p?: ProblemDetails) { super(422, id, p); this.name = "ValidationError"; } }

export function toApiError(status: number, correlationId: string, problem?: ProblemDetails): ApiError {
  switch (status) {
    case 401: return new UnauthorizedError(correlationId, problem);
    case 403: return new ForbiddenError(correlationId, problem);
    case 409: return new ConflictError(correlationId, problem);
    case 422: return new ValidationError(correlationId, problem);
    default: return new ApiError(status, correlationId, problem);
  }
}
