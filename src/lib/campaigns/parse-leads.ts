import { parseCsvRows } from "@/lib/csv";
import { isE164 } from "@/lib/validation/phone";

export interface ParsedLead {
  phone: string;
  name?: string;
}

export interface InvalidLeadRow {
  /** 1-based row number in the original file (header is row 1). */
  row: number;
  phone: string;
  error: ParseLeadError;
}

export type ParseLeadError = "INVALID_E164" | "MISSING_PHONE";

export interface ParsedLeads {
  valid: ParsedLead[];
  invalid: InvalidLeadRow[];
  /** True when the file has no `phone` header column. */
  missingHeader: boolean;
}

export function parseLeads(csv: string): ParsedLeads {
  const rows = parseCsvRows(csv).filter((r) => r.some((c) => c.trim().length > 0));
  if (rows.length === 0) return { valid: [], invalid: [], missingHeader: true };

  const headerRow = rows[0];
  if (!headerRow) return { valid: [], invalid: [], missingHeader: true };
  const header = headerRow.map((c) => c.trim().toLowerCase());
  const phoneIdx = header.indexOf("phone");
  const nameIdx = header.indexOf("name");
  if (phoneIdx === -1) return { valid: [], invalid: [], missingHeader: true };

  const valid: ParsedLead[] = [];
  const invalid: InvalidLeadRow[] = [];
  const seen = new Set<string>();

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const phone = row[phoneIdx]?.trim() ?? "";
    const name = nameIdx >= 0 ? row[nameIdx]?.trim() : undefined;

    if (!phone) {
      invalid.push({ row: rowNumber, phone, error: "MISSING_PHONE" });
      return;
    }
    if (!isE164(phone)) {
      invalid.push({ row: rowNumber, phone, error: "INVALID_E164" });
      return;
    }
    if (seen.has(phone)) return;
    seen.add(phone);
    valid.push({ phone, name: name || undefined });
  });

  return { valid, invalid, missingHeader: false };
}
