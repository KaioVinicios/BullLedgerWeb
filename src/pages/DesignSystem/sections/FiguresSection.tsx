import { MoneyValue } from "@/components/MoneyValue";
import { PercentValue } from "@/components/PercentValue";
import { SignedFigure } from "@/components/SignedFigure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";
import type { Money } from "@/utils/money";

const holdings: {
  asset: string;
  value: Money;
  change: Money;
  weight: string;
}[] = [
  {
    asset: "PETR4",
    value: { amount: 384500, currency: "BRL" },
    change: { amount: 21340, currency: "BRL" },
    weight: "0.1375",
  },
  {
    asset: "VOO",
    value: { amount: 1024160, currency: "USD" },
    change: { amount: -8875, currency: "USD" },
    weight: "0.3662",
  },
  {
    asset: "XEQT",
    value: { amount: 275000, currency: "CAD" },
    change: { amount: 0, currency: "CAD" },
    weight: "0.0983",
  },
];

export function FiguresSection() {
  return (
    <ShowcaseSection
      id="figures"
      title="Figures"
      description="The primitives every recorded amount passes through. Money arrives as integer minor units and quantities as decimal strings; both are formatted without ever becoming a floating-point number."
    >
      <DemoBlock label="Money across currencies and locales" className="gap-8">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">pt-BR</p>
          <MoneyValue
            value={{ amount: 123456, currency: "BRL" }}
            locale="pt-BR"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">en-US</p>
          <MoneyValue
            value={{ amount: 123456, currency: "USD" }}
            locale="en-US"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">en-CA</p>
          <MoneyValue
            value={{ amount: 123456, currency: "CAD" }}
            locale="en-CA"
          />
        </div>
      </DemoBlock>

      <DemoBlock label="Precision at the limit" className="block space-y-2">
        <MoneyValue
          value={{ amount: 900719925474099, currency: "USD" }}
          locale="en-US"
          className="text-2xl"
        />
        <p className="max-w-2xl text-xs text-muted-foreground">
          9,007,199,254,740.99 — the largest amount JavaScript can hold exactly,
          rendered digit for digit. Anything past it is rejected on entry rather
          than silently rounded.
        </p>
      </DemoBlock>

      <DemoBlock label="Gain, loss, and no change" className="gap-8">
        <SignedFigure
          value={{ amount: 21340, currency: "BRL" }}
          locale="pt-BR"
        />
        <SignedFigure
          value={{ amount: -8875, currency: "USD" }}
          locale="en-US"
        />
        <SignedFigure value={{ amount: 0, currency: "CAD" }} locale="en-CA" />
      </DemoBlock>

      <DemoBlock label="Percentages" className="gap-8">
        <PercentValue value="0.1375" locale="en-US" />
        <PercentValue value="-0.0125" locale="en-US" />
        <PercentValue value="0.00000125" locale="en-US" />
      </DemoBlock>

      <DemoBlock label="Aligned in a column" className="block p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Unrealized</TableHead>
              <TableHead className="text-right">Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <TableRow key={holding.asset}>
                <TableCell className="font-medium">{holding.asset}</TableCell>
                <TableCell className="text-right">
                  <MoneyValue value={holding.value} locale="en-US" />
                </TableCell>
                <TableCell className="text-right">
                  <SignedFigure value={holding.change} locale="en-US" />
                </TableCell>
                <TableCell className="text-right">
                  <PercentValue value={holding.weight} locale="en-US" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DemoBlock>
    </ShowcaseSection>
  );
}
