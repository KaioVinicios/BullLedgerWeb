import { z } from "zod";

import { PATHS } from "@/routes/path";

/**
 * Where to send a user after they sign in.
 *
 * This is a security boundary, not a formatting nicety. The value arrives from
 * the URL, so an attacker can craft `/login?redirect=https://evil.example` and
 * turn a genuine login into an off-origin redirect. A leading `/` that is not
 * followed by a second `/` is exactly the set of same-origin relative paths,
 * which rules out both `//evil.example` and any absolute URL.
 *
 * `.catch()` rather than a thrown error, matching `pageSchema`: someone who
 * followed a mangled link should land in the app, not on a router error page.
 */
export const redirectSchema = z
  .string()
  .refine((value) => value.startsWith("/") && !value.startsWith("//"))
  .catch(PATHS.APP);

/**
 * The search params every guarded-entry auth route accepts.
 *
 * `.optional()` rather than `.default()`, for two reasons. Without either,
 * Zod marks `redirect` required and TanStack Router demands a `search` prop on
 * every `<Link to="/login">` in the app. With `.default()`, the router
 * serializes the filled-in value straight back out, so a plain `/login`
 * silently becomes `/login?redirect=%2Fapp` — a return path nobody asked for.
 *
 * Optional keeps the URL honest: absent means absent. Read it as
 * `search.redirect ?? PATHS.APP`. The safety guarantee is unaffected — a
 * *present* value still passes through `redirectSchema`'s same-origin check.
 */
export const authSearchSchema = z.object({
  redirect: redirectSchema.optional(),
});

export type AuthSearch = z.infer<typeof authSearchSchema>;
