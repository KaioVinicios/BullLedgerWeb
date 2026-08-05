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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { PercentField } from "@/forms/PercentField";
import { SelectField } from "@/forms/SelectField";
import {
  claimFieldErrors,
  translateServerErrors,
  type PartitionedServerErrors,
} from "@/forms/serverErrors";
import { useFormatLocale } from "@/hooks/useFormatLocale";
import { ApiClientError } from "@/lib/apiError";
import { StepsEditor } from "@/pages/Targets/StepsEditor";
import { PATHS } from "@/routes/path";
import {
  ARCHETYPES,
  PERIODS,
  TARGET_SCOPES,
  type Archetype,
  type Period,
  type TargetScope,
} from "@/schemas/apiEnums";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
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

const LIVE = {} as const;

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

  const { data: accountsPage } = useQuery({
    queryKey: accountKeys.list(LIVE),
    queryFn: () => listAccounts(LIVE),
  });
  const { data: assetsPage } = useQuery({
    queryKey: assetKeys.list(LIVE),
    queryFn: () => listAssets(LIVE),
  });

  const accounts = useMemo(() => accountsPage?.results ?? [], [accountsPage]);
  const assets = useMemo(() => assetsPage?.results ?? [], [assetsPage]);

  const names = useMemo(
    () => ({
      accountName: (id: string) =>
        accounts.find((row) => row.id === id)?.name ?? id,
      assetName: (id: string) =>
        assets.find((row) => row.id === id)?.name ?? id,
    }),
    [accounts, assets],
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
  const selection = useStore(
    form.store,
    (state) => state.values as ScopeSelection,
  );

  const inScope = useQuery({
    ...targetsInScopeQuery(selection.scope),
    // Only on create: on edit the scope is not a control, so nothing can
    // collide with it.
    enabled: !target && isScopeComplete(selection),
  });

  const taken = target
    ? undefined
    : inScope.data?.find((row) => matchesScope(row, selection));

  const scopeName = target
    ? targetScopeName(target, names, t)
    : selectionScopeName(selection, names, t);

  const stepErrors = { ...clientErrors, ...serverErrors.fieldErrors };

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

      <Card>
        <CardContent className="space-y-8">
          {target ? (
            <div className="space-y-2">
              <span className="text-sm font-medium">
                {t("targets.form.scopeFixed")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {t(`enums.targetScope.${target.scope}`)}
                </Badge>
                <span className="font-medium">{scopeName}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <form.Field name="scope">
                {(field) => (
                  <div className="space-y-2">
                    {/* No <fieldset>: Radix's RadioGroup already renders
                        role="radiogroup", so a fieldset would nest a second
                        group naming itself off the same text and be announced
                        twice. Phase 4 settled this on the profile screen. */}
                    <span
                      id="target-scope-label"
                      className="text-sm font-medium"
                    >
                      {t("targets.form.scope")}
                    </span>
                    <RadioGroup
                      aria-labelledby="target-scope-label"
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as TargetScope)
                      }
                      className="gap-2"
                    >
                      {TARGET_SCOPES.map((scope) => (
                        <div key={scope} className="flex items-center gap-2">
                          <RadioGroupItem value={scope} id={`scope-${scope}`} />
                          <Label
                            htmlFor={`scope-${scope}`}
                            className="font-normal"
                          >
                            {t(`enums.targetScope.${scope}`)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => state.values.scope}>
                {(scope) => (
                  <div className="space-y-6">
                    {scope !== "PORTFOLIO_ARCHETYPE" && (
                      <form.Field name="account">
                        {(field) => (
                          <SelectField
                            name="account"
                            label={t("targets.form.account")}
                            value={field.state.value}
                            options={accounts.map((row) => row.id)}
                            renderOption={(id) =>
                              accounts.find((row) => row.id === id)?.name ?? id
                            }
                            onChange={field.handleChange}
                            errors={[
                              ...field.state.meta.errors,
                              ...(serverErrors.fieldErrors.account ?? []),
                            ]}
                          />
                        )}
                      </form.Field>
                    )}

                    {scope === "HOLDING" && (
                      <form.Field name="asset">
                        {(field) => (
                          <SelectField
                            name="asset"
                            label={t("targets.form.asset")}
                            value={field.state.value}
                            options={assets.map((row) => row.id)}
                            renderOption={(id) =>
                              assets.find((row) => row.id === id)?.name ?? id
                            }
                            onChange={field.handleChange}
                            errors={[
                              ...field.state.meta.errors,
                              ...(serverErrors.fieldErrors.asset ?? []),
                            ]}
                          />
                        )}
                      </form.Field>
                    )}

                    {scope !== "HOLDING" && (
                      <form.Field name="archetype">
                        {(field) => (
                          <SelectField
                            name="archetype"
                            label={t("targets.form.archetype")}
                            value={field.state.value}
                            options={ARCHETYPES}
                            renderOption={(archetype: Archetype) =>
                              t(`enums.archetype.${archetype}`)
                            }
                            onChange={field.handleChange}
                            errors={[
                              ...field.state.meta.errors,
                              ...(serverErrors.fieldErrors.archetype ?? []),
                            ]}
                          />
                        )}
                      </form.Field>
                    )}
                  </div>
                )}
              </form.Subscribe>
            </div>
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

              <div className="space-y-4">
                <form.Field name="floorEnabled">
                  {(field) => (
                    <div className="flex items-center gap-3">
                      <Switch
                        id="floor-enabled"
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                      />
                      <Label htmlFor="floor-enabled" className="font-normal">
                        {t("targets.form.floor.toggle")}
                      </Label>
                    </div>
                  )}
                </form.Field>

                <p className="text-xs text-muted-foreground">
                  {t("targets.form.floor.description")}
                </p>

                <form.Subscribe selector={(state) => state.values.floorEnabled}>
                  {(enabled) =>
                    enabled ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <form.Field name="loss_limit_pct">
                          {(field) => (
                            <PercentField
                              name="loss_limit_pct"
                              label={t("targets.form.floor.rate")}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={field.handleChange}
                              errors={[
                                ...field.state.meta.errors,
                                ...(stepErrors.loss_limit_pct ?? []),
                              ]}
                            />
                          )}
                        </form.Field>

                        <form.Field name="loss_limit_period">
                          {(field) => (
                            <SelectField
                              name="loss_limit_period"
                              label={t("targets.form.floor.period")}
                              value={field.state.value}
                              options={PERIODS}
                              renderOption={(period: Period) =>
                                t(`enums.period.${period}`)
                              }
                              onChange={field.handleChange}
                              errors={[
                                ...field.state.meta.errors,
                                ...(serverErrors.fieldErrors
                                  .loss_limit_period ?? []),
                              ]}
                            />
                          )}
                        </form.Field>
                      </div>
                    ) : null
                  }
                </form.Subscribe>
              </div>

              <FormError errors={serverErrors.formErrors} />
            </>
          )}
        </CardContent>

        {!taken && (
          <CardFooter className="justify-end gap-2">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={() => void navigate({ to: PATHS.TARGETS })}
                  >
                    {t("targets.form.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <IconLoader2 className="animate-spin" aria-hidden />
                    )}
                    {target ? t("targets.form.save") : t("targets.form.create")}
                  </Button>
                </>
              )}
            </form.Subscribe>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
