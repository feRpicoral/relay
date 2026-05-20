declare const __brand: unique symbol;

type Brand<T, B> = T & { readonly [__brand]: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type MembershipId = Brand<string, "MembershipId">;
export type InviteId = Brand<string, "InviteId">;
export type AgentId = Brand<string, "AgentId">;
export type PhoneNumberId = Brand<string, "PhoneNumberId">;
export type KnowledgeDocId = Brand<string, "KnowledgeDocId">;
export type CallId = Brand<string, "CallId">;
export type TranscriptId = Brand<string, "TranscriptId">;
export type ToolCallId = Brand<string, "ToolCallId">;
export type CallEventId = Brand<string, "CallEventId">;
export type CampaignId = Brand<string, "CampaignId">;
export type CampaignLeadId = Brand<string, "CampaignLeadId">;
export type CampaignAttemptId = Brand<string, "CampaignAttemptId">;
export type CalcomConnectionId = Brand<string, "CalcomConnectionId">;

export const asOrgId = (id: string): OrgId => id as OrgId;
export const asUserId = (id: string): UserId => id as UserId;
export const asMembershipId = (id: string): MembershipId => id as MembershipId;
export const asInviteId = (id: string): InviteId => id as InviteId;
export const asAgentId = (id: string): AgentId => id as AgentId;
export const asPhoneNumberId = (id: string): PhoneNumberId => id as PhoneNumberId;
export const asKnowledgeDocId = (id: string): KnowledgeDocId => id as KnowledgeDocId;
export const asCallId = (id: string): CallId => id as CallId;
export const asTranscriptId = (id: string): TranscriptId => id as TranscriptId;
export const asToolCallId = (id: string): ToolCallId => id as ToolCallId;
export const asCampaignId = (id: string): CampaignId => id as CampaignId;
export const asCampaignLeadId = (id: string): CampaignLeadId => id as CampaignLeadId;
export const asCampaignAttemptId = (id: string): CampaignAttemptId => id as CampaignAttemptId;
