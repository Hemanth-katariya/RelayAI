// RelayAI — prisma/seed.ts
//
// Run with: npx prisma db seed
// (after adding `"prisma": { "seed": "ts-node seed.ts" }` to package.json)
//
// Loads all four datasets in dependency order:
//   PolicyDocs -> Customers -> Orders -> Threads/Messages
// Embeddings for PolicyDocs are intentionally left for a separate script
// (embedPolicyDocs.ts) since they require an API call per doc — keeping
// that out of the main seed keeps re-seeding fast and free during dev.

import { PrismaClient } from "@prisma/client";
import { policyDocs } from "./policyDocs";
import {
  seedCustomers,
  seedOrders,
  generateFillerData,
} from "./generateCustomersAndOrders";
import { allMessages } from "./messages";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PolicyDocs...");
  for (const doc of policyDocs) {
    await prisma.policyDoc.upsert({
      where: { id: doc.id },
      update: {},
      create: {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content,
      },
    });
  }

  const { customers: fillerCustomers, orders: fillerOrders } =
    generateFillerData();
  const allCustomers = [...seedCustomers, ...fillerCustomers];
  const allOrders = [...seedOrders, ...fillerOrders];

  console.log(`Seeding ${allCustomers.length} customers...`);
  for (const c of allCustomers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, name: c.name, email: c.email },
    });
  }

  console.log(`Seeding ${allOrders.length} orders...`);
  for (const o of allOrders) {
    await prisma.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        customerId: o.customerId,
        itemName: o.itemName,
        amount: o.amount,
        orderDate: new Date(o.orderDate),
        deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : null,
        status: o.status,
        refundEligible: o.refundEligible,
      },
    });
  }

  console.log(`Seeding ${allMessages.length} inbox threads/messages...`);
  for (const m of allMessages) {
    const thread = await prisma.thread.upsert({
      where: { id: `thread-${m.id}` },
      update: {},
      create: {
        id: `thread-${m.id}`,
        customerId: m.customerId,
        orderId: m.orderId,
        subject: m.subject,
        status: "OPEN",
      },
    });

    await prisma.message.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        threadId: thread.id,
        sender: "CUSTOMER",
        body: m.body,
      },
    });
  }

  console.log("Seed complete.");
  console.log(
    "Next step: run `npx ts-node embedPolicyDocs.ts` to generate and store" +
      " vector embeddings for the policy docs before starting the agent pipeline."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
