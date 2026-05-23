import { z } from "zod";

/**
 * Canonical Zod schemas for the JSON columns written by the worker via
 * `recordToolCall`. Co-located so the worker's tool definitions and the UI
 * that reads back tool call rows agree on shape.
 */

export const CheckAvailabilityInputSchema = z.object({
  from: z.string(),
  to: z.string(),
  durationMin: z.number().int().positive(),
});
export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilityInputSchema>;

export const BookAppointmentInputSchema = z.object({
  slotIso: z.string(),
  durationMin: z.number().int().positive(),
  patientName: z.string(),
  patientPhone: z.string(),
  reason: z.string().optional(),
});
export type BookAppointmentInput = z.infer<typeof BookAppointmentInputSchema>;

export const BookAppointmentOutputSchema = z.object({
  confirmationId: z.string(),
  status: z.string(),
});
export type BookAppointmentOutput = z.infer<typeof BookAppointmentOutputSchema>;

export const LookupKbInputSchema = z.object({
  query: z.string(),
});
export type LookupKbInput = z.infer<typeof LookupKbInputSchema>;

export const TransferToHumanInputSchema = z.object({
  reason: z.string(),
});
export type TransferToHumanInput = z.infer<typeof TransferToHumanInputSchema>;
