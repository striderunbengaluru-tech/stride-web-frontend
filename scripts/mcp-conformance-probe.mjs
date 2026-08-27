// Connects to Stride's MCP servers with a REAL MCP client and reports what a
// host would actually see.
//
// Run:  node scripts/mcp-conformance-probe.mjs [url ...]
//       node scripts/mcp-conformance-probe.mjs            # defaults to production
//
// Why this exists rather than a curl script. Every curl probe of these endpoints
// passed while a real client timed out for sixty seconds, because curl reads the
// POST response body and a real client negotiates a transport first. A scan kept
// reporting "protocol handshake failed" and no amount of `curl -X POST` could
// reproduce it. This did, in one run.
//
// Reach for it after ANY change to @/lib/mcp/serve.ts, the transport options, or
// the Accept-header handling. Those are the places where the two disagree.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const DEFAULTS = [
  'https://www.strideclub.in/mcp',
  'https://www.strideclub.in/mcp/docs',
  'https://www.strideclub.in/.well-known/mcp',
]

const targets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULTS
let failures = 0

for (const url of targets) {
  const startedAt = Date.now()
  try {
    const client = new Client({ name: 'stride-conformance-probe', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(url)))

    const { tools } = await client.listTools()
    let resources = []
    try { resources = (await client.listResources()).resources } catch { /* server may expose none */ }

    const uiTools = tools.filter(t => t._meta?.['ui/resourceUri'] || t._meta?.ui?.resourceUri)

    console.log(`OK   ${url}  (${Date.now() - startedAt}ms)`)
    console.log(`     ${tools.length} tools, ${resources.length} resources, ${uiTools.length} rendering a ui:// view`)

    for (const tool of uiTools) {
      const uri = tool._meta.ui?.resourceUri ?? tool._meta['ui/resourceUri']
      const read = await client.readResource({ uri })
      const content = read.contents[0]
      console.log(`       ${tool.name} -> ${uri}  (${content.mimeType}, ${(content.text ?? '').length} bytes)`)
    }

    await client.close()
  } catch (error) {
    failures += 1
    console.log(`FAIL ${url}  (${Date.now() - startedAt}ms)`)
    console.log(`     ${error.message ?? error}`)
  }
}

console.log(failures === 0 ? `\n${targets.length}/${targets.length} servers reachable.` : `\n${failures} of ${targets.length} FAILED.`)
process.exit(failures === 0 ? 0 : 1)
