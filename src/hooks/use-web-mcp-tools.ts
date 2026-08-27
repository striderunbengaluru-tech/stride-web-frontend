'use client'

import { useEffect, useRef } from 'react'
import { registerWebMcpTools, type WebMcpTool } from '@/lib/webmcp'

/**
 * Registers WebMCP tools for as long as the component is mounted.
 *
 * The tools array is held in a ref and read at call time rather than captured in
 * the effect's closure. That is what lets a tool see current component state
 * without the effect re-running — re-running it would unregister and re-register
 * every tool on each render, and an agent mid-call would lose the tool underneath
 * it. The effect itself runs once.
 */
export function useWebMcpTools(tools: WebMcpTool[]): void {
  const latest = useRef(tools)
  latest.current = tools

  useEffect(() => {
    return registerWebMcpTools(
      latest.current.map(tool => ({
        ...tool,
        execute: (args: Record<string, unknown>) => {
          const current = latest.current.find(candidate => candidate.name === tool.name)
          return (current ?? tool).execute(args)
        },
      })),
    )
  }, [])
}
