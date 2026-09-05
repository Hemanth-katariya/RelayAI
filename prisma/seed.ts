import { PrismaClient } from '@prisma/client';
import { policyDocs } from './data/policyDocs';
import { customers, orders } from './data/generateCustomersAndOrders';
import { threads, messages } from './data/messages';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Seed Policy Docs (Without embeddings for now, the pipeline will add them later or we do it here if needed)
  for (const doc of policyDocs) {
    await prisma.policyDoc.create({
      data: {
        title: doc.title,
        content: doc.content,
      }
    });
  }
  console.log('Seeded Policy Docs');

  // 2. Seed Customers
  for (const cust of customers) {
    await prisma.customer.create({
      data: cust
    });
  }
  console.log('Seeded Customers');

  // 3. Seed Orders
  for (const ord of orders) {
    await prisma.order.create({
      data: ord
    });
  }
  console.log('Seeded Orders');

  // 4. Seed Threads
  for (const thread of threads) {
    await prisma.thread.create({
      data: thread
    });
  }
  console.log('Seeded Threads');

  // 5. Seed Messages
  for (const msg of messages) {
    await prisma.message.create({
      data: msg
    });
  }
  console.log('Seeded Messages');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
