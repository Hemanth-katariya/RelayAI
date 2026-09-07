// RelayAI — Policy Knowledge Base
//
// These are the ground-truth documents the agent retrieves during the
// "retrieve policy" step. Writing them ourselves means we know exactly
// which doc *should* be retrieved for a given message, which is what
// makes the evaluation report meaningful (retrieval precision/recall
// can be checked against a real answer key, not guessed at).
//
// RETURN_WINDOW_DAYS is the single source of truth used both here and
// by the order-seeding script to derive `refundEligible`, so the two
// datasets stay consistent with each other.

export const RETURN_WINDOW_DAYS = 30;

export interface PolicyDocSeed {
  id: string; // stable slug, referenced by eval labels
  title: string;
  category:
    | "refunds"
    | "shipping"
    | "returns"
    | "billing"
    | "escalation"
    | "cancellation"
    | "warranty";
  content: string;
}

export const policyDocs: PolicyDocSeed[] = [
  {
    id: "refund-window",
    title: "Refund Eligibility Window",
    category: "refunds",
    content: `Customers may request a full refund within ${RETURN_WINDOW_DAYS} days of the delivery date, provided the item is unused and in its original packaging. Refund requests made after ${RETURN_WINDOW_DAYS} days from delivery are not eligible for a standard refund and should be denied unless a warranty claim applies (see Warranty Policy). Refunds are processed to the original payment method within 5-7 business days of approval.`,
  },
  {
    id: "refund-non-eligible-items",
    title: "Non-Refundable Items",
    category: "refunds",
    content: `Gift cards, digital downloads, and items marked "Final Sale" at checkout are not eligible for refunds under any circumstances. If a customer requests a refund for one of these categories, the request should be denied and the customer should be offered a store credit or exchange instead where applicable.`,
  },
  {
    id: "refund-partial-damage",
    title: "Partial Refunds for Damaged Items",
    category: "refunds",
    content: `If an item arrives damaged but the customer wishes to keep it, a partial refund of 20-50% (based on severity, assessed by a human agent) may be offered instead of a full return. This decision always requires human approval and cannot be auto-executed by the support agent.`,
  },
  {
    id: "shipping-standard-sla",
    title: "Standard Shipping SLA",
    category: "shipping",
    content: `Standard shipping delivers within 5-7 business days of order confirmation. Expedited shipping delivers within 2-3 business days. If an order has not arrived within the SLA window plus 2 additional business days, it is considered delayed and the customer is entitled to a status update or, if 10+ business days have passed with no delivery, a full refund or reshipment at their choice.`,
  },
  {
    id: "shipping-lost-package",
    title: "Lost Package Policy",
    category: "shipping",
    content: `A package is classified as lost if tracking has shown no movement for 10 or more consecutive days and the carrier confirms no scan activity. In this case, the customer is entitled to either a full refund or a free reshipment, their choice. This determination should route to human review unless tracking data unambiguously confirms the loss.`,
  },
  {
    id: "shipping-tracking-info",
    title: "Providing Tracking Information",
    category: "shipping",
    content: `When a customer asks for an order status or tracking update, the support agent should look up the order and provide the current carrier tracking number and estimated delivery date directly. This is a low-risk, informational action and does not require human approval before sending.`,
  },
  {
    id: "returns-process",
    title: "Standard Return Process",
    category: "returns",
    content: `To initiate a return, the customer must request a return within ${RETURN_WINDOW_DAYS} days of delivery. Once approved, a prepaid return label is emailed to the customer. The refund is issued once the returned item is received and inspected at the warehouse, typically within 3-5 business days of receipt.`,
  },
  {
    id: "returns-wrong-item",
    title: "Wrong Item Received",
    category: "returns",
    content: `If a customer reports receiving the wrong item, this is treated as a company error, not a standard return. The customer should be offered a free return label and either an immediate reshipment of the correct item or a full refund, at their choice, regardless of the standard return window.`,
  },
  {
    id: "cancellation-policy",
    title: "Order Cancellation Policy",
    category: "cancellation",
    content: `Orders can be cancelled free of charge only if they have not yet entered the "processing" or "shipped" state. Once an order has shipped, it cannot be cancelled; the customer should instead be directed to the standard return process after delivery.`,
  },
  {
    id: "cancellation-already-shipped",
    title: "Cancellation Requests After Shipping",
    category: "cancellation",
    content: `If a customer requests cancellation after the order has already shipped, inform them that cancellation is no longer possible, but they are welcome to refuse delivery or initiate a standard return once the item arrives. This response can be auto-sent without human review.`,
  },
  {
    id: "billing-duplicate-charge",
    title: "Duplicate Charge Complaints",
    category: "billing",
    content: `If a customer reports being charged twice for the same order, this must always be escalated to human review — billing discrepancies are never auto-resolved by the support agent, regardless of confidence score, since they require verification against the payment processor's records.`,
  },
  {
    id: "billing-price-adjustment",
    title: "Price Adjustment / Price Match Requests",
    category: "billing",
    content: `RelayAI's parent store does not offer price adjustments after purchase, even if the item goes on sale shortly after the order was placed. This is a firm policy and the standard response can be sent directly to the customer without escalation.`,
  },
  {
    id: "warranty-standard",
    title: "Standard Warranty Coverage",
    category: "warranty",
    content: `All items carry a 1-year manufacturer warranty against defects (not damage from misuse). A warranty claim, if the defect is described clearly and the order is within the warranty period, can be auto-approved for a free replacement. If the claim details are ambiguous or the defect description suggests possible misuse, route to human review.`,
  },
  {
    id: "escalation-abusive-language",
    title: "Handling Abusive or Threatening Language",
    category: "escalation",
    content: `Any message containing abusive, threatening, or discriminatory language toward staff must be immediately escalated to a human agent regardless of the underlying request. The support agent should not attempt to auto-resolve the substantive issue in the same reply; the human reviewer will handle both the tone and the resolution.`,
  },
  {
    id: "escalation-legal-threat",
    title: "Legal Threats or Regulatory Complaints",
    category: "escalation",
    content: `Messages mentioning legal action, lawyers, chargebacks, or regulatory bodies (e.g. consumer protection agencies) must always be escalated to human review, even if the underlying request (e.g. a refund) would otherwise be auto-approvable. This protects the company from making commitments in a legally sensitive context.`,
  },
  {
    id: "escalation-high-value-order",
    title: "High-Value Order Threshold",
    category: "escalation",
    content: `Any refund or cancellation decision involving an order total above $300 must be routed to human review before execution, regardless of the agent's confidence score. This threshold exists to limit financial exposure from any single automated decision.`,
  },
  {
    id: "general-response-tone",
    title: "General Response Tone Guidelines",
    category: "escalation",
    content: `All customer-facing responses should be empathetic, concise, and avoid overly formal corporate language. Acknowledge the customer's issue in the first sentence before explaining the resolution or next steps.`,
  },
  {
    id: "returns-international",
    title: "International Return Shipping",
    category: "returns",
    content: `International orders (shipped outside the domestic market) follow the same ${RETURN_WINDOW_DAYS}-day return window, but the customer is responsible for return shipping costs unless the item arrived defective or incorrect, in which case the standard Wrong Item Received or Warranty policy applies instead.`,
  },
];
