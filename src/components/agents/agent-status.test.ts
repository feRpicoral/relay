import { describe, expect, it } from "vitest";

import { agentSetupState } from "@/components/agents/agent-status";

describe("agentSetupState", () => {
  it("flags an empty voice as needing setup", () => {
    const state = agentSetupState({ voiceId: "", enabled: true, phoneNumberCount: 2 });

    expect(state).toBe("setup");
  });

  it("flags a missing phone number as needing setup", () => {
    const state = agentSetupState({ voiceId: "voice-1", enabled: true, phoneNumberCount: 0 });

    expect(state).toBe("setup");
  });

  it("returns active for an enabled, fully configured agent", () => {
    const state = agentSetupState({ voiceId: "voice-1", enabled: true, phoneNumberCount: 1 });

    expect(state).toBe("active");
  });

  it("returns paused for a disabled, fully configured agent", () => {
    const state = agentSetupState({ voiceId: "voice-1", enabled: false, phoneNumberCount: 1 });

    expect(state).toBe("paused");
  });
});
