import "server-only";

import { type OrgId } from "@/lib/db/types";
import type { ScopedDb } from "@/lib/db/with-org";

interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(db: ScopedDb, orgId: OrgId, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      orgId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      userId: entry.userId,
      metadata: entry.metadata as object | undefined,
    },
  });
}
