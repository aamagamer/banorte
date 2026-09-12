'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react'
import type { McpActivityEntry } from '@/lib/mcp/types'

export function McpActivityPanel({ entries }: { entries: McpActivityEntry[] }) {
  const [open, setOpen] = useState(false)
  if (entries.length === 0) return null

  return (
    <div className="mcp-activity-panel">
      <button type="button" className="mcp-activity-toggle" onClick={() => setOpen((v) => !v)}>
        <Terminal aria-hidden="true" />
        MCP Activity ({entries.length} tools)
        {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      </button>
      {open && (
        <ul className="mcp-activity-list">
          {entries.map((entry, index) => (
            <li key={`${entry.tool}-${index}`}>
              <span className="mcp-activity-check">✓</span>
              <div>
                <strong>{entry.tool}</strong>
                <span className="mcp-activity-permission">{entry.permission}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
