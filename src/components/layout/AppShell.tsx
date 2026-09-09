"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  ChevronLeft,
  FileSearch,
  FileText,
  Flag,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { displayRole } from "@/lib/roles";
import { formatRelative, initials as nameInitials } from "@/lib/format";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Applications",
    items: [
      { href: "/applications", label: "All Applications", icon: FileText },
      { href: "/applications/new", label: "New Application", icon: Plus },
    ],
  },
  {
    label: "Verification",
    items: [
      { href: "/queue", label: "Verification Queue", icon: ListChecks },
      { href: "/documents", label: "Documents", icon: FileSearch },
      { href: "/issues", label: "Issues & Flags", icon: Flag },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/analytics", label: "Analytics", icon: Activity },
      { href: "/audit", label: "Audit Trail", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/help", label: "Help", icon: HelpCircle },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/applications": "Applications",
  "/applications/new": "New Application",
  "/queue": "Verification Queue",
  "/documents": "Documents",
  "/issues": "Issues & Flags",
  "/analytics": "Analytics",
  "/audit": "Audit Trail",
  "/settings": "Settings",
  "/help": "Help",
};

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; body: string; href: string; createdAt: string }[]
  >([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnread(data.unread || 0);
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setNotesOpen(false);
  }, [pathname]);

  const title = useMemo(() => {
    if (pathname.startsWith("/applications/") && pathname !== "/applications/new") {
      return "Application";
    }
    if (pathname.startsWith("/documents/")) return "Document";
    return TITLES[pathname] || "LendFlow";
  }, [pathname]);

  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((part, index, parts) => ({
      label: part.replace(/-/g, " "),
      href: "/" + parts.slice(0, index + 1).join("/"),
    }));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 px-4 py-5", collapsed && "justify-center px-2")}>
        <Logo light markOnly={collapsed} />
        {!collapsed && (
          <button
            type="button"
            className="ml-auto hidden rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white lg:block"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-white/12 text-white"
                        : "text-white/70 hover:bg-white/8 hover:text-white",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-3 rounded-lg bg-white/5 px-2 py-2", collapsed && "justify-center")}>
          <span className="flex size-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {nameInitials(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-white/50">{displayRole(user.role)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        {collapsed && (
          <button
            type="button"
            className="absolute top-5 right-[-12px] z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="size-3 rotate-180" />
          </button>
        )}
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-72 bg-sidebar text-sidebar-foreground shadow-xl">
            <button
              type="button"
              className="absolute top-4 right-3 rounded-md p-1 text-white/70"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className={cn("min-h-screen", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              className="rounded-md p-2 text-foreground hover:bg-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title}</p>
              <nav aria-label="Breadcrumb" className="hidden text-xs text-muted-foreground sm:block">
                LendFlow
                {crumbs.map((crumb) => (
                  <span key={crumb.href}>
                    {" / "}
                    <Link href={crumb.href} className="capitalize hover:text-foreground">
                      {crumb.label}
                    </Link>
                  </span>
                ))}
              </nav>
            </div>
            <form
              className="relative hidden w-72 md:block"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(`/applications?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search applications"
                className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-8 text-sm"
                aria-label="Search applications"
              />
            </form>
            <div className="relative">
              <button
                type="button"
                className="relative rounded-md p-2 hover:bg-muted"
                onClick={() => setNotesOpen((open) => !open)}
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
                )}
              </button>
              {notesOpen && (
                <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] rounded-xl bg-card p-2 shadow-xl ring-1 ring-border">
                  <p className="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Notifications
                  </p>
                  {notifications.length === 0 ? (
                    <p className="px-2 py-6 text-sm text-muted-foreground">No notifications yet.</p>
                  ) : (
                    notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="block rounded-lg px-2 py-2 hover:bg-muted"
                      >
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatRelative(item.createdAt)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="User menu"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {nameInitials(user.name)}
                </span>
                <span className="hidden text-left text-sm md:block">
                  <span className="block font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">{displayRole(user.role)}</span>
                </span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card p-2 shadow-xl ring-1 ring-border">
                  <p className="px-2 py-1 text-xs text-muted-foreground">{user.email}</p>
                  <Link href="/settings" className="block rounded-lg px-2 py-2 text-sm hover:bg-muted">
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
