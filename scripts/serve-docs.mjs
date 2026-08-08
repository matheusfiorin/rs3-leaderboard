// Serve the production static export exactly the way GitHub Pages does.
//
// Pages publishes docs/ at https://<user>.github.io/rs3-leaderboard/, so the
// build carries basePath=/rs3-leaderboard and every asset URL is absolute
// under that prefix. Serving docs/ at the server root would 404 on all of them
// and hide precisely the class of bug we want to catch before publishing.
//
//   node scripts/serve-docs.mjs [port]
//   -> http://localhost:<port>/rs3-leaderboard/

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const ROOT = new URL("../docs/", import.meta.url).pathname;
const PREFIX = "/rs3-leaderboard";
const PORT = Number(process.argv[2] ?? 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function resolve(pathname) {
  // Strip the Pages prefix; anything outside it is a genuine 404 in production.
  if (pathname === PREFIX) return join(ROOT, "index.html");
  if (!pathname.startsWith(PREFIX + "/")) return null;

  let rel = decodeURIComponent(pathname.slice(PREFIX.length + 1));
  // Contain traversal: normalize, then reject anything still climbing out.
  rel = normalize(rel);
  if (rel.startsWith("..")) return null;

  const candidate = join(ROOT, rel);
  try {
    const s = await stat(candidate);
    if (s.isDirectory()) return join(candidate, "index.html");
    return candidate;
  } catch {
    // trailingSlash:true means /skills/ is a directory; /skills is not.
    try {
      const asDir = join(ROOT, rel, "index.html");
      await stat(asDir);
      return asDir;
    } catch {
      return null;
    }
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const file = await resolve(url.pathname);

  if (!file) {
    if (url.pathname === "/") {
      res.writeHead(302, { Location: PREFIX + "/" });
      res.end();
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      // No caching: a review pass must never measure a stale asset.
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, "404.html"));
      res.writeHead(404, { "Content-Type": MIME[".html"] });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404");
    }
  }
});

server.listen(PORT, () => {
  console.log(`serving docs/ at http://localhost:${PORT}${PREFIX}/`);
});
