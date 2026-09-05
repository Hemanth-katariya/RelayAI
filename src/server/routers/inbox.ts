import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "../db";

export const inboxRouter = createTRPCRouter({
  getThreads: publicProcedure.query(async () => {
    return prisma.thread.findMany({
      include: {
        customer: true,
        messages: {
          include: {
            agentDecision: true,
          }
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),
});
