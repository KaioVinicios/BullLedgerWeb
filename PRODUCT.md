# Product

## Register

product

## Users

Individual (retail) investors tracking their own portfolios: positions, transactions, and performance over time. They arrive with real money on the line and a specific question in mind ("how am I doing?", "what did I buy and when?"). Sessions are focused check-ins and record-keeping, on desktop first, often during or after market hours. They are comfortable with finance basics but are not professional traders; they compare the experience against polished consumer finance tools, not Bloomberg terminals.

## Product Purpose

BullLedger is a web frontend for the BullLedger REST API: an investment-tracking app where users record and review their holdings, transactions, and portfolio performance. Success means a user trusts the numbers at a glance and can complete record-keeping tasks (add a trade, review a position, scan performance) quickly and without ambiguity. The app is early-stage: the current surface is a placeholder home page and a design-system showcase, with authenticated dashboard/table/form surfaces ahead.

## Brand Personality

Precise, calm, trustworthy. Finance-grade restraint: the numbers are the hero, and the interface disappears into the task. The gold bull identity (logo, gold/amber primary) carries the brand's confidence, used for primary actions, selection, and key state — never as decoration. Tone of voice is plain, direct, and unhyped: state facts, avoid market-bro energy.

## Anti-references

- Crypto-dashboard maximalism: neon glows, dark-mode-only, animated tickers, glassmorphism everywhere.
- Bloomberg-terminal density worship: walls of numbers with no hierarchy, jargon-first labels.
- Generic SaaS landing template: gradient hero, hero-metric cards, identical feature-card grids, eyebrow kickers.
- Gamified trading-app energy (confetti on trades, streaks, urgency cues) — this is a ledger, not a casino.

## Design Principles

1. **Numbers first.** Every screen's hierarchy leads with the figures users came for; chrome, labels, and decoration defer to data.
2. **Earned familiarity.** Use standard, best-in-class product patterns (shadcn vocabulary, conventional nav, real tables and forms). Novelty must buy usability, or it's out.
3. **Calm under volatility.** Gains and losses are stated, not dramatized. Color signals state (up/down, error, success) and is never used for excitement.
4. **Trust through precision.** Aligned tabular numerals, consistent formatting, explicit units and dates, honest empty/loading/error states. Sloppy details read as untrustworthy math.
5. **One accent, spent deliberately.** The gold primary marks the primary action and current selection; everything else stays in the neutral ramp.

## Accessibility & Inclusion

WCAG 2.1 AA. Concretely: ≥4.5:1 contrast for body text (≥3:1 for large text), full keyboard operability with visible focus, `prefers-reduced-motion` alternatives for all animation, and gain/loss never encoded by color alone (pair red/green with sign, icon, or label). Light and dark themes both meet contrast targets. i18n (react-i18next) is in the stack — keep copy string-externalizable and layouts tolerant of longer translations.
