/**
 * Fetches the live OpenAPI schema into `openapi.yaml`.
 *
 * This runs through Bun rather than as a shell one-liner because Bun loads
 * `.env` for its own runtime but does not inject it into the shell that
 * executes package.json scripts — `$VITE_API_URL` is empty there. In CI the
 * value comes from the workflow environment instead, and this script works
 * unchanged either way.
 */
import { writeFile } from "node:fs/promises";

import { findOpenApiProblem } from "./schema-payload.ts";

const apiUrl = process.env.VITE_API_URL;

if (!apiUrl) {
  console.error(
    "VITE_API_URL is not set. Copy .env.example to .env, or export it in the environment.",
  );
  process.exit(1);
}

const schemaUrl = new URL("/system/schema/", apiUrl);
const response = await fetch(schemaUrl);

if (!response.ok) {
  console.error(
    `Failed to fetch ${schemaUrl.href}: ${response.status} ${response.statusText}`,
  );
  process.exit(1);
}

// A 200 says the request reached *something*, not that the something was the
// API — see `schema-payload.ts`. Checking before the write is what keeps a
// wrong URL from destroying the committed schema.
const body = await response.text();
const problem = findOpenApiProblem({
  url: schemaUrl.href,
  contentType: response.headers.get("content-type"),
  body,
});

if (problem) {
  console.error(problem);
  process.exit(1);
}

await writeFile("openapi.yaml", body);

console.log(`Wrote openapi.yaml from ${schemaUrl.href}`);
