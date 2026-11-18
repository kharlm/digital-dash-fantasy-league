import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/pickem/sign-in-form";
import { getSession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

/** Only same-site paths — never bounce someone to another domain after sign-in. */
function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/pickem";
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-fg uppercase">Sign in</h1>
      <p className="mt-1 mb-8 text-fg-muted">
        For DDFL members — sign in once and you&apos;ll stay signed in.
      </p>
      <SignInForm
        next={next}
        google={Boolean(process.env.GOOGLE_CLIENT_ID)}
        apple={Boolean(process.env.APPLE_CLIENT_ID)}
      />
    </div>
  );
}
