import { createTRPCRouter } from "../trpc";
import { inboxRouter } from "./inbox";
import { actionRouter } from "./action";

export const appRouter = createTRPCRouter({
  inbox: inboxRouter,
  action: actionRouter,
});

export type AppRouter = typeof appRouter;
