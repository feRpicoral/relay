import { describe, expect, it } from "vitest";

import { rewriteToolIds, sanitize } from "./anthropic-tool-id-shim";

describe("sanitize", () => {
  it("passes safe IDs through unchanged", () => {
    const result = sanitize("abc-123_def");

    expect(result).toBe("abc-123_def");
  });

  it("replaces the framework's `/` separator with `_`", () => {
    const result = sanitize("item_abc/fnc_1");

    expect(result).toBe("item_abc_fnc_1");
  });

  it("replaces every char outside [A-Za-z0-9_-]", () => {
    const punct = sanitize("a.b+c=d");
    const spaces = sanitize("a b c");

    expect(punct).toBe("a_b_c_d");
    expect(spaces).toBe("a_b_c");
  });

  it("is idempotent", () => {
    const once = sanitize("item_abc/fnc_1");

    const twice = sanitize(once);

    expect(twice).toBe(once);
  });

  it("handles empty string", () => {
    const result = sanitize("");

    expect(result).toBe("");
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

    const out = rewriteToolIds(body);

    expect(out).toEqual(body);
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
    const nul = rewriteToolIds(null);
    const num = rewriteToolIds(42);
    const str = rewriteToolIds("string");
    const undef = rewriteToolIds(undefined);

    expect(nul).toBeNull();
    expect(num).toBe(42);
    expect(str).toBe("string");
    expect(undef).toBeUndefined();
  });

  it("returns an object whose messages key is not an array unchanged", () => {
    const body = { messages: "not-array", model: "claude-haiku" };

    const out = rewriteToolIds(body);

    expect(out).toEqual(body);
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

    const out = rewriteToolIds(body);

    expect(out).toEqual(body);
  });
});
