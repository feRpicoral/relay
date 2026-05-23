import { describe, expect, it, vi } from "vitest";

// rate-limit.ts has a top-level `import "server-only"` to guard against
// client bundling. That package throws on import in plain Node, so we mock
// it away here so vitest can load the module. The mock is hoisted to the
// top of the file by vitest before the import below.
vi.mock("server-only", () => ({}));

import { consumeToken, OTP_LIMIT } from "./rate-limit";

const small = { capacity: 3, refillIntervalMs: 1000 };

describe("consumeToken — basic semantics", () => {
  it("allows up to capacity then denies", () => {
    const key = "rl:test-basic";
    expect(consumeToken(key, small)).toBe(true);
    expect(consumeToken(key, small)).toBe(true);
    expect(consumeToken(key, small)).toBe(true);
    expect(consumeToken(key, small)).toBe(false);
  });

  it("isolates buckets per key", () => {
    // Drain one key fully — a different key must still have all its tokens.
    const a = "rl:isolation-a";
    const b = "rl:isolation-b";
    for (let i = 0; i < small.capacity; i++) consumeToken(a, small);
    expect(consumeToken(a, small)).toBe(false);
    expect(consumeToken(b, small)).toBe(true);
  });
});

describe("consumeToken — refill", () => {
  it("refills one token after the configured interval", async () => {
    const key = "rl:test-refill";
    const fast = { capacity: 2, refillIntervalMs: 50 };
    expect(consumeToken(key, fast)).toBe(true);
    expect(consumeToken(key, fast)).toBe(true);
    expect(consumeToken(key, fast)).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect(consumeToken(key, fast)).toBe(true);
  });

  it("caps refill at capacity (no overflow after a long idle period)", async () => {
    const key = "rl:test-cap";
    const fast = { capacity: 1, refillIntervalMs: 25 };
    expect(consumeToken(key, fast)).toBe(true);
    // Wait long enough that without a cap we'd accumulate many tokens.
    await new Promise((r) => setTimeout(r, 250));
    expect(consumeToken(key, fast)).toBe(true);
    expect(consumeToken(key, fast)).toBe(false);
  });
});

describe("OTP_LIMIT", () => {
  it("defaults to 5 attempts per minute", () => {
    expect(OTP_LIMIT.capacity).toBe(5);
    expect(OTP_LIMIT.refillIntervalMs).toBe(60_000);
  });
});
