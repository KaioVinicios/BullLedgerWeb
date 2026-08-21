import explainEn from "@/i18n/locales/en/explain.json";

type Resource = typeof explainEn;

/** Every namespace holding entries — `trigger` is the label, not an entry. */
type Namespace = Exclude<keyof Resource, "trigger">;

/**
 * Every metric key the `explain` namespace defines, as `namespace.leaf`.
 *
 * These ids come from the API (`docs/backend/metrics.md`) and are used
 * verbatim as i18n keys, so this type is derived from the English resource
 * rather than written out: adding an entry to the JSON is the only way to add
 * a key, and a call site naming one that does not exist fails the build.
 *
 * `InfoHint` still guards at runtime, because two cases outlive the type: a
 * key present in `en` and missing from `pt`, and a key assembled from data
 * (the account form builds one per registration).
 */
export type ExplainMetric = {
  [N in Namespace]: `${N}.${Extract<keyof Resource[N], string>}`;
}[Namespace];

/**
 * The explainer key for one account registration, or `undefined`.
 *
 * The registration select builds its key from the chosen value, which the
 * type above cannot reach — `ExplainMetric` is a union of literals, and this
 * is a string known only at runtime. The narrowing happens here, once, rather
 * than as a cast at the call site: a cast would also swallow a registration
 * that has no entry, and this returns `undefined` for it instead.
 */
export function registrationMetric(
  registration: string | undefined,
): ExplainMetric | undefined {
  if (!registration) return undefined;

  const key = `account.registration_${registration.toLowerCase()}`;
  return REGISTRATION_METRICS.has(key) ? (key as ExplainMetric) : undefined;
}

const REGISTRATION_METRICS: ReadonlySet<string> = new Set(
  Object.keys(explainEn.account)
    .filter((leaf) => leaf.startsWith("registration_"))
    .map((leaf) => `account.${leaf}`),
);
