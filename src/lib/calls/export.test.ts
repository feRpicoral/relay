import { describe, expect, it } from "vitest";

import { type CallExportRow, callsToCsv } from "./export";

const baseRow: CallExportRow = {
  startedAt: new Date("2026-06-27T14:32:00.000Z"),
  direction: "INBOUND",
  status: "COMPLETED",
  callerE164: "+5511984721130",
  calleeE164: "+5511555000000",
  callerName: "Mariana Oliveira",
  agentName: "Lumen Reception",
  durationMs: 72_000,
  outcome: "SCHEDULED",
  sentiment: "POSITIVE",
  costCents: 14,
};

describe("callsToCsv", () => {
  it("writes a header row followed by data rows", () => {
    const csv = callsToCsv([baseRow]);
    const [header, first] = csv.split("\r\n");

    expect(header).toBe(
      "Started,Direction,Status,Caller,Callee,Name,Agent,Duration,Outcome,Sentiment,Cost (USD)",
    );
    expect(first).toBe(
      "2026-06-27T14:32:00.000Z,INBOUND,COMPLETED,+5511984721130,+5511555000000,Mariana Oliveira,Lumen Reception,1m 12s,SCHEDULED,POSITIVE,$0.14",
    );
  });

  it("renders empty cells for null fields", () => {
    const csv = callsToCsv([
      {
        ...baseRow,
        callerName: null,
        agentName: null,
        durationMs: null,
        outcome: null,
        sentiment: null,
        costCents: null,
      },
    ]);
    const dataRow = csv.split("\r\n")[1];

    expect(dataRow).toBe(
      "2026-06-27T14:32:00.000Z,INBOUND,COMPLETED,+5511984721130,+5511555000000,,,,,,",
    );
  });

  it("quotes a name containing a comma", () => {
    const csv = callsToCsv([{ ...baseRow, callerName: "Smith, John" }]);

    expect(csv).toContain('"Smith, John"');
  });

  it("emits only the header for an empty result", () => {
    const csv = callsToCsv([]);

    expect(csv).toBe(
      "Started,Direction,Status,Caller,Callee,Name,Agent,Duration,Outcome,Sentiment,Cost (USD)",
    );
  });
});
