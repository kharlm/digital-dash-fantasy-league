import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendSignInCode } from "@/lib/email";

const DAY = 60 * 60 * 24;

// Google and Apple only switch on once their credentials exist, so local
// dev works with email codes alone before either developer console is set up.
const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
          appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
        },
      }
    : {}),
};

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Sliding sessions: a year long, and every visit at least a day after the
  // last refresh pushes expiry out another year. A manager who votes weekly
  // effectively never sees the sign-in screen again — the whole reason this
  // is Better Auth and not Clerk's free tier (hard 7-day cap).
  session: {
    expiresIn: 365 * DAY,
    updateAge: DAY,
  },
  socialProviders,
  // Apple posts its OAuth callback from its own origin.
  trustedOrigins: ["https://appleid.apple.com"],
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") await sendSignInCode(email, otp);
      },
    }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;
