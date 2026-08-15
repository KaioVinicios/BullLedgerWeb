/**
 * The scope control: General, then one account.
 *
 * **Two controls, one state, chosen by width.** A tab strip is right when the
 * options fit side by side — every scope visible at once, one click to any of
 * them. It stops being right well before the viewport gets narrow: labels here
 * are `accountLabel` output like "XP Investimentos · Previdência XP", and four
 * of those exceed a phone's width several times over. The strip's answer was a
 * horizontal scroll, which hides most of the options behind a gesture with no
 * affordance, truncates the rest, and puts a scroll region inside a header.
 *
 * So below `useIsMobile`'s breakpoint this renders a `Select` instead: one
 * control, the current scope always legible in full, the rest a tap away in a
 * list with room for their whole names. The breakpoint is the app's own — the
 * same one that turns the sidebar into a drawer — rather than a second number
 * meaning nearly the same thing.
 *
 * Only one of the two is ever in the DOM, so nothing is duplicated to the
 * accessibility tree and there is no hidden second control to tab through.
 *
 * **The strip's scroll box is separate from the strip.** `TabsList` has a
 * fixed `h-9`, and `TabsTrigger` carries an `after:` rule sitting at
 * `bottom-[-5px]` — outside the box, and absolutely positioned children still
 * count toward scrollable overflow. Putting `overflow-x-auto` on the list
 * itself therefore produced a *vertical* scrollbar: per CSS, when one axis is
 * not `visible` the other's `visible` computes to `auto`, so asking for
 * horizontal scrolling silently asked for vertical too. The wrapper below pins
 * `overflow-y-hidden` to refuse it, and pads enough that neither that pseudo
 * element nor a 3px focus ring is clipped by the refusal — the negative margin
 * gives the padding back so nothing moves.
 *
 * General is `GENERAL_TAB` on the wire and `undefined` in the URL — both
 * primitives need a value for every option, and the address bar must not carry
 * one for the resting state.
 *
 * Options are named by `accountLabel`, not by `Account.name`: the name is an
 * optional nickname and is blank on most accounts, so a raw read would print a
 * strip of empty tabs.
 */
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Account } from "@/services/accounts";
import { accountLabel } from "@/utils/accountLabel";

const GENERAL_TAB = "general";

export function ScopeTabs({
  accountId,
  accounts,
  onChange,
}: {
  accountId: string | undefined;
  accounts: readonly Account[];
  onChange: (next: string | undefined) => void;
}) {
  const { t } = useTranslation("app");
  const isMobile = useIsMobile();

  const value = accountId ?? GENERAL_TAB;
  const select = (next: string) =>
    onChange(next === GENERAL_TAB ? undefined : next);

  const options = [
    { id: GENERAL_TAB, label: t("overview.tabs.general") },
    ...accounts.map((row) => ({ id: row.id, label: accountLabel(row, t) })),
  ];

  if (isMobile) {
    return (
      <Select value={value} onValueChange={select}>
        <SelectTrigger aria-label={t("overview.tabs.label")} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Tabs value={value} onValueChange={select}>
      <div className="-my-1.5 overflow-x-auto overflow-y-hidden py-1.5">
        <TabsList aria-label={t("overview.tabs.label")} className="w-max">
          {options.map((option) => (
            <TabsTrigger key={option.id} value={option.id}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
