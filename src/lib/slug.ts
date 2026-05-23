/** Length cap on generated slugs; matches `Organization.slug` typical UX width. */
const SLUG_MAX_LEN = 48;

export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      // `\p{M}/u` matches every combining mark — robust across editors / file
      // encodings, unlike a literal range that depends on the source bytes.
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, SLUG_MAX_LEN)
  );
}
