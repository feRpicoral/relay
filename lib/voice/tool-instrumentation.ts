import type { CallId, OrgId } from "@/lib/db/types";

import { recordToolCall } from "./persistence";

/**
 * Wraps a tool executor so the worker no longer hand-rolls the same
 * `startedAt = new Date()` / try / recordToolCall(success) / catch /
 * recordToolCall(error) / rethrow boilerplate around every tool.
 *
 * Failures inside `recordToolCall` itself are swallowed (logged) so a DB blip
 * can't take down a live call; tool-execution failures still propagate to the
 * LLM via rethrow.
 */
export async function runInstrumentedTool<TInput, TOutput>(args: {
  orgId: OrgId;
  callId: CallId;
  name: string;
  input: TInput;
  execute: () => Promise<TOutput>;
}): Promise<TOutput> {
  const startedAt = new Date();
  try {
    const output = await args.execute();
    const endedAt = new Date();
    void recordToolCall(args.orgId, args.callId, {
      name: args.name,
      inputJson: args.input as Record<string, unknown>,
      outputJson: output as Record<string, unknown>,
      startedAt,
      endedAt,
      durationMs: endedAt.getTime() - startedAt.getTime(),
    }).catch((err: unknown) =>
      console.warn(`[tool-instrumentation] recordToolCall ${args.name} failed`, err),
    );
    return output;
  } catch (err) {
    const endedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    void recordToolCall(args.orgId, args.callId, {
      name: args.name,
      inputJson: args.input as Record<string, unknown>,
      errorMessage: message,
      startedAt,
      endedAt,
      durationMs: endedAt.getTime() - startedAt.getTime(),
    }).catch((logErr: unknown) =>
      console.warn(`[tool-instrumentation] recordToolCall error ${args.name} failed`, logErr),
    );
    throw err;
  }
}
