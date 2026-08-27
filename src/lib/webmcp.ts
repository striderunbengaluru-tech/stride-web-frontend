/**
 * WebMCP — in-page tools for browser-resident AI agents.
 *
 * The W3C draft standard. An agent running inside the browser (Chrome ships it
 * in 157; 149–156 was an origin trial) can call tools the page registers, which
 * means it operates the page the way a person does rather than by guessing at
 * URLs. Where the MCP server at `/mcp` answers questions about Stride from the
 * database, these tools drive the page that is already open.
 *
 * Two deliberate boundaries:
 *
 * 1. **Nothing here mutates anything.** No registration, no payment, no profile
 *    edit, no check-in. The deepest any tool reaches is opening the registration
 *    modal with a package preselected — the human still confirms, and money
 *    still moves only after they do.
 *
 * 2. **Nothing here reads the session.** Every tool returns what is already
 *    rendered on screen for everybody, so a tool's answer never depends on whose
 *    browser it is running in.
 *
 * `document.modelContext` is the current API. `navigator.modelContext` was the
 * pre-Chrome-150 alias and is deprecated; both are probed because the origin
 * trial shipped the old one. Absent entirely in every other browser, so
 * everything here is feature-detected and silently does nothing when missing.
 */

export type WebMcpToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

export type WebMcpTool = {
  name: string
  description: string
  /** JSON Schema for the arguments. Omit for a tool that takes none. */
  inputSchema?: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<WebMcpToolResult> | WebMcpToolResult
}

type ModelContext = {
  registerTool?: (tool: unknown) => (() => void) | void
  provideContext?: (context: { tools: unknown[] }) => void
}

function modelContext(): ModelContext | null {
  if (typeof window === 'undefined') return null

  const fromDocument = (document as unknown as { modelContext?: ModelContext }).modelContext
  if (fromDocument) return fromDocument

  // Deprecated pre-Chrome-150 alias, kept for origin-trial builds.
  const fromNavigator = (navigator as unknown as { modelContext?: ModelContext }).modelContext
  return fromNavigator ?? null
}

/** JSON-serialisable value as a tool result. */
export function toolJson(value: unknown): WebMcpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

export function toolError(message: string): WebMcpToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] }
}

/**
 * Registers tools with the page's model context and returns a cleanup function.
 *
 * Returns a no-op when WebMCP is unavailable, so callers never branch. The
 * cleanup matters: these tools close over component state, and a tool left
 * registered after unmount would answer from a stale closure — reporting the
 * previous page's events on the next navigation.
 */
export function registerWebMcpTools(tools: WebMcpTool[]): () => void {
  const context = modelContext()
  if (!context) return () => {}

  const shaped = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
    execute: tool.execute,
  }))

  // Two shapes exist across drafts: registerTool per tool (returning an
  // unregister function), and provideContext for the whole set at once.
  if (typeof context.registerTool === 'function') {
    const unregisters = shaped
      .map(tool => context.registerTool?.(tool))
      .filter((fn): fn is () => void => typeof fn === 'function')

    return () => {
      for (const unregister of unregisters) {
        try { unregister() } catch { /* the page is going away regardless */ }
      }
    }
  }

  if (typeof context.provideContext === 'function') {
    context.provideContext({ tools: shaped })
    return () => {
      try { context.provideContext?.({ tools: [] }) } catch { /* as above */ }
    }
  }

  return () => {}
}
