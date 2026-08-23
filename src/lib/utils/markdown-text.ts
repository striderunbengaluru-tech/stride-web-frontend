/**
 * Flattens a markdown body to plain prose.
 *
 * Written for the `articleBody` of a blog post's `BlogPosting` JSON-LD, which is
 * how the full text of a post reaches a crawler or an LLM that only parses the
 * HTML and never asks for the `Accept: text/markdown` twin. Schema.org expects
 * text there, not markup, so the syntax has to come off.
 *
 * Deliberately a small regex pass rather than a markdown parser: the blog bodies
 * use one flat subset (headings, images, links, bold, blockquotes, bullets), and
 * pulling a parser into a Server Component to produce a metadata string is not
 * worth the bundle or the render cost.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    // Images carry no prose — their alt text is already the visible caption.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Links keep their label and lose the target.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Heading hashes, blockquote arrows and bullet markers.
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    // Emphasis markers, keeping the emphasised words.
    .replace(/(\*\*|__|\*|_)(?=\S)([^*_]*?\S)\1/g, '$2')
    // Collapse the blank lines the strips leave behind into paragraph breaks.
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{2,}/g, '\n\n')
    .trim()
}
