import { IconSearch } from "@tabler/icons-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_SELECT_TRIGGER } from "@/forms/emptySelect";
import { cn } from "@/lib/utils";
import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";

export function FormsSection() {
  return (
    <ShowcaseSection
      id="forms"
      title="Form controls"
      description="Text inputs, selection controls, and toggles. Labels are always attached — controls are never presented bare."
    >
      <DemoBlock label="Text inputs" className="grid gap-6 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="ds-ticker">Ticker</Label>
          <Input id="ds-ticker" placeholder="AAPL" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ds-search">Search</Label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ds-search"
              className="pl-8"
              placeholder="Search assets…"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ds-locked">Broker</Label>
          <Input id="ds-locked" value="Interactive Brokers" disabled readOnly />
        </div>
        <div className="grid gap-2 md:col-span-3">
          <Label htmlFor="ds-notes">Notes</Label>
          <Textarea
            id="ds-notes"
            placeholder="Optional note about this transaction…"
            rows={3}
          />
        </div>
      </DemoBlock>

      <DemoBlock label="Selection" className="grid gap-6 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="ds-currency">Currency</Label>
          <Select defaultValue="usd">
            <SelectTrigger id="ds-currency" className="w-full">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usd">USD — US Dollar</SelectItem>
              <SelectItem value="brl">BRL — Brazilian Real</SelectItem>
              <SelectItem value="eur">EUR — Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label>Operation</Label>
          <RadioGroup defaultValue="buy" className="flex gap-6">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="buy" id="ds-buy" />
              <Label htmlFor="ds-buy">Buy</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sell" id="ds-sell" />
              <Label htmlFor="ds-sell">Sell</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="ds-fees" defaultChecked />
            <Label htmlFor="ds-fees">Include broker fees</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ds-reinvest" />
            <Label htmlFor="ds-reinvest">Reinvest dividends</Label>
          </div>
        </div>
      </DemoBlock>

      {/*
        The state a select spends its first session in, on a portfolio that has
        nothing in it yet. Shown beside a normal one because the pair is the
        point: the empty one is recognisably the same control, not an error.
      */}
      <DemoBlock
        label="Nothing to choose"
        className="grid gap-6 md:grid-cols-2"
      >
        <div className="grid gap-2">
          <Label htmlFor="ds-account">Account</Label>
          <Select>
            <SelectTrigger id="ds-account" className="w-full">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brokerage">Brokerage</SelectItem>
              <SelectItem value="retirement">Retirement</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Where this movement was recorded.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ds-account-empty">Account</Label>
          <Select>
            {/*
              Disabled, so it cannot open onto a blank panel — and the value
              slot carries the state instead of resting empty. See
              `forms/emptySelect.ts` for why the dimming is put back.
            */}
            <SelectTrigger
              id="ds-account-empty"
              className={cn("w-full", EMPTY_SELECT_TRIGGER)}
              disabled
              aria-describedby="ds-account-empty-hint"
            >
              <span className="min-w-0 truncate">No accounts yet</span>
            </SelectTrigger>
            <SelectContent />
          </Select>
          <p
            id="ds-account-empty-hint"
            className="text-xs text-muted-foreground"
          >
            Add an account first.
          </p>
        </div>
      </DemoBlock>

      <DemoBlock label="Slider" className="block">
        <div className="max-w-sm space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="ds-allocation">Target allocation</Label>
            <span className="font-mono text-sm tabular-nums">60%</span>
          </div>
          <Slider id="ds-allocation" defaultValue={[60]} max={100} step={5} />
        </div>
      </DemoBlock>
    </ShowcaseSection>
  );
}
