import { evalLabels } from "../prisma/data/evalLabels";
import { runAgentPipeline } from "../src/server/agent/pipeline";
import { prisma } from "../src/server/db";
import * as fs from "fs";
import * as path from "path";

interface EvalResult {
  messageId: string;
  expectedIntent: string;
  actualIntent: string;
  intentMatch: boolean;
  expectedPolicyDocId: string;
  retrievedPolicyDocIds: string[];
  policyMatch: boolean;
  expectedAction: string;
  actualAction: string;
  actionMatch: boolean;
  expectedRequiresHuman: boolean;
  actualRequiresHuman: boolean;
  routingMatch: boolean;
  confidence: number;
  reasoning: string;
}

async function runEvaluation() {
  console.log("================================================================================");
  console.log("                     RelayAI Agent Pipeline Evaluation Suite                    ");
  console.log("================================================================================\n");

  const results: EvalResult[] = [];

  for (let i = 0; i < evalLabels.length; i++) {
    const label = evalLabels[i];
    console.log(`[${i + 1}/${evalLabels.length}] Evaluating message: "${label.messageId}"...`);

    const decision = await runAgentPipeline(label.messageId);

    // Fetch full decision with retrieved policy docs
    const fullDecision = await prisma.agentDecision.findUnique({
      where: { id: decision.id },
      include: { retrievedPolicyDocs: true },
    });

    const retrievedIds = fullDecision?.retrievedPolicyDocs.map((p) => p.id) || [];
    const actualRequiresHuman =
      fullDecision?.riskLevel === "HIGH" || fullDecision?.proposedAction === "ESCALATE_TO_HUMAN";

    const result: EvalResult = {
      messageId: label.messageId,
      expectedIntent: label.expectedIntent,
      actualIntent: fullDecision?.intent || "",
      intentMatch: fullDecision?.intent === label.expectedIntent,
      expectedPolicyDocId: label.expectedPolicyDocId,
      retrievedPolicyDocIds: retrievedIds,
      policyMatch: retrievedIds.includes(label.expectedPolicyDocId),
      expectedAction: label.expectedAction,
      actualAction: fullDecision?.proposedAction || "",
      actionMatch: fullDecision?.proposedAction === label.expectedAction,
      expectedRequiresHuman: label.expectedRequiresHuman,
      actualRequiresHuman: Boolean(actualRequiresHuman),
      routingMatch: actualRequiresHuman === label.expectedRequiresHuman,
      confidence: fullDecision?.confidence || 0,
      reasoning: fullDecision?.reasoning || "",
    };

    results.push(result);
  }

  // Aggregate Metrics
  const total = results.length;
  const intentCorrect = results.filter((r) => r.intentMatch).length;
  const policyCorrect = results.filter((r) => r.policyMatch).length;
  const actionCorrect = results.filter((r) => r.actionMatch).length;
  const routingCorrect = results.filter((r) => r.routingMatch).length;

  const intentAccuracy = ((intentCorrect / total) * 100).toFixed(1);
  const policyRecallAt3 = ((policyCorrect / total) * 100).toFixed(1);
  const actionAccuracy = ((actionCorrect / total) * 100).toFixed(1);
  const routingAccuracy = ((routingCorrect / total) * 100).toFixed(1);

  console.log("\n================================================================================");
  console.log("                              BENCHMARK SUMMARY                                ");
  console.log("================================================================================");
  console.log(`Total Handcrafted Test Cases:      ${total}`);
  console.log(`Intent Classification Accuracy:    ${intentCorrect}/${total} (${intentAccuracy}%)`);
  console.log(`Policy Retrieval Recall@3:         ${policyCorrect}/${total} (${policyRecallAt3}%)`);
  console.log(`AllowedAction Decision Accuracy:   ${actionCorrect}/${total} (${actionAccuracy}%)`);
  console.log(`Human Routing (HITL) Accuracy:     ${routingCorrect}/${total} (${routingAccuracy}%)`);
  console.log("================================================================================\n");

  // Generate evaluation_report.md
  let reportMd = `# RelayAI Agent Pipeline — Benchmark Evaluation Report\n\n`;
  reportMd += `**Evaluated On**: ${new Date().toISOString()}\n`;
  reportMd += `**Test Dataset**: 12 Handcrafted Edge Cases from \`data/evalLabels.ts\`\n\n`;

  reportMd += `## Executive Summary\n\n`;
  reportMd += `| Metric | Score | Target | Status |\n`;
  reportMd += `|---|---|---|---|\n`;
  reportMd += `| **Intent Classification Accuracy** | **${intentAccuracy}%** (${intentCorrect}/${total}) | ≥ 90% | ${Number(intentAccuracy) >= 90 ? "✅ PASSED" : "⚠️ NEEDS TUNING"} |\n`;
  reportMd += `| **Policy Retrieval Recall@3 (pgvector)** | **${policyRecallAt3}%** (${policyCorrect}/${total}) | ≥ 85% | ${Number(policyRecallAt3) >= 85 ? "✅ PASSED" : "⚠️ NEEDS TUNING"} |\n`;
  reportMd += `| **AllowedAction Decision Accuracy** | **${actionAccuracy}%** (${actionCorrect}/${total}) | ≥ 95% | ${Number(actionAccuracy) >= 95 ? "✅ PASSED" : "⚠️ NEEDS TUNING"} |\n`;
  reportMd += `| **Human Escalation (HITL Routing) Accuracy** | **${routingAccuracy}%** (${routingCorrect}/${total}) | 100% | ${Number(routingAccuracy) === 100 ? "✅ PERFECT" : "⚠️ REVIEW ROUTING"} |\n\n`;

  reportMd += `## Detailed Test Case Breakdown\n\n`;
  reportMd += `| Message ID | Expected Action | Actual Action | Expected Human? | Actual Human? | Policy Recalled? | Result |\n`;
  reportMd += `|---|---|---|---|---|---|---|\n`;

  for (const r of results) {
    const passed = r.actionMatch && r.routingMatch;
    reportMd += `| \`${r.messageId}\` | \`${r.expectedAction}\` | \`${r.actualAction}\` | ${r.expectedRequiresHuman ? "Yes" : "No"} | ${r.actualRequiresHuman ? "Yes" : "No"} | ${r.policyMatch ? "✅" : "❌"} | ${passed ? "✅ PASS" : "❌ FAIL"} |\n`;
  }

  reportMd += `\n## Methodology & Guardrails\n\n`;
  reportMd += `1. **Vector Retrieval**: Embeddings queried using pgvector cosine distance (\`ORDER BY embedding <=> query::vector LIMIT 3\`).\n`;
  reportMd += `2. **High-Value Escalation Guardrail**: Any order > $300 is forced to \`ESCALATE_TO_HUMAN\` with \`HIGH\` risk level.\n`;
  reportMd += `3. **Legal & Hostile Language Guardrail**: Immediate human escalation when hostile, abusive, or legal threats are detected.\n`;
  reportMd += `4. **Final Sale & Cancelled Guardrail**: Non-refundable items and already-cancelled orders deny refunds deterministically per company policy.\n`;

  const reportPath = path.join(__dirname, "../evaluation_report.md");
  fs.writeFileSync(reportPath, reportMd, "utf-8");
  console.log(`📄 Full evaluation report written to: ${reportPath}\n`);
}

runEvaluation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
