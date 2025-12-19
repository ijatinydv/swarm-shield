import { useEffect, useState } from 'react'
import { api, Agent } from '../lib/api'
import { Card, Badge, Button, ProgressRing } from '../components/ui'
import { Users, RefreshCw, Wifi, WifiOff, Hexagon, Activity, Cpu } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const capabilityColors: Record<string, string> = {
  security_scan: 'from-red-500/30 to-red-500/10 border-red-500/40 text-red-400',
  dependency_analysis: 'from-orange-500/30 to-orange-500/10 border-orange-500/40 text-orange-400',
  security_verify: 'from-yellow-500/30 to-yellow-500/10 border-yellow-500/40 text-yellow-400',
  incident_response: 'from-amber-500/30 to-amber-500/10 border-amber-500/40 text-amber-400',
  ci_policy: 'from-green-500/30 to-green-500/10 border-green-500/40 text-green-400',
  release_gatekeeping: 'from-emerald-500/30 to-emerald-500/10 border-emerald-500/40 text-emerald-400',
  autofix: 'from-cyan-500/30 to-cyan-500/10 border-cyan-500/40 text-cyan-400',
  patch_planner: 'from-blue-500/30 to-blue-500/10 border-blue-500/40 text-blue-400',
  gateway: 'from-purple-500/30 to-purple-500/10 border-purple-500/40 text-purple-400',
  coordinator: 'from-pink-500/30 to-pink-500/10 border-pink-500/40 text-pink-400',
}

const capabilityIcons: Record<string, string> = {
  security_scan: '🔍',
  dependency_analysis: '📦',
  security_verify: '✓',
  incident_response: '🚨',
  ci_policy: '🔒',
  release_gatekeeping: '🚪',
  autofix: '🔧',
  patch_planner: '📋',
  gateway: '🌐',
  coordinator: '🎯',
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

  const onlineCount = agents.filter(a => a.status === 'online').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-20 h-20 border-2 border-neon-cyan/20 rounded-full animate-spin-slow" />
          <div className="absolute inset-2 border-2 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="w-8 h-8 text-neon-cyan animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Hexagon className="w-5 h-5 text-neon-cyan" />
            <h1 className="text-3xl font-display font-bold tracking-wide">
              <span className="glow-text-cyan">AGENT</span>
              <span className="text-white ml-2">REGISTRY</span>
            </h1>
          </div>
          <p className="text-gray-400 font-mono text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-green animate-pulse" />
            {agents.length} agents registered in the swarm network
          </p>
        </div>
        <Button variant="secondary" onClick={fetchAgents} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <ProgressRing 
              progress={(onlineCount / Math.max(agents.length, 1)) * 100} 
              size={80}
              strokeWidth={5}
              variant="green"
            >
              <div className="text-center">
                <p className="text-lg font-display font-bold text-neon-green">{onlineCount}</p>
                <p className="text-[10px] text-gray-500 font-mono">ONLINE</p>
              </div>
            </ProgressRing>
            <div>
              <h3 className="font-display font-semibold text-white tracking-wide">SWARM STATUS</h3>
              <p className="text-sm text-gray-400 font-mono">
                {onlineCount === agents.length 
                  ? 'All agents operational' 
                  : `${agents.length - onlineCount} agent(s) offline`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 rounded-lg bg-soc-dark/50 border border-soc-border">
              <p className="text-2xl font-display font-bold text-white">{agents.length}</p>
              <p className="text-xs text-gray-500 font-mono">TOTAL</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-neon-green/5 border border-neon-green/20">
              <p className="text-2xl font-display font-bold text-neon-green">{onlineCount}</p>
              <p className="text-xs text-gray-500 font-mono">ACTIVE</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Agent Grid */}
      <div className="grid grid-cols-2 gap-5">
        {agents.map(agent => (
          <Card 
            key={agent.id} 
            glow 
            className="group hover:border-neon-cyan/30 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                {/* Agent Icon */}
                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                    agent.status === 'online' 
                      ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-green/10 border-neon-cyan/30 group-hover:shadow-neon-cyan' 
                      : 'bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-gray-500/30'
                  }`}>
                    <Cpu className={`w-7 h-7 ${
                      agent.status === 'online' ? 'text-neon-cyan' : 'text-gray-500'
                    }`} />
                  </div>
                  {/* Status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-soc-dark ${
                    agent.status === 'online' 
                      ? 'bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]' 
                      : 'bg-gray-500'
                  }`}>
                    {agent.status === 'online' && (
                      <div className="absolute inset-0 rounded-full bg-neon-green animate-ping opacity-50" />
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-display font-semibold text-white tracking-wide group-hover:text-neon-cyan transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono truncate max-w-[200px] mt-1">
                    {agent.did}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {agent.status === 'online' ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <Badge variant={agent.status === 'online' ? 'success' : 'warning'} pulse={agent.status === 'online'}>
                  {agent.status}
                </Badge>
              </div>
            </div>

            {/* Capabilities */}
            <div className="mb-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mb-3">Capabilities</p>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map(cap => (
                  <span
                    key={cap}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border bg-gradient-to-r backdrop-blur-sm ${
                      capabilityColors[cap] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-400'
                    }`}
                  >
                    <span className="mr-1">{capabilityIcons[cap] || '•'}</span>
                    {cap.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-soc-border/50">
              {agent.endpoint && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neon-cyan/50" />
                  <p className="text-xs text-gray-500 font-mono truncate max-w-[180px]">
                    {agent.endpoint}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 font-mono">
                Last seen {formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true })}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <Card className="text-center py-16">
          <div className="relative inline-block mb-4">
            <Users className="w-16 h-16 text-gray-600" />
            <div className="absolute inset-0 blur-xl bg-neon-cyan/10" />
          </div>
          <p className="text-gray-400 font-display text-lg">No agents registered</p>
          <p className="text-sm text-gray-600 mt-2 font-mono">
            Agents will appear here once they connect to the network
          </p>
        </Card>
      )}
    </div>
  )
}
