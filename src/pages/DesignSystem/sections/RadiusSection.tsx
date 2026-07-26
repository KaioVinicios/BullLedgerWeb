import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";
import { cn } from "@/lib/utils";

const radii = [
  { token: "sm", className: "rounded-sm" },
  { token: "md", className: "rounded-md" },
  { token: "lg", className: "rounded-lg" },
  { token: "xl", className: "rounded-xl" },
  { token: "2xl", className: "rounded-2xl" },
  { token: "3xl", className: "rounded-3xl" },
  { token: "4xl", className: "rounded-4xl" },
];

const spacing = [
  { token: "1", className: "size-1" },
  { token: "2", className: "size-2" },
  { token: "4", className: "size-4" },
  { token: "6", className: "size-6" },
  { token: "8", className: "size-8" },
  { token: "12", className: "size-12" },
  { token: "16", className: "size-16" },
];

export function RadiusSection() {
  return (
    <ShowcaseSection
      id="radius"
      title="Radius & spacing"
      description="Every corner radius derives from a single --radius token (0.875rem), so the whole scale can be tuned in one place. Spacing follows Tailwind's 4px-based scale."
    >
      <DemoBlock label="Radius scale">
        {radii.map((radius) => (
          <div key={radius.token} className="space-y-1.5 text-center">
            <div
              className={cn(
                "size-20 border-2 border-dashed bg-muted",
                radius.className,
              )}
            />
            <p className="font-mono text-xs">{radius.token}</p>
          </div>
        ))}
      </DemoBlock>
      <DemoBlock label="Spacing scale" className="items-end">
        {spacing.map((step) => (
          <div key={step.token} className="space-y-1.5 text-center">
            <div
              className={cn("mx-auto rounded-xs bg-primary", step.className)}
            />
            <p className="font-mono text-xs">{step.token}</p>
          </div>
        ))}
      </DemoBlock>
    </ShowcaseSection>
  );
}
