/**
 * Authoring a target: where it applies, the rate ladder, and an optional floor.
 *
 * **The scope is chosen once and never again.** `PatchedTargetUpdateRequest` is
 * a union of three structurally identical members carrying only
 * `loss_limit_pct`, `loss_limit_period`, and `steps` — no discriminator and
 * none of the scope fields. That is the schema saying a target for a different
 * scope is a different target, so on edit the scope renders as a badge, the way
 * `AssetForm` renders archetype.
 *
 * **One flat state, the union assembled at the wire.** Every level's fields
 * live in one object and `toTargetRequest` picks the member. Nested per-scope
 * state would be tidier to read and worse to use: choosing the wrong level and
 * choosing back would discard what was typed.
 *
 * **The one-per-scope rule is surfaced, not made unreachable.** The scope stays
 * freely selectable; the moment it resolves to an existing non-archived target,
 * the rest of the form is replaced by a block naming that target and linking to
 * it. An absent option could not have said *why*, and here the why — you
 * already own one, edit it — is the useful part.
 *
 * **The fields read beside what they add up to.** `TargetSummaryPanel` renders
 * the draft through the same `describeDraft` the list card and the holding
 * block use, so a user reads the target in the app's words *while* authoring it
 * rather than discovering them after saving. The three field groups are their
 * own components — this file assembles them, holds the form state, and owns the
 * wire.
 */
