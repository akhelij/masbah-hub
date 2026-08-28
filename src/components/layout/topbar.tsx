"use client";

import { LogOut, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ShellUser } from "./app-shell";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  OPERATOR: "Opérateur",
  VIEWER: "Lecture seule",
};

export function Topbar({ user, onOpenMobile }: { user: ShellUser; onOpenMobile: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("masbah-theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        onClick={onOpenMobile}
        className="rounded-md p-1.5 text-muted hover:bg-card-2 hover:text-ink lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/leads?q=${encodeURIComponent(query)}`);
        }}
        className="relative hidden max-w-md flex-1 sm:block"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un prospect, une ville…"
          className="h-9 w-full rounded-lg border border-line bg-bg pl-9 pr-12 text-sm text-ink placeholder:text-muted/70 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted md:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={() => router.push("/leads?new=1")} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          Prospect
        </Button>

        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-card-2 hover:text-ink"
          aria-label="Basculer le thème"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-card-2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-[11px] font-semibold text-white">
              {initials(user.name)}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium leading-tight text-ink">{user.name}</span>
              <span className="block text-[10px] leading-tight text-muted">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </span>
          </button>

          <div
            className={cn(
              "absolute right-0 top-full mt-2 w-52 origin-top-right rounded-lg border border-line bg-card p-1 shadow-xl",
              menuOpen ? "animate-fade-up block" : "hidden",
            )}
          >
            <div className="px-3 py-2">
              <p className="truncate text-xs font-medium text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-card-2 hover:text-danger"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
