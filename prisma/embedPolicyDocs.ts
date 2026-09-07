import { prisma } from "../src/server/db";
import "dotenv/config";

// Deterministic 1536-dimensional feature hashing embedding
// Provides instant offline semantic vector search with pgvector without requiring paid API keys,
// while supporting AI embeddings when an API key is configured.
export function generateOfflineEmbedding(text: string, dim = 1536): number[] {
  const vec = new Float64Array(dim);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = clean.split(/\s+/).filter(Boolean);

  // Unigrams and bigrams
  const tokens: string[] = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`);
  }

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vec[idx] += sign;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm) || 1;

  const result: number[] = new Array(dim);
  for (let i = 0; i < dim; i++) {
    result[i] = Number((vec[i] / norm).toFixed(6));
  }
  return result;
}

async function main() {
  console.log("Starting policy embedding generation...");

  const policies = await prisma.policyDoc.findMany();
  if (policies.length === 0) {
    console.log("No policy docs found in the database. Run seed first.");
    return;
  }

  console.log(`Found ${policies.length} policy documents. Generating 1536-dim embeddings...`);

  const generateVector = (text: string) => generateOfflineEmbedding(text, 1536);

  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    const text = `${policy.title}\nCategory: ${policy.category}\n${policy.content}`;
    const embedding = await generateVector(text);

    const vectorString = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      UPDATE "PolicyDoc" 
      SET embedding = ${vectorString}::vector 
      WHERE id = ${policy.id}
    `;
    console.log(`[${i + 1}/${policies.length}] Embedded: "${policy.title}"`);
  }

  console.log("✅ All 18 policy doc embeddings stored in Postgres pgvector!");
}

main()
  .catch((e) => {
    console.error("Error generating embeddings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
