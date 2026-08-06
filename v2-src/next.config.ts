import type { NextConfig } from "next";

// Static export served by GitHub Pages from `master:/docs`.
//
// The app owns the whole site now (v1 retired 2026-08-06), so basePath is the
// bare repo name rather than a /v2 sub-path. distDir keeps the build inside
// the project because Turbopack refuses to write above projectPath;
// scripts/publish.mjs moves the artefact to repo-root /docs afterwards.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/rs3-leaderboard",
  assetPrefix: "/rs3-leaderboard",
  trailingSlash: true,
  distDir: ".dist",
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
