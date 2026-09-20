import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { Workspace } from "@/components/Workspace";

function WorkspaceFallback() {
  return <div className="min-h-0 flex-1 bg-background" />;
}

export default function HomePage() {
  return (
    <AppShell full>
      <Suspense fallback={<WorkspaceFallback />}>
        <Workspace />
      </Suspense>
    </AppShell>
  );
}
