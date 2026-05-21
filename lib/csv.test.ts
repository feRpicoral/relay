import { describe, expect, it } from "vitest";

import { parseCsvRows } from "./csv";

describe("parseCsvRows", () => {
  it("parses a simple table", () => {
    expect(parseCsvRows("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with embedded commas", () => {
    expect(parseCsvRows('name,age\n"Smith, John",42')).toEqual([
      ["name", "age"],
      ["Smith, John", "42"],
    ]);
  });

  it("handles doubled-up quotes", () => {
    expect(parseCsvRows('q\n"he said ""hi"""')).toEqual([["q"], ['he said "hi"']]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsvRows("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("strips UTF-8 BOM", () => {
    expect(parseCsvRows("﻿a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("preserves a newline inside a quoted field", () => {
    expect(parseCsvRows('name\n"line1\nline2"')).toEqual([["name"], ["line1\nline2"]]);
  });

  it("returns empty for an empty input", () => {
    expect(parseCsvRows("")).toEqual([]);
  });

  it("flushes a trailing field without a newline", () => {
    expect(parseCsvRows("a,b\n1,")).toEqual([
      ["a", "b"],
      ["1", ""],
    ]);
  });
});
