"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

type Props = {
  modo: "login" | "registro";
};

export function AuthForm({ modo }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const supabase = createClient();
      if (modo === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        router.replace("/");
        router.refresh();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setInfo("Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] rounded-[28px] border border-line/80 bg-card/90 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <div className="flex justify-center lg:hidden">
        <Logo size={48} />
      </div>
      <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted lg:mt-0 lg:text-left">
        Resolx Agent
      </p>
      <h1 className="mt-3 text-center text-[28px] font-semibold tracking-tight lg:text-left">
        {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h1>
      <p className="mt-2 text-center text-sm leading-6 text-muted lg:text-left">
        Acceso al agente de balance logístico AX = B.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <label className="block text-[13px] font-medium text-muted">
          Correo
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-background px-4 text-[15px] text-foreground outline-none transition focus:border-foreground"
          />
        </label>
        <label className="block text-[13px] font-medium text-muted">
          Contraseña
          <input
            type="password"
            required
            minLength={6}
            autoComplete={modo === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-background px-4 text-[15px] text-foreground outline-none transition focus:border-foreground"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {info ? <p className="text-sm text-muted">{info}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-full bg-accent text-[15px] font-medium text-background transition hover:bg-black/80 disabled:opacity-50"
        >
          {pending ? "Procesando…" : modo === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-muted lg:text-left">
        {modo === "login" ? (
          <>
            ¿Sin cuenta?{" "}
            <Link href="/registro" className="font-medium text-foreground underline-offset-4 hover:underline">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
