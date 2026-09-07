// RelayAI — Evaluation Ground Truth
//
// One label per handcrafted message. run_evaluation.ts (to be written in
// week 3) will run each message through the live agent pipeline and
// compare its output against this answer key to compute:
//   - intent classification accuracy
//   - policy retrieval precision/recall (was expectedPolicyDocId in the
//     top-k retrieved set?)
//   - action-decision accuracy (did it pick the right AllowedAction?)
//   - risk/routing accuracy (did it correctly require human review?)
//
// This is the same habit TaxPilot AI used to produce a real, defensible
// benchmark section in its README instead of "it seems to work."

import type { AllowedAction } from "@prisma/client";

export interface EvalLabel {
  messageId: string; // matches MessageSeed.id in messages.ts
  expectedIntent: string;
  expectedPolicyDocId: string; // matches PolicyDocSeed.id in policyDocs.ts
  expectedAction: AllowedAction;
  expectedRequiresHuman: boolean;
  reasoning: string; // why this is the correct answer — for your own reference
}

export const evalLabels: EvalLabel[] = [
  {
    messageId: "msg-refund-within-window",
    expectedIntent: "refund_request",
    expectedPolicyDocId: "refund-window",
    expectedAction: "APPROVE_REFUND",
    expectedRequiresHuman: false,
    reasoning:
      "Delivered 15 days ago, well within 30-day window, order under $300 → auto-approvable.",
  },
  {
    messageId: "msg-refund-past-window",
    expectedIntent: "refund_request",
    expectedPolicyDocId: "refund-window",
    expectedAction: "DENY_REFUND",
    expectedRequiresHuman: false,
    reasoning:
      "60 days since delivery, past the 30-day window. A clear denial per policy, doesn't need human review to say no.",
  },
  {
    messageId: "msg-delayed-order",
    expectedIntent: "delivery_complaint",
    expectedPolicyDocId: "shipping-standard-sla",
    expectedAction: "ESCALATE_TO_HUMAN",
    expectedRequiresHuman: true,
    reasoning:
      "Order is delayed past SLA but not yet at the 10-day lost-package threshold — status is ambiguous enough to route to a human rather than promise a refund or reship automatically.",
  },
  {
    messageId: "msg-cancelled-order-confusion",
    expectedIntent: "refund_request",
    expectedPolicyDocId: "cancellation-policy",
    expectedAction: "DENY_REFUND",
    expectedRequiresHuman: false,
    reasoning:
      "Order is already CANCELLED — nothing was charged/shipped to refund. Clarify status to customer.",
  },
  {
    messageId: "msg-high-value-refund",
    expectedIntent: "refund_request",
    expectedPolicyDocId: "escalation-high-value-order",
    expectedAction: "ESCALATE_TO_HUMAN",
    expectedRequiresHuman: true,
    reasoning:
      "Order is $649, above the $300 high-value threshold — must route to human even though it's otherwise a clean, in-window refund case.",
  },
  {
    messageId: "msg-wrong-item",
    expectedIntent: "wrong_item_received",
    expectedPolicyDocId: "returns-wrong-item",
    expectedAction: "APPROVE_REFUND",
    expectedRequiresHuman: false,
    reasoning:
      "Wrong item received is a company error — free return + refund/reshipment can be offered directly, not subject to the standard window.",
  },
  {
    messageId: "msg-tracking-request",
    expectedIntent: "order_status_inquiry",
    expectedPolicyDocId: "shipping-tracking-info",
    expectedAction: "RESEND_TRACKING_INFO",
    expectedRequiresHuman: false,
    reasoning:
      "Simple informational request, low risk, well within SLA — textbook auto-executable action.",
  },
  {
    messageId: "msg-final-sale-refund",
    expectedIntent: "refund_request",
    expectedPolicyDocId: "refund-non-eligible-items",
    expectedAction: "DENY_REFUND",
    expectedRequiresHuman: false,
    reasoning:
      "Item explicitly marked Final Sale at checkout — non-refundable regardless of return window.",
  },
  {
    messageId: "msg-duplicate-charge",
    expectedIntent: "billing_dispute",
    expectedPolicyDocId: "billing-duplicate-charge",
    expectedAction: "ESCALATE_TO_HUMAN",
    expectedRequiresHuman: true,
    reasoning:
      "Billing discrepancies are never auto-resolved per policy, regardless of confidence — always escalate.",
  },
  {
    messageId: "msg-abusive-language",
    expectedIntent: "general_complaint",
    expectedPolicyDocId: "escalation-abusive-language",
    expectedAction: "ESCALATE_TO_HUMAN",
    expectedRequiresHuman: true,
    reasoning:
      "Abusive language toward staff must be escalated immediately regardless of the underlying request.",
  },
  {
    messageId: "msg-legal-threat",
    expectedIntent: "delivery_complaint",
    expectedPolicyDocId: "escalation-legal-threat",
    expectedAction: "ESCALATE_TO_HUMAN",
    expectedRequiresHuman: true,
    reasoning:
      "Mentions lawyer/consumer protection — must escalate even though the underlying delayed-order issue would otherwise be routine.",
  },
  {
    messageId: "msg-cancellation-request-pre-ship",
    expectedIntent: "cancellation_request",
    expectedPolicyDocId: "cancellation-policy",
    expectedAction: "GENERAL_REPLY",
    expectedRequiresHuman: false,
    reasoning:
      "Order is still IN_TRANSIT/not yet shipped in our seed data window — cancellation should be confirmable directly per policy.",
  },
];
