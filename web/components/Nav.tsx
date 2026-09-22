"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export function Nav({ email }: { email?: string | null }) {
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="text-foreground">
          <Wordmark size={26} />
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="hidden sm:inline">{email}</span>
          <button
            type="button"
            onClick={() => void salir()}
            className="rounded-full border border-line px-3 py-1.5 text-foreground hover:border-foreground"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
