/**
 * Picks the topmost problem so the toast names the field the admin will fix
 * first. Zod reports issues in schema-key order, which is not the order the
 * fields appear on screen — `order` is the form's visual top-to-bottom list
 * (EVENT_FIELD_ORDER, RACE_FIELD_ORDER). Issues on fields not in the list sort last.
 */
export function firstFormIssue(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  order: readonly string[],
): { error: string; field?: string } {
  const rank = (issue: { path: readonly PropertyKey[] }) => {
    const idx = order.indexOf(String(issue.path[0] ?? ''))
    return idx === -1 ? order.length : idx
  }
  const top = [...issues].sort((a, b) => rank(a) - rank(b))[0]
  if (!top) return { error: 'Please check the form and try again.' }
  const field = String(top.path[0] ?? '')
  return { error: top.message, field: field || undefined }
}
