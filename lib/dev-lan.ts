import { networkInterfaces } from "node:os";

/**
 * This Mac's Wi-Fi/LAN IPv4 addresses (e.g. 192.168.4.55), so a phone on the
 * same network can use the dev server at http://<ip>:3000. Dev only — the
 * callers ignore it in production.
 */
export function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .flatMap((i) => (i && i.family === "IPv4" && !i.internal ? [i.address] : []));
}
