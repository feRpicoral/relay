"use client";

import {
  BarChart3,
  Bot,
  CalendarClock,
  LayoutDashboard,
  Megaphone,
  PhoneCall,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: { email: string; name: string | null };
  org: { name: string; slug: string };
  role: "ADMIN" | "MEMBER";
}

const nav = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/calls", label: "Chamadas", icon: PhoneCall },
  { href: "/agents", label: "Agentes", icon: Bot },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/calendar", label: "Calendário", icon: CalendarClock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppSidebar({ user, org, role }: SidebarProps) {
  const pathname = usePathname();
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <aside className="border-border bg-card/40 flex h-screen w-60 flex-col border-r">
      <div className="px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
            <Zap className="h-4 w-4" />
          </div>
          Relay
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-border border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
              <p className="text-muted-foreground truncate text-xs">{org.name}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
            </DropdownMenuItem>
            {role === "ADMIN" ? (
              <DropdownMenuItem asChild>
                <Link href="/settings/members">
                  <Settings className="h-4 w-4" />
                  Membros
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <form action="/auth/signout" method="post">
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  Sair
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
