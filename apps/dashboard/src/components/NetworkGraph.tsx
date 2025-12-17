import { useMemo } from 'react'
import { Agent, Incident } from '../lib/api'
import SwarmGraph from './SwarmGraph'

interface NetworkGraphProps {
  agents: Agent[]
  incidents: Incident[]
  width?: number
  height?: number
}

interface GraphNode {
  id: string
  cluster: number
  intensity: number
  color?: string
}

interface GraphLink {
  source: string
  target: string
}

const clusterByRole: Record<'gateway' | 'scanner' | 'verifier' | 'patch' | 'incident', number> = {
  gateway: 0,
  scanner: 1,
  verifier: 2,
  patch: 3,
  incident: 4,
}

const severityToIntensity: Record<string, number> = {
  critical: 1.6,
  high: 1.3,
  medium: 1.0,
  low: 0.8,
}

export default function NetworkGraph({ agents, incidents, width = 600, height = 400 }: NetworkGraphProps) {
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    const gatewayId = 'gateway'
    nodes.push({
      id: gatewayId,
      cluster: clusterByRole.gateway,
      intensity: 2,
      color: '#2de2e6',
    })

    const normalizeRole = (agent: Agent): 'scanner' | 'verifier' | 'patch' => {
      const roleFromAgent = (agent as any).role as string | undefined
      if (roleFromAgent === 'scanner' || roleFromAgent === 'verifier' || roleFromAgent === 'patch' || roleFromAgent === 'patch-agent') {
        return roleFromAgent === 'patch-agent' ? 'patch' : (roleFromAgent as 'scanner' | 'verifier' | 'patch')
      }

      const caps = agent.capabilities || []
      if (caps.some((c) => c.includes('scan') || c.includes('scanner'))) return 'scanner'
      if (caps.some((c) => c.includes('verify') || c.includes('verifier'))) return 'verifier'
      return 'patch'
    }

    const scanners: string[] = []

    agents.forEach((agent) => {
      const role = normalizeRole(agent)
      const cluster = clusterByRole[role]
      const agentId = agent.did || agent.id || `${role}-${Math.random().toString(36).slice(2, 8)}`
      const isOnline = agent.status === 'online'
      const color = isOnline ? (role === 'scanner' ? '#2de2e6' : '#39ff14') : '#ff4d6d'
      const intensity = isOnline ? 1.1 : 0.8

      nodes.push({
        id: agentId,
        cluster,
        intensity,
        color,
      })

      links.push({ source: gatewayId, target: agentId })

      if (role === 'scanner') {
        scanners.push(agentId)
      }
    })

    const scannerFallback = scanners[0] || gatewayId

    incidents.forEach((incident) => {
      const nodeId = `incident-${incident.id}`
      const severityKey = incident.severity?.toLowerCase?.() || 'medium'
      const intensity = severityToIntensity[severityKey] ?? 1.0

      nodes.push({
        id: nodeId,
        cluster: clusterByRole.incident,
        intensity,
        color: '#ff4d6d',
      })

      links.push({
        source: scannerFallback,
        target: nodeId,
      })
    })

    return { nodes, links }
  }, [agents, incidents])

  return <SwarmGraph data={graphData} width={width} height={height} />
}