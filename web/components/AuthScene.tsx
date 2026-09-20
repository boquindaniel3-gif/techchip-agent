import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export function AuthScene({ children }: { children: ReactNode }) {
  return (
    <div className="auth-scene relative min-h-full overflow-hidden">
      <div className="relative z-10 mx-auto grid min-h-full max-w-6xl lg:grid-cols-2">
        <section className="hidden flex-col justify-center px-14 py-16 lg:flex">
          <Logo size={72} />
          <h1 className="mt-10 max-w-md text-5xl font-semibold tracking-tight text-foreground">
            El agente de balance de planta.
          </h1>
          <p className="mt-5 max-w-sm text-[17px] leading-7 text-muted">
            Asigna presupuesto de recursos con álgebra lineal real: Gauss,
            Gauss-Jordan e inversa, de 2×2 hasta 12×12. Sin atajos numéricos.
          </p>
        </section>
        <section className="flex items-center justify-center px-4 py-16">
          {children}
        </section>
      </div>
    </div>
  );
}
