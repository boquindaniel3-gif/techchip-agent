import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <div className="flex min-h-full flex-col">
      <Nav email={user?.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
