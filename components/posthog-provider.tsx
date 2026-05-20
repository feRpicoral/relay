"use client";

import { useEffect } from "react";

import { ensurePostHog } from "@/lib/posthog/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensurePostHog();
  }, []);
  return <>{children}</>;
}
