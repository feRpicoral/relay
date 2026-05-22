import type { OrgId } from "@/lib/db/types";
import { getDb } from "@/lib/db/with-org";

/**
 * Search the org's knowledge base. v1 uses simple ILIKE matching ranked by
 * occurrence, good enough for FAQ-sized KBs (<50k tokens). When/if a tenant's
 * KB outgrows this we move to pgvector + embeddings.
 */
export async function lookupKb(
  orgId: OrgId,
  query: string,
  limit = 3,
): Promise<Array<{ title: string; excerpt: string }>> {
  const db = getDb(orgId);
  const q = query.trim();
  if (q.length === 0) return [];

  const docs = await db.knowledgeDoc.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return docs.map((d) => ({
    title: d.title,
    excerpt: extractRelevantSpan(d.body, q),
  }));
}

export function extractRelevantSpan(body: string, query: string, span = 240): string {
  const lc = body.toLowerCase();
  const qLc = query.toLowerCase();
  const idx = lc.indexOf(qLc);
  if (idx === -1) return body.slice(0, span);
  const start = Math.max(0, idx - Math.floor(span / 2));
  const end = Math.min(body.length, start + span);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < body.length ? "..." : "";
  return `${prefix}${body.slice(start, end)}${suffix}`;
}
