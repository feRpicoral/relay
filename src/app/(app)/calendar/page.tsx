import { CalendarCheck2, CalendarDays, CalendarPlus, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { type BookingDay, BookingList, type BookingRow } from "@/components/calendar/booking-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";
import { requireSession } from "@/lib/auth/session";
import { formatBookingTime, groupBookingsByDay } from "@/lib/calendar/format";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { getPrisma } from "@/lib/db/client";
import { getDb } from "@/lib/db/with-org";
import { bookingStatusKey, bookingStatusVisual } from "@/lib/status-tone";
import { formatPhone } from "@/lib/utils";
import { BookAppointmentInputSchema, BookAppointmentOutputSchema } from "@/lib/voice/tool-schemas";

const CALCOM_APP_URL = "https://app.cal.com";
const RECENT_BOOKINGS_LIMIT = 200;

interface ParsedBooking {
  id: string;
  callId: string;
  start: Date;
  attendeeName: string;
  eventTypeName: string | null;
  phone: string | null;
  status: string;
}

export default async function CalendarPage() {
  const session = await requireSession();
  const t = await getTranslations("calendar");
  const tStatus = await getTranslations("enums.bookingStatus");
  const locale = await getLocale();

  const db = getDb(session.orgId);
  const [connection, org, bookingCalls] = await Promise.all([
    db.calcomConnection.findUnique({ where: { orgId: session.orgId } }),
    getPrisma().organization.findUnique({
      where: { id: session.orgId },
      select: { timezone: true },
    }),
    db.toolCall.findMany({
      where: { name: "book_appointment" },
      orderBy: { startedAt: "desc" },
      take: RECENT_BOOKINGS_LIMIT,
      include: { call: { select: { callerE164: true } } },
    }),
  ]);

  const openCalcomLink = (
    <a
      href={CALCOM_APP_URL}
      target="_blank"
      rel="noreferrer"
      className="text-primary inline-flex items-center gap-1.5 text-sm font-medium"
    >
      {t("openCalcom")}
      <ExternalLink className="size-3.5" />
    </a>
  );

  const isConnected = Boolean(connection?.apiKeyEncrypted);

  if (!isConnected) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} actions={openCalcomLink} />
        <div className="flex flex-1 items-center justify-center p-6">
          {session.role === "ADMIN" ? (
            <StateCard
              icon={<CalendarDays />}
              iconTone="primary"
              title={t("connect.title")}
              description={t("connect.description")}
              actions={
                <Button asChild>
                  <Link href="/settings/calendar">
                    <CalendarPlus className="size-4" />
                    {t("connect.cta")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <StateCard
              icon={<CalendarDays />}
              title={t("connect.title")}
              description={t("connect.description")}
              actions={
                <span className="border-border bg-secondary text-muted-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs">
                  <Lock className="size-3.5" />
                  {t("connect.memberLocked")}
                </span>
              }
            />
          )}
        </div>
      </>
    );
  }

  const timeZone = org?.timezone ?? connection?.timezone ?? DEFAULT_TIMEZONE;
  const now = new Date();

  const parsed: ParsedBooking[] = [];
  for (const row of bookingCalls) {
    if (row.errorMessage) continue;
    const input = BookAppointmentInputSchema.safeParse(row.inputJson);
    if (!input.success) continue;
    const start = new Date(input.data.slotIso);
    if (Number.isNaN(start.getTime()) || start.getTime() < now.getTime()) continue;
    const output = BookAppointmentOutputSchema.safeParse(row.outputJson);
    if (!output.success) continue;
    parsed.push({
      id: row.id,
      callId: row.callId,
      start,
      attendeeName: input.data.patientName,
      eventTypeName: input.data.eventTypeName ?? null,
      phone: input.data.patientPhone || row.call.callerE164 || null,
      status: output.data.status,
    });
  }

  if (parsed.length === 0) {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} actions={openCalcomLink} />
        <div className="flex flex-1 items-center justify-center p-6">
          <StateCard
            icon={<CalendarCheck2 />}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        </div>
      </>
    );
  }

  const groups = groupBookingsByDay(
    parsed.map((booking) => ({ start: booking.start, item: booking })),
    timeZone,
    locale,
    now,
  );

  const days: BookingDay[] = groups.map((group) => {
    const relativePrefix =
      group.relative === "today"
        ? t("relative.today")
        : group.relative === "tomorrow"
          ? t("relative.tomorrow")
          : null;
    const header = relativePrefix ? `${relativePrefix}: ${group.label}` : group.label;
    const rows: BookingRow[] = group.items.map((booking) => ({
      id: booking.id,
      callId: booking.callId,
      time: formatBookingTime(booking.start, timeZone, locale),
      attendeeName: booking.attendeeName,
      secondary: booking.eventTypeName,
      phone: booking.phone ? formatPhone(booking.phone) : null,
      statusLabel: tStatus(bookingStatusKey(booking.status)),
      statusTone: bookingStatusVisual(booking.status).tone,
    }));
    return { dayKey: group.dayKey, header, rows };
  });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={openCalcomLink} />
      <div className="p-4 md:p-6">
        <BookingList days={days} viewCallLabel={t("viewCall")} />
      </div>
    </>
  );
}
