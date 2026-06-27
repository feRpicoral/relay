"use client";

import { Loader2, Lock } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TabLinkProps {
  href: string;
  label: string;
  locked?: boolean;
  lockLabel?: string;
}

function TabPending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null;
}

export function TabLink({ href, label, locked = false, lockLabel }: TabLinkProps) {
  const pathname = usePathname();
  const active = href === "/settings" ? pathname === href : pathname.startsWith(href);

  const className = cn(
    "flex items-center gap-1.5 border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "border-primary text-foreground"
      : "text-muted-foreground hover:text-foreground border-transparent",
  );

  if (locked) {
    const link = (
      <Link href={href} className={className}>
        <Lock className="size-3" aria-hidden />
        {label}
        <TabPending />
      </Link>
    );
    return lockLabel ? (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent>{lockLabel}</TooltipContent>
      </Tooltip>
    ) : (
      link
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
      <TabPending />
    </Link>
  );
}
