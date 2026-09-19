"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-card p-8 shadow-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">TechChip Systems S.A.</p>
      <h1 className="mt-2 text-2xl font-semibold">
        {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Acceso al agente de balance logístico AX = B.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
        <label className="block text-sm">
          Correo
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          Contraseña
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {info ? <p className="text-sm text-warn">{info}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-background disabled:opacity-60"
        >
          {pending ? "Procesando…" : modo === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        {modo === "login" ? (
          <>
            ¿Sin cuenta?{" "}
            <Link href="/registro" className="text-accent hover:underline">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
