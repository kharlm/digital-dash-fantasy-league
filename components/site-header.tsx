import Image from "next/image";
import Link from "next/link";

import { LeagueSwitcher } from "@/components/league-switcher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-navy-600 bg-navy-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo-mark.png" alt="" width={40} height={34} className="h-9 w-auto" priority />
          <span className="font-display text-lg font-semibold tracking-wide text-fg uppercase">
            DDFL
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/announcements"
            className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            Announcements
          </Link>
          <Link
            href="/photos"
            className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            Photos
          </Link>
          <LeagueSwitcher />
        </div>
      </div>
    </header>
  );
}
