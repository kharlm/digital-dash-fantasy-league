import type { Metadata } from "next";
import Link from "next/link";

import { PhoneForm } from "@/components/pickem/phone-form";
import { requireManager } from "@/lib/dal";
import { formatUsPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const viewer = await requireManager("/pickem/settings");

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-8">
      <Link href="/pickem" className="text-sm text-fg-muted hover:text-fg">
        ← Pick&apos;em
      </Link>
      <h1 className="mt-4 mb-8 font-display text-3xl font-semibold text-fg uppercase">Settings</h1>

      <dl className="mb-8 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">Team</dt>
          <dd className="text-fg">{viewer.manager.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-fg-muted">Signed in as</dt>
          <dd className="truncate text-fg">{viewer.email}</dd>
        </div>
      </dl>

      <PhoneForm current={formatUsPhone(viewer.manager.phone)} />
    </div>
  );
}
