import type { components } from "@/types/api";

type ApiErrorBody = components["schemas"]["ApiError"];

export type ApiErrorKind =
  "validation" | "auth" | "notFound" | "server" | "network" | "malformed";

/** The key the server groups general, non-field problems under. */
export const NON_FIELD_ERRORS = "non_field_errors";
/** The key a scalar problem (404, 405, 401) arrives under — always an array. */
export const DETAIL = "detail";

interface ApiClientErrorInit {
  status: number;
  kind: ApiErrorKind;
  message: string;
  /** i18n key for client-generated messages; absent when the server spoke. */
  messageKey?: string;
  fields?: Record<string, string[]>;
  cause?: unknown;
}

/**
 * The single client-side failure shape. Every way a request can fail — a
 * validation error, an expired session, a 500, a network outage, a body that
 * is not JSON — arrives here, so no screen ever has two ways to fail.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly messageKey?: string;
  readonly fields: Readonly<Record<string, string[]>>;

  constructor(init: ApiClientErrorInit) {
    super(init.message, { cause: init.cause });
    this.name = "ApiClientError";
    this.status = init.status;
    this.kind = init.kind;
    this.messageKey = init.messageKey;
    this.fields = Object.freeze({ ...(init.fields ?? {}) });
  }

  /** Messages for one field, addressed by its exact key (`steps.0.rate`). */
  fieldErrors(key: string): string[] {
    return this.fields[key] ?? [];
  }

  get nonFieldErrors(): string[] {
    return this.fieldErrors(NON_FIELD_ERRORS);
  }

  get detail(): string[] {
    return this.fieldErrors(DETAIL);
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "notFound";
  if (status >= 500) return "server";
  return "validation";
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null) return false;

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.message !== "string") return false;
  if (typeof candidate.errors !== "object" || candidate.errors === null) {
    return false;
  }

  return Object.values(candidate.errors as Record<string, unknown>).every(
    (messages) =>
      Array.isArray(messages) &&
      messages.every((message) => typeof message === "string"),
  );
}

/**
 * Normalizes an already-parsed error body.
 *
 * A body that does not conform is reported as `malformed` with a generic
 * message key — never with the payload itself. The live API currently answers
 * `POST /api/auth/login/` with a Django debug page, so this path is exercised
 * in practice, and letting that reach a user would leak a stack trace.
 */
export function apiClientErrorFromBody(
  body: unknown,
  status: number,
): ApiClientError {
  if (!isApiErrorBody(body)) {
    return new ApiClientError({
      status,
      kind: "malformed",
      message: `The server returned an unreadable ${status} response.`,
      messageKey: "errors:unexpected",
    });
  }

  return new ApiClientError({
    status,
    kind: kindForStatus(status),
    message: body.message,
    fields: body.errors,
  });
}

/** Normalizes a thrown fetch: network down, timeout, DNS, CORS. */
export function apiClientErrorFromTransport(cause: unknown): ApiClientError {
  return new ApiClientError({
    status: 0,
    kind: "network",
    message: "The request could not reach the server.",
    messageKey: "errors:network",
    cause,
  });
}
