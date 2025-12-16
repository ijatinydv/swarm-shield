import { useEffect, useState, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { api, Incident, Agent, Credential } from '../lib/api'
import { Card, Badge, Button, StatCard, ProgressRing } from '../components/ui'
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  Clock, 
  ChevronRight,
  PlayCircle,
  RefreshCw,
  Zap,
  Activity,
  Target,
  Hexagon
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Lazy load NetworkGraph for code splitting
const NetworkGraph = lazy(() => import('../components/NetworkGraph'))

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetchData = async () => {
    try {
      const [inc, ag, cred] = await Promise.all([
        api.getIncidents(),
        api.getAgents(),
        api.getCredentials(),
      ])
      setIncidents(inc)
      setAgents(ag)
      setCredentials(cred)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.seedDemo().catch(() => {})
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const triggerDemo = async (scenario: string) => {
    setTriggering(true)
    try {
      await api.triggerDemo('', scenario)
      setTimeout(fetchData, 1000)
    } catch (err) {
      console.error('Failed to trigger demo:', err)
    } finally {
      setTriggering(false)
    }
  }

  const stats = {
    totalIncidents: incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    activeAgents: agents.filter(a => a.status === 'online').length,
    totalAgents: agents.length,
    credentials: credentials.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          {/* Outer spinning ring */}
          <div className="w-20 h-20 border-2 border-neon-cyan/20 rounded-full animate-spin-slow" />
          {/* Inner spinning ring */}
          <div className="absolute inset-2 border-2 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-8 h-8 text-neon-cyan animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Hexagon className="w-5 h-5 text-neon-cyan" />
              <h1 className="text-3xl font-display font-bold tracking-wide">
                <span className="glow-text-cyan">SECURITY</span>
                <span className="text-white ml-2">DASHBOARD</span>
              </h1>
            </div>
          </div>
          <p className="text-gray-400 font-mono text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-green animate-pulse" />
            Real-time dependency threat monitoring • Last sync: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => fetchData()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Demo Triggers - Cyber Style */}
      <Card className="relative overflow-hidden">
        {/* Animated border gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-pink/20 flex items-center justify-center border border-neon-cyan/30">
                <Zap className="w-6 h-6 text-neon-cyan" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-xl border border-neon-cyan/50 animate-ping opacity-30" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white tracking-wide">SIMULATION CONTROL</h3>
              <p className="text-sm text-gray-400 font-mono">Trigger simulated security incidents</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              size="sm" 
              onClick={() => triggerDemo('typosquat')}
              disabled={triggering}
            >
              <Target className="w-4 h-4" />
              Typosquat
            </Button>
            <Button 
              size="sm"
              variant="danger"
              onClick={() => triggerDemo('malicious_scripts')}
              disabled={triggering}
            >
              <AlertTriangle className="w-4 h-4" />
              Malicious Scripts
            </Button>
            <Button 
              size="sm"
              variant="secondary"
              onClick={() => triggerDemo('obfuscated')}
              disabled={triggering}
            >
              Obfuscated Code
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Grid: Network Graph + Stats */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* Network Graph - Takes 2 columns */}
        <div className="col-span-2">
          <Card className="p-0 overflow-hidden h-[420px] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-soc-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/30">
                  <Activity className="w-4 h-4 text-neon-cyan" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-white tracking-wide">SWARM NETWORK</h2>
                  <p className="text-xs text-gray-500 font-mono">Live agent topology</p>
                </div>
              </div>
              <Badge variant="info" pulse>LIVE</Badge>
            </div>
            
            {/* Graph */}
            <div className="flex-1">
              <Suspense fallback={
                <div className="h-full min-h-[340px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin" />
                </div>
              }>
                <NetworkGraph 
                  agents={agents} 
                  incidents={incidents} 
                  width={720}
                  height={360}
                />
              </Suspense>
            </div>
          </Card>
        </div>

        {/* Stats Panel - Right side */}
        <div className="grid grid-rows-[1.2fr_1fr] gap-4 h-[420px]">
          {/* Threat Level Gauge */}
          <Card className="text-center flex flex-col items-center justify-center">
            <h3 className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-4">Threat Level</h3>
            <ProgressRing 
              progress={Math.min(100, stats.critical * 25 + stats.totalIncidents * 5)} 
              size={110}
              strokeWidth={6}
              variant={stats.critical > 0 ? 'pink' : stats.totalIncidents > 0 ? 'cyan' : 'green'}
            >
              <div className="text-center">
                <p className={`text-2xl font-display font-bold ${
                  stats.critical > 0 ? 'text-neon-pink' : stats.totalIncidents > 0 ? 'text-neon-cyan' : 'text-neon-green'
                }`}>
                  {stats.critical > 0 ? 'HIGH' : stats.totalIncidents > 0 ? 'MED' : 'LOW'}
                </p>
              </div>
            </ProgressRing>
            {stats.critical > 0 && (
              <p className="mt-4 text-xs text-neon-pink font-mono animate-pulse">
                ⚠ {stats.critical} CRITICAL THREAT{stats.critical > 1 ? 'S' : ''} DETECTED
              </p>
            )}
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              value={stats.totalIncidents}
              label="Incidents"
              variant={stats.critical > 0 ? 'pink' : 'cyan'}
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              value={`${stats.activeAgents}/${stats.totalAgents}`}
              label="Agents Online"
              variant="green"
            />
            <StatCard
              icon={<Shield className="w-5 h-5" />}
              value={stats.credentials}
              label="Credentials"
              variant="cyan"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              value={incidents.length > 0 
                ? formatDistanceToNow(new Date(incidents[0].created_at), { addSuffix: false }).split(' ')[0]
                : '—'
              }
              label="Last Alert"
              variant="orange"
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Incidents & Credentials */}
      <div className="grid grid-cols-2 gap-6 items-stretch">
        {/* Recent Incidents */}
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neon-pink/10 flex items-center justify-center border border-neon-pink/30">
                <AlertTriangle className="w-4 h-4 text-neon-pink" />
              </div>
              <h2 className="font-display font-semibold text-white tracking-wide">RECENT INCIDENTS</h2>
            </div>
            <Link to="/incidents" className="text-sm text-neon-cyan hover:text-white flex items-center gap-1 font-mono transition-colors">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-2">
            {incidents.slice(0, 5).map(incident => (
              <Link
                key={incident.id}
                to={`/incidents/${incident.id}`}
                className="group flex items-center justify-between p-3 rounded-lg bg-soc-dark/50 hover:bg-soc-dark border border-transparent hover:border-neon-cyan/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Severity indicator */}
                  <div className={`relative w-2 h-8 rounded-full ${
                    incident.severity === 'critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                    incident.severity === 'high' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
                    incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {(incident.severity === 'critical' || incident.severity === 'high') && (
                      <div className="absolute inset-0 rounded-full animate-pulse bg-current opacity-50" />
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-sm text-white group-hover:text-neon-cyan transition-colors">
                      {incident.package_name}
                      <span className="text-gray-500">@{incident.version}</span>
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={incident.severity}>{incident.severity}</Badge>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-neon-cyan group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
            {incidents.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-mono text-sm">No incidents detected</p>
                <p className="text-gray-600 text-xs mt-1">Use simulation controls above to trigger events</p>
              </div>
            )}
          </div>
        </Card>

        {/* Credential Timeline */}
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/30">
                <Shield className="w-4 h-4 text-neon-green" />
              </div>
              <h2 className="font-display font-semibold text-white tracking-wide">CREDENTIAL TIMELINE</h2>
            </div>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto flex-1">
            {credentials.slice(0, 10).map(cred => (
              <div
                key={cred.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-soc-dark/50 border border-transparent hover:border-neon-cyan/10 transition-all"
              >
                {/* Type indicator */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  cred.type === 'SafeToUseAttestation' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  cred.type === 'RiskFindingCredential' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  cred.type === 'VerifiedIncidentCredential' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">
                    {cred.type.replace('Credential', '').replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-xs text-gray-500 font-mono truncate">
                    Issued by <span className="text-neon-cyan">{cred.issuer_did.split(':').pop()}</span>
                  </p>
                  <p className="text-xs text-gray-600 font-mono">
                    {formatDistanceToNow(new Date(cred.issuance_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {credentials.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-mono text-sm">No credentials issued yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
