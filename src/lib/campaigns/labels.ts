/**
 * Display labels and Badge variants for Campaign and CampaignLead status
 * enums. Co-located so a schema change forces an update right next to the
 * code that consumes them.
 *
 * The labels themselves moved to message files (`messages/*.json` under
 * `enums.campaignStatus.*` / `enums.campaignLeadStatus.*`) when i18n landed.
 * Callers thread in a translator via the helper functions below.
 */
import type { CampaignLeadStatus, CampaignStatus } from "@prisma/client";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive";
type EnumTranslator<Keys extends string> = (key: Keys) => string;

export const CAMPAIGN_STATUS_VARIANT: Record<CampaignStatus, Variant> = {
  DRAFT: "secondary",
  RUNNING: "default",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELED: "destructive",
};

export const LEAD_STATUS_VARIANT: Record<CampaignLeadStatus, Variant> = {
  PENDING: "secondary",
  CALLING: "default",
  ATTEMPTED: "secondary",
  REACHED: "success",
  NO_ANSWER: "warning",
  VOICEMAIL: "warning",
  FAILED: "destructive",
  EXCLUDED: "secondary",
};

export function campaignStatusLabel(
  status: CampaignStatus,
  t: EnumTranslator<CampaignStatus>,
): string {
  return t(status);
}

export function leadStatusLabel(
  status: CampaignLeadStatus,
  t: EnumTranslator<CampaignLeadStatus>,
): string {
  return t(status);
}

/** Lead statuses considered terminal for progress-bar accounting. */
export const TERMINAL_LEAD_STATUSES: ReadonlyArray<CampaignLeadStatus> = [
  "REACHED",
  "ATTEMPTED",
  "FAILED",
  "EXCLUDED",
];
