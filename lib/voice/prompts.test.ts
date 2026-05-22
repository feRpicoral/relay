import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildGreeting, buildSystemPrompt } from "./prompts";
import type { AgentContext } from "./types";

// Tests follow the language-directive refactor of `buildSystemPrompt`:
// one English base body plus a per-language directive prepended at the top.
// Day names and the empty-KB sentinel are now English-only — the LLM is
// expected to localize them at speak time per the directive.

function makeCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    callId: "call-1",
    orgId: "org-1",
    agentId: "agent-1",
    language: "en-US",
    ttsProvider: "cartesia",
    voiceId: "voice-1",
    personaPrompt: "",
    greeting: "",
    knowledgeChunks: [],
    businessHours: { timezone: "America/Sao_Paulo" },
    fallbackTransferE164: null,
    transferSipDomain: null,
    callerE164: "+14155550000",
    calleeE164: "+14155550001",
    ...overrides,
  };
}

describe("buildSystemPrompt — language directive", () => {
  it("pt-BR includes the Brazilian Portuguese directive", () => {
    expect(buildSystemPrompt(makeCtx({ language: "pt-BR" }))).toContain("Brazilian Portuguese");
  });

  it("en-US includes the English directive", () => {
    expect(buildSystemPrompt(makeCtx({ language: "en-US" }))).toContain("Respond in English");
  });

  it("auto includes the language-detection directive", () => {
    expect(buildSystemPrompt(makeCtx({ language: "auto" }))).toContain(
      "Detect the caller's language",
    );
  });
});

describe("buildSystemPrompt — business hours", () => {
  it("renders 24/7 when no day blocks are configured", () => {
    expect(buildSystemPrompt(makeCtx())).toContain("Business hours: 24/7");
  });

  it("renders day blocks with English keys (model localizes at speak time)", () => {
    const out = buildSystemPrompt(
      makeCtx({
        businessHours: {
          timezone: "America/Sao_Paulo",
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "10:00", close: "20:00" },
        },
      }),
    );
    expect(out).toContain("monday: 09:00-18:00");
    expect(out).toContain("tuesday: 10:00-20:00");
  });
});

describe("buildSystemPrompt — empty knowledge base", () => {
  it("renders the empty-KB sentinel in English regardless of agent language", () => {
    expect(buildSystemPrompt(makeCtx({ language: "pt-BR" }))).toContain(
      "(No knowledge base provided.)",
    );
    expect(buildSystemPrompt(makeCtx({ language: "en-US" }))).toContain(
      "(No knowledge base provided.)",
    );
  });
});

describe("buildSystemPrompt — guardrail rules", () => {
  it("reminds the model to speak after every tool call (silence-after-tool regression)", () => {
    expect(buildSystemPrompt(makeCtx())).toContain("After every tool call, you MUST speak");
  });

  it("instructs the model to invoke end_call after a farewell", () => {
    expect(buildSystemPrompt(makeCtx())).toContain("end_call");
  });

  it("tells the model to use lookup_kb before inventing answers", () => {
    expect(buildSystemPrompt(makeCtx())).toContain("lookup_kb");
  });
});

describe("buildSystemPrompt — knowledge base", () => {
  it("numbers KB chunks starting at [1]", () => {
    const out = buildSystemPrompt(makeCtx({ knowledgeChunks: ["Office at 123 Main", "Open 9-5"] }));
    expect(out).toContain("[1] Office at 123 Main");
    expect(out).toContain("[2] Open 9-5");
  });
});

describe("buildSystemPrompt — persona", () => {
  it("renders the supplied persona prompt", () => {
    const out = buildSystemPrompt(makeCtx({ personaPrompt: "Be unusually formal and concise." }));
    expect(out).toContain("Be unusually formal and concise.");
  });

  it("falls back to a default persona when empty", () => {
    expect(buildSystemPrompt(makeCtx({ personaPrompt: "" }))).toContain(
      "Be warm, concise, and helpful.",
    );
  });
});

describe("buildSystemPrompt — current date injection", () => {
  // The prompt embeds `new Date()` formatted in the org's timezone, so we
  // fake the clock to keep the assertions deterministic across CI / dev.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T15:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes a 'Current date/time:' line in the prompt", () => {
    expect(buildSystemPrompt(makeCtx())).toContain("Current date/time:");
  });

  it("formats the date in the configured org timezone (São Paulo, UTC-3)", () => {
    // 2026-05-21 15:00 UTC → 12:00 in São Paulo.
    const out = buildSystemPrompt(makeCtx({ businessHours: { timezone: "America/Sao_Paulo" } }));
    expect(out).toMatch(/May 21, 2026/);
    expect(out).toContain("America/Sao_Paulo");
    expect(out).toMatch(/12:00/);
  });

  it("formats the date in UTC when the org is configured for UTC", () => {
    const out = buildSystemPrompt(makeCtx({ businessHours: { timezone: "UTC" } }));
    expect(out).toMatch(/May 21, 2026/);
    expect(out).toContain("UTC");
    expect(out).toMatch(/3:00/); // 15:00 UTC printed as "3:00 PM"
  });
});

describe("buildGreeting", () => {
  it("returns the configured greeting verbatim when present", () => {
    expect(buildGreeting(makeCtx({ greeting: "Bem-vindo à clínica!" }))).toBe(
      "Bem-vindo à clínica!",
    );
  });

  it("falls back to a Portuguese default for pt-BR", () => {
    expect(buildGreeting(makeCtx({ language: "pt-BR" }))).toContain("Olá");
  });

  it("falls back to an English default for en-US", () => {
    expect(buildGreeting(makeCtx({ language: "en-US" }))).toContain("Hi");
  });

  it("falls back to English for auto mode (model switches on the caller's first turn)", () => {
    expect(buildGreeting(makeCtx({ language: "auto" }))).toContain("Hello");
  });
});
