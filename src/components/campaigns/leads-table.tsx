import type { CampaignLeadStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { leadStatusLabel } from "@/lib/campaigns/labels";
import { campaignLeadStatusVisual } from "@/lib/status-tone";
import { formatPhone } from "@/lib/utils";

export interface LeadRow {
  id: string;
  phoneE164: string;
  name: string | null;
  status: CampaignLeadStatus;
  attempts: number;
  lastCall: string | null;
}

export async function CampaignLeadsTable({ leads }: { leads: LeadRow[] }) {
  const t = await getTranslations("campaigns.detail.leadsTable");
  const tLead = await getTranslations("enums.campaignLeadStatus");

  return (
    <Card className="overflow-hidden">
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("attempts")}</TableHead>
              <TableHead className="text-right">{t("lastCall")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const visual = campaignLeadStatusVisual(lead.status);
              return (
                <TableRow key={lead.id}>
                  <TableCell className="text-foreground font-mono font-semibold">
                    {formatPhone(lead.phoneE164)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.name ?? t("unnamed")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={leadStatusLabel(lead.status, tLead)}
                      tone={visual.tone}
                      pulse={visual.pulse}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">{lead.attempts}</TableCell>
                  <TableCell className="text-muted-foreground text-right font-mono">
                    {lead.lastCall ?? t("never")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
