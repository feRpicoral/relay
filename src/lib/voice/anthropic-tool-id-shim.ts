/**
 * Workaround for an @livekit/agents (v1.4.3) bug where the framework's internal
 * tool-call IDs (`item_<itemId>/fnc_<idx>`) leak into the LLM request body. When
 * the LLM is Anthropic (via the OpenAI-compat endpoint at api.anthropic.com),
 * Anthropic validates `tool_use.id` against `^[a-zA-Z0-9_-]+$` and 400s on the
 * `/` separator. The agent then stalls (retries 3x, gives up, no LLM response,
 * Cartesia gets empty text and errors with "No valid transcripts passed").
 *
 * We can't reach into the framework cleanly, so we monkey-patch globalThis.fetch
 * at module load. The interceptor only touches requests to anthropic.com and
 * only rewrites the two fields that carry the offending IDs:
 *   - messages[N].tool_calls[M].id
 *   - messages[N].tool_call_id
 *
 * Drop this shim once upstream issue is fixed:
 * https://github.com/livekit/agents-js/issues
 */

let installed = false;

export function installAnthropicToolIdShim(): void {
  if (installed) return;
  installed = true;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    if (!shouldRewrite(input, init)) return originalFetch(input, init);

    try {
      const parsed = JSON.parse(init!.body as string) as unknown;
      const rewritten = rewriteToolIds(parsed);
      const newBody = JSON.stringify(rewritten);
      return originalFetch(input, { ...init, body: newBody });
    } catch {
      // Body wasn't JSON or rewrite failed; pass through unchanged so we
      // don't make a working request fail.
      return originalFetch(input, init);
    }
  };
}

function shouldRewrite(input: Parameters<typeof fetch>[0], init?: RequestInit): boolean {
  if (!init?.body || typeof init.body !== "string") return false;
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  return url.includes("anthropic.com");
}

/**
 * Replace any non-`^[a-zA-Z0-9_-]+$` characters with `_` in the two known
 * locations where the framework puts its internal IDs. Intentionally narrow:
 * we don't touch unknown `id` fields because that could break other things.
 */
export function rewriteToolIds(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const root = value as { messages?: unknown };
  if (!Array.isArray(root.messages)) return value;

  for (const msgRaw of root.messages) {
    if (!msgRaw || typeof msgRaw !== "object") continue;
    const msg = msgRaw as {
      tool_calls?: Array<{ id?: string }>;
      tool_call_id?: string;
    };

    if (Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (typeof tc.id === "string") tc.id = sanitize(tc.id);
      }
    }
    if (typeof msg.tool_call_id === "string") {
      msg.tool_call_id = sanitize(msg.tool_call_id);
    }
  }

  return value;
}

export function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
