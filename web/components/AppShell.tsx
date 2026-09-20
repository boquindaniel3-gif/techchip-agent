import type { ReactNode } from "react";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

function NavFallback() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="h-[52px]" />
    </header>
  );
}

export async function AppShell({
  children,
  full = false,
}: {
  children: ReactNode;
  full?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <div className={`flex flex-col ${full ? "h-dvh overflow-hidden" : "min-h-full"}`}>
      <Suspense fallback={<NavFallback />}>
        <Nav email={user?.email} />
      </Suspense>
      <main
        className={
          full
            ? "flex min-h-0 flex-1 flex-col"
            : "mx-auto w-full max-w-6xl flex-1 px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
