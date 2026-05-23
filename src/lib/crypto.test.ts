import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./crypto";

// crypto.ts derives its symmetric key from ENCRYPTION_KEY via scrypt and
// caches the result for the life of the module. The cache means a test
// process that sets the key once gets the same derived key for every call.
const ORIGINAL_KEY = process.env.ENCRYPTION_KEY;

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-must-be-32-chars-long";
});

afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext", () => {
    const pt = "AC1234567890abcdef-fake-twilio-token";
    expect(decryptSecret(encryptSecret(pt))).toBe(pt);
  });

  it("produces different ciphertexts for the same plaintext (non-deterministic nonce)", () => {
    expect(encryptSecret("hello")).not.toBe(encryptSecret("hello"));
  });

  it("uses the gcm: prefix for forward-compat with algorithm rotation", () => {
    expect(encryptSecret("x").startsWith("gcm:")).toBe(true);
  });

  it("emits four colon-separated base64 segments", () => {
    const parts = encryptSecret("x").split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("gcm");
    // nonce, tag, ciphertext are base64
    for (const p of parts.slice(1)) {
      expect(p).toMatch(/^[A-Za-z0-9+/=]+$/);
    }
  });

  it("handles empty string", () => {
    expect(decryptSecret(encryptSecret(""))).toBe("");
  });

  it("handles unicode multi-byte characters", () => {
    const pt = "Olá, multi-tenant 🚀 voz";
    expect(decryptSecret(encryptSecret(pt))).toBe(pt);
  });
});

describe("decryptSecret negative paths", () => {
  it("rejects an unknown algorithm prefix", () => {
    expect(() => decryptSecret("aes:foo:bar:baz")).toThrow(/expected format/i);
  });

  it("rejects a payload with the wrong number of segments", () => {
    expect(() => decryptSecret("gcm:onlyone")).toThrow(/expected format/i);
    expect(() => decryptSecret("gcm:a:b")).toThrow(/expected format/i);
    expect(() => decryptSecret("gcm:a:b:c:d")).toThrow(/expected format/i);
  });

  it("rejects tampered ciphertext (auth tag detects the flip)", () => {
    const ct = encryptSecret("secret-value");
    const [prefix, nonce, tag, body] = ct.split(":");
    const tamperedBody = Buffer.from(body!, "base64");
    tamperedBody[0] = tamperedBody[0]! ^ 0x01;
    const tampered = [prefix, nonce, tag, tamperedBody.toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("rejects a tampered auth tag", () => {
    const ct = encryptSecret("secret-value");
    const [prefix, nonce, tag, body] = ct.split(":");
    const tamperedTag = Buffer.from(tag!, "base64");
    tamperedTag[0] = tamperedTag[0]! ^ 0x01;
    const tampered = [prefix, nonce, tamperedTag.toString("base64"), body].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
