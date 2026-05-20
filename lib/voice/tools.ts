import "server-only";

import { z } from "zod";

import { getPrisma } from "@/lib/db/client";
import { asOrgId, type CallId, type OrgId } from "@/lib/db/types";

import { recordToolCall } from "./persistence";
import { lookupKb } from "./tools/lookup-kb";

/**
 * Tools available to the agent during a live call. All tools share the same shape:
 *   name, description, input schema (zod), and an async `execute` that returns
 *   a JSON-serializable result.
 *
 * The agent worker calls `runTool` to dispatch by name; persistence and latency
 * tracking happen here so the caller only worries about the conversation flow.
 */

interface ToolHandler<I extends z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: I;
  execute: (
    input: z.infer<I>,
    ctx: { orgId: OrgId; callId: CallId },
  ) => Promise<Record<string, unknown>>;
}

const checkAvailability: ToolHandler<
  z.ZodObject<{ from: z.ZodString; to: z.ZodString; durationMin: z.ZodNumber }>
> = {
  name: "check_availability",
  description:
    "Check available appointment slots within a date range. Returns up to 5 candidate slots.",
  inputSchema: z.object({
    from: z.string().describe("ISO 8601 datetime of the earliest acceptable slot"),
    to: z.string().describe("ISO 8601 datetime of the latest acceptable slot"),
    durationMin: z.number().int().positive().describe("Appointment length in minutes"),
  }),
  async execute(input, ctx) {
    const { calcom } = await import("@/lib/calendar/calcom");
    const slots = await calcom.getAvailableSlots({
      orgId: ctx.orgId,
      fromIso: input.from,
      toIso: input.to,
      durationMin: input.durationMin,
    });
    return { slots: slots.slice(0, 5) };
  },
};

const bookAppointment: ToolHandler<
  z.ZodObject<{
    slotIso: z.ZodString;
    durationMin: z.ZodNumber;
    patientName: z.ZodString;
    patientPhone: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
  }>
> = {
  name: "book_appointment",
  description: "Book an appointment at the given slot. Returns a confirmation id.",
  inputSchema: z.object({
    slotIso: z.string().describe("ISO 8601 datetime of the chosen slot"),
    durationMin: z.number().int().positive(),
    patientName: z.string().min(2).max(120),
    patientPhone: z.string().min(8).max(20),
    reason: z.string().max(280).optional(),
  }),
  async execute(input, ctx) {
    const { calcom } = await import("@/lib/calendar/calcom");
    const booking = await calcom.bookAppointment({
      orgId: ctx.orgId,
      slotIso: input.slotIso,
      durationMin: input.durationMin,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      reason: input.reason,
    });
    return { confirmationId: booking.id, status: booking.status };
  },
};

const lookupKnowledgeBase: ToolHandler<z.ZodObject<{ query: z.ZodString }>> = {
  name: "lookup_kb",
  description:
    "Search the business knowledge base (FAQ, hours, policies). Use this BEFORE answering any question that isn't in your context.",
  inputSchema: z.object({ query: z.string().min(2).max(500) }),
  async execute(input, ctx) {
    const chunks = await lookupKb(ctx.orgId, input.query);
    return { chunks };
  },
};

const transferToHuman: ToolHandler<z.ZodObject<{ reason: z.ZodString }>> = {
  name: "transfer_to_human",
  description:
    "Transfer the call to the human fallback number. Use only when you cannot help or the caller explicitly asks for a person.",
  inputSchema: z.object({ reason: z.string().min(2).max(280) }),
  async execute(_input, ctx) {
    const call = await getPrisma().call.findUnique({
      where: { id: ctx.callId },
      include: { agent: true },
    });
    return {
      ok: true,
      transferToE164: call?.agent?.fallbackTransferE164 ?? null,
    };
  },
};

export const VOICE_TOOLS = {
  check_availability: checkAvailability,
  book_appointment: bookAppointment,
  lookup_kb: lookupKnowledgeBase,
  transfer_to_human: transferToHuman,
} as const;

export type VoiceToolName = keyof typeof VOICE_TOOLS;

export interface ToolDispatchResult {
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

/**
 * Dispatch a tool by name. Validates input with zod, runs the tool, records the
 * call in the DB, and returns the result + latency.
 */
export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: { orgId: OrgId; callId: CallId },
): Promise<ToolDispatchResult> {
  const startedAt = new Date();
  const start = startedAt.getTime();
  const tool = (VOICE_TOOLS as unknown as Record<string, ToolHandler<z.ZodTypeAny>>)[name];
  if (!tool) {
    return {
      ok: false,
      error: `Unknown tool: ${name}`,
      durationMs: 0,
    };
  }

  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const error = parsed.error.issues.map((i) => i.message).join("; ");
    await recordToolCall(ctx.orgId, ctx.callId, {
      name,
      inputJson: rawInput as Record<string, unknown>,
      errorMessage: error,
      startedAt,
      endedAt: new Date(),
      durationMs: Date.now() - start,
    });
    return { ok: false, error, durationMs: Date.now() - start };
  }

  try {
    const result = await tool.execute(parsed.data, ctx);
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - start;
    await recordToolCall(ctx.orgId, ctx.callId, {
      name,
      inputJson: parsed.data as Record<string, unknown>,
      outputJson: result,
      startedAt,
      endedAt,
      durationMs,
    });
    return { ok: true, result, durationMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const endedAt = new Date();
    const durationMs = endedAt.getTime() - start;
    await recordToolCall(ctx.orgId, ctx.callId, {
      name,
      inputJson: parsed.data as Record<string, unknown>,
      errorMessage: error,
      startedAt,
      endedAt,
      durationMs,
    });
    return { ok: false, error, durationMs };
  }
}

/**
 * Tool definitions in the JSON Schema shape Anthropic expects for `tools` on
 * the `messages.create` API. We hand-write these to avoid pulling in a runtime
 * zod-to-JSON-Schema dependency for four small schemas; if the tool list grows
 * we can revisit.
 */
export function toolDefinitionsForAnthropic() {
  return [
    {
      name: "check_availability",
      description:
        "Check available appointment slots within a date range. Returns up to 5 candidate slots.",
      input_schema: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "ISO 8601 datetime of earliest slot" },
          to: { type: "string", description: "ISO 8601 datetime of latest slot" },
          durationMin: { type: "integer", minimum: 1 },
        },
        required: ["from", "to", "durationMin"],
      },
    },
    {
      name: "book_appointment",
      description: "Book an appointment at the given slot. Returns a confirmation id.",
      input_schema: {
        type: "object" as const,
        properties: {
          slotIso: { type: "string" },
          durationMin: { type: "integer", minimum: 1 },
          patientName: { type: "string", minLength: 2, maxLength: 120 },
          patientPhone: { type: "string", minLength: 8, maxLength: 20 },
          reason: { type: "string", maxLength: 280 },
        },
        required: ["slotIso", "durationMin", "patientName", "patientPhone"],
      },
    },
    {
      name: "lookup_kb",
      description:
        "Search the business knowledge base. Use BEFORE answering any question not already in your context.",
      input_schema: {
        type: "object" as const,
        properties: { query: { type: "string", minLength: 2, maxLength: 500 } },
        required: ["query"],
      },
    },
    {
      name: "transfer_to_human",
      description: "Transfer the call to the human fallback number. Use only when you cannot help.",
      input_schema: {
        type: "object" as const,
        properties: { reason: { type: "string", minLength: 2, maxLength: 280 } },
        required: ["reason"],
      },
    },
  ];
}

// Re-export the OrgId helper for consumers that don't already import it.
export { asOrgId };
