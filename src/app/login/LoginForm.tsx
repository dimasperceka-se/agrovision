"use client";

import { useActionState } from "react";
import { Mail, Loader2, CircleAlert } from "lucide-react";
import { loginAction, type AuthState } from "@/lib/actions/auth";

const initialState: AuthState = { ok: false, message: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-500">
          Email
        </label>
        <div className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/30">
          <Mail className="h-4 w-4 text-slate-500" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue=""
            placeholder="nama@perusahaan.co.id"
            aria-describedby={state.message ? "login-error" : undefined}
            className="w-full text-sm text-slate-700 outline-none"
          />
        </div>
      </div>

      {state.message && !state.ok && (
        <p
          id="login-error"
          role="alert"
          className="flex items-start gap-1.5 text-xs leading-relaxed text-red-600"
        >
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Memverifikasi..." : "Masuk"}
      </button>
    </form>
  );
}
