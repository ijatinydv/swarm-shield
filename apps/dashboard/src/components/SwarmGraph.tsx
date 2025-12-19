import { useCallback, useEffect, useMemo, useRef } from 'react'
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d'

interface StarNode {
  id: string
  cluster?: number
  intensity?: number
  color?: string
}

interface StarLink {
  source: string
  target: string
}

interface SwarmGraphProps {
  width?: number
  height?: number
  data?: { nodes: StarNode[]; links: StarLink[] }
}

const defaultData = (): { nodes: StarNode[]; links: StarLink[] } => {
  const nodes: StarNode[] = Array.from({ length: 18 }, (_, i) => ({
    id: `star-${i + 1}`,
    cluster: i % 3,
    intensity: 0.6 + ((i * 37) % 10) / 15,
  }))

  const links: StarLink[] = []
  nodes.forEach((node, i) => {
    const next = nodes[(i + 3) % nodes.length]
    const orbit = nodes[(i + 6) % nodes.length]
    links.push({ source: node.id, target: next.id })
    links.push({ source: node.id, target: orbit.id })
  })

  return { nodes, links }
}

export default function SwarmGraph({ width = 640, height = 400, data }: SwarmGraphProps) {
  const graphRef = useRef<ForceGraphMethods<StarNode, StarLink>>()
  const graphData = useMemo(() => {
    if (data && Array.isArray(data.nodes) && data.nodes.length > 0) return data
    return defaultData()
  }, [data])

  const paintNode = useCallback((node: StarNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const cluster = typeof node.cluster === 'number' ? node.cluster : 0
    const intensity = typeof node.intensity === 'number' ? node.intensity : 0.9
    const radius = (3 + intensity * 3) / globalScale
    const x = node.x || 0
    const y = node.y || 0

    const hues = ['#2de2e6', '#39ff14', '#7c5dff', '#f7c948', '#ff4d6d']
    const baseColor = node.color || hues[cluster % hues.length]

    ctx.save()
    ctx.shadowBlur = 18
    ctx.shadowColor = `${baseColor}cc`

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 4)
    gradient.addColorStop(0, `${baseColor}ff`)
    gradient.addColorStop(0.35, `${baseColor}99`)
    gradient.addColorStop(1, `${baseColor}00`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius * 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [])

  const paintLink = useCallback((link: StarLink & { source: any; target: any }, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source
    const end = link.target
    if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number') return

    const startColor = start.color || '#2de2e6'
    const endColor = end.color || '#ff4d6d'

    const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y)
    gradient.addColorStop(0, `${startColor}59`)
    gradient.addColorStop(1, `${endColor}59`)

    ctx.save()
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.2 / globalScale
    ctx.setLineDash([6 / globalScale, 10 / globalScale])
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()

    const pulse = ((Date.now() % 1200) / 1200) ** 1.5
    const px = start.x + (end.x - start.x) * pulse
    const py = start.y + (end.y - start.y) * pulse
    ctx.setLineDash([])
    ctx.fillStyle = startColor
    ctx.shadowBlur = 12
    ctx.shadowColor = `${startColor}cc`
    ctx.beginPath()
    ctx.arc(px, py, 2.5 / globalScale, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [])

  useEffect(() => {
    if (graphRef.current) {
      setTimeout(() => graphRef.current?.zoomToFit(400, 40), 400)
    }
  }, [graphData])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0">
      <div className="absolute inset-0 bg-cyber-grid bg-grid-size opacity-20 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent" />
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        enableZoomInteraction
        enablePanInteraction
        nodeRelSize={4}
        d3VelocityDecay={0.35}
        d3AlphaDecay={0.02}
        warmupTicks={40}
        cooldownTicks={120}
      />
      <div className="absolute top-4 right-4 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" /> Star Map Live
      </div>
    </div>
  )
}
