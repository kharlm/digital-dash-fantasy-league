"use client";

import { useState, useTransition } from "react";

import { draftSharePost } from "@/app/pickem/admin/actions";

/**
 * "Share to WhatsApp": the site writes the post (Claude adds a fun line),
 * the admin can edit it, then WhatsApp opens with it typed out — they pick
 * the group and hit send. wa.me is WhatsApp's own share link, so there's no
 * bot or API involved.
 */
export function SharePost({ propId, kind }: { propId: number; kind: "announcement" | "recap" }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const draft = () =>
    startTransition(async () => {
      setError(null);
      const result = await draftSharePost(propId, kind);
      if (result.error) setError(result.error);
      if (result.text) setText(result.text);
    });

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const title = kind === "recap" ? "Recap post" : "Announcement post";

  return (
    <div className="space-y-3 border-t border-navy-600 pt-4">
      {text === null ? (
        <button
          type="button"
          onClick={draft}
          disabled={pending}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? "Writing the post…" : `Share ${kind === "recap" ? "the recap" : "this prop"} to WhatsApp`}
        </button>
      ) : (
        <>
          <label htmlFor={`share-${kind}`} className="block text-sm font-medium text-fg-muted">
            {title}: edit anything, then send
          </label>
          <textarea
            id={`share-${kind}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2.5 text-sm text-fg focus:border-gold-500 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Open WhatsApp
            </a>
            <button type="button" onClick={copy} className="text-sm text-fg-muted hover:text-fg">
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button type="button" onClick={draft} disabled={pending} className="text-sm text-fg-muted hover:text-fg disabled:opacity-60">
              {pending ? "Rewriting…" : "Start over with a new fun line"}
            </button>
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
