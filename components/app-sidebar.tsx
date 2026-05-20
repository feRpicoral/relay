"use client";

import {
  BarChart3,
  Bot,
  CalendarClock,
  LayoutDashboard,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

const COLLAPSED_STORAGE_KEY = "relay:sidebar-collapsed";

// localStorage as an external store. useSyncExternalStore handles SSR (returns
// false on the server, real value on the client) without a hydration mismatch
// or an extra setState-in-effect, which the new react-hooks/set-state-in-effect
// rule flags as an anti-pattern.
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readCollapsed(): boolean {
  return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
}

function serverCollapsed(): boolean {
  return false;
}

export function AppSidebar({ user, org, role }: SidebarProps) {
  const pathname = usePathname();
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  const collapsed = useSyncExternalStore(subscribeToStorage, readCollapsed, serverCollapsed);

  function toggle() {
    const next = !collapsed;
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
    // localStorage.setItem in the same tab does not fire the "storage" event,
    // so we manually dispatch one to wake every useSyncExternalStore subscriber.
    window.dispatchEvent(new StorageEvent("storage", { key: COLLAPSED_STORAGE_KEY }));
  }

  return (
    <aside
      className={cn(
        "border-border bg-card/40 sticky top-0 flex h-screen flex-col border-r transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center px-3 py-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? null : (
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
              <Zap className="h-4 w-4" />
            </div>
            Relay
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className={cn("flex-1 space-y-1", collapsed ? "px-2" : "px-3")}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const link = (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center rounded-md text-sm transition-colors",
                collapsed ? "h-9 w-full justify-center" : "gap-2 px-3 py-2",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {collapsed ? null : label}
            </Link>
          );
          if (!collapsed) return link;
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div className={cn("border-border border-t", collapsed ? "p-2" : "p-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "hover:bg-accent flex w-full items-center rounded-md text-left",
              collapsed ? "justify-center p-1" : "gap-3 px-2 py-2",
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {collapsed ? null : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
                <p className="text-muted-foreground truncate text-xs">{org.name}</p>
              </div>
            )}
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
