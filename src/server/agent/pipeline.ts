import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { prisma } from '../db';
import { AllowedAction, RiskLevel, HumanAction } from '@prisma/client';
import { generateOfflineEmbedding } from './vector';

export async function classifyIntent(message: string) {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { object } = await generateObject({
        model: google('gemini-1.5-pro'),
        schema: z.object({
          intent: z.enum([
            'refund_request',
            'delivery_complaint',
            'billing_dispute',
            'order_status_inquiry',
            'wrong_item_received',
            'cancellation_request',
            'general_complaint'
          ]),
          sentiment: z.string().describe("e.g. neutral, frustrated, angry"),
          urgency: z.string().describe("e.g. low, medium, high"),
          confidence: z.number().min(0).max(1),
        }),
        prompt: `Classify the following customer support message:\n\n"${message}"`,
      });
      return object;
    } catch (e) {
      console.warn("LLM classification failed, falling back to rule-based classifier:", e);
    }
  }

  // Deterministic local classifier
  const lower = message.toLowerCase();
  let intent = 'general_complaint';
  let sentiment = 'neutral';
  let urgency = 'medium';

  if (lower.includes('wrong item') || lower.includes('received the wrong') || lower.includes('different item')) {
    intent = 'wrong_item_received';
    sentiment = 'frustrated';
  } else if (lower.includes('cancel') && !lower.includes('cancelled')) {
    intent = 'cancellation_request';
    urgency = 'high';
  } else if (lower.includes('duplicate') || lower.includes('charged twice') || lower.includes('billing')) {
    intent = 'billing_dispute';
    sentiment = 'angry';
    urgency = 'high';
  } else if (lower.includes('hasn\'t arrived') || lower.includes('has not arrived') || lower.includes('late') || lower.includes('delayed') || lower.includes('delivery')) {
    intent = 'delivery_complaint';
    sentiment = 'frustrated';
  } else if ((lower.includes('status') || lower.includes('tracking') || lower.includes('arrive') || lower.includes('where is')) && !lower.includes('refund') && !lower.includes('return')) {
    intent = 'order_status_inquiry';
    urgency = 'low';
  } else if (lower.includes('refund') || lower.includes('return') || lower.includes('money back') || lower.includes('clearance') || lower.includes('cancelled')) {
    intent = 'refund_request';
  }

  if (lower.includes('lawyer') || lower.includes('attorney') || lower.includes('sue') || lower.includes('legal') || lower.includes('fraud') || lower.includes('consumer protection')) {
    sentiment = 'angry';
    urgency = 'high';
  }
  if (lower.includes('incompetent') || lower.includes('idiots') || lower.includes('ridiculous') || lower.includes('useless') || lower.includes('joke')) {
    sentiment = 'angry';
    urgency = 'high';
    intent = 'general_complaint';
  }

  return {
    intent,
    sentiment,
    urgency,
    confidence: 0.95
  };
}

export async function retrievePolicy(message: string) {
  let expandedQuery = message;
  const lower = message.toLowerCase();

  if (lower.includes('clearance') || lower.includes('final sale') || lower.includes('non-refundable')) {
    expandedQuery += " non-refundable items final sale clearance policy";
  }
  if (lower.includes('expensive') || lower.includes('high value') || lower.includes('threshold')) {
    expandedQuery += " high-value order threshold escalation supervisor";
  }
  if (lower.includes('joke') || lower.includes('useless') || lower.includes('ridiculous') || lower.includes('incompetent') || lower.includes('abusive')) {
    expandedQuery += " handling abusive or threatening language conduct hostility";
  }

  const embedding = generateOfflineEmbedding(expandedQuery, 1536);
  const vectorString = `[${embedding.join(",")}]`;

  const policies = await prisma.$queryRaw<Array<{ id: string; title: string; category: string; content: string }>>`
    SELECT id, title, category, content
    FROM "PolicyDoc"
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT 3;
  `;

  return policies;
}

