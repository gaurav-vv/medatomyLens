/**
 * Sub-path the static site is served from ("" at a domain root, "/AnatomyLens"
 * on GitHub Pages project sites). Set NEXT_PUBLIC_BASE_PATH at build time.
 * Next prefixes its own routes and bundles; raw asset URLs use `withBase`.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
