import "server-only";

const FROM = process.env.EMAIL_FROM ?? "DDFL <login@mail.digitaldashfl.com>";

/**
 * Sends a plain-text email via Resend's REST API (no SDK — it's one POST).
 * Without RESEND_API_KEY (local dev) the email is printed to the dev
 * server's terminal instead, so sign-in and admin alerts still work.
 */
export async function sendEmail({ to, subject, text }: { to: string | string[]; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set");
    }
    console.log(`[email] to ${[to].flat().join(", ")}: ${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend -> ${res.status} ${await res.text()}`);
  }
}

/** The 6-digit sign-in code. */
export async function sendSignInCode(email: string, otp: string) {
  await sendEmail({
    to: email,
    subject: `${otp} is your DDFL sign-in code`,
    text: `Your DDFL sign-in code is ${otp}. It expires in 5 minutes.\n\nIf you didn't try to sign in, you can ignore this email.`,
  });
}
