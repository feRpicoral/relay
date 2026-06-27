import { Zap } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function QuoteCard({
  quote,
  attributionName,
  attributionOrg,
}: {
  quote: string;
  attributionName: string;
  attributionOrg: string;
}) {
  const initials = attributionName.slice(0, 2).toUpperCase();

  return (
    <div className="bg-primary/8 border-border rounded-xl border p-10">
      <div className="max-w-3xl">
        <Zap className="text-primary mb-4 size-6" />
        <p className="text-lg leading-relaxed font-medium tracking-tight text-pretty md:text-xl">
          &ldquo;{quote}&rdquo;
        </p>
        <div className="mt-5 flex items-center gap-3">
          <Avatar className="bg-primary/15 size-[38px]">
            <AvatarFallback className="text-primary bg-transparent font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-semibold">{attributionName}</div>
            <div className="text-muted-foreground text-[12.5px]">{attributionOrg}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
