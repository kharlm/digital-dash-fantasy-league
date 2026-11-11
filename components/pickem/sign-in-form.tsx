"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type Props = { next: string; google: boolean; apple: boolean };

const inputClass =
  "w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2.5 text-fg placeholder:text-fg-subtle focus:border-gold-500 focus:outline-none";
const primaryButton =
  "w-full rounded-lg bg-gold-500 px-4 py-2.5 font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:opacity-50";
const socialButton =
  "w-full rounded-lg border border-navy-600 bg-navy-800 px-4 py-2.5 font-medium text-fg transition-colors hover:bg-navy-700 disabled:opacity-50";

export function SignInForm({ next, google, apple }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function social(provider: "google" | "apple") {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.social({ provider, callbackURL: next });
    if (error) {
      setError(error.message ?? "Sign-in failed. Try again.");
      setBusy(false);
    }
    // On success the browser is already navigating to the provider.
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    setBusy(false);
    if (error) return setError(error.message ?? "Couldn't send the code. Try again.");
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: code.trim(),
    });
    if (error) {
      setBusy(false);
      return setError(error.message ?? "That code didn't work. Check it and try again.");
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {(google || apple) && step === "email" ? (
        <div className="space-y-3">
          {apple ? (
            <button type="button" className={socialButton} disabled={busy} onClick={() => social("apple")}>
              Continue with Apple
            </button>
          ) : null}
          {google ? (
            <button type="button" className={socialButton} disabled={busy} onClick={() => social("google")}>
              Continue with Google
            </button>
          ) : null}
          <div className="flex items-center gap-3 text-xs text-fg-subtle uppercase">
            <span className="h-px flex-1 bg-navy-600" />
            or
            <span className="h-px flex-1 bg-navy-600" />
          </div>
        </div>
      ) : null}

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-sm font-medium text-fg-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
          <button type="submit" className={primaryButton} disabled={busy}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-sm text-fg-muted">
            We sent a 6-digit code to <span className="text-fg">{email}</span>.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            aria-label="Sign-in code"
            className={`${inputClass} text-center font-display text-2xl tracking-[0.4em]`}
          />
          <button type="submit" className={primaryButton} disabled={busy || code.length !== 6}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-fg-muted hover:text-fg"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
