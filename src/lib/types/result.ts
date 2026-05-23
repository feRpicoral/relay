/**
 * Discriminated union used as the return type of nearly every Server Action.
 * Two callers exist:
 *  - `Result<T>`: actions that return data on success.
 *  - `Result`: actions that just signal ok/error.
 */
export type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };
