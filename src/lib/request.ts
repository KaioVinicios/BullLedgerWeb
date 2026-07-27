import axios, { type AxiosResponse } from "axios";

import {
  apiClientErrorFromBody,
  apiClientErrorFromTransport,
} from "@/lib/apiError";

/**
 * Strips the response envelope at the type level.
 *
 * The schema declares which responses are wrapped: resource operations return
 * `…Envelope` / `Paginated…List` shapes carrying `data`, while the four
 * dj-rest-auth endpoints (`login`, `logout`, `user`, `token/refresh`) return
 * bare bodies. None of those four has a `data` property, so one rule covers
 * both without a per-call decision.
 */
export type Unwrap<T> = T extends { data: infer D } ? D : T;

export function unwrap<T>(body: T): Unwrap<T> {
  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as { data: unknown }).data as Unwrap<T>;
  }

  return body as Unwrap<T>;
}

/**
 * Runs one API call and reduces its outcomes to two: unwrapped data, or a
 * thrown `ApiClientError`. Throwing is what TanStack Query expects, and one
 * error type is what every screen gets to assume.
 *
 * Axios rejects on any non-2xx, so the failure paths converge here: a
 * rejection carrying a response is the server speaking, and a rejection
 * without one never reached it.
 */
export async function request<T>(
  call: Promise<AxiosResponse<T>>,
): Promise<Unwrap<T>> {
  try {
    const response = await call;
    return unwrap(response.data);
  } catch (cause) {
    if (axios.isAxiosError(cause) && cause.response) {
      throw apiClientErrorFromBody(cause.response.data, cause.response.status);
    }

    throw apiClientErrorFromTransport(cause);
  }
}
