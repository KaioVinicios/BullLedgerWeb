import { useTranslation } from "react-i18next";
import { IconInfoCircle } from "@tabler/icons-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMotionPreference } from "@/store/motionPreference";

/**
 * How much the interface is allowed to move.
 *
 * The one card on this screen with no Save button, and the absence is the
 * design rather than an omission. Reporting batches its two fields behind an
 * explicit Save because it spends a request and changes every figure in the
 * app; these two spend nothing and show their own result the instant they are
 * clicked — the background either stops or it does not. A Save button here
 * would ask people to confirm something they can already see.
 *
 * The second switch contains the first, so the first is disabled while the
 * second is on. It keeps rendering its *stored* value rather than flipping to
 * checked: the reader is owed the truth about what they set, and a box that
 * checks itself would leave them unable to tell which of the two switches
 * they would have to undo. The hint under it names the one that is winning.
 */
export function AppearanceSection() {
  const { t } = useTranslation("app");
  const reduceMotion = useMotionPreference((state) => state.reduceMotion);
  const hideBackground = useMotionPreference((state) => state.hideBackground);
  const setReduceMotion = useMotionPreference((state) => state.setReduceMotion);
  const setHideBackground = useMotionPreference(
    (state) => state.setHideBackground,
  );
  const systemAsksForStillness = usePrefersReducedMotion();

  return (
    <section aria-labelledby="appearance-title">
      <Card>
        <CardHeader>
          <CardTitle id="appearance-title">
            {t("profile.appearance.title")}
          </CardTitle>
          <CardDescription>
            {t("profile.appearance.description")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stated only when it is true, and stated as fact rather than as a
              warning: the system preference is already being honoured, and
              the reader did not make a mistake by arriving here. */}
          {systemAsksForStillness && (
            <p className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <IconInfoCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("profile.appearance.systemReduced")}
            </p>
          )}

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="hide-background"
              className="mt-0.5"
              checked={hideBackground}
              disabled={reduceMotion}
              onCheckedChange={(checked) => setHideBackground(checked === true)}
              aria-describedby="hide-background-hint"
            />
            <div className="space-y-1">
              {/* Dimmed by colour rather than by opacity while it is
                  overruled: the checkbox beside it is already at 50% and a
                  label at 50% of the foreground lands wherever the theme puts
                  it, which is not a contrast anyone measured. The muted token
                  is measured — 4.83:1 light, 7.56:1 dark. */}
              <Label
                htmlFor="hide-background"
                className={cn(
                  "font-normal",
                  reduceMotion && "text-muted-foreground",
                )}
              >
                {t("profile.appearance.hideBackground")}
              </Label>
              <p
                id="hide-background-hint"
                className="text-xs text-muted-foreground"
              >
                {reduceMotion
                  ? t("profile.appearance.coveredByReduceMotion")
                  : t("profile.appearance.hideBackgroundHint")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="reduce-motion"
              className="mt-0.5"
              checked={reduceMotion}
              onCheckedChange={(checked) => setReduceMotion(checked === true)}
              aria-describedby="reduce-motion-hint"
            />
            <div className="space-y-1">
              <Label htmlFor="reduce-motion" className="font-normal">
                {t("profile.appearance.reduceMotion")}
              </Label>
              <p
                id="reduce-motion-hint"
                className="text-xs text-muted-foreground"
              >
                {t("profile.appearance.reduceMotionHint")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
