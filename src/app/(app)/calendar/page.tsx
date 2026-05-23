import { CalendarCheck2, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/with-org";
import { BookAppointmentInputSchema, BookAppointmentOutputSchema } from "@/lib/voice/tool-schemas";

const RECENT_BOOKINGS_LIMIT = 20;

export default async function CalendarPage() {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const t = await getTranslations("calendar");
  const tSettings = await getTranslations("settings.calendar");

  const [connection, recentBookings] = await Promise.all([
    db.calcomConnection.findUnique({ where: { orgId: session.orgId } }),
    db.toolCall.findMany({
      where: { name: "book_appointment" },
      orderBy: { startedAt: "desc" },
      take: RECENT_BOOKINGS_LIMIT,
      include: {
        call: { select: { id: true, callerE164: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/calendar">
              <CalendarCheck2 className="h-4 w-4" />
              {tSettings("connect.submit")}
            </Link>
          </Button>
        }
      />
      <div className="p-8">
        {!connection ? (
          <Empty
            icon={<CalendarPlus className="h-5 w-5" />}
            title={tSettings("connect.title")}
            description={tSettings("connect.apiKeyHint")}
            action={
              <Button asChild>
                <Link href="/settings/calendar">{tSettings("connect.submit")}</Link>
              </Button>
            }
          />
        ) : recentBookings.length === 0 ? (
          <Empty
            icon={<CalendarCheck2 className="h-5 w-5" />}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
            </CardHeader>
            <div className="divide-border divide-y">
              {recentBookings.map((booking) => {
                // Parse via Zod so a worker-side schema drift surfaces as
                // "-" instead of crashing the calendar view.
                const input = BookAppointmentInputSchema.safeParse(booking.inputJson);
                const output = BookAppointmentOutputSchema.safeParse(booking.outputJson);
                const patientName = input.success ? input.data.patientName : "—";
                const slotIso = input.success ? input.data.slotIso : "";
                const patientPhone = input.success ? input.data.patientPhone : "";
                const status = output.success ? output.data.status : null;
                const displayStatus = status ?? "-";
                return (
                  <Link
                    key={booking.id}
                    href={`/calls/${booking.callId}`}
                    className="hover:bg-accent/40 flex items-center justify-between px-5 py-3 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{patientName}</p>
                      <p className="text-muted-foreground text-xs">
                        {slotIso}, {patientPhone}
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs">{displayStatus}</p>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
