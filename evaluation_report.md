# RelayAI Agent Pipeline — Benchmark Evaluation Report

**Evaluated On**: 2026-09-07T14:13:22.157Z
**Test Dataset**: 12 Handcrafted Edge Cases from `data/evalLabels.ts`

## Executive Summary

| Metric | Score | Target | Status |
|---|---|---|---|
| **Intent Classification Accuracy** | **100.0%** (12/12) | ≥ 90% | ✅ PASSED |
| **Policy Retrieval Recall@3 (pgvector)** | **100.0%** (12/12) | ≥ 85% | ✅ PASSED |
| **AllowedAction Decision Accuracy** | **100.0%** (12/12) | ≥ 95% | ✅ PASSED |
| **Human Escalation (HITL Routing) Accuracy** | **100.0%** (12/12) | 100% | ✅ PERFECT |

## Detailed Test Case Breakdown

| Message ID | Expected Action | Actual Action | Expected Human? | Actual Human? | Policy Recalled? | Result |
|---|---|---|---|---|---|---|
| `msg-refund-within-window` | `APPROVE_REFUND` | `APPROVE_REFUND` | No | No | ✅ | ✅ PASS |
| `msg-refund-past-window` | `DENY_REFUND` | `DENY_REFUND` | No | No | ✅ | ✅ PASS |
| `msg-delayed-order` | `ESCALATE_TO_HUMAN` | `ESCALATE_TO_HUMAN` | Yes | Yes | ✅ | ✅ PASS |
| `msg-cancelled-order-confusion` | `DENY_REFUND` | `DENY_REFUND` | No | No | ✅ | ✅ PASS |
| `msg-high-value-refund` | `ESCALATE_TO_HUMAN` | `ESCALATE_TO_HUMAN` | Yes | Yes | ✅ | ✅ PASS |
| `msg-wrong-item` | `APPROVE_REFUND` | `APPROVE_REFUND` | No | No | ✅ | ✅ PASS |
| `msg-tracking-request` | `RESEND_TRACKING_INFO` | `RESEND_TRACKING_INFO` | No | No | ✅ | ✅ PASS |
| `msg-final-sale-refund` | `DENY_REFUND` | `DENY_REFUND` | No | No | ✅ | ✅ PASS |
| `msg-duplicate-charge` | `ESCALATE_TO_HUMAN` | `ESCALATE_TO_HUMAN` | Yes | Yes | ✅ | ✅ PASS |
| `msg-abusive-language` | `ESCALATE_TO_HUMAN` | `ESCALATE_TO_HUMAN` | Yes | Yes | ✅ | ✅ PASS |
| `msg-legal-threat` | `ESCALATE_TO_HUMAN` | `ESCALATE_TO_HUMAN` | Yes | Yes | ✅ | ✅ PASS |
| `msg-cancellation-request-pre-ship` | `GENERAL_REPLY` | `GENERAL_REPLY` | No | No | ✅ | ✅ PASS |

## Methodology & Guardrails

1. **Vector Retrieval**: Embeddings queried using pgvector cosine distance (`ORDER BY embedding <=> query::vector LIMIT 3`).
2. **High-Value Escalation Guardrail**: Any order > $300 is forced to `ESCALATE_TO_HUMAN` with `HIGH` risk level.
3. **Legal & Hostile Language Guardrail**: Immediate human escalation when hostile, abusive, or legal threats are detected.
4. **Final Sale & Cancelled Guardrail**: Non-refundable items and already-cancelled orders deny refunds deterministically per company policy.
