import { cn } from "@/lib/utils";

interface ShowcaseSectionProps {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ShowcaseSection({
  id,
  title,
  description,
  children,
}: ShowcaseSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 space-y-6">
      <div className="space-y-1.5">
        <h2>{title}</h2>
        <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

interface DemoBlockProps {
  label?: string;
  className?: string;
  children: React.ReactNode;
}

export function DemoBlock({ label, className, children }: DemoBlockProps) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
          {label}
        </p>
      )}
      <div
        className={cn(
          "bg-card/50 flex flex-wrap items-center gap-4 rounded-xl border p-6",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
