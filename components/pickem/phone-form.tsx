"use client";

import { useActionState } from "react";

import { updatePhone, type PhoneFormState } from "@/app/pickem/actions";

export function PhoneForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<PhoneFormState, FormData>(updatePhone, {});

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="phone" className="block text-sm font-medium text-fg-muted">
        Phone number
      </label>
      <input
        id="phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={current}
        placeholder="(555) 555-5555"
        className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2.5 text-fg placeholder:text-fg-subtle focus:border-gold-500 focus:outline-none"
      />
      <p className="text-xs text-fg-subtle">Used for Pick&apos;em reminders later. Never shown to anyone else.</p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gold-500 px-4 py-2.5 font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : state.saved ? (
        <p className="text-sm text-gold-400">Saved.</p>
      ) : null}
    </form>
  );
}
