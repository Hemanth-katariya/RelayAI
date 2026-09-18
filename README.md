# RelayAI — AI-Powered Customer Support Platform

> **A production-ready Human-in-the-Loop (HITL) customer support agent** powered by Google Gemini, pgvector semantic search, and a deterministic policy rule engine — built with Next.js 16, tRPC, Prisma, and PostgreSQL.

---

## What is RelayAI?

RelayAI is an intelligent customer support automation platform that processes incoming support tickets through a **multi-stage AI agent pipeline**. It classifies customer intent, retrieves relevant company policies via semantic vector search, cross-references order data, and either **auto-resolves** or **escalates** tickets to human agents — all in real time.

The system ships with a full **Human-in-the-Loop (HITL) dashboard** where human agents can review AI decisions, approve/edit/reject draft responses, and maintain final control over high-risk cases.

### Benchmark Results

| Metric | Score | Target |
|---|---|---|
| **Intent Classification Accuracy** | **100%** (12/12) | >= 90% |
| **Policy Retrieval Recall@3** | **100%** (12/12) | >= 85% |
| **Action Decision Accuracy** | **100%** (12/12) | >= 95% |
| **HITL Escalation Accuracy** | **100%** (12/12) | 100% |

---

## Architecture Overview

```mermaid
flowchart TD
    Msg(["Customer Message"]) --> Pipeline

    subgraph Pipeline ["Agent Pipeline"]
        direction TB
        Step1["1. classifyIntent()\n(Gemini / Rule-based)"] --> |"Intent, Sentiment, Urgency"| Step2
        Step2["2. retrievePolicy()\n(pgvector cosine similarity search)"] --> |"Top-3 Policy Docs"| Step3
        Step3["3. lookUpOrder()\n(PostgreSQL)"] --> |"Order Details"| Step4
        Step4["4. decideAndDraft()\n(Gemini / Rule-based)"]
    end

    Step4 --> |"Action, Risk, Draft Response"| Decision{"Confidence & Risk?"}

    Decision -->|"Confidence ≥ 0.8 & LOW Risk"| AutoResolve(["Auto-resolve & Send Response"])
    Decision -->|"HIGH Risk OR Low Confidence"| Pending["PENDING_HUMAN_REVIEW"]

    Pending --> HITL(["HITL Dashboard\n(Approve / Edit / Reject)"])

    style Msg fill:#f9f,stroke:#333,stroke-width:2px
    style AutoResolve fill:#bbf,stroke:#333,stroke-width:2px
    style HITL fill:#bfb,stroke:#333,stroke-width:2px
    style Pipeline fill:#f4f4f4,stroke:#666,stroke-width:2px,stroke-dasharray: 5 5
```

### Agent Actions

