// RelayAI — Seed Inbox Messages
//
// The first 12 messages are HANDCRAFTED and each pairs with a specific
// seedOrder from generateCustomersAndOrders.ts, deliberately exercising
// one branch of the agent's "decide allowed action" logic. These 12 are
// also what evalLabels.ts hand-labels for the evaluation report.
//
// The remaining messages are generic/filler — realistic inbox noise with
// varied tone and length, not individually labeled.

export interface MessageSeed {
  id: string;
  customerId: string; // matches CustomerSeed.id
  orderId: string | null; // matches OrderSeed.id, null if no order context
  subject: string;
  body: string;
}

export const handcraftedMessages: MessageSeed[] = [
  {
    id: "msg-refund-within-window",
    customerId: "cust-amara",
    orderId: "order-within-window",
    subject: "Refund request for headphones",
    body: "Hi, I got the wireless headphones about two weeks ago but honestly they don't fit well and I'd like to return them for a refund. Order was delivered on time, item's unused, still in the box. Can you help me get a refund?",
  },
  {
    id: "msg-refund-past-window",
    customerId: "cust-devraj",
    orderId: "order-past-window",
    subject: "Want a refund for the cookware set",
    body: "I know it's been a while since I got this cookware set, but I only just got round to using it and one of the pans has a weird coating that's flaking off. I'd like a refund please.",
  },
  {
    id: "msg-delayed-order",
    customerId: "cust-lena",
    orderId: "order-delayed",
    subject: "Where is my standing desk converter??",
    body: "I ordered this almost two weeks ago and it still hasn't arrived. The tracking hasn't updated in days. This is really frustrating, can someone tell me what's going on with my order?",
  },
  {
    id: "msg-cancelled-order-confusion",
    customerId: "cust-yuto",
    orderId: "order-cancelled",
    subject: "Refund for my keyboard order",
    body: "Hey, I'd like a refund for the mechanical keyboard I ordered. I think I might have cancelled it already but I'm not sure, can you check and sort out the refund either way?",
  },
  {
    id: "msg-high-value-refund",
    customerId: "cust-sofia",
    orderId: "order-high-value",
    subject: "Returning my monitor",
    body: "The 4K monitor I bought has some dead pixels in the corner. I'd like to return it for a full refund, it was quite an expensive purchase so I hope this can be sorted quickly.",
  },
  {
    id: "msg-wrong-item",
    customerId: "cust-marcus",
    orderId: "order-wrong-item",
    subject: "Received the wrong item",
    body: "I ordered an espresso machine but what showed up is a completely different model, looks like a blender actually. This obviously isn't what I paid for, please send me the correct item or refund me.",
  },
  {
    id: "msg-tracking-request",
    customerId: "cust-priya",
    orderId: "order-in-transit-tracking",
    subject: "Order status?",
    body: "Just wanted to check on the status of my running shoes order, when should I expect it to arrive? Thanks!",
  },
  {
    id: "msg-final-sale-refund",
    customerId: "cust-oliver",
    orderId: "order-final-sale",
    subject: "Jacket refund",
    body: "The clearance jacket I bought doesn't fit right, can I get a refund for it please?",
  },
  {
    id: "msg-duplicate-charge",
    customerId: "cust-amara",
    orderId: "order-within-window",
    subject: "Charged twice for my order",
    body: "I just checked my bank statement and it looks like I was charged twice for the same headphones order. Can someone look into this and refund the duplicate charge?",
  },
  {
    id: "msg-abusive-language",
    customerId: "cust-devraj",
    orderId: "order-past-window",
    subject: "This is ridiculous",
    body: "This service is a joke, you people are useless and I'm sick of being ignored. Fix my order NOW or I'm done with this company.",
  },
  {
    id: "msg-legal-threat",
    customerId: "cust-lena",
    orderId: "order-delayed",
    subject: "Considering next steps",
    body: "My order still hasn't arrived and it's been weeks. If this isn't resolved soon I'll be speaking to my lawyer and filing a complaint with consumer protection.",
  },
  {
    id: "msg-cancellation-request-pre-ship",
    customerId: "cust-priya",
    orderId: "order-in-transit-tracking",
    subject: "Need to cancel order",
    body: "I just placed an order for running shoes a few minutes ago by mistake, wrong size. Can I cancel it before it ships?",
  },
];

// Generic filler inbox noise — realistic tone variety, not individually
// labeled or wired to specific edge-case orders. Exists so the live feed
// feels like a real inbox rather than exactly 12 curated messages.
export const fillerMessages: MessageSeed[] = [
  {
    id: "msg-filler-1",
    customerId: "cust-filler-0",
    orderId: "order-filler-0-0",
    subject: "quick question",
    body: "hey do you guys ship internationally? thinking about ordering again from another country",
  },
  {
    id: "msg-filler-2",
    customerId: "cust-filler-1",
    orderId: "order-filler-1-0",
    subject: "Loved it!",
    body: "Just wanted to say the product arrived earlier than expected and it's great quality, thank you!",
  },
  {
    id: "msg-filler-3",
    customerId: "cust-filler-2",
    orderId: "order-filler-2-0",
    subject: "Change delivery address",
    body: "Is there any way to change the delivery address on my order? I moved recently and forgot to update it.",
  },
  {
    id: "msg-filler-4",
    customerId: "cust-filler-3",
    orderId: null,
    subject: "General inquiry",
    body: "Do you have a size guide for your clothing items? Couldn't find one on the site.",
  },
  {
    id: "msg-filler-5",
    customerId: "cust-filler-4",
    orderId: "order-filler-4-0",
    subject: "Item arrived damaged",
    body: "Unfortunately the box was pretty crushed in shipping and the item inside has a dent. Not sure if it still works properly, what should I do?",
  },
  {
    id: "msg-filler-6",
    customerId: "cust-filler-5",
    orderId: "order-filler-5-0",
    subject: "warranty question",
    body: "My item stopped working after about 4 months of normal use, is this covered under warranty?",
  },
];

export const allMessages: MessageSeed[] = [...handcraftedMessages, ...fillerMessages];
