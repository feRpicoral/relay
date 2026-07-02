"use client";

import { useEffect, useRef, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/browser";

type RowFor<T> = T & { id: string };

interface UseRealtimeListOptions<T> {
  table: string;
  filter?: string;
  /**
   * Unique key for this subscription. Two components that subscribe to the
   * same table + filter would otherwise share a channel and step on each
   * other's teardown. Pass something stable per use site (component name +
   * relevant id).
   */
  channelKey: string;
  initial: RowFor<T>[];
  /**
   * Reports channel lifecycle so callers can render a reconnect affordance.
   * `true` once the channel drops (CHANNEL_ERROR/TIMED_OUT), back to `false`
   * once it (re)subscribes.
   */
  onChannelError?: (errored: boolean) => void;
}

/**
 * Subscribe to inserts/updates/deletes on a Supabase table. Returns a state
 * array that automatically appends new rows, replaces updated ones, and drops
 * deleted ones.
 *
 * `filter` example: `org_id=eq.<uuid>` or `call_id=eq.<uuid>`. See Supabase
 * docs. Prefer the narrowest filter the subscriber actually needs; broad
 * `org_id` filters force the client to re-render on every row in the org.
 *
 * The `initial` snapshot is treated as a static SSR seed — callers that want
 * a fresh snapshot on, say, a different callId must remount the consumer via
 * a `key` prop.
 */
export function useRealtimeList<T>({
  table,
  filter,
  channelKey,
  initial,
  onChannelError,
}: UseRealtimeListOptions<T>): RowFor<T>[] {
  const [rows, setRows] = useState<RowFor<T>[]>(initial);
  const seen = useRef(new Set<string>(initial.map((r) => r.id)));
  const onChannelErrorRef = useRef(onChannelError);

  useEffect(() => {
    onChannelErrorRef.current = onChannelError;
  }, [onChannelError]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    // Namespacing with `channelKey` prevents two mounted components from
    // sharing a channel and tearing each other down on unmount.
    const channel = supabase
      .channel(`rt:${channelKey}:${table}:${filter ?? "all"}`)
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
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table, filter },
        (payload: { old: RowFor<T> }) => {
          const id = payload.old?.id;
          if (!id) return;
          seen.current.delete(id);
          setRows((prev) => prev.filter((r) => r.id !== id));
        },
      )
      .subscribe((status: string, err?: Error) => {
        // Realtime errors (RLS reject, missing publication) are otherwise
        // silent. Surface them so misconfiguration is visible.
        if (err) console.warn("[use-realtime] subscribe error", { table, filter, err });
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[use-realtime] channel status", { table, filter, status });
          onChannelErrorRef.current?.(true);
        } else if (status === "SUBSCRIBED") {
          onChannelErrorRef.current?.(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter, channelKey]);

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
      .subscribe((status: string, err?: Error) => {
        if (err) console.warn("[use-realtime] row subscribe error", { table, id, err });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, id]);

  return row;
}
