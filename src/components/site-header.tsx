"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Columns3, Plus, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PersonSelector } from "@/components/criteria/person-selector";
import { LogoutButton } from "@/components/logout-button";

const NAV = [
  { href: "/", label: "Dashboard", icon: Home, exact: true },
  { href: "/viewings", label: "Viewings", icon: CalendarDays },
  { href: "/compare", label: "Compare", icon: Columns3 },
];

type PersonOption = { id: string; name: string };

export function SiteHeader({
  people = [],
  activePersonId = null,
  showLogout = false,
}: {
  people?: PersonOption[];
  activePersonId?: string | null;
  showLogout?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MapPin className="size-4" />
          </span>
          <span>House Hunt</span>
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            · Cliffhaven
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(href, exact)
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <PersonSelector people={people} activePersonId={activePersonId} />
          <Button size="sm" nativeButton={false} render={<Link href="/properties/new" />}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add property</span>
          </Button>
          {showLogout && <LogoutButton />}
        </div>
      </div>
    </header>
  );
}
