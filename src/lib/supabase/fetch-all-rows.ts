/**
 * PostgREST caps every response at `db.max_rows` (1000 on this project), and it
 * does so silently — a `select()` with no `.range()` returns the first 1000 rows
 * with no error and no indication that anything was dropped. Any admin view that
 * counts or aggregates over a whole table must page through it instead.
 */
const PAGE_SIZE = 1000

// Guards against an unbounded loop if a page ever comes back full but stale.
const MAX_PAGES = 100

type PageResult<T> = { data: T[] | null; error: { message: string } | null }

/**
 * Reads every row a query matches by walking `.range()` windows until a short
 * page arrives. `page` receives an inclusive from/to pair and must apply it to a
 * query with a deterministic `.order()` — without one, PostgREST may repeat or
 * skip rows across windows.
 */
export async function fetchAllRows<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = []

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const from = pageIndex * PAGE_SIZE
    const { data, error } = await page(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error(`fetchAllRows(${label}) failed at offset ${from}:`, error.message)
      throw new Error(`Could not load ${label}.`)
    }

    if (!data?.length) return rows
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }

  console.error(`fetchAllRows(${label}) hit the ${MAX_PAGES}-page ceiling; results are truncated.`)
  throw new Error(`Could not load all of ${label}.`)
}
