import { describe, expect, it } from "vitest";

import {
  BookAppointmentInputSchema,
  BookAppointmentOutputSchema,
  CheckAvailabilityInputSchema,
  LookupKbInputSchema,
  TransferToHumanInputSchema,
} from "./tool-schemas";

describe("CheckAvailabilityInputSchema", () => {
  it("accepts well-formed input", () => {
    const parsed = CheckAvailabilityInputSchema.parse({
      from: "2026-05-21T10:00:00Z",
      to: "2026-05-21T18:00:00Z",
      durationMin: 30,
    });
    expect(parsed.durationMin).toBe(30);
  });

  it("rejects when fields are missing", () => {
    expect(() => CheckAvailabilityInputSchema.parse({ from: "x", to: "y" })).toThrow();
  });

  it("rejects non-positive durationMin", () => {
    expect(() =>
      CheckAvailabilityInputSchema.parse({ from: "x", to: "y", durationMin: 0 }),
    ).toThrow();
    expect(() =>
      CheckAvailabilityInputSchema.parse({ from: "x", to: "y", durationMin: -5 }),
    ).toThrow();
  });

  it("rejects non-integer durationMin", () => {
    expect(() =>
      CheckAvailabilityInputSchema.parse({ from: "x", to: "y", durationMin: 30.5 }),
    ).toThrow();
  });
});

describe("BookAppointmentInputSchema", () => {
  it("accepts without an optional reason", () => {
    const parsed = BookAppointmentInputSchema.parse({
      slotIso: "2026-05-21T14:00:00Z",
      durationMin: 30,
      patientName: "João",
      patientPhone: "+5511987654321",
    });
    expect(parsed.reason).toBeUndefined();
  });

  it("accepts with a reason", () => {
    const parsed = BookAppointmentInputSchema.parse({
      slotIso: "2026-05-21T14:00:00Z",
      durationMin: 30,
      patientName: "João",
      patientPhone: "+5511987654321",
      reason: "consulta",
    });
    expect(parsed.reason).toBe("consulta");
  });

  it("rejects when patientName is missing", () => {
    expect(() =>
      BookAppointmentInputSchema.parse({
        slotIso: "2026-05-21T14:00:00Z",
        durationMin: 30,
        patientPhone: "+5511987654321",
      }),
    ).toThrow();
  });
});

describe("BookAppointmentOutputSchema", () => {
  it("accepts a basic confirmation", () => {
    const parsed = BookAppointmentOutputSchema.parse({
      confirmationId: "cal_123",
      status: "ACCEPTED",
    });
    expect(parsed.confirmationId).toBe("cal_123");
  });

  it("rejects when confirmationId is missing", () => {
    expect(() => BookAppointmentOutputSchema.parse({ status: "ACCEPTED" })).toThrow();
  });
});

describe("LookupKbInputSchema", () => {
  it("accepts a string query", () => {
    expect(LookupKbInputSchema.parse({ query: "hours" }).query).toBe("hours");
  });

  it("rejects a non-string query", () => {
    expect(() => LookupKbInputSchema.parse({ query: 42 })).toThrow();
  });
});

describe("TransferToHumanInputSchema", () => {
  it("accepts a reason string", () => {
    expect(TransferToHumanInputSchema.parse({ reason: "complex case" }).reason).toBe(
      "complex case",
    );
  });

  it("rejects when reason is missing", () => {
    expect(() => TransferToHumanInputSchema.parse({})).toThrow();
  });
});
