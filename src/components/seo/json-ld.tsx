/**
 * The one place `dangerouslySetInnerHTML` is used for structured data.
 *
 * There were six copies of this pattern across the app. One component means one
 * place to get the escaping right — and it does need getting right: a `<` inside
 * a JSON string would otherwise let event copy or a blog title close the script
 * tag early and inject markup. `JSON.stringify` does not escape it, so this does.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: json }} />
}