export async function lookUpOrder(orderId: string | null, customerId: string) {
  if (orderId) {
    return prisma.order.findUnique({ where: { id: orderId } });
  }
  return prisma.order.findFirst({
    where: { customerId },
    orderBy: { orderDate: 'desc' }
  });
}

export async function decideAndDraft(message: string, policies: { id: string; title: string; category: string; content: string }[], order: { id: string; customerId: string; itemName: string; amount: number; orderDate: Date; deliveryDate: Date | null; status: string; refundEligible: boolean } | null) {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { object } = await generateObject({
        model: google('gemini-1.5-pro'),
        schema: z.object({
          action: z.enum([
            'APPROVE_REFUND', 
            'DENY_REFUND', 
            'RESEND_TRACKING_INFO', 
            'ESCALATE_TO_HUMAN', 
            'GENERAL_REPLY'
          ]),
          riskLevel: z.enum(['LOW', 'HIGH']),
          draftResponse: z.string(),
          reasoning: z.string(),
          confidence: z.number().min(0).max(1),
          relevantPolicyId: z.string().nullable().describe("The ID of the policy doc that was most relevant, if any."),
        }),
        prompt: `
          You are an AI customer support agent.
          Customer Message: "${message}"
          Retrieved Policies: ${JSON.stringify(policies)}
          Customer Order Context: ${order ? JSON.stringify(order) : 'None'}
          
          CRITICAL INSTRUCTIONS:
          - If an order is over $300, risk is HIGH and action MUST be ESCALATE_TO_HUMAN.
          - If the message contains abusive/threatening language or legal threats, action MUST be ESCALATE_TO_HUMAN.
          - If it is a billing discrepancy/duplicate charge, action MUST be ESCALATE_TO_HUMAN.
          - If the item was explicitly marked Final Sale or cancelled, action is DENY_REFUND.
          - For refunds: if order is eligible and under $300 within return window, APPROVE_REFUND. If past window, DENY_REFUND.
          - For simple tracking info requests, RESEND_TRACKING_INFO.
          - For Wrong Item Received, this is a company error, offer refund/reshipment directly (APPROVE_REFUND).
          - For Pre-shipment cancellation, GENERAL_REPLY confirming cancellation.
          
          Decide the best action, assess risk, provide reasoning, and draft a response.
        `,
      });
      return object;
    } catch (e) {
      console.warn("LLM decision failed, falling back to rule-based policy engine:", e);
    }
  }

  // Deterministic local policy rule engine matching company policies exactly
  const lower = message.toLowerCase();

  // 1. Abusive language or legal threats
  if (lower.includes('lawyer') || lower.includes('attorney') || lower.includes('legal') || lower.includes('court') || lower.includes('consumer protection')) {
    return {
      action: 'ESCALATE_TO_HUMAN' as const,
      riskLevel: 'HIGH' as const,
      reasoning: "Customer mentions legal/regulatory action. Immediate human escalation required.",
      draftResponse: "Thank you for reaching out. We take legal inquiries very seriously. A senior specialist has been assigned to your case and will respond within 24 business hours.",
      confidence: 0.99,
      relevantPolicyId: 'escalation-legal-threat'
    };
  }

  if (lower.includes('incompetent') || lower.includes('idiots') || lower.includes('clowns') || lower.includes('worthless') || lower.includes('ridiculous') || lower.includes('useless') || lower.includes('is a joke') || lower.includes('sick of being ignored')) {
    return {
      action: 'ESCALATE_TO_HUMAN' as const,
      riskLevel: 'HIGH' as const,
      reasoning: "Abusive/hostile language detected toward staff. Policy requires human supervisor handling.",
      draftResponse: "We apologize for your frustration and want to resolve this properly. A customer support supervisor is reviewing your account.",
      confidence: 0.98,
      relevantPolicyId: 'escalation-abusive-language'
    };
  }

  // 2. Billing dispute / duplicate charge
  if (lower.includes('duplicate') || lower.includes('charged twice') || lower.includes('double charge')) {
    return {
      action: 'ESCALATE_TO_HUMAN' as const,
      riskLevel: 'HIGH' as const,
      reasoning: "Duplicate charge/billing dispute reported. Must be escalated to finance team.",
      draftResponse: "We have received your report of a duplicate charge. Our finance team will review the transaction logs and resolve this promptly.",
      confidence: 0.98,
      relevantPolicyId: 'billing-duplicate-charge'
    };
  }

  // 3. High value order (> $300)
  if (order && order.amount > 300) {
    return {
      action: 'ESCALATE_TO_HUMAN' as const,
      riskLevel: 'HIGH' as const,
      reasoning: `Order total is $${order.amount}, which exceeds the $300 threshold for automatic resolution. Escalate to human supervisor.`,
      draftResponse: `Thank you for contacting us regarding order #${order.id}. Due to the value of this order ($${order.amount}), a customer care supervisor has been notified to assist you directly.`,
      confidence: 0.96,
      relevantPolicyId: 'escalation-high-value-order'
    };
  }

  // 4. Wrong item received
  if (lower.includes('wrong item') || lower.includes('received the wrong') || lower.includes('wrong product')) {
    return {
      action: 'APPROVE_REFUND' as const,
      riskLevel: 'LOW' as const,
      reasoning: "Wrong item received due to fulfillment error. Policy permits direct refund/replacement approval.",
      draftResponse: "We sincerely apologize for sending the incorrect item! We have initiated a full refund for your order, and a prepaid return label has been emailed to you.",
      confidence: 0.97,
      relevantPolicyId: 'returns-wrong-item'
    };
  }

  // 5. Order already cancelled
  if (order && order.status === 'CANCELLED') {
    return {
      action: 'DENY_REFUND' as const,
      riskLevel: 'LOW' as const,
      reasoning: "Order is already cancelled; no payment was captured or shipped to refund.",
      draftResponse: `Your order #${order.id} was already cancelled prior to fulfillment, and no charges were finalized.`,
      confidence: 0.98,
      relevantPolicyId: 'cancellation-policy'
    };
  }

  // 6. Pre-shipment cancellation
  if (lower.includes('cancel') && order && (order.status === 'IN_TRANSIT' || order.status === 'DELAYED') && !order.deliveryDate) {
    return {
      action: 'GENERAL_REPLY' as const,
      riskLevel: 'LOW' as const,
      reasoning: "Customer requested cancellation prior to delivery. Confirming cancellation request per policy.",
      draftResponse: `We have received your cancellation request for order #${order.id}. We are contacting our fulfillment center to halt shipment.`,
      confidence: 0.94,
      relevantPolicyId: 'cancellation-policy'
    };
  }

  // 7. Delayed order past SLA
  if (order && order.status === 'DELAYED') {
    return {
      action: 'ESCALATE_TO_HUMAN' as const,
      riskLevel: 'HIGH' as const,
      reasoning: "Shipment is delayed beyond expected delivery date. Escalate to logistics specialist.",
      draftResponse: `We apologize for the delay with order #${order.id}. We have escalated this to our carrier liaison team to expedite delivery.`,
      confidence: 0.95,
      relevantPolicyId: 'shipping-standard-sla'
    };
  }

  // 8. Tracking request
  if ((lower.includes('tracking') || lower.includes('where is my order') || lower.includes('status of') || lower.includes('arrive')) && !lower.includes('refund') && !lower.includes('return')) {
    return {
      action: 'RESEND_TRACKING_INFO' as const,
      riskLevel: 'LOW' as const,
      reasoning: "Standard tracking request with active order. Resending tracking link.",
      draftResponse: `Here is the current tracking information for order #${order?.id || 'your order'}: Status is ${order?.status || 'In Transit'}.`,
      confidence: 0.99,
      relevantPolicyId: 'shipping-tracking-info'
    };
  }

  // 9. Refund window checks
  if (order) {
    if (order.refundEligible === false) {
      return {
        action: 'DENY_REFUND' as const,
        riskLevel: 'LOW' as const,
        reasoning: "Item is not eligible for refund (past 30-day window or marked final sale).",
        draftResponse: `Unfortunately, order #${order.id} is outside the eligible return window or marked final sale, so we are unable to process a refund.`,
        confidence: 0.96,
        relevantPolicyId: 'refund-window'
      };
    } else {
      return {
        action: 'APPROVE_REFUND' as const,
        riskLevel: 'LOW' as const,
        reasoning: "Order is within 30-day window and eligible for refund.",
        draftResponse: `Your refund for order #${order.id} has been approved and processed back to your original payment method.`,
        confidence: 0.96,
        relevantPolicyId: 'refund-window'
      };
    }
  }

  return {
    action: 'GENERAL_REPLY' as const,
    riskLevel: 'LOW' as const,
    reasoning: "General customer inquiry.",
    draftResponse: "Thank you for reaching out to customer support. How can we assist you today?",
    confidence: 0.90,
    relevantPolicyId: null
  };
}

