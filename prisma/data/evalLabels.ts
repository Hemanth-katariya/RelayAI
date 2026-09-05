export const evalLabels = {
  msg_1: {
    expectedIntent: "RETURN_REQUEST",
    expectedPolicyDoc: "Standard Return Policy",
    expectedAction: "approve_refund",
    requiresHuman: false
  },
  msg_2: {
    expectedIntent: "RETURN_REQUEST",
    expectedPolicyDoc: "Late Returns Policy",
    expectedAction: "deny_refund", // or offer store credit
    requiresHuman: true // Because it's a denial, might want human review
  },
  msg_3: {
    expectedIntent: "ORDER_CANCELLATION",
    expectedPolicyDoc: "Escalation to Human Agents",
    expectedAction: "escalate_to_human",
    requiresHuman: true
  },
  msg_4: {
    expectedIntent: "SHIPPING_STATUS",
    expectedPolicyDoc: "Shipping Delays and Missing Packages",
    expectedAction: "general_reply", // or partial refund
    requiresHuman: false
  }
};
