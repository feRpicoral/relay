/**
 * Display labels and Badge variants for Campaign and CampaignLead status
 * enums. Co-located so a schema change forces an update right next to the
 * code that consumes them.
 */
import type { CampaignLeadStatus, CampaignStatus } from "@prisma/client";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive";

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho",
  RUNNING: "Rodando",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

export const CAMPAIGN_STATUS_VARIANT: Record<CampaignStatus, Variant> = {
  DRAFT: "secondary",
  RUNNING: "default",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELED: "destructive",
};

export const LEAD_STATUS_LABEL: Record<CampaignLeadStatus, string> = {
  PENDING: "Pendente",
  CALLING: "Ligando",
  ATTEMPTED: "Esgotada",
  REACHED: "Atendeu",
  NO_ANSWER: "Sem resposta",
  VOICEMAIL: "Caixa postal",
  FAILED: "Falhou",
  EXCLUDED: "Excluída",
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

/** Lead statuses considered terminal for progress-bar accounting. */
export const TERMINAL_LEAD_STATUSES: ReadonlyArray<CampaignLeadStatus> = [
  "REACHED",
  "ATTEMPTED",
  "FAILED",
  "EXCLUDED",
];
