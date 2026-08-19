import { IconAlertTriangle, IconHeart } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CopyField } from "@/components/CopyField";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  donationMethods,
  type DonationMethod,
  type DonationRegion,
} from "@/config/donations";

/** Reading order. Brazil first: PIX is instant and free where most readers are. */
const REGIONS: readonly DonationRegion[] = ["brazil", "international"];

/**
 * Asking for money, in the quietest room in the product.
 *
 * `form` width rather than `full`: this screen is prose and five short values,
 * and it is the one place in the app where the figures are not the reader's.
 * A full-width column would give a donation request the same footprint as the
 * portfolio, which is exactly the wrong hierarchy.
 *
 * Nothing here is fetched and nothing is recorded. The screen has no idea who
 * gave, and deliberately so — there is no donor to track, no receipt to issue,
 * and no state that survives the visit.
 */
export function DonatePage() {
  const { t } = useTranslation("app");
  const methods = donationMethods();

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("screens.donate.title")}
        description={t("screens.donate.description")}
      />

      {methods.length === 0 ? (
        <EmptyState
          icon={IconHeart}
          title={t("donate.empty.title")}
          description={t("donate.empty.description")}
        />
      ) : (
        <div className="space-y-6">
          <p className="max-w-prose text-sm leading-relaxed">
            {t("donate.lede")}
          </p>

          {REGIONS.map((region) => {
            const inRegion = methods.filter(
              (method) => method.region === region,
            );
            if (inRegion.length === 0) return null;

            return (
              <RegionCard key={region} region={region} methods={inRegion} />
            );
          })}

          {/*
            Last, and small. It is the honest disclaimer rather than the pitch,
            and putting it up front would make the screen argue with itself.
          */}
          <p className="max-w-prose text-xs text-muted-foreground">
            {t("donate.noReturn")}
          </p>
        </div>
      )}
    </PageContainer>
  );
}

/**
 * One region's addresses.
 *
 * The network warning rides in the international card's description, which
 * puts it *above* the addresses it applies to. A warning printed under the
 * thing it warns about arrives after the reader has already copied.
 */
function RegionCard({
  region,
  methods,
}: {
  region: DonationRegion;
  methods: DonationMethod[];
}) {
  const { t } = useTranslation("app");

  const title = t(`donate.regions.${region}`);

  return (
    // A named region, not a bare card. Two groups of addresses that mean
    // different things to different readers earn landmarks a screen-reader
    // user can jump between, and "International" has to be reachable without
    // arrowing through every Brazilian key first. `Card` spreads its props, so
    // this needs no wrapper element to carry the role.
    <Card role="region" aria-label={title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {region === "international" && (
          <CardDescription className="flex items-start gap-2 text-foreground">
            <IconAlertTriangle
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            {/* Not an Alert and not red. Sending to the wrong chain is a
                mistake to prevent, not an error that has happened, and this
                product states facts rather than raising its voice. */}
            <span>{t("donate.networkWarning")}</span>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {methods.map((method) => (
          <CopyField
            key={method.id}
            label={t(`donate.methods.${method.id}.label`)}
            hint={t(`donate.methods.${method.id}.detail`)}
            value={method.value}
          />
        ))}
      </CardContent>
    </Card>
  );
}
