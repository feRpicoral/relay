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
    const ctx = makeCtx({ language: "pt-BR" });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Brazilian Portuguese");
  });

  it("en-US includes the English directive", () => {
    const ctx = makeCtx({ language: "en-US" });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Respond in English");
  });

  it("auto includes the language-detection directive", () => {
    const ctx = makeCtx({ language: "auto" });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Detect the caller's language");
  });
});

describe("buildSystemPrompt — business hours", () => {
  it("renders 24/7 when no day blocks are configured", () => {
    const ctx = makeCtx();

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Business hours: 24/7");
  });

  it("renders day blocks with English keys (model localizes at speak time)", () => {
    const ctx = makeCtx({
      businessHours: {
        timezone: "America/Sao_Paulo",
        monday: { open: "09:00", close: "18:00" },
        tuesday: { open: "10:00", close: "20:00" },
      },
    });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("monday: 09:00-18:00");
    expect(prompt).toContain("tuesday: 10:00-20:00");
  });
});

describe("buildSystemPrompt — empty knowledge base", () => {
  it("renders the empty-KB sentinel in English regardless of agent language", () => {
    const ptCtx = makeCtx({ language: "pt-BR" });
    const enCtx = makeCtx({ language: "en-US" });

    const ptPrompt = buildSystemPrompt(ptCtx);
    const enPrompt = buildSystemPrompt(enCtx);

    expect(ptPrompt).toContain("(No knowledge base provided.)");
    expect(enPrompt).toContain("(No knowledge base provided.)");
  });
});

describe("buildSystemPrompt — guardrail rules", () => {
  it("reminds the model to speak after every tool call (silence-after-tool regression)", () => {
    const prompt = buildSystemPrompt(makeCtx());

    expect(prompt).toContain("After every tool call, you MUST speak");
  });

  it("instructs the model to invoke end_call after a farewell", () => {
    const prompt = buildSystemPrompt(makeCtx());

    expect(prompt).toContain("end_call");
  });

  it("tells the model to use lookup_kb before inventing answers", () => {
    const prompt = buildSystemPrompt(makeCtx());

    expect(prompt).toContain("lookup_kb");
  });
});

describe("buildSystemPrompt — knowledge base", () => {
  it("numbers KB chunks starting at [1]", () => {
    const ctx = makeCtx({ knowledgeChunks: ["Office at 123 Main", "Open 9-5"] });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("[1] Office at 123 Main");
    expect(prompt).toContain("[2] Open 9-5");
  });
});

describe("buildSystemPrompt — persona", () => {
  it("renders the supplied persona prompt", () => {
    const ctx = makeCtx({ personaPrompt: "Be unusually formal and concise." });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Be unusually formal and concise.");
  });

  it("falls back to a default persona when empty", () => {
    const ctx = makeCtx({ personaPrompt: "" });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Be warm, concise, and helpful.");
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
    const prompt = buildSystemPrompt(makeCtx());

    expect(prompt).toContain("Current date/time:");
  });

  it("formats the date in the configured org timezone (São Paulo, UTC-3)", () => {
    const ctx = makeCtx({ businessHours: { timezone: "America/Sao_Paulo" } });

    const prompt = buildSystemPrompt(ctx);

    // 2026-05-21 15:00 UTC → 12:00 in São Paulo.
    expect(prompt).toMatch(/May 21, 2026/);
    expect(prompt).toContain("America/Sao_Paulo");
    expect(prompt).toMatch(/12:00/);
  });

  it("formats the date in UTC when the org is configured for UTC", () => {
    const ctx = makeCtx({ businessHours: { timezone: "UTC" } });

    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toMatch(/May 21, 2026/);
    expect(prompt).toContain("UTC");
    expect(prompt).toMatch(/3:00/); // 15:00 UTC printed as "3:00 PM"
  });
});

describe("buildGreeting", () => {
  it("returns the configured greeting verbatim when present", () => {
    const ctx = makeCtx({ greeting: "Bem-vindo à clínica!" });

    const greeting = buildGreeting(ctx);

    expect(greeting).toBe("Bem-vindo à clínica!");
  });

  it("falls back to a Portuguese default for pt-BR", () => {
    const ctx = makeCtx({ language: "pt-BR" });

    const greeting = buildGreeting(ctx);

    expect(greeting).toContain("Olá");
  });

  it("falls back to an English default for en-US", () => {
    const ctx = makeCtx({ language: "en-US" });

    const greeting = buildGreeting(ctx);

    expect(greeting).toContain("Hi");
  });

  it("falls back to English for auto mode (model switches on the caller's first turn)", () => {
    const ctx = makeCtx({ language: "auto" });

    const greeting = buildGreeting(ctx);

    expect(greeting).toContain("Hello");
  });
});
