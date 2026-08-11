import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <Image
        src="/logo.png"
        alt="Digital Dash Fantasy League crest"
        width={363}
        height={460}
        priority
        className="h-56 w-auto drop-shadow-[0_0_40px_rgba(13,95,224,0.35)] sm:h-72"
      />

      <div className="space-y-3">
        <h1 className="font-display text-4xl font-semibold tracking-wide text-fg uppercase sm:text-6xl">
          Digital Dash
          <span className="block bg-gradient-to-b from-gold-300 via-gold-500 to-gold-600 bg-clip-text text-transparent">
            Fantasy League
          </span>
        </h1>
        <p className="text-sm font-medium tracking-[0.3em] text-fg-muted uppercase sm:text-base">
          10 Years Running
        </p>
      </div>

      <p className="max-w-md text-balance text-fg-subtle">
        Standings, drafts, brackets, and a decade of grudges — dynasty and
        redraft, all in one place. Under construction.
      </p>
    </main>
  );
}
