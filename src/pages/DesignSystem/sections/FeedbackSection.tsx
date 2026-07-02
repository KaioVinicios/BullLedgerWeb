import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";

export function FeedbackSection() {
  return (
    <ShowcaseSection
      id="feedback"
      title="Feedback"
      description="Badges for compact status, alerts for inline messages, toasts for transient confirmations, and skeletons while data loads."
    >
      <DemoBlock label="Badges">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="secondary">
          <IconTrendingUp />
          +2.4%
        </Badge>
        <Badge variant="destructive">
          <IconTrendingDown />
          -1.1%
        </Badge>
      </DemoBlock>

      <DemoBlock label="Alerts" className="block space-y-4">
        <Alert>
          <IconInfoCircle />
          <AlertTitle>Prices are delayed</AlertTitle>
          <AlertDescription>
            Market data is delayed up to 15 minutes and provided for
            informational purposes only.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>Sync failed</AlertTitle>
          <AlertDescription>
            We couldn't reach your broker. Your positions may be out of date —
            try again in a few minutes.
          </AlertDescription>
        </Alert>
      </DemoBlock>

      <DemoBlock label="Toasts">
        <Button
          variant="outline"
          onClick={() => toast("Portfolio synced", { description: "42 positions updated." })}
        >
          Default
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success("Transaction saved")}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error("Could not delete transaction")}
        >
          Error
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast("Transaction deleted", {
              action: { label: "Undo", onClick: () => toast("Restored") },
            })
          }
        >
          With action
        </Button>
      </DemoBlock>

      <DemoBlock label="Skeleton" className="block">
        <div className="flex max-w-sm items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </DemoBlock>

      <DemoBlock label="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Cost basis includes broker fees</TooltipContent>
        </Tooltip>
      </DemoBlock>
    </ShowcaseSection>
  );
}
