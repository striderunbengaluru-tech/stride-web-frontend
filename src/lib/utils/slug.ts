// Convert a free-text name into a URL slug. Lowercases, collapses
// non-alphanumeric runs to hyphens, trims leading/trailing hyphens.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
