import { runAgentPipeline } from "../src/server/agent/pipeline";
import { prisma } from "../src/server/db";

async function main() {
  console.log("Testing pipeline on msg-refund-within-window...");
  const result = await runAgentPipeline("msg-refund-within-window");
  console.log("Result proposedAction:", result.proposedAction);
  console.log("Result riskLevel:", result.riskLevel);
  console.log("Result autoExecuted:", result.autoExecuted);
  console.log("Result draftResponse:", result.draftResponse);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
