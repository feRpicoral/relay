"use client";

import { useEffect, useRef, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";

type RowFor<T> = T & { id: string };

interface UseRealtimeListOptions<T> {
  table: string;
  filter?: string;
  orderBy?: "asc" | "desc";
  initial: RowFor<T>[];
}

/**
 * Subscribe to inserts/updates on a Supabase table. Returns a state array that
 * automatically appends new rows and replaces updated ones.
 *
 * `filter` example: `org_id=eq.<uuid>` or `call_id=eq.<uuid>`. See Supabase docs.
 */
export function useRealtimeList<T>({
  table,
  filter,
  initial,
}: UseRealtimeListOptions<T>): RowFor<T>[] {
  const [rows, setRows] = useState<RowFor<T>[]>(initial as RowFor<T>[]);
  const seen = useRef(new Set<string>(rows.map((r) => r.id)));

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`rt:${table}:${filter ?? "all"}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table, filter },
        (payload: { new: RowFor<T> }) => {
          if (seen.current.has(payload.new.id)) return;
          seen.current.add(payload.new.id);
          setRows((prev) => [...prev, payload.new]);
        },
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table, filter },
        (payload: { new: RowFor<T> }) => {
          setRows((prev) => prev.map((r) => (r.id === payload.new.id ? payload.new : r)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);

  return rows;
}

interface UseRealtimeRowOptions<T> {
  table: string;
  id: string;
  initial: T;
}

export function useRealtimeRow<T>({ table, id, initial }: UseRealtimeRowOptions<T>): T {
  const [row, setRow] = useState<T>(initial);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`rt-row:${table}:${id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${id}` },
        (payload: { new: T }) => setRow(payload.new),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, id]);

  return row;
}
