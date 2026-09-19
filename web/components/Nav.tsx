"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Resolver" },
  { href: "/historial", label: "Historial" },
  { href: "/estres", label: "Estrés" },
];

export function Nav({ email }: { email?: string | null }) {
  const path = usePathname();
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide text-accent">
          TechChip Agent
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 ${
                path === link.href
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="hidden sm:inline">{email}</span>
          <button
            type="button"
            onClick={() => void salir()}
            className="rounded-md border border-line px-3 py-1.5 text-foreground hover:border-accent"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
