import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";

import { InviteMemberForm } from "./invite-form";
import { MembersTable } from "./members-table";

export default async function MembersPage() {
  const session = await requireAdmin();

  const db = getDb(session.orgId);
  const [memberships, invites] = await Promise.all([
    db.membership.findMany({
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.invite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <InviteMemberForm />
      <MembersTable
        memberships={memberships.map((m) => ({
          id: m.id,
          userId: m.userId,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          currentUserId: session.userId,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </div>
  );
}
