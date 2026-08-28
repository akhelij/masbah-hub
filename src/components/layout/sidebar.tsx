"use client";

import {
  BarChart3,
  ChevronLeft,
  LayoutDashboard,
  MessageCircle,
  PenTool,
  Settings,
  Users,
  Waves,
  Zap,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/leads", label: "Prospects", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/content", label: "Contenu", icon: PenTool },
  { href: "/automations", label: "Automatisations", icon: Zap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-2.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onCloseMobile}
            title={collapsed ? label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand"
                : "text-muted hover:bg-card-2 hover:text-ink",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onCloseMobile} aria-hidden />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line bg-card transition-transform lg:static lg:translate-x-0 lg:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[68px]",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center gap-2.5 px-4",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
            <Waves className="h-4.5 w-4.5" />
          </div>
          <span className={cn("text-[15px] font-semibold tracking-tight", collapsed && "lg:hidden")}>
            Masbah<span className="text-teal">.ma</span>
          </span>
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded-md p-1 text-muted hover:bg-card-2 lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto pb-4">{nav}</div>

        <button
          onClick={onToggleCollapsed}
          className={cn(
            "hidden items-center gap-3 border-t border-line px-4 py-3 text-xs font-medium text-muted transition-colors hover:text-ink lg:flex",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          <span className={cn(collapsed && "lg:hidden")}>Réduire</span>
        </button>
      </aside>
    </>
  );
}