import { useMemo, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";

import { FormError } from "@/components/FormError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  claimFieldErrors,
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import { FloorField } from "@/pages/Targets/FloorField";
import { ScopeField } from "@/pages/Targets/ScopeField";
import { StepsEditor } from "@/pages/Targets/StepsEditor";
import { TargetSummaryPanel } from "@/pages/Targets/TargetSummaryPanel";
import { PATHS } from "@/routes/path";
import { ARCHETYPES, PERIODS, TARGET_SCOPES } from "@/schemas/apiEnums";
import { allAccountsQuery } from "@/services/accounts";
import { allAssetsQuery } from "@/services/assets";
import {
  createTarget,
  invalidateTargets,
  targetsInScopeQuery,
  updateTarget,
  type Target,
} from "@/services/targets";
import {
  isScopeComplete,
  matchesScope,
  selectionScopeName,
  targetScopeName,
  type ScopeSelection,
} from "@/utils/targetScope";
import { describeDraft } from "@/utils/targetSentence";
import {
  defaultFormValues,
  toTargetRequest,
  toTargetUpdate,
  validateFormValues,
  type TargetFormValues,
} from "@/utils/targetWire";

const NO_SERVER_ERRORS: PartitionedServerErrors = {
  fieldErrors: {},
  formErrors: [],
};

/**
 * Server keys with an input here. `steps` claims its own dotted children —
 * `claimFieldErrors` treats a claim as covering `steps.0.rate` — so an indexed
 * rejection reaches the row rather than the banner, and anything the form does
 * not render still reaches the banner rather than nowhere.
 */
const CLAIMED_FIELDS = [
  "scope",
  "account",
  "asset",
  "archetype",
  "steps",
  "loss_limit_pct",
  "loss_limit_period",
] as const;

export function TargetForm({
  target,
  prefill = {},
}: {
  target?: Target;
  prefill?: Partial<ScopeSelection>;
}) {
  const { t } = useTranslation("app");
  const { t: tError } = useTranslation("errors");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = useFormatLocale();
  const [serverErrors, setServerErrors] =
    useState<PartitionedServerErrors>(NO_SERVER_ERRORS);
  // Client-side refusals, keyed the way the server keys its own, so both
  // render through one path. See `validateFormValues`.
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>(
    {},
  );

  // Every page, not the first fifty — the same lookups the list screen walks.
  // A target names an account and an asset by id and carries no label of its
  // own, so a form that only held page one would print a UUID at the fifty-
  // first account, in the summary panel and in the success toast alike.
  const accountList = useQuery(allAccountsQuery);
  const assetList = useQuery(allAssetsQuery);

  const accounts = useMemo(() => accountList.data ?? [], [accountList.data]);
  const assets = useMemo(() => assetList.data ?? [], [assetList.data]);

  /**
   * Whether an empty list means "none exist" yet.
   *
   * An array that has not arrived and an array with nothing in it are the same
   * `[]`, and `ScopeField` turns an empty one into "no accounts to choose
   * from" — a sentence that would be wrong for as long as the request is in
   * flight. The query state is the only thing that tells them apart and it
   * lives here, so the scope block waits rather than guessing. `LotSelect`
   * settles the same question the same way; an errored query counts as settled
   * there and here, because a list that failed to load is not going to fill in
   * by being waited on.
   */
  const listsSettled =
    (accountList.isSuccess || accountList.isError) &&
    (assetList.isSuccess || assetList.isError);

  /**
   * Whether the scope is answerable — either it is not a control at all, or its
   * controls are on screen rather than still a skeleton.
   *
   * The submit is held on this, and not only the fields. While the lookups walk
   * their pages the scope block is a skeleton, but the footer is still there:
   * without this a user could type a rate and press Create, `superRefine` would
   * raise "Choose an account.", and that message would be handed to an
   * unmounted `ScopeField` and render nowhere — the same silent refusal, reached
   * through a different door. `listAllAccounts` walks pages *sequentially*, so
   * on a large tenant that window is several serial round trips, not a frame.
   */
  const scopeReady = Boolean(target) || listsSettled;

  /**
   * Names resolve from **every** row, archived included: a target authored
   * before its account was archived still has to say that account's name on
   * edit. The options offered below are live-only, which is what the
   * non-archived queries this replaced returned — archiving something is a
   * statement that it should stop being chosen.
   */
  const names = useMemo(
    () => ({
      accountName: (id: string) =>
        accounts.find((row) => row.id === id)?.name ?? id,
      assetName: (id: string) =>
        assets.find((row) => row.id === id)?.name ?? id,
    }),
    [accounts, assets],
  );

  const liveAccounts = useMemo(
    () => accounts.filter((row) => row.archived_at === null),
    [accounts],
  );
  const liveAssets = useMemo(
    () => assets.filter((row) => row.archived_at === null),
    [assets],
  );

  const schema = useMemo(
    () =>
      z
        .object({
          scope: z.enum(TARGET_SCOPES),
          account: z.string(),
          asset: z.string(),
          archetype: z.enum(ARCHETYPES),
          steps: z
            .array(
              z.object({
                from_month: z.string(),
                rate: z.string(),
                rate_period: z.enum(PERIODS),
              }),
            )
            .min(1),
          floorEnabled: z.boolean(),
          loss_limit_pct: z.string(),
          loss_limit_period: z.enum(PERIODS),
        })
        .superRefine((value, ctx) => {
          if (value.scope !== "PORTFOLIO_ARCHETYPE" && value.account === "") {
            ctx.addIssue({
              code: "custom",
              path: ["account"],
              message: t("targets.form.errors.account"),
            });
          }
          if (value.scope === "HOLDING" && value.asset === "") {
            ctx.addIssue({
              code: "custom",
              path: ["asset"],
              message: t("targets.form.errors.asset"),
            });
          }
        }),
    [t],
  );

  const mutation = useMutation({
    mutationFn: async (values: TargetFormValues) => {
      if (target) {
        const body = toTargetUpdate(values, locale);
        if (!body) throw new Error("unconvertible");

        return updateTarget(target.id, body);
      }

      const body = toTargetRequest(values, locale);
      if (!body) throw new Error("unconvertible");

      return createTarget(body);
    },
    onSuccess: async (saved) => {
      await invalidateTargets(queryClient);
      toast.success(
        target
          ? t("targets.form.saved")
          : t("targets.form.created", {
              name: targetScopeName(saved, names, t),
            }),
      );
      void navigate({ to: PATHS.TARGETS });
    },
    onError: (error) => {
      setServerErrors(
        error instanceof ApiClientError
          ? claimFieldErrors(
              translateServerErrors(error, tError),
              CLAIMED_FIELDS,
            )
          : { fieldErrors: {}, formErrors: [tError("unexpected")] },
      );
    },
  });

  const form = useForm({
    defaultValues: defaultFormValues(target, prefill, locale),
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setServerErrors(NO_SERVER_ERRORS);

      // Refuse visibly rather than silently: a value `toTargetRequest` cannot
      // convert would otherwise make the submit button do nothing.
      const refused = validateFormValues(value, locale, {
        fromMonth: t("targets.form.errors.fromMonth"),
        duplicateMonth: t("targets.form.errors.duplicateMonth"),
        rate: t("targets.form.errors.rate"),
        floor: t("targets.form.errors.floor"),
      });
      setClientErrors(refused);
      if (Object.keys(refused).length > 0) return;

      try {
        await mutation.mutateAsync(value);
      } catch {
        // Already rendered by onError; swallowed so the rejection does not
        // escape as an unhandled promise.
      }
    },
  });

  // Read at render time rather than inside a Subscribe, because the
  // taken-scope query keys off it — a hook cannot live inside a render prop.
  // The summary panel needs the same object, so the whole form value is read
  // here and the fields below are handed plain values: with this subscription
  // already re-rendering on every keystroke, a nested `Subscribe` around them
  // would gate nothing.
  const values = useStore(form.store, (state) => state.values);

  /**
   * The schema's own refusals, which reach a field through its meta and not
   * through `serverErrors` — "Choose an account." is raised by `superRefine`
   * before any request is made, so there is no response to carry it. The three
   * `form.Field` wrappers this replaced merged `field.state.meta.errors` in at
   * each select; `ScopeField` takes one errors object, so the merge happens
   * here instead. Dropping it would make the create button fail in silence.
   */
  const fieldMeta = useStore(form.store, (state) => state.fieldMeta);

  const inScope = useQuery({
    ...targetsInScopeQuery(values.scope),
    // Only on create: on edit the scope is not a control, so nothing can
    // collide with it.
    enabled: !target && isScopeComplete(values),
  });

  /**
   * The scope already holds a target — and the third place `names` is read,
   * gated on `listsSettled` for the same reason the other two are.
   *
   * This is the worst of the three degradations, not the mildest: the badge
   * falls back to an id inside a chip, while this block's title is a
   * *sentence* — "22222222-… · 11111111-… already has a target." Prose
   * degrading to UUIDs is the case PLAN DEFECT #13 called unsurvivable.
   *
   * The window is reached without a click: the holding detail's "Set one" link
   * prefills scope, account, and asset, so `isScopeComplete` holds at mount and
   * this query can answer before two *sequential* page walks do.
   *
   * Waiting introduces no new swap — `taken` is already undefined until the
   * check answers, and the ladder already renders in the meantime. It only
   * delays an existing transition until the screen can name what it found.
   */
  const taken =
    target || !listsSettled
      ? undefined
      : inScope.data?.find((row) => matchesScope(row, values));

  const scopeName = target
    ? targetScopeName(target, names, t)
    : selectionScopeName(values, names, t);

  const stepErrors = { ...clientErrors, ...serverErrors.fieldErrors };

  const clauses = describeDraft(values, { names, t, locale });

  return (
    <form
      noValidate
      aria-labelledby="target-form-title"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {/* The PageHeader above carries the visible title; this names the form
          landmark for assistive tech without repeating the heading. */}
      <span id="target-form-title" className="sr-only">
        {target ? t("targets.form.editTitle") : t("targets.form.createTitle")}
      </span>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <Card>
          <CardContent className="space-y-8">
            {/* No section heading above these three: `ScopeField`,
                `StepsEditor`, and `FloorField` each render their own, and a
                wrapper heading here would print "Where it applies" twice on
                one screen. */}
            {!listsSettled ? (
              /* One gate, two shapes. Both branches below name the scope from
                 `names`, which falls back to the id it was asked about — so
                 painting either early does not degrade to a blank, it degrades
                 to a UUID. The edit branch is the worse of the two, because its
                 badge row is *prose* rather than a select: it reads
                 "22222222-2222-… · 11111111-1111-…" for as long as two
                 sequential page walks take.
                 The submit is deliberately NOT held on this when editing —
                 `scopeReady` short-circuits on `target` — because the scope is
                 not a control there and no field can be left unmounted holding
                 a refusal. This gate is about what the screen says, not about
                 what it will accept. */
              <div
                aria-busy="true"
                className={target ? "space-y-2" : "space-y-6"}
              >
                <span className="sr-only" role="status">
                  {t("loading")}
                </span>
                <Skeleton className="h-4 w-32" />
                {target ? (
                  <Skeleton className="h-6 w-56" />
                ) : (
                  <>
                    <Skeleton className="h-24 w-full max-w-sm" />
                    <Skeleton className="h-9 w-full max-w-sm" />
                  </>
                )}
              </div>
            ) : target ? (
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t("targets.form.scopeFixed")}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Task 7 rewrote these values into plain language, so this
                      badge reads "An asset in one account" rather than
                      "Holding" — longer than a chip usually carries, and kept
                      anyway. The pill names the *level* and the text beside it
                      names the *instance*, and with three levels in the
                      hierarchy the level is not derivable from "BTC · Binance"
                      alone. `Badge` is `h-5 whitespace-nowrap overflow-hidden`,
                      so the risk worth checking was clipping: the longest
                      value in either bundle is "An archetype across the
                      portfolio", ~200px at `text-xs`, inside a `flex-wrap` row
                      in a card that is ~288px at the narrowest supported
                      width. It wraps to its own line and never clips. */}
                  <Badge variant="secondary">
                    {t(`enums.targetScope.${target.scope}`)}
                  </Badge>
                  <span className="font-medium">{scopeName}</span>
                </div>
              </div>
            ) : (
              <ScopeField
                scope={values.scope}
                onScopeChange={(next) => form.setFieldValue("scope", next)}
                account={values.account}
                onAccountChange={(next) => form.setFieldValue("account", next)}
                asset={values.asset}
                onAssetChange={(next) => form.setFieldValue("asset", next)}
                archetype={values.archetype}
                onArchetypeChange={(next) =>
                  form.setFieldValue("archetype", next)
                }
                accounts={liveAccounts}
                assets={liveAssets}
                errors={{
                  account: [
                    ...(fieldMeta.account?.errors ?? []),
                    ...(serverErrors.fieldErrors.account ?? []),
                  ],
                  asset: [
                    ...(fieldMeta.asset?.errors ?? []),
                    ...(serverErrors.fieldErrors.asset ?? []),
                  ],
                  archetype: [
                    ...(fieldMeta.archetype?.errors ?? []),
                    ...(serverErrors.fieldErrors.archetype ?? []),
                  ],
                }}
              />
            )}

            {taken ? (
              <div className="space-y-3 rounded-xl border bg-muted/50 p-4">
                <p className="font-medium">
                  {t("targets.form.taken.title", { name: scopeName })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("targets.form.taken.description")}
                </p>
                <Button asChild variant="outline">
                  <Link to={PATHS.TARGETS_EDIT} params={{ id: taken.id }}>
                    {t("targets.form.taken.action")}
                    <IconArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <form.Field name="steps">
                  {(field) => (
                    <StepsEditor
                      steps={field.state.value}
                      onChange={field.handleChange}
                      fieldErrors={stepErrors}
                    />
                  )}
                </form.Field>

                <FloorField
                  enabled={values.floorEnabled}
                  onEnabledChange={(next) =>
                    form.setFieldValue("floorEnabled", next)
                  }
                  pct={values.loss_limit_pct}
                  onPctChange={(next) =>
                    form.setFieldValue("loss_limit_pct", next)
                  }
                  period={values.loss_limit_period}
                  onPeriodChange={(next) =>
                    form.setFieldValue("loss_limit_period", next)
                  }
                  errors={stepErrors.loss_limit_pct ?? []}
                  periodErrors={serverErrors.fieldErrors.loss_limit_period}
                />

                <FormError errors={serverErrors.formErrors} />
              </>
            )}
          </CardContent>

          {!taken && (
            <CardFooter className="justify-end gap-2">
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <>
                    {/* Cancel stays live while the lookups walk. It navigates
                        away and cannot reach the refusal the submit can, and
                        taking the only escape hatch away for the length of a
                        multi-page walk would be the worse trade. */}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => void navigate({ to: PATHS.TARGETS })}
                    >
                      {t("targets.form.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !scopeReady}
                    >
                      {isSubmitting && (
                        <IconLoader2 className="animate-spin" aria-hidden />
                      )}
                      {target
                        ? t("targets.form.save")
                        : t("targets.form.create")}
                    </Button>
                  </>
                )}
              </form.Subscribe>
            </CardFooter>
          )}
        </Card>

        {/* Source order puts the panel after the fields, so a keyboard walk
            reaches the inputs first, and the grid column places it right on
            wide screens without `lg:order-last`. Below `lg` that puts it after
            the submit controls; `TargetSummaryPanel`'s docblock carries the
            reason that is the accepted reading rather than a slip.

            Held back until the lookups settle, for the same reason the scope
            block is. `ScopeNames` falls back to the id it was asked about, and
            the panel's scope clause is a *sentence* — so painting it early
            does not degrade to a blank, it degrades to "This target covers
            22222222-2222-… in 11111111-1111-…", which is worse than saying
            nothing yet. */}
        {!taken && listsSettled && <TargetSummaryPanel clauses={clauses} />}
      </div>
    </form>
  );
}
