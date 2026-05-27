import { describe, expect, it } from "vitest";

import { parseCsvRows } from "./csv";

describe("parseCsvRows", () => {
  it("parses a simple table", () => {
    const input = "a,b,c\n1,2,3";

    const result = parseCsvRows(input);

    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with embedded commas", () => {
    const input = 'name,age\n"Smith, John",42';

    const result = parseCsvRows(input);

    expect(result).toEqual([
      ["name", "age"],
      ["Smith, John", "42"],
    ]);
  });

  it("handles doubled-up quotes", () => {
    const input = 'q\n"he said ""hi"""';

    const result = parseCsvRows(input);

    expect(result).toEqual([["q"], ['he said "hi"']]);
  });

  it("handles CRLF line endings", () => {
    const input = "a,b\r\n1,2\r\n3,4";

    const result = parseCsvRows(input);

    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("strips UTF-8 BOM", () => {
    const input = "﻿a,b\n1,2";

    const result = parseCsvRows(input);

    expect(result).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("preserves a newline inside a quoted field", () => {
    const input = 'name\n"line1\nline2"';

    const result = parseCsvRows(input);

    expect(result).toEqual([["name"], ["line1\nline2"]]);
  });

  it("returns empty for an empty input", () => {
    const result = parseCsvRows("");

    expect(result).toEqual([]);
  });

  it("flushes a trailing field without a newline", () => {
    const input = "a,b\n1,";

    const result = parseCsvRows(input);

    expect(result).toEqual([
      ["a", "b"],
      ["1", ""],
    ]);
  });
});
