/**
 * RFC 4180-compliant CSV parser. Handles quoted fields with embedded commas,
 * doubled-up quotes (`""` → `"`), CRLF / LF / mixed line endings, and a
 * leading UTF-8 BOM. State machine, no dependency.
 *
 * Returns rows as `string[][]`. Header parsing is the caller's job.
 */
export function parseCsvRows(input: string): string[][] {
  // Strip UTF-8 BOM if present (Google Sheets and Excel both emit it).
  let src = input;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const len = src.length;
  for (let i = 0; i < len; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        // Doubled quote inside a quoted field is a literal quote.
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      // Swallow the LF half of a CRLF.
      if (c === "\r" && src[i + 1] === "\n") i += 1;
    } else {
      field += c;
    }
  }
  // Flush trailing field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serializes rows to an RFC 4180 CSV string with CRLF line endings. Each cell
 * is coerced with `String()`; quoting is applied only where required.
 */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}
