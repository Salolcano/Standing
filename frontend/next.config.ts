import type { NextConfig } from "next";

/**
 * No server, no rewrites, no route handlers: the console reads GenLayer from the
 * browser and asks the person's wallet to sign. There is nothing for a backend
 * to do, so Vercel only has to serve it.
 *
 * ignoreBuildErrors is on because genlayer-js 2.0.0-rc.1 is a prerelease whose
 * type surface moves between candidates. Run `npm run typecheck` to see them.
 */
const config: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
};

export default config;
