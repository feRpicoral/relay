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
    const input = {
      from: "2026-05-21T10:00:00Z",
      to: "2026-05-21T18:00:00Z",
      durationMin: 30,
    };

    const parsed = CheckAvailabilityInputSchema.parse(input);

    expect(parsed.durationMin).toBe(30);
  });

  it("rejects when fields are missing", () => {
    const input = { from: "x", to: "y" };

    expect(() => CheckAvailabilityInputSchema.parse(input)).toThrow();
  });

  it("rejects non-positive durationMin", () => {
    const zero = { from: "x", to: "y", durationMin: 0 };
    const negative = { from: "x", to: "y", durationMin: -5 };

    expect(() => CheckAvailabilityInputSchema.parse(zero)).toThrow();
    expect(() => CheckAvailabilityInputSchema.parse(negative)).toThrow();
  });

  it("rejects non-integer durationMin", () => {
    const input = { from: "x", to: "y", durationMin: 30.5 };

    expect(() => CheckAvailabilityInputSchema.parse(input)).toThrow();
  });
});

describe("BookAppointmentInputSchema", () => {
  it("accepts without an optional reason", () => {
    const input = {
      slotIso: "2026-05-21T14:00:00Z",
      durationMin: 30,
      patientName: "João",
      patientPhone: "+5511987654321",
    };

    const parsed = BookAppointmentInputSchema.parse(input);

    expect(parsed.reason).toBeUndefined();
  });

  it("accepts with a reason", () => {
    const input = {
      slotIso: "2026-05-21T14:00:00Z",
      durationMin: 30,
      patientName: "João",
      patientPhone: "+5511987654321",
      reason: "consulta",
    };

    const parsed = BookAppointmentInputSchema.parse(input);

    expect(parsed.reason).toBe("consulta");
  });

  it("rejects when patientName is missing", () => {
    const input = {
      slotIso: "2026-05-21T14:00:00Z",
      durationMin: 30,
      patientPhone: "+5511987654321",
    };

    expect(() => BookAppointmentInputSchema.parse(input)).toThrow();
  });
});

describe("BookAppointmentOutputSchema", () => {
  it("accepts a basic confirmation", () => {
    const input = {
      confirmationId: "cal_123",
      status: "ACCEPTED",
    };

    const parsed = BookAppointmentOutputSchema.parse(input);

    expect(parsed.confirmationId).toBe("cal_123");
  });

  it("rejects when confirmationId is missing", () => {
    const input = { status: "ACCEPTED" };

    expect(() => BookAppointmentOutputSchema.parse(input)).toThrow();
  });
});

describe("LookupKbInputSchema", () => {
  it("accepts a string query", () => {
    const input = { query: "hours" };

    const parsed = LookupKbInputSchema.parse(input);

    expect(parsed.query).toBe("hours");
  });

  it("rejects a non-string query", () => {
    const input = { query: 42 };

    expect(() => LookupKbInputSchema.parse(input)).toThrow();
  });
});

describe("TransferToHumanInputSchema", () => {
  it("accepts a reason string", () => {
    const input = { reason: "complex case" };

    const parsed = TransferToHumanInputSchema.parse(input);

    expect(parsed.reason).toBe("complex case");
  });

  it("rejects when reason is missing", () => {
    expect(() => TransferToHumanInputSchema.parse({})).toThrow();
  });
});
