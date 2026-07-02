import {
  IconDownload,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";

export function ButtonsSection() {
  return (
    <ShowcaseSection
      id="buttons"
      title="Buttons"
      description="Six variants across four sizes. Default carries the primary action of a view; destructive is reserved for irreversible operations."
    >
      <DemoBlock label="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </DemoBlock>

      <DemoBlock label="Sizes">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Add transaction">
          <IconPlus />
        </Button>
      </DemoBlock>

      <DemoBlock label="With icons & states">
        <Button>
          <IconPlus data-icon="inline-start" />
          New transaction
        </Button>
        <Button variant="outline">
          <IconDownload data-icon="inline-start" />
          Export CSV
        </Button>
        <Button variant="destructive">
          <IconTrash data-icon="inline-start" />
          Delete
        </Button>
        <Button disabled>
          <IconLoader2 data-icon="inline-start" className="animate-spin" />
          Saving…
        </Button>
        <Button variant="outline" disabled>
          Disabled
        </Button>
      </DemoBlock>
    </ShowcaseSection>
  );
}
