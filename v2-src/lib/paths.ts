// basePath is applied by Next to <Link> and <Image>, but NOT to bare fetch()
// or to src strings we build by hand. Everything that reaches for a static
// asset at runtime must go through here or it 404s in production while
// working fine on localhost.

export const BASE_PATH = "/rs3-leaderboard";

export function asset(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}

export function dataUrl(file: string): string {
  return asset(`/data/${file}`);
}

export function iconUrl(file: string): string {
  return asset(`/data/icons/${file}`);
}

export function wikiUrl(slug: string): string {
  return `https://runescape.wiki/w/${encodeURIComponent(slug.replace(/ /g, "_"))}`;
}
