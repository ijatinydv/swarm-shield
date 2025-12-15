import { useEffect, useState } from 'react'
import { api, Agent } from '../lib/api'
import { Card, Badge, Button } from '../components/ui'
import { Users, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const capabilityColors: Record<string, string> = {
  security_scan: 'bg-red-500/20 text-red-400 border-red-500/30',
  dependency_analysis: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  security_verify: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  incident_response: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ci_policy: 'bg-green-500/20 text-green-400 border-green-500/30',
  release_gatekeeping: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  autofix: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  patch_planner: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  gateway: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  coordinator: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = async () => {
    try {
      const data = await api.getAgents()
      setAgents(data)
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Registry</h1>
          <p className="text-gray-400 mt-1">
            {agents.length} agents registered in the swarm
          </p>
        </div>
        <Button variant="secondary" onClick={fetchAgents} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-2 gap-4">
        {agents.map(agent => (
          <Card key={agent.id} glow className="hover:border-neon-cyan/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-pink/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-neon-cyan" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{agent.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{agent.did}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {agent.status === 'online' ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <Badge variant={agent.status === 'online' ? 'success' : 'warning'}>
                  {agent.status}
                </Badge>
              </div>
            </div>

            {/* Capabilities */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Capabilities</p>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map(cap => (
                  <span
                    key={cap}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      capabilityColors[cap] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}
                  >
                    {cap.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-soc-border/50">
              {agent.endpoint && (
                <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                  {agent.endpoint}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Last seen {formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true })}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No agents registered yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Agents will appear here once they connect to the network
          </p>
        </Card>
      )}
    </div>
  )
}
