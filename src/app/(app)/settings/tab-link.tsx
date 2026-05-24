"use client";

import { Loader2 } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface TabLinkProps {
  href: string;
  label: string;
}

function TabPending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null;
}

export function TabLink({ href, label }: TabLinkProps) {
  const pathname = usePathname();
  const active = href === "/settings" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground border-transparent",
      )}
    >
      {label}
      <TabPending />
    </Link>
  );
}
