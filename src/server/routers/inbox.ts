import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "../db";

export const inboxRouter = createTRPCRouter({
  getThreads: publicProcedure.query(async () => {
    return prisma.thread.findMany({
      include: {
        customer: true,
        order: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
        agentDecisions: {
          include: {
            retrievedPolicyDocs: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getThread: publicProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input }) => {
      return prisma.thread.findUnique({
        where: { id: input.threadId },
        include: {
          customer: true,
          order: true,
          messages: {
            orderBy: { createdAt: "asc" },
          },
          agentDecisions: {
            include: {
              retrievedPolicyDocs: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),
});
