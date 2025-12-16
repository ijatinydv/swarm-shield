import { useEffect, useRef, useMemo, useCallback } from 'react'
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d'
import { Agent, Incident } from '../lib/api'

interface NetworkGraphProps {
  agents: Agent[]
  incidents: Incident[]
  width?: number
  height?: number
}

interface GraphNode {
  id: string
  name: string
  type: 'hub' | 'agent' | 'incident'
  status?: string
  severity?: string
  val: number
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  type: 'agent' | 'incident'
}

export default function NetworkGraph({ agents, incidents, width = 600, height = 400 }: NetworkGraphProps) {
  const graphRef = useRef<ForceGraphMethods>()
  
  // Build graph data from agents and incidents
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    
    // Central Hub Node (Swarm Shield)
    nodes.push({
      id: 'hub',
      name: 'SWARM SHIELD',
      type: 'hub',
      val: 30,
    })
    
    // Agent Nodes
    agents.forEach(agent => {
      nodes.push({
        id: agent.did,
        name: agent.name,
        type: 'agent',
        status: agent.status,
        val: 15,
      })
      links.push({
        source: 'hub',
        target: agent.did,
        type: 'agent',
      })
    })
    
    // Incident Nodes (limit to recent 5 for clarity)
    incidents.slice(0, 5).forEach(incident => {
      nodes.push({
        id: `incident-${incident.id}`,
        name: `${incident.package_name}@${incident.version}`,
        type: 'incident',
        severity: incident.severity,
        val: incident.severity === 'critical' ? 20 : incident.severity === 'high' ? 15 : 10,
      })
      
      // Connect incidents to scanner agent if exists
      const scanner = agents.find(a => a.capabilities.includes('security_scan'))
      if (scanner) {
        links.push({
          source: scanner.did,
          target: `incident-${incident.id}`,
          type: 'incident',
        })
      }
    })
    
    return { nodes, links }
  }, [agents, incidents])

  // Custom node canvas rendering for cyberpunk aesthetic
  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = node.type === 'hub' ? 10 / globalScale : 8 / globalScale
    
    // Node colors based on type
    let color = '#00f2ea' // Cyan for agents
    let glowColor = 'rgba(0, 242, 234, 0.5)'
    
    if (node.type === 'hub') {
      color = '#00f2ea'
      glowColor = 'rgba(0, 242, 234, 0.6)'
    } else if (node.type === 'incident') {
      if (node.severity === 'critical') {
        color = '#ff0055'
        glowColor = 'rgba(255, 0, 85, 0.6)'
      } else if (node.severity === 'high') {
        color = '#ff6600'
        glowColor = 'rgba(255, 102, 0, 0.5)'
      } else {
        color = '#ffcc00'
        glowColor = 'rgba(255, 204, 0, 0.4)'
      }
    } else if (node.status === 'offline') {
      color = '#666666'
      glowColor = 'rgba(100, 100, 100, 0.3)'
    } else if (node.status === 'online') {
      color = '#39ff14'
      glowColor = 'rgba(57, 255, 20, 0.5)'
    }
    
    const nodeSize = node.val / globalScale
    const x = node.x || 0
    const y = node.y || 0
    
    // Glow effect
    ctx.shadowBlur = 15
    ctx.shadowColor = glowColor
    
    if (node.type === 'hub') {
      // Draw hexagonal hub
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const px = x + nodeSize * Math.cos(angle)
        const py = y + nodeSize * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      
      // Fill with gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize)
      gradient.addColorStop(0, 'rgba(0, 242, 234, 0.3)')
      gradient.addColorStop(1, 'rgba(0, 242, 234, 0.1)')
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
      
      // Inner hexagon
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const px = x + (nodeSize * 0.6) * Math.cos(angle)
        const py = y + (nodeSize * 0.6) * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(0, 242, 234, 0.5)'
      ctx.lineWidth = 1 / globalScale
      ctx.stroke()
      
    } else if (node.type === 'incident') {
      // Draw warning triangle for incidents
      ctx.beginPath()
      ctx.moveTo(x, y - nodeSize)
      ctx.lineTo(x + nodeSize * 0.866, y + nodeSize * 0.5)
      ctx.lineTo(x - nodeSize * 0.866, y + nodeSize * 0.5)
      ctx.closePath()
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize)
      gradient.addColorStop(0, `${color}40`)
      gradient.addColorStop(1, `${color}10`)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()
      
      // Exclamation mark
      ctx.fillStyle = color
      ctx.font = `bold ${fontSize * 1.5}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', x, y)
      
    } else {
      // Draw diamond for agents
      ctx.beginPath()
      ctx.moveTo(x, y - nodeSize)
      ctx.lineTo(x + nodeSize, y)
      ctx.lineTo(x, y + nodeSize)
      ctx.lineTo(x - nodeSize, y)
      ctx.closePath()
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize)
      gradient.addColorStop(0, `${color}30`)
      gradient.addColorStop(1, `${color}05`)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5 / globalScale
      ctx.stroke()
      
      // Inner diamond
      ctx.beginPath()
      const innerSize = nodeSize * 0.4
      ctx.moveTo(x, y - innerSize)
      ctx.lineTo(x + innerSize, y)
      ctx.lineTo(x, y + innerSize)
      ctx.lineTo(x - innerSize, y)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    }
    
    // Reset shadow
    ctx.shadowBlur = 0
    
    // Draw label
    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    
    // Truncate long labels
    const maxLen = node.type === 'hub' ? 15 : 12
    const displayLabel = label.length > maxLen ? label.slice(0, maxLen) + '...' : label
    ctx.fillText(displayLabel, x, y + nodeSize + 3)
    
  }, [])

  // Custom link rendering
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source
    const end = link.target
    
    if (!start || !end || typeof start.x !== 'number') return
    
    // Link styling based on type
    let color = 'rgba(0, 242, 234, 0.3)'
    if (link.type === 'incident') {
      color = 'rgba(255, 0, 85, 0.4)'
    }
    
    // Draw animated dashed line
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = color
    ctx.lineWidth = 1 / globalScale
    ctx.setLineDash([4 / globalScale, 4 / globalScale])
    ctx.stroke()
    ctx.setLineDash([])
    
    // Draw flow particles
    const particlePos = (Date.now() % 2000) / 2000
    const px = start.x + (end.x - start.x) * particlePos
    const py = start.y + (end.y - start.y) * particlePos
    
    ctx.beginPath()
    ctx.arc(px, py, 2 / globalScale, 0, 2 * Math.PI)
    ctx.fillStyle = link.type === 'incident' ? '#ff0055' : '#00f2ea'
    ctx.shadowBlur = 8
    ctx.shadowColor = link.type === 'incident' ? 'rgba(255, 0, 85, 0.8)' : 'rgba(0, 242, 234, 0.8)'
    ctx.fill()
    ctx.shadowBlur = 0
    
  }, [])

  // Zoom to fit on mount
  useEffect(() => {
    if (graphRef.current) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50)
      }, 500)
    }
  }, [graphData])

  // Force re-render for particle animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (graphRef.current) {
        // @ts-ignore - internal method for re-rendering
        graphRef.current.refresh?.()
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="network-graph-container relative overflow-hidden">
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent animate-scan-line" />
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-neon-cyan/30 rounded-tl-lg" />
      <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-neon-cyan/30 rounded-tr-lg" />
      <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-neon-cyan/30 rounded-bl-lg" />
      <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-neon-cyan/30 rounded-br-lg" />
      
      {/* Status indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse shadow-neon-green" />
        <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Live Network</span>
      </div>
      
      {/* Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor="transparent"
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        nodeRelSize={6}
        linkDirectionalParticles={0}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={50}
        cooldownTicks={100}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        onNodeHover={(node) => {
          document.body.style.cursor = node ? 'pointer' : 'default'
        }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rotate-45 bg-neon-green/30 border border-neon-green" />
          <span className="text-xs text-gray-400 font-mono">Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-neon-pink" />
          <span className="text-xs text-gray-400 font-mono">Threat</span>
        </div>
      </div>
    </div>
  )
}