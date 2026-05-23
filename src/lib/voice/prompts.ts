import type { AgentContext } from "./types";

/**
 * Build the system prompt that the worker hands to the LLM at conversation
 * start. We keep a single English base body and inject a one-line directive
 * telling the model which language to actually *speak* in. The model then
 * localizes greetings, day names, business-hours phrasing, and farewells
 * itself — that's much less brittle than maintaining parallel PT/EN copies of
 * the same instructions.
 */
function languageDirective(language: AgentContext["language"]): string {
  switch (language) {
    case "pt-BR":
      return "Respond in Brazilian Portuguese (pt-BR). All spoken output — greetings, day names, business-hours phrasing, confirmations, and farewells — must be in pt-BR.";
    case "en-US":
      return "Respond in English (en-US).";
    case "auto":
      return "Detect the caller's language from their first utterance and respond in the same language for the entire call. Default to English if uncertain.";
  }
}

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies ReadonlyArray<keyof Omit<AgentContext["businessHours"], "timezone">>;

function formatHours(hours: AgentContext["businessHours"]): string {
  const entries: string[] = [];
  for (const key of DAY_KEYS) {
    const block = hours[key];
    if (block) {
      entries.push(`${key}: ${block.open}-${block.close}`);
    }
  }
  if (entries.length === 0) {
    return "24/7";
  }
  return entries.join(", ");
}

export function buildSystemPrompt(ctx: AgentContext): string {
  const hours = formatHours(ctx.businessHours);
  const kb = ctx.knowledgeChunks.length
    ? ctx.knowledgeChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")
    : "(No knowledge base provided.)";

  // Inject the current date in the org's timezone so the LLM doesn't pick
  // dates from its training cutoff when building tool-call arguments
  // (observed: Claude passing 2025-01-XX in 2026-05 calls, which then makes
  // Cal.com return zero slots because the query is in the past). This is
  // metadata for the LLM (not spoken text), so we format with en-US
  // unconditionally to keep the string stable across agent languages.
  const tz = ctx.businessHours.timezone;
  const nowInTz = new Date().toLocaleString("en-US", {
    timeZone: tz,
    dateStyle: "full",
    timeStyle: "short",
  });

  return [
    languageDirective(ctx.language),
    "",
    "You are a friendly, professional AI receptionist. Speak naturally, keep responses short (1-2 sentences), and never sound robotic.",
    "Always confirm details verbally before booking. If you are unsure, say so honestly and offer to transfer.",
    "If the caller asks something outside the knowledge base, do not invent. Use the lookup_kb tool first.",
    "When you need a moment for a tool call (>300ms), say 'one moment, please' before invoking it.",
    "After every tool call, you MUST speak — never go silent. If `check_availability` returns no slots, say so out loud and ask the caller for a different day or time. If a tool errors, apologize briefly and offer to transfer or take a message. Never let a tool result sit without a verbal reply.",
    "When the caller is fully done (appointment booked and confirmed, question answered, they said goodbye), say a brief farewell out loud THEN call `end_call` to hang up. Don't keep the line open waiting for them to disconnect.",
    "",
    `Current date/time: ${nowInTz} (${tz}). When the caller says "tomorrow", "next Monday", etc., resolve against this — never use older dates from your training data.`,
    `Business hours: ${hours}`,
    "",
    "Knowledge base (verbatim, quote when relevant):",
    kb,
    "",
    "Persona instructions:",
    ctx.personaPrompt || "Be warm, concise, and helpful.",
  ].join("\n");
}

export function buildGreeting(ctx: AgentContext): string {
  if (ctx.greeting && ctx.greeting.length > 0) return ctx.greeting;
  switch (ctx.language) {
    case "pt-BR":
      return "Olá! Obrigada por ligar. Como posso ajudar?";
    case "en-US":
      return "Hi! Thanks for calling. How can I help you today?";
    case "auto":
      // English fallback — the language directive in the system prompt makes
      // the agent switch on the caller's first turn.
      return "Hello! Thanks for calling. How can I help you today?";
  }
}
