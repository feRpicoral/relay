import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { RelayWordmark } from "./relay-wordmark";

interface AuthSplitLayoutProps {
  quote: string;
  attributionName: string;
  attributionOrg: string;
  tagline: string;
  children: React.ReactNode;
}

export function AuthSplitLayout({
  quote,
  attributionName,
  attributionOrg,
  tagline,
  children,
}: AuthSplitLayoutProps) {
  const initials = attributionName.slice(0, 2).toUpperCase();

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="border-border bg-primary/10 hidden flex-col justify-between border-r p-10 md:flex">
        <RelayWordmark />
        <div>
          <p className="text-lg leading-relaxed font-medium tracking-tight text-balance">
            &ldquo;{quote}&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="bg-primary/15 text-primary size-9">
              <AvatarFallback className="text-primary bg-transparent font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-semibold">{attributionName}</div>
              <div className="text-muted-foreground text-xs">{attributionOrg}</div>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{tagline}</p>
      </aside>

      <main className="flex flex-col">
        <header className="p-6 md:hidden">
          <RelayWordmark />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-12 md:p-10">
          <div className="w-full max-w-[340px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
