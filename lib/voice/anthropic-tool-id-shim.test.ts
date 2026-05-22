import { describe, expect, it } from "vitest";

import { rewriteToolIds, sanitize } from "./anthropic-tool-id-shim";

describe("sanitize", () => {
  it("passes safe IDs through unchanged", () => {
    expect(sanitize("abc-123_def")).toBe("abc-123_def");
  });

  it("replaces the framework's `/` separator with `_`", () => {
    expect(sanitize("item_abc/fnc_1")).toBe("item_abc_fnc_1");
  });

  it("replaces every char outside [A-Za-z0-9_-]", () => {
    expect(sanitize("a.b+c=d")).toBe("a_b_c_d");
    expect(sanitize("a b c")).toBe("a_b_c");
  });

  it("is idempotent", () => {
    const once = sanitize("item_abc/fnc_1");
    expect(sanitize(once)).toBe(once);
  });

  it("handles empty string", () => {
    expect(sanitize("")).toBe("");
  });
});

describe("rewriteToolIds — happy paths", () => {
  it("sanitizes ids on messages[].tool_calls[].id", () => {
    const body = {
      messages: [
        {
          role: "assistant",
          tool_calls: [
            { id: "item_abc/fnc_1", function: { name: "x" } },
            { id: "item_def/fnc_2", function: { name: "y" } },
          ],
        },
      ],
    };
    const out = rewriteToolIds(body) as typeof body;
    expect(out.messages[0]!.tool_calls[0]!.id).toBe("item_abc_fnc_1");
    expect(out.messages[0]!.tool_calls[1]!.id).toBe("item_def_fnc_2");
  });

  it("sanitizes messages[].tool_call_id on tool messages", () => {
    const body = {
      messages: [{ role: "tool", tool_call_id: "item_abc/fnc_1", content: "{}" }],
    };
    const out = rewriteToolIds(body) as typeof body;
    expect(out.messages[0]!.tool_call_id).toBe("item_abc_fnc_1");
  });

  it("leaves messages without tool fields untouched", () => {
    const body = { messages: [{ role: "user", content: "hello" }] };
    expect(rewriteToolIds(body)).toEqual(body);
  });

  it("does not touch unrelated message-level fields", () => {
    const body = {
      messages: [
        {
          role: "assistant",
          content: "ok",
          tool_calls: [{ id: "good_id", function: { name: "x" } }],
        },
      ],
    };
    const out = rewriteToolIds(body) as typeof body;
    expect(out.messages[0]!.role).toBe("assistant");
    expect(out.messages[0]!.content).toBe("ok");
    expect(out.messages[0]!.tool_calls[0]!.id).toBe("good_id");
  });
});

describe("rewriteToolIds — degenerate inputs", () => {
  it("returns non-object scalars unchanged", () => {
    expect(rewriteToolIds(null)).toBeNull();
    expect(rewriteToolIds(42)).toBe(42);
    expect(rewriteToolIds("string")).toBe("string");
    expect(rewriteToolIds(undefined)).toBeUndefined();
  });

  it("returns an object whose messages key is not an array unchanged", () => {
    const body = { messages: "not-array", model: "claude-haiku" };
    expect(rewriteToolIds(body)).toEqual(body);
  });

  it("skips non-object entries inside the messages array without throwing", () => {
    const body = { messages: [null, "string", { tool_call_id: "x/y" }] };
    const out = rewriteToolIds(body) as { messages: Array<unknown> };
    expect(out.messages[0]).toBeNull();
    expect(out.messages[1]).toBe("string");
    expect((out.messages[2] as { tool_call_id: string }).tool_call_id).toBe("x_y");
  });

  it("returns an object with no `messages` key unchanged", () => {
    const body = { model: "claude-haiku" };
    expect(rewriteToolIds(body)).toEqual(body);
  });
});
