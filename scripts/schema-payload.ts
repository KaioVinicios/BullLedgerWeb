/**
 * Decides whether a response body is actually an OpenAPI document.
 *
 * `fetch-schema.ts` overwrites `openapi.yaml` with whatever the schema URL
 * returns, and a 200 is not evidence that what came back is a schema. The SPA
 * and the API now share a hostname, so a `/system/` path that misses the
 * Worker's proxy is answered by the asset network's single-page fallback: the
 * app shell, with a 200 and no error anywhere. Written to `openapi.yaml`, it
 * replaces a good spec with HTML, and the first complaint arrives from
 * `openapi-typescript` pointing at a line of the theme script — a message that
 * describes the wreckage rather than the cause.
 *
 * So the payload is judged by its own first line rather than by the status or
 * the content type. Servers disagree about the type (`application/
 * vnd.oai.openapi`, `+json`, `text/yaml`, `application/octet-stream`), but
 * every OpenAPI document opens by naming its version.
 */

/** Anything before the version key that YAML allows: comments, blank lines,
 * and the directives-end marker drf-spectacular may emit. */
const IGNORABLE_LINE = /^(#.*|---)?$/;

const YAML_VERSION_KEY = /^(openapi|swagger)\s*:/;
const JSON_VERSION_KEY = /"(openapi|swagger)"\s*:/;

/** Long enough to recognise a payload, short enough to stay readable in a log. */
const SNIPPET_LIMIT = 80;

interface SchemaPayload {
  /** The URL that was fetched, so the message names what to go and look at. */
  url: string;
  /** The response's content type, or null when the server sent none. */
  contentType: string | null;
  /** The response body, verbatim. */
  body: string;
}

/**
 * Returns null when `body` is an OpenAPI document, or a message explaining
 * what arrived instead. The message is written for whoever reads a failed CI
 * log, so it names the URL, what came back, and why that happens here.
 */
export function findOpenApiProblem({
  url,
  contentType,
  body,
}: SchemaPayload): string | null {
  // A UTF-8 BOM survives `response.text()` and would keep the version key from
  // matching at the start of the line.
  const text = body.replace(/^\uFEFF/, "");
  const type = contentType ?? "no content type";

  if (text.trim() === "") {
    return `${url} returned an empty body (${type}). openapi.yaml was left unchanged.`;
  }

  if (looksLikeSchema(text)) return null;

  return [
    `${url} did not return an OpenAPI document (${type}).`,
    `It answered with: ${firstMeaningfulLine(text) ?? "comments and blank lines only"}`,
    "openapi.yaml was left unchanged.",
    "Check that VITE_API_URL points at the API. The SPA and the API share a",
    "hostname, so a /system/ path that is not proxied to the API answers with",
    "the app shell instead of the schema.",
  ].join("\n");
}

function looksLikeSchema(text: string): boolean {
  // A JSON document keeps the version key on the same line as everything else
  // when it is not pretty-printed, so the whole body is the only safe haystack.
  if (text.trimStart().startsWith("{")) return JSON_VERSION_KEY.test(text);

  const line = firstMeaningfulLine(text, { truncate: false });

  return line !== null && YAML_VERSION_KEY.test(line);
}

function firstMeaningfulLine(
  text: string,
  { truncate = true } = {},
): string | null {
  for (const raw of text.split("\n")) {
    const line = raw.trim();

    if (IGNORABLE_LINE.test(line)) continue;

    return truncate && line.length > SNIPPET_LIMIT
      ? `${line.slice(0, SNIPPET_LIMIT)}…`
      : line;
  }

  return null;
}
