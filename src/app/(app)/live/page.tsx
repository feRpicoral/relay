import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Dot } from "@/components/ui/dot";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { LiveCallsList } from "./live-list";

export default async function LiveCallsPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("calls.live");

  const initial = await db.call.findMany({
    where: { status: { in: ["RINGING", "IN_PROGRESS"] } },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { agent: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <span className="border-success/30 bg-success/10 text-success inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
            <Dot tone="success" pulse />
            {t("liveBadge")}
          </span>
        }
      />
      <div className="p-8">
        <LiveCallsList
          orgId={session.orgId}
          initial={initial.map((c) => ({
            id: c.id,
            org_id: c.orgId,
            agent_name: c.agent?.name ?? null,
            caller_e164: c.callerE164,
            callee_e164: c.calleeE164,
            direction: c.direction,
            status: c.status as "RINGING" | "IN_PROGRESS",
            started_at: c.startedAt.toISOString(),
          }))}
        />
      </div>
      <div className="px-8 pb-8">
        <Link
          href="/calls"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("viewHistory")}
        </Link>
      </div>
    </>
  );
}