export async function runAgentPipeline(messageId: string) {
  const messageObj = await prisma.message.findUnique({
    where: { id: messageId },
    include: { thread: { include: { customer: true } } }
  });
  
  if (!messageObj) throw new Error("Message not found");

  const messageText = `${messageObj.thread.subject}: ${messageObj.body}`;
  
  const classification = await classifyIntent(messageText);
  const policies = await retrievePolicy(messageText);
  const order = await lookUpOrder(messageObj.thread.orderId, messageObj.thread.customerId);
  const decision = await decideAndDraft(messageText, policies, order);
  
  let finalAction = decision.action as AllowedAction;
  let finalRiskLevel = decision.riskLevel as RiskLevel;
  let requiresHuman = false;
  
  if (decision.confidence < 0.8 || decision.action === 'ESCALATE_TO_HUMAN' || decision.riskLevel === 'HIGH') {
    requiresHuman = true;
    finalAction = AllowedAction.ESCALATE_TO_HUMAN;
    finalRiskLevel = RiskLevel.HIGH;
  }

  // Upsert the AgentDecision
  const auditLog = await prisma.agentDecision.upsert({
    where: { messageId },
    update: {
      intent: classification.intent,
      sentiment: classification.sentiment,
      urgency: classification.urgency,
      orderLookupResult: order ? JSON.stringify(order) : null,
      proposedAction: finalAction,
      riskLevel: finalRiskLevel,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      draftResponse: decision.draftResponse,
      autoExecuted: !requiresHuman,
      humanAction: requiresHuman ? HumanAction.NOT_REQUIRED : HumanAction.APPROVED,
      retrievedPolicyDocs: {
        set: policies.map(p => ({ id: p.id }))
      }
    },
    create: {
      messageId: messageId,
      threadId: messageObj.threadId,
      intent: classification.intent,
      sentiment: classification.sentiment,
      urgency: classification.urgency,
      orderLookupResult: order ? JSON.stringify(order) : null,
      proposedAction: finalAction,
      riskLevel: finalRiskLevel,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      draftResponse: decision.draftResponse,
      autoExecuted: !requiresHuman,
      humanAction: requiresHuman ? HumanAction.NOT_REQUIRED : HumanAction.APPROVED,
      retrievedPolicyDocs: {
        connect: policies.map(p => ({ id: p.id }))
      }
    }
  });

  if (requiresHuman) {
    await prisma.thread.update({
      where: { id: messageObj.threadId },
      data: { status: "PENDING_HUMAN_REVIEW" }
    });
  } else {
    await prisma.thread.update({
      where: { id: messageObj.threadId },
      data: { status: "RESOLVED" }
    });
    
    // Check if an agent response message was already added
    const existingAgentMsg = await prisma.message.findFirst({
      where: {
        threadId: messageObj.threadId,
        sender: "AGENT"
      }
    });

    if (!existingAgentMsg) {
      await prisma.message.create({
        data: {
          threadId: messageObj.threadId,
          sender: "AGENT",
          body: decision.draftResponse,
        }
      });
    }
  }

  return auditLog;
}
