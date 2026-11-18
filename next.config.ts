import type { NextConfig } from "next";

import { lanAddresses } from "./lib/dev-lan";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi load the dev server (http://<mac-ip>:3000).
  // Only affects `next dev`.
  allowedDevOrigins: lanAddresses(),
  // digitaldashfl.com is the canonical domain (see app/layout.tsx's
  // metadataBase); www is added in Vercel purely so it resolves instead of
  // erroring, then bounced here to the bare domain rather than serving
  // duplicate content at two hostnames.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.digitaldashfl.com" }],
        destination: "https://digitaldashfl.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
