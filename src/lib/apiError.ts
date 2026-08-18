import type { ErrorsKey } from "@/lib/serverMessages";
import type { components } from "@/types/api";

type ApiErrorBody = components["schemas"]["ApiError"];

export type ApiErrorKind =
  "validation" | "auth" | "notFound" | "server" | "network" | "malformed";

/** The key the server groups general, non-field problems under. */
export const NON_FIELD_ERRORS = "non_field_errors";
/** The key a scalar problem (404, 405, 401) arrives under — always an array. */
export const DETAIL = "detail";
/**
 * Django's *other* non-field key, used when a **model** constraint fails rather
 * than a serializer rule — the two travel different paths and only the
 * serializer one becomes `non_field_errors`.
 *
 * Found in the Phase 9 live walk: a second target on a scope that already has
 * one is rejected as `{"__all__": ["Constraint “target_unique_holding” is
 * violated."]}`. Read as a field name it belongs to no input, so
 * `claimFieldErrors` prefixed the sentence with the key and printed
 * `__all__: …` at the user. It is a form-level problem and is grouped as one.
 */
export const ALL_FIELDS = "__all__";

interface ApiClientErrorInit {
  status: number;
  kind: ApiErrorKind;
  message: string;
  /**
   * Key in the `errors` namespace for a client-generated message; absent when
   * the server spoke for itself. Unprefixed, because every consumer holds a `t`
   * already scoped to that namespace, and typed against the English locale so a
   * key that does not exist fails the build rather than rendering raw.
   */
  messageKey?: ErrorsKey;
  fields?: Record<string, string[]>;
  /**
   * The stable code behind each message in `fields`, same shape and keys.
   * Optional even though the server always sends it: a body normalized before
   * this field existed (an older fixture, a hand-built test double) should
   * still produce a usable error rather than fail validation over a field
   * nothing here has read yet.
   */
  codes?: Record<string, string[]>;
  /**
   * The structured values behind each message in `fields`, same shape and
   * keys, so a translated sentence keeps its figures. Money arrives as
   * `{amount, currency}` and decimals and dates as strings — the server sends
   * the figure, never its spelling, because `BRL 1,000.00` is correct English
   * and wrong Portuguese for the same number.
   *
   * Optional for the same reason `codes` is, and for one more: the server
   * omits the key entirely when no message on the response takes a parameter,
   * so its absence is the common case rather than an old body.
   */
  params?: Record<string, Record<string, unknown>[]>;
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
  readonly messageKey?: ErrorsKey;
  readonly fields: Readonly<Record<string, string[]>>;
  readonly codes: Readonly<Record<string, string[]>>;
  readonly params: Readonly<Record<string, Record<string, unknown>[]>>;

  constructor(init: ApiClientErrorInit) {
    super(init.message, { cause: init.cause });
    this.name = "ApiClientError";
    this.status = init.status;
    this.kind = init.kind;
    this.messageKey = init.messageKey;
    this.fields = Object.freeze({ ...(init.fields ?? {}) });
    this.codes = Object.freeze({ ...(init.codes ?? {}) });
    this.params = Object.freeze({ ...(init.params ?? {}) });
  }

  /** Messages for one field, addressed by its exact key (`steps.0.rate`). */
  fieldErrors(key: string): string[] {
    return this.fields[key] ?? [];
  }

  /** The stable codes behind one field's messages, in the same order. */
  fieldCodes(key: string): string[] {
    return this.codes[key] ?? [];
  }

  /** The structured values behind one field's messages, in the same order. */
  fieldParams(key: string): Record<string, unknown>[] {
    return this.params[key] ?? [];
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

/** `{ field: [message, ...] }` — the shape both `errors` and `codes` share. */
function isMessageMap(value: unknown): value is Record<string, string[]> {
  if (typeof value !== "object" || value === null) return false;

  return Object.values(value as Record<string, unknown>).every(
    (messages) =>
      Array.isArray(messages) &&
      messages.every((message) => typeof message === "string"),
  );
}

/** `{ field: [{...}, ...] }` — the shape `params` travels in. */
function isParamsMap(
  value: unknown,
): value is Record<string, Record<string, unknown>[]> {
  if (typeof value !== "object" || value === null) return false;

  return Object.values(value as Record<string, unknown>).every(
    (entries) =>
      Array.isArray(entries) &&
      entries.every(
        (entry) =>
          typeof entry === "object" && entry !== null && !Array.isArray(entry),
      ),
  );
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null) return false;

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.message !== "string") return false;
  if (!isMessageMap(candidate.errors)) return false;
  // `codes` is validated when present but not required: see the comment on
  // ApiClientErrorInit.codes.
  if (candidate.codes !== undefined && !isMessageMap(candidate.codes)) {
    return false;
  }
  if (candidate.params !== undefined && !isParamsMap(candidate.params)) {
    return false;
  }

  return true;
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
      messageKey: "unexpected",
    });
  }

  return new ApiClientError({
    status,
    kind: kindForStatus(status),
    message: body.message,
    fields: body.errors,
    codes: body.codes,
    params: body.params,
  });
}

/** Normalizes a thrown fetch: network down, timeout, DNS, CORS. */
export function apiClientErrorFromTransport(cause: unknown): ApiClientError {
  return new ApiClientError({
    status: 0,
    kind: "network",
    message: "The request could not reach the server.",
    messageKey: "network",
    cause,
  });
}
