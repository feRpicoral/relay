import { Zap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen md:grid-cols-2">
      <div className="bg-card hidden flex-col justify-between p-12 md:flex">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
            <Zap className="h-4 w-4" />
          </div>
          Relay
        </Link>
        <div className="space-y-4">
          <p className="text-2xl leading-snug font-medium text-balance">
            &ldquo;Atende todas as ligações, mesmo às 3h da manhã. Nossa recepção dobrou de
            capacidade sem contratar ninguém.&rdquo;
          </p>
          <p className="text-muted-foreground text-sm">— Dra. Renata Martins, Clínica Lumen</p>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-6 md:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
              <Zap className="h-4 w-4" />
            </div>
            Relay
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
