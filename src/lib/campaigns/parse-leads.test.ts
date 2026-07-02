import { describe, expect, it } from "vitest";

import { parseLeads } from "./parse-leads";

describe("parseLeads", () => {
  it("partitions valid and invalid rows by E.164 format", () => {
    const csv = [
      "phone,name",
      "+5511984721130,Mariana Oliveira",
      "11 9 9988-7766,Bad Format",
      "+5511,Too Short",
    ].join("\n");

    const result = parseLeads(csv);

    expect(result.missingHeader).toBe(false);
    expect(result.valid).toEqual([{ phone: "+5511984721130", name: "Mariana Oliveira" }]);
    expect(result.invalid).toEqual([
      { row: 3, phone: "11 9 9988-7766", error: "INVALID_E164" },
      { row: 4, phone: "+5511", error: "INVALID_E164" },
    ]);
  });

  it("reports rows missing a phone as MISSING_PHONE", () => {
    const csv = ["phone,name", ",No Phone", "+5521996553082,Rafael Costa"].join("\n");

    const result = parseLeads(csv);

    expect(result.invalid).toEqual([{ row: 2, phone: "", error: "MISSING_PHONE" }]);
    expect(result.valid).toEqual([{ phone: "+5521996553082", name: "Rafael Costa" }]);
  });

  it("rejects phone numbers whose country code starts with zero", () => {
    const csv = ["phone,name", "+0511987654321,Bad Country Code"].join("\n");

    const result = parseLeads(csv);

    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([{ row: 2, phone: "+0511987654321", error: "INVALID_E164" }]);
  });

  it("treats a name column as optional", () => {
    const csv = ["phone", "+5511984721130", "+5521996553082"].join("\n");

    const result = parseLeads(csv);

    expect(result.valid).toEqual([
      { phone: "+5511984721130", name: undefined },
      { phone: "+5521996553082", name: undefined },
    ]);
  });

  it("deduplicates repeated phone numbers, keeping the first", () => {
    const csv = ["phone,name", "+5511984721130,First", "+5511984721130,Second"].join("\n");

    const result = parseLeads(csv);

    expect(result.valid).toEqual([{ phone: "+5511984721130", name: "First" }]);
    expect(result.invalid).toEqual([]);
  });

  it("flags a missing phone header", () => {
    const csv = ["telefone,name", "+5511984721130,Mariana"].join("\n");

    const result = parseLeads(csv);

    expect(result.missingHeader).toBe(true);
    expect(result.valid).toEqual([]);
  });

  it("returns missingHeader for empty input", () => {
    const result = parseLeads("");

    expect(result.missingHeader).toBe(true);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it("ignores column order and is case-insensitive in the header", () => {
    const csv = ["Name,Phone", "Mariana,+5511984721130"].join("\n");

    const result = parseLeads(csv);

    expect(result.valid).toEqual([{ phone: "+5511984721130", name: "Mariana" }]);
  });

  it("handles quoted names with embedded commas and CRLF endings", () => {
    const csv = 'phone,name\r\n+5511984721130,"Oliveira, Mariana"\r\n';

    const result = parseLeads(csv);

    expect(result.valid).toEqual([{ phone: "+5511984721130", name: "Oliveira, Mariana" }]);
  });
});
