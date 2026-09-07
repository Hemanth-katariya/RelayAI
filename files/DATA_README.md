# RelayAI — Seed Dataset

All data in this project is synthetic by design (no real customer or
company data is used or needed). This is normal for a portfolio agent
project — what matters is that the dataset is internally consistent and
exercises every branch of the agent's decision logic on purpose.

## What's included

| File | Contents | Count |
|---|---|---|
| `data/policyDocs.ts` | Company policy knowledge base (retrieved via vector search) | 18 docs |
| `data/generateCustomersAndOrders.ts` | Customers + orders (looked up via tool call) | 8 handcrafted + 32 filler customers; 8 handcrafted + ~48 filler orders |
| `data/messages.ts` | Seed inbox messages | 12 handcrafted + 6 filler |
| `data/evalLabels.ts` | Hand-labeled ground truth for evaluation | 12 labels (1 per handcrafted message) |

## Why 12 handcrafted message/order pairs

Each of the 12 handcrafted messages is deliberately wired to a specific
order that exercises exactly one branch of the "decide allowed action"
policy logic:

| Message | Edge case exercised | Expected action |
|---|---|---|
| `msg-refund-within-window` | Standard, clean refund | `APPROVE_REFUND` |
| `msg-refund-past-window` | Past the 30-day return window | `DENY_REFUND` |
| `msg-delayed-order` | Delayed but not yet "lost" | `ESCALATE_TO_HUMAN` |
| `msg-cancelled-order-confusion` | Order already cancelled | `DENY_REFUND` |
| `msg-high-value-refund` | Otherwise-valid refund over $300 | `ESCALATE_TO_HUMAN` |
| `msg-wrong-item` | Company error, not standard return | `APPROVE_REFUND` |
| `msg-tracking-request` | Simple, low-risk info request | `RESEND_TRACKING_INFO` |
| `msg-final-sale-refund` | Non-refundable item category | `DENY_REFUND` |
| `msg-duplicate-charge` | Billing dispute, always escalated | `ESCALATE_TO_HUMAN` |
| `msg-abusive-language` | Abusive tone toward staff | `ESCALATE_TO_HUMAN` |
| `msg-legal-threat` | Legal/regulatory mention | `ESCALATE_TO_HUMAN` |
| `msg-cancellation-request-pre-ship` | Pre-shipment cancellation | `GENERAL_REPLY` |

This table is the answer key `evalLabels.ts` encodes, and it's what
`run_evaluation.ts` (week 3) will score the live agent pipeline against
to produce real accuracy/precision numbers in `evaluation_report.md` —
the same habit that made TaxPilot AI's README stand out.

## Filler data

The 32 filler customers, ~48 filler orders, and 6 filler messages exist
purely so the inbox and database feel like a real system at a glance
(not exactly 8 rows). They're generated with `faker.seed(42)` for
reproducibility and are **not** individually labeled — don't build
eval logic around them.

## Load order

```
PolicyDocs → Customers → Orders → Threads/Messages
```

Run `npx prisma db seed` after your schema is migrated. Embeddings for
policy docs are generated in a separate script (`embedPolicyDocs.ts`,
not yet written) so re-seeding during development stays fast and free.
