import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const contract = process.env.VITEST_CONTRACT === "1";

export default defineConfig({
  resolve: {
    alias: {
      "@/": root,
      "server-only": `${root}test/server-only.ts`,
    },
  },
  // `npm test` runs everything except the contract tests, which call the
  // real Sleeper/ESPN APIs and run on their own schedule
  // (`npm run test:contract`, daily in GitHub Actions).
  test: contract
    ? { environment: "node", include: ["**/*.contract.test.ts"], testTimeout: 30_000 }
    : {
        environment: "node",
        include: ["**/*.test.ts"],
        exclude: ["node_modules/**", ".next/**", "**/*.contract.test.ts"],
      },
});
