import Image from "next/image";
import Link from "next/link";

import { LeagueSwitcher } from "@/components/league-switcher";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-navy-600 bg-navy-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
        {/* On phones the nav row is already full (announcements, photos, league
            switcher), so Pick'em rides on the logo row instead — it has the
            empty space — and moves into the nav row from sm up. */}
        <div className="flex w-full items-center justify-between sm:w-auto">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-mark.png" alt="" width={40} height={34} className="h-9 w-auto" priority />
            <span className="font-display text-lg font-semibold tracking-wide text-fg uppercase">
              DDFL
            </span>
          </Link>
          <Link
            href="/pickem"
            className="rounded-full bg-gold-500 px-3 py-1 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400 sm:hidden"
          >
            Pick&apos;em
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/pickem"
            className="hidden text-sm font-medium text-fg-muted transition-colors hover:text-fg sm:inline"
          >
            Pick&apos;em
          </Link>
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
