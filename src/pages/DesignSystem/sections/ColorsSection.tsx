import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";
import { cn } from "@/lib/utils";

interface TokenSwatch {
  token: string;
  swatchClass: string;
  sampleClass?: string;
}

const semanticTokens: TokenSwatch[] = [
  {
    token: "background",
    swatchClass: "bg-background",
    sampleClass: "text-foreground",
  },
  {
    token: "card",
    swatchClass: "bg-card",
    sampleClass: "text-card-foreground",
  },
  {
    token: "popover",
    swatchClass: "bg-popover",
    sampleClass: "text-popover-foreground",
  },
  {
    token: "primary",
    swatchClass: "bg-primary",
    sampleClass: "text-primary-foreground",
  },
  {
    token: "secondary",
    swatchClass: "bg-secondary",
    sampleClass: "text-secondary-foreground",
  },
  {
    token: "muted",
    swatchClass: "bg-muted",
    sampleClass: "text-muted-foreground",
  },
  {
    token: "accent",
    swatchClass: "bg-accent",
    sampleClass: "text-accent-foreground",
  },
  {
    token: "destructive",
    swatchClass: "bg-destructive",
    sampleClass: "text-white",
  },
];

const utilityTokens: TokenSwatch[] = [
  { token: "border", swatchClass: "bg-border" },
  { token: "input", swatchClass: "bg-input" },
  { token: "ring", swatchClass: "bg-ring" },
];

const chartTokens: TokenSwatch[] = [
  { token: "chart-1", swatchClass: "bg-chart-1" },
  { token: "chart-2", swatchClass: "bg-chart-2" },
  { token: "chart-3", swatchClass: "bg-chart-3" },
  { token: "chart-4", swatchClass: "bg-chart-4" },
  { token: "chart-5", swatchClass: "bg-chart-5" },
];

function Swatch({ token, swatchClass, sampleClass }: TokenSwatch) {
  return (
    <div className="w-36 space-y-1.5">
      <div
        className={cn("flex h-16 items-end rounded-lg border p-2", swatchClass)}
      >
        {sampleClass && (
          <span className={cn("text-sm font-medium", sampleClass)}>Aa</span>
        )}
      </div>
      <p className="font-mono text-xs">--{token}</p>
    </div>
  );
}

export function ColorsSection() {
  return (
    <ShowcaseSection
      id="colors"
      title="Colors"
      description="Semantic tokens defined in oklch. Every color pairs a surface with its foreground, and both light and dark values live behind the same variable — switch the theme to see them adapt."
    >
      <DemoBlock label="Semantic">
        {semanticTokens.map((token) => (
          <Swatch key={token.token} {...token} />
        ))}
      </DemoBlock>
      <DemoBlock label="Utility">
        {utilityTokens.map((token) => (
          <Swatch key={token.token} {...token} />
        ))}
      </DemoBlock>
      <DemoBlock label="Charts">
        <div className="flex w-full max-w-md overflow-hidden rounded-lg border">
          {chartTokens.map((token) => (
            <div
              key={token.token}
              className={cn("h-16 flex-1", token.swatchClass)}
              title={`--${token.token}`}
            />
          ))}
        </div>
        <div className="flex w-full max-w-md">
          {chartTokens.map((token) => (
            <p
              key={token.token}
              className="flex-1 text-center font-mono text-xs"
            >
              {token.token.replace("chart-", "")}
            </p>
          ))}
        </div>
      </DemoBlock>
    </ShowcaseSection>
  );
}
