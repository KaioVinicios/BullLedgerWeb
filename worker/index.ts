/**
 * Puts the API on the SPA's own origin.
 *
 * `wrangler.jsonc` runs this Worker on `/api/*` and `/system/*` and nothing
 * else; every other path is served off the static asset network without an
 * invocation. So this file has exactly one job — hand those two prefixes to
 * `API_ORIGIN` unchanged and return what comes back.
 *
 * What the arrangement buys is narrower than "it fixes the cookies", and the
 * difference is worth stating so nobody re-derives it wrongly. A second
 * subdomain of `voynan.com` would be a different *origin* but the same
 * *site*, and `SameSite` reasons about sites — so the httpOnly JWT cookies
 * already work at the API's `SameSite=Lax`, cross-origin or not.
 *
 * What goes away is CORS. Cross-origin means every unsafe request pays a
 * preflight round trip before the real one, and it means `CORS_ALLOWED_ORIGINS`
 * and `CSRF_TRUSTED_ORIGINS` on the API have to stay in step with wherever the
 * SPA happens to be deployed — a coupling that is invisible until it breaks in
 * production. On one origin the preflight disappears and the browser has
 * nothing to police.
 */

interface Env {
  API_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.API_ORIGIN.trim();

    // Blank until the API's new home is decided. Saying so in the response is
    // worth the four lines: the alternative is `fetch` throwing on an unparsed
    // URL, which surfaces as a bare 1101 in the dashboard and explains nothing.
    if (!origin) {
      return new Response(
        "API_ORIGIN is not set. Set it in wrangler.jsonc and redeploy.",
        { status: 503, headers: { "content-type": "text/plain" } },
      );
    }

    const target = new URL(request.url);
    const upstream = new URL(origin);
    target.protocol = upstream.protocol;
    target.host = upstream.host;

    // `new Request(url, request)` carries the method, headers and body over,
    // and the runtime derives `Host` from the URL — so the API sees its own
    // hostname and routes normally, while `Origin` stays as the browser sent
    // it. That last part is what Django's CSRF check reads, which is why the
    // API needs this hostname in `CSRF_TRUSTED_ORIGINS`.
    //
    // `redirect: "manual"` because a proxy must not resolve redirects on the
    // client's behalf. Following them here would swallow the `Location` the
    // browser needs and return the wrong URL's body under the original URL.
    return fetch(new Request(target, request), { redirect: "manual" });
  },
};
