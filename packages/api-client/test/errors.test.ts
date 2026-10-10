import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError, UnauthorizedError, ValidationError, toApiError } from "../src/errors.js";

describe("API problem mapping", () => {
  it.each([[401, UnauthorizedError], [403, ForbiddenError], [409, ConflictError], [422, ValidationError]] as const)("maps %s to its stable error type", (status, ErrorType) => {
    expect(toApiError(status, "cid", { title: "Problem", status })).toBeInstanceOf(ErrorType);
  });
});
