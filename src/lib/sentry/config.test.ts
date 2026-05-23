import type { ErrorEvent, EventHint } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { scrubPii } from "./config";

const hint = {} as EventHint;

function event(partial: Partial<ErrorEvent>): ErrorEvent {
  return partial as ErrorEvent;
}

describe("scrubPii — request headers", () => {
  it("strips authorization, cookie, and x-twilio-signature", () => {
    const e = event({
      request: {
        headers: {
          authorization: "Bearer abc",
          cookie: "session=foo",
          "x-twilio-signature": "sig",
          "user-agent": "test-runner",
        },
      },
    });
    const out = scrubPii(e, hint)!;
    const headers = out.request!.headers!;
    expect(headers).not.toHaveProperty("authorization");
    expect(headers).not.toHaveProperty("cookie");
    expect(headers).not.toHaveProperty("x-twilio-signature");
    expect(headers["user-agent"]).toBe("test-runner");
  });

  it("clears the cookies object wholesale", () => {
    const e = event({ request: { cookies: { session: "abc", refresh: "def" } } });
    const out = scrubPii(e, hint)!;
    expect(out.request!.cookies).toEqual({});
  });
});

describe("scrubPii — user", () => {
  it("keeps id but drops email/ip for correlation without PII", () => {
    const e = event({ user: { id: "u-1", email: "a@b.com", ip_address: "1.2.3.4" } });
    const out = scrubPii(e, hint)!;
    expect(out.user).toEqual({ id: "u-1" });
  });

  it("drops the user object when there is no id", () => {
    const e = event({ user: { email: "a@b.com" } });
    const out = scrubPii(e, hint)!;
    expect(out.user).toBeUndefined();
  });
});

describe("scrubPii — JSON payload regex", () => {
  it("redacts authToken / apiKey / secret / token / password values", () => {
    const e = event({
      extra: {
        authToken: "auth-leak",
        apiKey: "key-leak",
        secret: "secret-leak",
        token: "token-leak",
        password: "pw-leak",
        nested: { apiKeyEncrypted: "encrypted-leak" },
      },
    });
    const json = JSON.stringify(scrubPii(e, hint));
    for (const leak of [
      "auth-leak",
      "key-leak",
      "secret-leak",
      "token-leak",
      "pw-leak",
      "encrypted-leak",
    ]) {
      expect(json).not.toContain(leak);
    }
    expect(json).toContain("[redacted]");
  });

  it("redacts E.164 phone numbers anywhere they appear", () => {
    const e = event({ extra: { caller: "+5511987654321", callee: "+14155551234" } });
    const json = JSON.stringify(scrubPii(e, hint));
    expect(json).not.toContain("5511987654321");
    expect(json).not.toContain("4155551234");
    expect(json).toContain("[phone-redacted]");
  });

  it("returns the original event reference when nothing scrubbable matched", () => {
    const e = event({ extra: { harmless: "data" } });
    const out = scrubPii(e, hint);
    expect(out).toBe(e);
  });
});
