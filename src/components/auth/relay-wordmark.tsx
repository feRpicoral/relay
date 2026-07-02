import { Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function RelayWordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 text-lg font-bold tracking-tight", className)}
    >
      <span className="bg-primary text-primary-foreground flex size-[30px] items-center justify-center rounded-lg">
        <Zap className="size-[18px]" />
      </span>
      Relay
    </Link>
  );
}
