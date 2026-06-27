import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type Catalog = Record<string, unknown>;

function flattenEntries(obj: Catalog, prefix = ""): [string, unknown][] {
  const entries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenEntries(value as Catalog, path));
    } else {
      entries.push([path, value]);
    }
  }
  return entries;
}

const en = JSON.parse(readFileSync("src/messages/en-US.json", "utf8")) as Catalog;
const pt = JSON.parse(readFileSync("src/messages/pt-BR.json", "utf8")) as Catalog;

const enEntries = flattenEntries(en);
const ptEntries = flattenEntries(pt);
const enKeys = new Set(enEntries.map(([k]) => k));
const ptKeys = new Set(ptEntries.map(([k]) => k));

describe("i18n catalog parity", () => {
  it("en-US and pt-BR expose identical key sets", () => {
    expect([...enKeys].filter((k) => !ptKeys.has(k))).toEqual([]);
    expect([...ptKeys].filter((k) => !enKeys.has(k))).toEqual([]);
  });

  it("has no empty string values in either catalog", () => {
    const empty = [...enEntries, ...ptEntries]
      .filter(([, v]) => typeof v === "string" && v.trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });
});
