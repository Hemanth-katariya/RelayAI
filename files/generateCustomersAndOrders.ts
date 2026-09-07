// RelayAI — Customer & Order generator
//
// This is the mock "backend system" the agent queries via a tool call
// during the "look up customer/order" pipeline step. Most records are
// randomly generated filler (so the dataset feels realistic at scale),
// but a fixed set of HANDCRAFTED edge-case orders is seeded first and
// referenced by exact index from messages.ts and evalLabels.ts — these
// are the records that actually exercise the agent's decision logic.

import { faker } from "@faker-js/faker";
import { RETURN_WINDOW_DAYS } from "./policyDocs";

export type OrderStatus =
  | "DELIVERED"
  | "IN_TRANSIT"
  | "DELAYED"
  | "CANCELLED"
  | "RETURNED";

export interface CustomerSeed {
  id: string; // stable slug used for cross-referencing
  name: string;
  email: string;
}

export interface OrderSeed {
  id: string; // stable slug used for cross-referencing
  customerId: string;
  itemName: string;
  amount: number;
  orderDate: string; // ISO date
  deliveryDate: string | null;
  status: OrderStatus;
  refundEligible: boolean;
  note: string; // why this record exists — not stored in DB, just for readability here
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function deriveRefundEligible(status: OrderStatus, deliveryDate: Date | null): boolean {
  if (status === "CANCELLED" || status === "RETURNED") return false;
  if (!deliveryDate) return false; // not yet delivered
  const daysSinceDelivery =
    (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceDelivery <= RETURN_WINDOW_DAYS;
}

// ---------------------------------------------------------------------------
// Handcrafted customers + orders covering every branch of the agent's
// "decide allowed action" logic. Referenced by id from messages.ts.
// ---------------------------------------------------------------------------
export const seedCustomers: CustomerSeed[] = [
  { id: "cust-amara", name: "Amara Okafor", email: "amara.okafor@example.com" },
  { id: "cust-devraj", name: "Devraj Patel", email: "devraj.patel@example.com" },
  { id: "cust-lena", name: "Lena Müller", email: "lena.muller@example.com" },
  { id: "cust-yuto", name: "Yuto Tanaka", email: "yuto.tanaka@example.com" },
  { id: "cust-sofia", name: "Sofia Rossi", email: "sofia.rossi@example.com" },
  { id: "cust-marcus", name: "Marcus Webb", email: "marcus.webb@example.com" },
  { id: "cust-priya", name: "Priya Nair", email: "priya.nair@example.com" },
  { id: "cust-oliver", name: "Oliver Kane", email: "oliver.kane@example.com" },
];

export const seedOrders: OrderSeed[] = [
  {
    id: "order-within-window",
    customerId: "cust-amara",
    itemName: "Wireless Noise-Cancelling Headphones",
    amount: 149.99,
    orderDate: daysAgo(20).toISOString(),
    deliveryDate: daysAgo(15).toISOString(),
    status: "DELIVERED",
    refundEligible: true,
    note: "Straightforward: within 30-day window → refund should be approvable",
  },
  {
    id: "order-past-window",
    customerId: "cust-devraj",
    itemName: "Ceramic Cookware Set",
    amount: 89.5,
    orderDate: daysAgo(70).toISOString(),
    deliveryDate: daysAgo(60).toISOString(),
    status: "DELIVERED",
    refundEligible: false,
    note: "60 days since delivery, past the 30-day window → refund should be denied",
  },
  {
    id: "order-delayed",
    customerId: "cust-lena",
    itemName: "Standing Desk Converter",
    amount: 210.0,
    orderDate: daysAgo(12).toISOString(),
    deliveryDate: null,
    status: "DELAYED",
    refundEligible: false,
    note: "Still in transit, past SLA → status update / reshipment logic, not refund",
  },
  {
    id: "order-cancelled",
    customerId: "cust-yuto",
    itemName: "Mechanical Keyboard",
    amount: 129.0,
    orderDate: daysAgo(5).toISOString(),
    deliveryDate: null,
    status: "CANCELLED",
    refundEligible: false,
    note: "Already cancelled → any further refund request should be denied/clarified",
  },
  {
    id: "order-high-value",
    customerId: "cust-sofia",
    itemName: "4K OLED Monitor",
    amount: 649.0,
    orderDate: daysAgo(10).toISOString(),
    deliveryDate: daysAgo(6).toISOString(),
    status: "DELIVERED",
    refundEligible: true,
    note: "Eligible by date, but > $300 → must route to human per escalation-high-value-order policy",
  },
  {
    id: "order-wrong-item",
    customerId: "cust-marcus",
    itemName: "Espresso Machine",
    amount: 175.0,
    orderDate: daysAgo(8).toISOString(),
    deliveryDate: daysAgo(4).toISOString(),
    status: "DELIVERED",
    refundEligible: true,
    note: "Customer will report receiving the wrong item → wrong-item policy applies, not standard refund",
  },
  {
    id: "order-in-transit-tracking",
    customerId: "cust-priya",
    itemName: "Running Shoes",
    amount: 74.99,
    orderDate: daysAgo(3).toISOString(),
    deliveryDate: null,
    status: "IN_TRANSIT",
    refundEligible: false,
    note: "Simple tracking-info request, well within SLA → low-risk auto-executable action",
  },
  {
    id: "order-final-sale",
    customerId: "cust-oliver",
    itemName: "Clearance Winter Jacket (Final Sale)",
    amount: 45.0,
    orderDate: daysAgo(15).toISOString(),
    deliveryDate: daysAgo(10).toISOString(),
    status: "DELIVERED",
    refundEligible: false,
    note: "Marked final sale at checkout → refund should be denied per non-refundable-items policy",
  },
];

// ---------------------------------------------------------------------------
// Randomly generated filler customers + orders, so the inbox/dataset feels
// like a real, larger system rather than exactly 8 records. These do NOT
// need individually correct edge-case behavior — they exist for volume
// and realism, not for the evaluation set.
// ---------------------------------------------------------------------------
const FILLER_CUSTOMER_COUNT = 32;
const ITEM_NAMES = [
  "Bluetooth Speaker",
  "Yoga Mat",
  "Cast Iron Skillet",
  "Desk Lamp",
  "Backpack",
  "Electric Kettle",
  "Office Chair",
  "Water Bottle",
  "Wireless Mouse",
  "Throw Blanket",
  "Air Purifier",
  "Bike Helmet",
];

export function generateFillerData(): {
  customers: CustomerSeed[];
  orders: OrderSeed[];
} {
  faker.seed(42); // deterministic output across runs

  const customers: CustomerSeed[] = [];
  const orders: OrderSeed[] = [];

  for (let i = 0; i < FILLER_CUSTOMER_COUNT; i++) {
    const custId = `cust-filler-${i}`;
    customers.push({
      id: custId,
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
    });

    // 1-2 orders per filler customer
    const orderCount = faker.number.int({ min: 1, max: 2 });
    for (let j = 0; j < orderCount; j++) {
      const status = faker.helpers.arrayElement<OrderStatus>([
        "DELIVERED",
        "DELIVERED",
        "DELIVERED", // weight toward delivered, the common case
        "IN_TRANSIT",
        "DELAYED",
        "CANCELLED",
      ]);
      const orderDaysAgo = faker.number.int({ min: 1, max: 90 });
      const orderDate = daysAgo(orderDaysAgo);
      const delivered = status === "DELIVERED" || status === "RETURNED";
      const deliveryDate = delivered
        ? daysAgo(Math.max(orderDaysAgo - faker.number.int({ min: 2, max: 7 }), 0))
        : null;

      orders.push({
        id: `order-filler-${i}-${j}`,
        customerId: custId,
        itemName: faker.helpers.arrayElement(ITEM_NAMES),
        amount: Number(faker.commerce.price({ min: 15, max: 250 })),
        orderDate: orderDate.toISOString(),
        deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
        status,
        refundEligible: deriveRefundEligible(status, deliveryDate),
        note: "filler",
      });
    }
  }

  return { customers, orders };
}
