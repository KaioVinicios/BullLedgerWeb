import { useTranslation } from "react-i18next";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconBell,
  IconChartHistogram,
  IconReportMoney,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

// Illustrative holdings across asset types — this panel previews the product,
// it is not the viewer's data. Framed as a preview in the caption so the
// numbers are never mistaken for real balances.
const HOLDINGS = [
  { symbol: "BTC", kind: "crypto", value: "18,204.55", change: 2.6 },
  { symbol: "AAPL", kind: "stock", value: "12,480.16", change: 0.9 },
  { symbol: "VWCE", kind: "fund", value: "9,733.20", change: -0.4 },
] as const;

const FEATURES = [
  { icon: IconChartHistogram, key: "insights" },
  { icon: IconReportMoney, key: "tracking" },
  { icon: IconBell, key: "alerts" },
] as const;

function Change({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? IconArrowUpRight : IconArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-sm tabular-nums",
        up
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : "−"}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function TrustPanel({ className }: { className?: string }) {
  const { t } = useTranslation("auth");
  return (
    <aside
      className={cn(
        "relative overflow-hidden border-l bg-muted/40 px-8 py-12 xl:px-10",
        className,
      )}
    >
      {/* Soft gold glow, top-right — the one place the accent breathes. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex h-full flex-col justify-center">
        <h2 className="text-xl leading-snug">{t("trust.heading")}</h2>
        <p className="mt-2.5 text-sm text-pretty text-muted-foreground">
          {t("trust.subtitle")}
        </p>

        {/* Preview card — a single surface, framed as illustrative. */}
        <div className="mt-7 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("trust.totalValue")}
              </p>
              <p className="font-mono text-xl font-semibold tabular-nums">
                $48,210.36
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">
                {t("trust.today")}
              </p>
              <span className="inline-flex items-center gap-0.5 font-mono text-sm font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                <IconArrowUpRight className="size-3.5" aria-hidden />
                +0.65%
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {HOLDINGS.map((h) => (
              <div key={h.symbol} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{h.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`trust.kind.${h.kind}`)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="font-mono text-sm tabular-nums">
                    ${h.value}
                  </span>
                  <span className="w-14 text-right">
                    <Change value={h.change} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 border-t pt-3 text-[0.6875rem] text-muted-foreground">
            {t("trust.previewCaption")}
          </p>
        </div>

        <ul className="mt-7 space-y-3">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm">{t(`trust.features.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
