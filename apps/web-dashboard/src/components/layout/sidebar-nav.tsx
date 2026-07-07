"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/data/dashboard";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            <Icon aria-hidden className="size-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
