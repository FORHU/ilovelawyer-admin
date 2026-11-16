/** A short id from a title: "Refund policy!" → "refund-policy". Ids are what flows and steps are
 * referred to by, so they are plain, and they stay as first made when the title changes. */
export function slug(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return base || "item"
}

/** `slug(text)`, numbered if that id is already taken. */
export function uniqueId(text: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const base = slug(text)
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** The ids in a new order after moving one up or down. */
export function moved<T>(items: T[], index: number, by: -1 | 1): T[] {
  const target = index + by
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}
