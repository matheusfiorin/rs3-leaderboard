import type { NextConfig } from "next";

// Static export under sub-path /rs3-leaderboard/v2 of the legacy GH Pages
// site. distDir keeps the build inside the project (Turbopack refuses to
// write outside projectPath); a postbuild script moves the artefact to
// repo-root /v2/ so it ships alongside the legacy v1.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/rs3-leaderboard/v2",
  assetPrefix: "/rs3-leaderboard/v2",
  trailingSlash: true,
  distDir: ".v2-dist",
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
