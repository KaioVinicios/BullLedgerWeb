import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";

const tabularRows = [
  { label: "AAPL", amount: "$12,408.90" },
  { label: "VOO", amount: "$8,112.34" },
  { label: "PETR4", amount: "R$1,904.00" },
  { label: "BTC", amount: "$402.19" },
];

export function TypographySection() {
  return (
    <ShowcaseSection
      id="typography"
      title="Typography"
      description="San Francisco (via the system stack) for body text with Inter as the web fallback, Space Grotesk for headings and emphasis, and Geist Mono for figures and code."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <DemoBlock label="Sans — body" className="block space-y-2">
          <p className="text-2xl">The quick brown fox jumps over the lazy dog</p>
          <p className="text-muted-foreground font-mono text-xs">
            -apple-system → Inter Variable
          </p>
        </DemoBlock>
        <DemoBlock label="Heading — emphasis" className="block space-y-2">
          <p className="font-heading text-2xl font-semibold tracking-tight">
            The quick brown fox jumps over the lazy dog
          </p>
          <p className="text-muted-foreground font-mono text-xs">
            Space Grotesk Variable
          </p>
        </DemoBlock>
        <DemoBlock label="Mono — data & code" className="block space-y-2">
          <p className="font-mono text-2xl">$1,234.56 +2.4% 0xF9</p>
          <p className="text-muted-foreground font-mono text-xs">
            Geist Mono Variable
          </p>
        </DemoBlock>
      </div>

      <DemoBlock label="Scale" className="block space-y-4">
        <h1>Heading 1 — Portfolio overview</h1>
        <h2>Heading 2 — Recent transactions</h2>
        <h3>Heading 3 — Dividends received</h3>
        <h4>Heading 4 — Fees & taxes</h4>
        <p>
          Body — Your portfolio gained 2.4% this month, driven mostly by tech
          positions and reinvested dividends.
        </p>
        <p className="text-sm">
          Small — Prices are delayed up to 15 minutes and provided for
          informational purposes only.
        </p>
        <p className="text-muted-foreground text-sm">
          Muted — Last synced 5 minutes ago.
        </p>
      </DemoBlock>

      <DemoBlock label="Tabular figures" className="block">
        <div className="max-w-xs space-y-1">
          {tabularRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-8">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="font-mono text-sm tabular-nums">
                {row.amount}
              </span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-4 text-xs">
          Amounts use <code className="font-mono">tabular-nums</code> so digits
          align vertically in tables and lists.
        </p>
      </DemoBlock>
    </ShowcaseSection>
  );
}
