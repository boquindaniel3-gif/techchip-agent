"use client";

import Link from "next/link";
import { Wordmark } from "@/components/Logo";

export function Nav({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="text-foreground">
          <Wordmark size={26} />
        </Link>
        {email ? <span className="hidden text-xs text-muted sm:inline">{email}</span> : null}
      </div>
    </header>
  );
}
