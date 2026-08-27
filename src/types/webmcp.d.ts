/**
 * WebMCP's declarative tool attributes, as JSX props.
 *
 * `toolname` and `tooldescription` are part of the W3C WebMCP draft: they mark a
 * control as an agent-callable tool in the markup itself, which means a static
 * scan of the server-rendered HTML can see it without running any JavaScript.
 * That is the half of WebMCP that `document.modelContext.registerTool()` cannot
 * cover, so both halves are worth having.
 *
 * React renders unknown all-lowercase attributes through to the DOM, so no
 * runtime shim is needed — only this declaration, so `tsc` knows they are
 * intentional rather than a typo for `title`.
 */
declare module 'react' {
  interface HTMLAttributes<T> {
    /** WebMCP: the tool name an agent invokes this control by. */
    toolname?: string
    /** WebMCP: what invoking this control does, in plain language. */
    tooldescription?: string
  }
}

export {}