| Action | Trigger |
|---|---|
| `APPROVE_REFUND` | Refund-eligible order within return window, or wrong item received |
| `DENY_REFUND` | Past return window, final-sale/clearance item, already-cancelled order |
| `RESEND_TRACKING_INFO` | Simple order status / tracking inquiry |
| `ESCALATE_TO_HUMAN` | Order > $300, abusive/legal language, billing disputes, damaged items, delayed shipments |
| `GENERAL_REPLY` | Pre-shipment cancellation requests, general inquiries |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 |
| **API Layer** | [tRPC v11](https://trpc.io/) + TanStack React Query v5 |
| **Database** | PostgreSQL + [pgvector](https://github.com/pgvector/pgvector) extension |
| **ORM** | [Prisma 7](https://www.prisma.io/) (with `@prisma/adapter-pg`) |
| **AI / LLM** | [Google Gemini](https://ai.google.dev/) via Vercel AI SDK (`@ai-sdk/google`) |
| **Vector Search** | `pgvector` — cosine similarity, 1536-dim embeddings |
| **Styling** | Tailwind CSS v4 |
| **Validation** | Zod v4 |

---

## Project Structure

```
relay-ai/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seeds policy docs, customers, orders, and inbox messages
│   ├── embedPolicyDocs.ts     # Generates 1536-dim embeddings and stores them via pgvector
│   └── data/                  # Static seed datasets
│
├── src/
│   ├── app/
│   │   ├── page.tsx           # HITL Dashboard UI (main application)
│   │   ├── layout.tsx         # Root layout + tRPC provider
│   │   └── globals.css        # Global styles
│   │
│   ├── server/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── trpc.ts            # tRPC server initialization
│   │   ├── agent/
│   │   │   ├── pipeline.ts    # Core AI agent pipeline (classify -> retrieve -> lookup -> decide)
│   │   │   └── vector.ts      # Offline feature-hashing embedding generator (1536-dim)
│   │   └── routers/
│   │       ├── _app.ts        # Root tRPC router
│   │       ├── inbox.ts       # getThreads, getThread queries
│   │       └── action.ts      # approveAction, editAction, rejectAction, runAgentOnThread
│   │
│   └── trpc/
│       ├── client.ts          # tRPC client setup
│       └── Provider.tsx       # TanStack Query + tRPC provider wrapper
│
├── evaluation_report.md       # Benchmark results across 12 edge-case test scenarios
├── next.config.ts
└── package.json
```

---

## Database Schema

### Core Models

| Model | Purpose |
|---|---|
| `PolicyDoc` | Knowledge base for RAG (18 docs across refunds/shipping/returns/billing) |
| `Customer` | Customer records with email and name |
| `Order` | Orders with status (`DELIVERED`/`IN_TRANSIT`/`DELAYED`/`CANCELLED`/`RETURNED`) + refund eligibility |
| `Thread` | Support conversations (`OPEN`/`PENDING_HUMAN_REVIEW`/`RESOLVED`/`ESCALATED`) |
| `Message` | Individual messages (sender: `CUSTOMER`/`AGENT`/`HUMAN`) |
| `AgentDecision` | Full audit log per pipeline run |

### AgentDecision — The Audit Trail

Every pipeline run produces one `AgentDecision` row containing:

| Field | Description |
|---|---|
| `intent` | Classified customer intent (e.g., `refund_request`, `delivery_complaint`) |
| `sentiment` | `neutral` / `frustrated` / `angry` |
| `urgency` | `low` / `medium` / `high` |
| `retrievedPolicyDocs` | Top-3 policy docs retrieved by vector search |
| `orderLookupResult` | Serialized order snapshot used for decision |
| `proposedAction` | One of the 5 allowed actions |
| `riskLevel` | `LOW` / `HIGH` |
| `confidence` | 0.0–1.0 self-reported by LLM |
| `draftResponse` | AI-generated customer-facing message |
| `reasoning` | Chain-of-thought explanation |
| `autoExecuted` | Whether action was auto-resolved without human review |
| `humanAction` | `APPROVED` / `EDITED` / `REJECTED` / `NOT_REQUIRED` |
| `finalResponse` | Final response sent to the customer after human review |

---

## Agent Pipeline Deep Dive

### Step 1 — Intent Classification

Uses **Gemini** (with a keyword-based fallback) to classify messages into intents:

| Intent | Example trigger |
|---|---|
| `refund_request` | "I want my money back for this broken item" |
| `delivery_complaint` | "My order still hasn't arrived after 2 weeks" |
| `billing_dispute` | "I was charged twice for the same order" |
| `order_status_inquiry` | "Where is my package?" |
| `wrong_item_received` | "I received the wrong product" |
| `cancellation_request` | "I want to cancel my order" |
| `general_complaint` | Catch-all for other grievances |

### Step 2 — Policy Retrieval

Generates a 1536-dimensional embedding of the customer message using a **deterministic feature-hashing algorithm** (no API key required), then queries PostgreSQL with the pgvector cosine distance operator:

```sql
SELECT id, title, category, content
FROM "PolicyDoc"
ORDER BY embedding <=> $queryVector::vector
LIMIT 3;
```

Query expansion is applied for edge-case intents (e.g., "clearance" expands to include "non-refundable items final sale" terms).

### Step 3 — Order Lookup

Fetches the associated order from PostgreSQL, including `status`, `amount`, `refundEligible`, and delivery dates.

### Step 4 — Decision & Draft

Applies **business policy rules** via Gemini (with a deterministic fallback). Critical guardrails:

| Guardrail | Rule |
|---|---|
| High-value order | Any order > $300 → `ESCALATE_TO_HUMAN` (HIGH risk) |
| Legal threat | Mentions of "lawyer", "sue", "court", "consumer protection" → immediate escalation |
| Abusive language | Hostile/offensive language detected → supervisor review |
| Billing dispute | Duplicate charge / double billing → finance team escalation |
| Final sale / cancelled | Non-refundable or already-cancelled → `DENY_REFUND` deterministically |

### Auto-Resolution Logic

```
if (confidence < 0.80 OR action == ESCALATE_TO_HUMAN OR riskLevel == HIGH):
    Thread status: PENDING_HUMAN_REVIEW  (awaits HITL action)
else:
    Thread status: RESOLVED  (agent response sent automatically)
```

---

## HITL Dashboard

The dashboard (at `/`) gives human agents a complete support inbox with:

- **Thread list** with filter tabs: All / Pending / High Risk / Resolved
- **Full-text search** across customer name, email, and subject
- **Thread detail panel** with:
  - Full conversation history (customer → agent → human messages)
  - AI reasoning trail: intent, sentiment, urgency, confidence score
  - Retrieved policy documents (expandable)
  - Order snapshot (item, amount, status, refund eligibility)
  - Proposed action with risk badge
  - Editable draft response
- **Action buttons**: Approve · Edit & Send · Reject (escalate) · Run Agent

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** with the `pgvector` extension enabled
- **Google Gemini API Key** _(optional — the system works fully offline without one)_

### 1. Clone & Install

```bash
git clone https://github.com/Hemanth-katariya/RelayAI.git
cd RelayAI
npm install
```

### 2. Configure Environment

Create a `.env` file at the project root:

```env
# PostgreSQL connection string (required)
DATABASE_URL="postgresql://user:password@localhost:5432/relayai"

# Google Gemini API key (optional — fallback rule engine used if absent)
GOOGLE_GENERATIVE_AI_API_KEY="your-api-key-here"
```

### 3. Set Up the Database

```bash
# Enable pgvector in your PostgreSQL database:
# psql -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Push the Prisma schema to your database
npx prisma db push

# Seed policy docs, customers, orders, and messages
npx prisma db seed
```

### 4. Generate Vector Embeddings

```bash
# Generate and store 1536-dim embeddings for all 18 policy documents
npx tsx prisma/embedPolicyDocs.ts
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the HITL Dashboard.

---

## Offline Mode (No API Key Required)

RelayAI works **fully offline** without any paid API keys:

- **Intent classification** falls back to a deterministic keyword-based classifier
- **Policy retrieval** uses a local feature-hashing embedding (1536-dim, L2-normalized) stored in pgvector
- **Decision engine** falls back to a hand-coded policy rule engine matching company guidelines exactly

This makes the system free to run, deterministically testable, and resilient when the LLM is unavailable.

---

## Evaluation

The pipeline was benchmarked against **12 handcrafted edge-case scenarios**. See [`evaluation_report.md`](./evaluation_report.md) for the full breakdown.

Test cases include:
- Refund within and outside the 30-day return window
- High-value order escalation (> $300)
- Wrong item received (company fulfillment error)
- Final-sale / clearance item denial
- Duplicate charge billing dispute
- Abusive customer language escalation
- Legal threat detection and escalation
- Pre-shipment cancellation handling
- Delivery delay escalation
- Tracking info request (auto-resolve)

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npx prisma db push` | Sync schema to database |
| `npx prisma db seed` | Seed the database with mock data |
| `npx tsx prisma/embedPolicyDocs.ts` | Generate and store pgvector embeddings |
| `npx prisma studio` | Open Prisma Studio to browse the database |

---

## API Reference (tRPC)

### Queries

| Procedure | Description |
|---|---|
| `inbox.getThreads` | Returns all threads with customer info, order, messages, and latest agent decision |
| `inbox.getThread` | Returns a single thread by ID with full message and decision history |

### Mutations

| Procedure | Description |
|---|---|
| `action.runAgentOnThread` | Triggers the full agent pipeline on the latest customer message |
| `action.approveAction` | Approves the AI draft, sends it, marks thread as RESOLVED |
| `action.editAction` | Saves human-edited response, sends it, marks thread as RESOLVED |
| `action.rejectAction` | Rejects the AI decision, escalates thread to ESCALATED status |

---


