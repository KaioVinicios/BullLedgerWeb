import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconWallet,
} from "@tabler/icons-react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoBlock, ShowcaseSection } from "@/pages/DesignSystem/Showcase";

const stats = [
  {
    label: "Portfolio value",
    value: "$48,203.12",
    change: "+2.4%",
    up: true,
  },
  {
    label: "Monthly P/L",
    value: "+$1,120.88",
    change: "+8.1%",
    up: true,
  },
  {
    label: "Dividends (YTD)",
    value: "$734.50",
    change: "-0.6%",
    up: false,
  },
];

const transactions = [
  { date: "Jun 27, 2026", ticker: "AAPL", type: "Buy", qty: 10, price: "$187.32", total: "$1,873.20" },
  { date: "Jun 24, 2026", ticker: "VOO", type: "Buy", qty: 2, price: "$512.08", total: "$1,024.16" },
  { date: "Jun 19, 2026", ticker: "PETR4", type: "Sell", qty: 100, price: "R$38.05", total: "R$3,805.00" },
  { date: "Jun 12, 2026", ticker: "BTC", type: "Buy", qty: 0.004, price: "$100,547.00", total: "$402.19" },
];

export function DataSection() {
  return (
    <ShowcaseSection
      id="data"
      title="Data display"
      description="Stat cards, tables with tabular figures, tabs, and avatars — the building blocks of the portfolio views."
    >
      <DemoBlock label="Stat cards" className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="font-mono text-2xl tabular-nums">
                {stat.value}
              </CardTitle>
              <CardAction>
                <Badge variant={stat.up ? "secondary" : "destructive"}>
                  {stat.up ? <IconArrowUpRight /> : <IconArrowDownRight />}
                  {stat.change}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <IconWallet className="size-3.5" />
                vs. last 30 days
              </p>
            </CardContent>
          </Card>
        ))}
      </DemoBlock>

      <DemoBlock label="Table" className="block p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={`${tx.date}-${tx.ticker}`}>
                <TableCell className="text-muted-foreground">
                  {tx.date}
                </TableCell>
                <TableCell className="font-medium">{tx.ticker}</TableCell>
                <TableCell>
                  <Badge
                    variant={tx.type === "Buy" ? "secondary" : "outline"}
                  >
                    {tx.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {tx.qty}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {tx.price}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {tx.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DemoBlock>

      <DemoBlock label="Tabs" className="block">
        <Tabs defaultValue="overview" className="max-w-md">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent
            value="overview"
            className="text-muted-foreground pt-3 text-sm"
          >
            A snapshot of your portfolio: total value, allocation, and recent
            performance.
          </TabsContent>
          <TabsContent
            value="positions"
            className="text-muted-foreground pt-3 text-sm"
          >
            Every open position with cost basis, current price, and unrealized
            P/L.
          </TabsContent>
          <TabsContent
            value="history"
            className="text-muted-foreground pt-3 text-sm"
          >
            The full transaction ledger, filterable by asset, type, and date.
          </TabsContent>
        </Tabs>
      </DemoBlock>

      <DemoBlock label="Avatars & separator">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>KV</AvatarFallback>
        </Avatar>
        <Separator orientation="vertical" className="h-8!" />
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>KV</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AM</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
      </DemoBlock>
    </ShowcaseSection>
  );
}
