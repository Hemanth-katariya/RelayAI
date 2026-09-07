import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "../db";
import { HumanAction } from "@prisma/client";
import { runAgentPipeline } from "../agent/pipeline";

export const actionRouter = createTRPCRouter({
  approveAction: publicProcedure
    .input(z.object({ decisionId: z.string() }))
    .mutation(async ({ input }) => {
      const decision = await prisma.agentDecision.findUnique({
        where: { id: input.decisionId },
        include: { thread: true },
      });

      if (!decision) throw new Error("Decision not found");

      await prisma.$transaction([
        prisma.agentDecision.update({
          where: { id: input.decisionId },
          data: {
            humanAction: HumanAction.APPROVED,
            finalResponse: decision.draftResponse,
          },
        }),
        prisma.message.create({
          data: {
            threadId: decision.threadId,
            sender: "HUMAN",
            body: decision.draftResponse,
          },
        }),
        prisma.thread.update({
          where: { id: decision.threadId },
          data: { status: "RESOLVED" },
        }),
      ]);

      return { success: true };
    }),

  editAction: publicProcedure
    .input(z.object({ decisionId: z.string(), customResponse: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const decision = await prisma.agentDecision.findUnique({
        where: { id: input.decisionId },
        include: { thread: true },
      });

      if (!decision) throw new Error("Decision not found");

      await prisma.$transaction([
        prisma.agentDecision.update({
          where: { id: input.decisionId },
          data: {
            humanAction: HumanAction.EDITED,
            finalResponse: input.customResponse,
          },
        }),
        prisma.message.create({
          data: {
            threadId: decision.threadId,
            sender: "HUMAN",
            body: input.customResponse,
          },
        }),
        prisma.thread.update({
          where: { id: decision.threadId },
          data: { status: "RESOLVED" },
        }),
      ]);

      return { success: true };
    }),

  rejectAction: publicProcedure
    .input(z.object({ decisionId: z.string() }))
    .mutation(async ({ input }) => {
      const decision = await prisma.agentDecision.findUnique({
        where: { id: input.decisionId },
      });

      if (!decision) throw new Error("Decision not found");

      await prisma.$transaction([
        prisma.agentDecision.update({
          where: { id: input.decisionId },
          data: { humanAction: HumanAction.REJECTED },
        }),
        prisma.thread.update({
          where: { id: decision.threadId },
          data: { status: "ESCALATED" },
        }),
      ]);

      return { success: true };
    }),

  runAgentOnThread: publicProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ input }) => {
      const lastCustomerMsg = await prisma.message.findFirst({
        where: { threadId: input.threadId, sender: "CUSTOMER" },
        orderBy: { createdAt: "desc" },
      });

      if (!lastCustomerMsg) throw new Error("No customer message found in this thread");

      const decision = await runAgentPipeline(lastCustomerMsg.id);
      return { success: true, decisionId: decision.id };
    }),
});
