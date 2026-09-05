import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "../db";

export const actionRouter = createTRPCRouter({
  approveAction: publicProcedure
    .input(z.object({ decisionId: z.string() }))
    .mutation(async ({ input }) => {
      // In a real app, this would execute the action.
      // For now, just mark the thread status.
      const decision = await prisma.agentDecision.findUnique({
        where: { id: input.decisionId },
        include: { message: true }
      });
      if (decision) {
         await prisma.thread.update({
           where: { id: decision.message.threadId },
           data: { status: "RESOLVED" }
         });
      }
      return { success: true };
    }),
});
