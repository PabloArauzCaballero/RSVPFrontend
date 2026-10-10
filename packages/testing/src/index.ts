import { HttpResponse, http } from "msw";

export const problem = (status: 401 | 403 | 409 | 422, title: string, correlationId = "test-correlation-id") => HttpResponse.json({ title, status, correlationId }, { status, headers: { "x-correlation-id": correlationId } });
export const apiErrorHandlers = (baseUrl: string) => [
  http.get(`${baseUrl}/__test/401`, () => problem(401, "Unauthorized")),
  http.get(`${baseUrl}/__test/403`, () => problem(403, "Forbidden")),
  http.get(`${baseUrl}/__test/409`, () => problem(409, "Conflict")),
  http.get(`${baseUrl}/__test/422`, () => problem(422, "Validation failed"))
];
