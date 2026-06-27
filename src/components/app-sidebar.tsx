"use client";

import {
  BarChart3,
  Bot,
  CalendarClock,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Radio,
  Settings,
  SlidersHorizontal,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/dot";
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
  /** Drives the green dot on the "Live" nav item when calls are in flight. */
  hasActiveCalls?: boolean;
}

type NavKey = "overview" | "live" | "calls" | "agents" | "campaigns" | "calendar" | "analytics";

interface NavItem {
  href: string;
  labelKey: NavKey;
  icon: typeof LayoutDashboard;
}

const nav: NavItem[] = [
  { href: "/overview", labelKey: "overview", icon: LayoutDashboard },
  { href: "/live", labelKey: "live", icon: Radio },
  { href: "/calls", labelKey: "calls", icon: PhoneCall },
  { href: "/agents", labelKey: "agents", icon: Bot },
  { href: "/campaigns", labelKey: "campaigns", icon: Megaphone },
  { href: "/calendar", labelKey: "calendar", icon: CalendarClock },
  { href: "/analytics", labelKey: "analytics", icon: BarChart3 },
];

const COLLAPSED_STORAGE_KEY = "relay:sidebar-collapsed";

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

// Renders inside a <Link>. useLinkStatus reads the parent Link's pending
// transition, so the icon swaps to a spinner the instant the user clicks —
// before the new page's server data resolves.
function NavIcon({ Icon }: { Icon: typeof LayoutDashboard }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />;
}

function Brand() {
  return (
    <Link href="/overview" className="flex items-center gap-2 font-semibold">
      <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
        <Zap className="h-4 w-4" />
      </div>
      Relay
    </Link>
  );
}

function NavLinks({
  collapsed,
  hasActiveCalls,
  onNavigate,
}: {
  collapsed: boolean;
  hasActiveCalls?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const tNav = useTranslations("sidebar.nav");

  return (
    <nav className={cn("flex-1 space-y-1", collapsed ? "px-2" : "px-3")}>
      {nav.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const label = tNav(labelKey);
        const showLive = labelKey === "live" && hasActiveCalls;
        const link = (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center rounded-md text-sm transition-colors",
              collapsed ? "h-9 w-full justify-center" : "gap-2 px-3 py-2",
              active
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <NavIcon Icon={Icon} />
            {collapsed ? null : <span className="flex-1">{label}</span>}
            {showLive ? (
              <Dot
                tone="success"
                className={collapsed ? "absolute top-1.5 right-1.5" : undefined}
              />
            ) : null}
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
  );
}

function UserMenu({ user, org, role, collapsed }: SidebarProps & { collapsed: boolean }) {
  const tMenu = useTranslations("sidebar.menu");
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-accent flex items-center rounded-md text-left",
          collapsed ? "w-full justify-center p-1" : "min-w-0 flex-1 gap-3 px-2 py-2",
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {collapsed ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{org.name}</p>
            <p className="text-muted-foreground truncate text-xs">{user.name ?? user.email}</p>
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
            {tMenu("settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/preferences">
            <SlidersHorizontal className="h-4 w-4" />
            {tMenu("preferences")}
          </Link>
        </DropdownMenuItem>
        {role === "ADMIN" ? (
          <DropdownMenuItem asChild>
            <Link href="/settings/members">
              <Users className="h-4 w-4" />
              {tMenu("members")}
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className="justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {tMenu("members")}
            </span>
            <Lock className="h-3.5 w-3.5" />
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="h-4 w-4" />
              {tMenu("signOut")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar({ user, org, role, hasActiveCalls }: SidebarProps) {
  const t = useTranslations("sidebar");
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
        // self-start stops the flex parent from stretching the aside to match
        // <main>'s height; without it, sticky+h-screen still renders a tall
        // background and the user-card footer floats mid-page on scrolled views.
        "border-border bg-card/40 sticky top-0 hidden h-screen flex-col self-start border-r transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center px-3 py-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? null : <Brand />}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
          aria-label={collapsed ? t("expand") : t("collapse")}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      <NavLinks collapsed={collapsed} hasActiveCalls={hasActiveCalls} />
      <div className={cn("border-border border-t", collapsed ? "p-2" : "p-3")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-1")}>
          <UserMenu user={user} org={org} role={role} collapsed={collapsed} />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ user, org, role, hasActiveCalls }: SidebarProps) {
  const t = useTranslations("sidebar");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="border-border bg-card/40 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setOpen(true)}
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Brand />
        <ThemeToggle />
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("navLabel")}
            className="bg-card absolute inset-y-0 left-0 flex w-64 flex-col border-r shadow-2xl"
          >
            <div className="flex items-center justify-between px-3 py-4">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavLinks
              collapsed={false}
              hasActiveCalls={hasActiveCalls}
              onNavigate={() => setOpen(false)}
            />
            <div className="border-border border-t p-3">
              <UserMenu user={user} org={org} role={role} collapsed={false} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
